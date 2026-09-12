import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { verifyToken } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { getEffectivePermissions, EXTERNAL_USER_PERMISSIONS } from "../utils/rbac.js";
import profileUpload from "../middleware/profileUpload.js";
import { validateFileSignature, processProfileImage } from "../utils/imageProcessor.js";
import { uploadImage, deleteImage } from "../utils/cloudinary.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";
import { getStudentRoleAndClub } from "./auth.js";

const router = express.Router();

const photoUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many upload attempts. Please try again later." },
});

router.get("/me", verifyToken, async (req, res) => {
  const { userId, userType, principalType } = req.user;

  try {
    if (userType === "admin" || principalType === "FACULTY" || principalType === "ADMIN") {
      const user = await prisma.adminRole.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const safeUser = sanitizeUser(user);
      const isFaculty = user.role === "facultyCoordinator";
      safeUser.principalType = isFaculty ? "FACULTY" : "ADMIN";

      const clubInfo = isFaculty
        ? await prisma.club.findFirst({ where: { facultyCoordinatorId: user.id } })
        : null;
      safeUser.clubId = clubInfo?.id ?? null;
      safeUser.memberships = clubInfo ? [{
        id: `fac_${clubInfo.id}`,
        clubId: clubInfo.id,
        clubName: clubInfo.clubName,
        role: "facultyCoordinator",
        status: "ACTIVE",
        customPermissions: [],
        canTakeAttendance: true,
        canEditEvents: true,
        permissions: {
          canTakeAttendance: true,
          canViewDashboard: true,
          canCheckRegistration: true,
          canEditEvents: true,
        },
      }] : [];

      const effectivePermissions = getEffectivePermissions(req.user, clubInfo?.id);

      return res.json({
        user: safeUser,
        role: user.role,
        userType: "admin",
        principalType: safeUser.principalType,
        effectivePermissions,
      });
    }

    if (principalType === "EXTERNAL" || userType === "external" || req.user.role === "external") {
      const externalUser = await prisma.externalUser.findUnique({ where: { id: userId } });
      if (!externalUser) {
        return res.status(404).json({ message: "External user not found." });
      }

      const safeUser = {
        id: externalUser.id,
        name: externalUser.name,
        email: externalUser.email,
        collegeName: externalUser.collegeName,
        phone: externalUser.phone,
        program: externalUser.program,
        graduationYear: externalUser.graduationYear,
        profileImage: externalUser.profileImage,
        portfolioUrl: externalUser.portfolioUrl,
        isTwoStepEnabled: externalUser.isTwoStepEnabled,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
        memberships: [],
        institutionalAssignments: [],
      };

      const effectivePermissions = EXTERNAL_USER_PERMISSIONS;

      return res.json({
        user: safeUser,
        role: "external",
        userType: "external",
        principalType: "EXTERNAL",
        effectivePermissions,
      });
    }

    const user = await prisma.studentUser.findUnique({
      where: { id: userId },
      include: {
        socialLinks: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const safeUser = sanitizeUser(user);
    safeUser.principalType = "STUDENT";

    const progress = calculateAcademicProgress(user);
    safeUser.academicYear = progress.academicYear;
    safeUser.academicYearLabel = progress.academicYearLabel;
    safeUser.semester = progress.semester;
    safeUser.semesterLabel = progress.semesterLabel;
    safeUser.expectedGraduationYear = user.expectedGraduationYear || progress.expectedGraduationYear;
    safeUser.academicStatus = progress.academicStatus;
    safeUser.year = progress.academicYearLabel;

    safeUser.socialLinks = user.socialLinks || [];
    user.socialLinks?.forEach((link) => {
      const plat = (link.platform || "").toUpperCase();
      if (plat === "GITHUB") safeUser.githubProfile = link.url;
      if (plat === "LINKEDIN") safeUser.linkedinProfile = link.url;
      if (plat === "X") safeUser.xProfile = link.url;
      if (plat === "INSTAGRAM") safeUser.instagramProfile = link.url;
      if (plat === "WHATSAPP") safeUser.whatsappNumber = link.url;
      if (plat === "PORTFOLIO") safeUser.portfolioUrl = link.url;
    });

    const { role, clubId, memberships } = await getStudentRoleAndClub(user.id);
    safeUser.clubId = clubId;
    safeUser.memberships = memberships;
    safeUser.institutionalAssignments = [];

    const effectivePermissions = getEffectivePermissions(req.user, clubId);

    return res.json({
      user: safeUser,
      role,
      userType: "student",
      principalType: "STUDENT",
      effectivePermissions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dedicated Social Links endpoints for students
router.get("/social-links", verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    if (userType !== "student") {
      return res.status(400).json({ message: "Social links are only available for students." });
    }
    const links = await prisma.studentSocialLink.findMany({
      where: { studentId: userId },
    });
    res.json(links);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/social-links", verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    if (userType !== "student") {
      return res.status(400).json({ message: "Social links are only available for students." });
    }
    const { platform, url } = req.body;
    if (!platform || !url) {
      return res.status(400).json({ message: "Platform and URL are required." });
    }
    const plat = String(platform).trim().toUpperCase();
    const validPlatforms = ["GITHUB", "LINKEDIN", "X", "INSTAGRAM", "WHATSAPP", "PORTFOLIO"];
    if (!validPlatforms.includes(plat)) {
      return res.status(400).json({ message: `Invalid platform. Allowed: ${validPlatforms.join(", ")}` });
    }
    const link = await prisma.studentSocialLink.upsert({
      where: {
        studentId_platform: {
          studentId: userId,
          platform: plat,
        },
      },
      update: { url: String(url).trim() },
      create: {
        id: crypto.randomBytes(12).toString("hex"),
        studentId: userId,
        platform: plat,
        url: String(url).trim(),
      },
    });
    res.json({ message: "Social link saved successfully", link });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/social-links/:idOrPlatform", verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    if (userType !== "student") {
      return res.status(400).json({ message: "Social links are only available for students." });
    }
    const { idOrPlatform } = req.params;
    const plat = String(idOrPlatform).trim().toUpperCase();
    const validPlatforms = ["GITHUB", "LINKEDIN", "X", "INSTAGRAM", "WHATSAPP", "PORTFOLIO"];

    if (validPlatforms.includes(plat)) {
      await prisma.studentSocialLink.deleteMany({
        where: { studentId: userId, platform: plat },
      });
    } else {
      await prisma.studentSocialLink.deleteMany({
        where: { id: idOrPlatform, studentId: userId },
      });
    }

    res.json({ message: "Social link removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// The :role segment is kept for URL compatibility; actual table is determined by JWT userType.
router.put("/:role/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userType, role, principalType } = req.user;

    const isSelf = (userId === id) || (req.user.id === id);
    if (!isSelf && role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const isExternal = userType === "external" || principalType === "EXTERNAL" || role === "external";

    if (isExternal) {
      const externalAllowedFields = [
        "name", "collegeName", "phone", "portfolioUrl", "program", "graduationYear", "isTwoStepEnabled"
      ];
      const updates = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => externalAllowedFields.includes(key) && req.body[key] !== undefined),
      );

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No allowed profile fields provided." });
      }

      const updated = await prisma.externalUser.update({ where: { id: userId || id }, data: updates });
      const safeUser = sanitizeUser(updated);
      safeUser.role = "external";
      safeUser.userType = "external";
      safeUser.principalType = "EXTERNAL";
      return res.json({ message: "Profile updated successfully", user: safeUser, role: "external", userType: "external", principalType: "EXTERNAL" });
    }

    if (userType === "admin") {
      const adminAllowedFields = ["name", "isTwoStepEnabled", "profileImage"];
      const updates = Object.fromEntries(
        Object.entries(req.body).filter(([key]) => adminAllowedFields.includes(key) && req.body[key] !== undefined),
      );

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No allowed profile fields provided." });
      }

      const updated = await prisma.adminRole.update({ where: { id: userId || id }, data: updates });
      const safeUser = sanitizeUser(updated);
      const isFaculty = updated.role === "facultyCoordinator";
      safeUser.principalType = isFaculty ? "FACULTY" : "ADMIN";
      const clubInfo = isFaculty ? await prisma.club.findFirst({ where: { facultyCoordinatorId: updated.id } }) : null;
      safeUser.clubId = clubInfo?.id ?? null;
      safeUser.memberships = clubInfo ? [{
        id: `fac_${clubInfo.id}`,
        clubId: clubInfo.id,
        clubName: clubInfo.clubName,
        role: "facultyCoordinator",
        permissions: {
          canTakeAttendance: true,
          canViewDashboard: true,
          canCheckRegistration: true,
          canEditEvents: true
        }
      }] : [];
      return res.json({ message: "Profile updated successfully", user: safeUser, role: updated.role, userType: "admin", principalType: safeUser.principalType });
    }

    // Student profile update
    const studentTargetId = userId || id;
    const studentUpdates = {};
    if (req.body.name !== undefined) studentUpdates.name = String(req.body.name).trim();
    if (req.body.isTwoStepEnabled !== undefined) studentUpdates.isTwoStepEnabled = Boolean(req.body.isTwoStepEnabled);

    if (Object.keys(studentUpdates).length > 0) {
      await prisma.studentUser.update({
        where: { id: studentTargetId },
        data: studentUpdates,
      });
    }

    // Handle social links upsert/delete if provided in body
    const socialKeyMap = {
      githubProfile: "GITHUB",
      linkedinProfile: "LINKEDIN",
      xProfile: "X",
      instagramProfile: "INSTAGRAM",
      whatsappNumber: "WHATSAPP",
      portfolioUrl: "PORTFOLIO",
    };

    for (const [key, platform] of Object.entries(socialKeyMap)) {
      if (req.body[key] !== undefined) {
        const val = req.body[key] ? String(req.body[key]).trim() : "";
        if (val) {
          await prisma.studentSocialLink.upsert({
            where: {
              studentId_platform: {
                studentId: studentTargetId,
                platform,
              },
            },
            update: { url: val },
            create: {
              id: crypto.randomBytes(12).toString("hex"),
              studentId: studentTargetId,
              platform,
              url: val,
            },
          });
        } else {
          await prisma.studentSocialLink.deleteMany({
            where: {
              studentId: studentTargetId,
              platform,
            },
          });
        }
      }
    }

    if (Array.isArray(req.body.socialLinks)) {
      const validPlatforms = ["GITHUB", "LINKEDIN", "X", "INSTAGRAM", "WHATSAPP", "PORTFOLIO"];
      for (const item of req.body.socialLinks) {
        const plat = String(item.platform || "").toUpperCase();
        if (validPlatforms.includes(plat)) {
          const val = item.url ? String(item.url).trim() : "";
          if (val) {
            await prisma.studentSocialLink.upsert({
              where: { studentId_platform: { studentId: studentTargetId, platform: plat } },
              update: { url: val },
              create: {
                id: crypto.randomBytes(12).toString("hex"),
                studentId: studentTargetId,
                platform: plat,
                url: val,
              },
            });
          } else {
            await prisma.studentSocialLink.deleteMany({
              where: { studentId: studentTargetId, platform: plat },
            });
          }
        }
      }
    }

    const updatedStudent = await prisma.studentUser.findUnique({
      where: { id: studentTargetId },
      include: { socialLinks: true },
    });

    const safeUser = sanitizeUser(updatedStudent);
    safeUser.principalType = "STUDENT";
    const progress = calculateAcademicProgress(updatedStudent);
    safeUser.academicYear = progress.academicYear;
    safeUser.academicYearLabel = progress.academicYearLabel;
    safeUser.semester = progress.semester;
    safeUser.semesterLabel = progress.semesterLabel;
    safeUser.expectedGraduationYear = updatedStudent.expectedGraduationYear || progress.expectedGraduationYear;
    safeUser.academicStatus = progress.academicStatus;
    safeUser.year = progress.academicYearLabel;

    safeUser.socialLinks = updatedStudent.socialLinks || [];
    updatedStudent.socialLinks?.forEach((link) => {
      const plat = (link.platform || "").toUpperCase();
      if (plat === "GITHUB") safeUser.githubProfile = link.url;
      if (plat === "LINKEDIN") safeUser.linkedinProfile = link.url;
      if (plat === "X") safeUser.xProfile = link.url;
      if (plat === "INSTAGRAM") safeUser.instagramProfile = link.url;
      if (plat === "WHATSAPP") safeUser.whatsappNumber = link.url;
      if (plat === "PORTFOLIO") safeUser.portfolioUrl = link.url;
    });

    const { role: studentRole, clubId: studentClubId, memberships } = await getStudentRoleAndClub(updatedStudent.id);
    safeUser.clubId = studentClubId;
    safeUser.memberships = memberships;
    safeUser.institutionalAssignments = [];

    return res.json({
      message: "Profile updated successfully",
      user: safeUser,
      role: studentRole,
      userType: "student",
      principalType: "STUDENT",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", verifyToken, async (req, res) => {
  const raw = req.query.query || req.query.q || "";
  const q = String(raw).trim();
  if (!q || q.length < 1) {
    return res.json([]);
  }
  try {
    const isExternalCaller = req.user.userType === "external" || req.user.role === "external" || req.user.principalType === "EXTERNAL";

    if (isExternalCaller) {
      const externals = await prisma.externalUser.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          collegeName: true,
          phone: true,
          program: true,
        },
        take: 15,
      });

      return res.json(externals.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        rollNo: e.collegeName,
        collegeName: e.collegeName,
        isExternal: true,
      })));
    }

    const students = await prisma.studentUser.findMany({
      where: {
        OR: [
          { rollNo: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        branch: true,
        expectedGraduationYear: true,
        program: true,
      },
      take: 15,
    });
    const enriched = students.map((s) => {
      const progress = calculateAcademicProgress(s);
      return {
        ...s,
        year: progress.academicYearLabel,
        academicYear: progress.academicYear,
        academicYearLabel: progress.academicYearLabel,
        semester: progress.semester,
        semesterLabel: progress.semesterLabel,
        academicStatus: progress.academicStatus,
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/lookup/:rollNo", verifyToken, async (req, res) => {
  const { rollNo } = req.params;
  const q = String(rollNo || "").trim();
  if (!q) {
    return res.status(400).json({ message: "Identifier is required." });
  }
  try {
    const student = await prisma.studentUser.findFirst({
      where: {
        OR: [
          { rollNo: { equals: q, mode: "insensitive" } },
          { email: { equals: q, mode: "insensitive" } },
          { id: q },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        branch: true,
        expectedGraduationYear: true,
        program: true,
      },
    });
    if (!student) {
      const ext = await prisma.externalUser.findFirst({
        where: {
          OR: [
            { email: { equals: q, mode: "insensitive" } },
            { id: q },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          collegeName: true,
          phone: true,
          program: true,
        },
      });
      if (ext) {
        return res.json({
          ...ext,
          rollNo: ext.collegeName || "External",
          branch: ext.collegeName || "External",
          isExternal: true,
        });
      }
      return res.status(404).json({ message: "Student not found." });
    }
    const progress = calculateAcademicProgress(student);
    return res.json({
      ...student,
      year: progress.academicYearLabel,
      academicYear: progress.academicYear,
      academicYearLabel: progress.academicYearLabel,
      semester: progress.semester,
      semesterLabel: progress.semesterLabel,
      academicStatus: progress.academicStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function extractCloudinaryPublicId(url) {
  if (!url) return null;
  try {
    const clean = url.split("?")[0];
    const match = clean.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

router.post(
  "/profile-photo",
  verifyToken,
  photoUploadLimiter,
  (req, res, next) => {
    profileUpload.single("profilePhoto")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Maximum file size is 5 MB." });
        }
        return res.status(400).json({ message: err.message || "Upload failed. Please try again." });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided." });
      }

      // Validate actual file signature (magic bytes) — prevents spoofed extensions
      const { valid, detectedFormat } = await validateFileSignature(req.file.buffer);
      if (!valid) {
        return res.status(400).json({
          message: "Image must be JPG, PNG or WEBP.",
          detail: detectedFormat ? `Detected format: ${detectedFormat}` : undefined,
        });
      }

      const processedBuffer = await processProfileImage(req.file.buffer);

      const { userId, userType, principalType } = req.user;
      const isAdmin = userType === "admin" || principalType === "ADMIN" || principalType === "FACULTY";
      const isExternalUser = userType === "external" || principalType === "EXTERNAL" || req.user.role === "external";

      let existingPhotoUrl = null;
      let folder = "profile-photos";
      let publicId = null;

      if (isAdmin) {
        folder = "admin-profiles";
        const currentAdmin = await prisma.adminRole.findUnique({
          where: { id: userId },
          select: { profileImage: true, email: true },
        });
        existingPhotoUrl = currentAdmin?.profileImage;
        const emailPrefix = currentAdmin?.email ? currentAdmin.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') : userId;
        publicId = `admin-${emailPrefix}`;
      } else if (isExternalUser) {
        folder = "external-profiles";
        const currentExternal = await prisma.externalUser.findUnique({
          where: { id: userId },
          select: { profileImage: true, email: true },
        });
        existingPhotoUrl = currentExternal?.profileImage;
        const emailPrefix = currentExternal?.email ? currentExternal.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') : userId;
        publicId = `external-${emailPrefix}`;
      } else {
        folder = "profile-photos";
        const currentStudent = await prisma.studentUser.findUnique({
          where: { id: userId },
          select: { profileImage: true, rollNo: true },
        });
        existingPhotoUrl = currentStudent?.profileImage;
        const rollOrId = currentStudent?.rollNo ? currentStudent.rollNo.toLowerCase().replace(/[^a-z0-9]+/g, '-') : userId;
        publicId = `student-${rollOrId}`;
      }

      if (existingPhotoUrl) {
        const oldPublicId = extractCloudinaryPublicId(existingPhotoUrl);
        if (oldPublicId && oldPublicId !== `${folder}/${publicId}` && oldPublicId !== publicId) {
          try {
            await deleteImage(oldPublicId);
          } catch (delErr) {
            console.warn("Failed to delete old image from Cloudinary:", delErr.message);
          }
        }
      }

      const uploadOptions = {
        public_id: publicId,
        unique_filename: false,
        overwrite: true,
      };

      const result = await uploadImage(processedBuffer, folder, uploadOptions);
      const versionedUrl = `${result.secure_url}?v=${Date.now()}`;

      if (isAdmin) {
        await prisma.adminRole.update({ where: { id: userId }, data: { profileImage: versionedUrl } });
      } else if (isExternalUser) {
        await prisma.externalUser.update({ where: { id: userId }, data: { profileImage: versionedUrl } });
      } else {
        await prisma.studentUser.update({ where: { id: userId }, data: { profileImage: versionedUrl } });
      }

      return res.json({
        success: true,
        imageUrl: versionedUrl,
        message: "Profile photo updated successfully",
      });
    } catch (err) {
      console.error("Profile photo upload error:", err);
      return res.status(500).json({ message: err.message || "Upload failed. Please try again." });
    }
  }
);

router.delete("/profile-photo", verifyToken, async (req, res) => {
  try {
    const { userId, userType, principalType } = req.user;
    const isAdmin = userType === "admin" || principalType === "ADMIN" || principalType === "FACULTY";
    const isExternalUser = userType === "external" || principalType === "EXTERNAL" || req.user.role === "external";

    let existingPhotoUrl = null;
    if (isAdmin) {
      const currentAdmin = await prisma.adminRole.findUnique({ where: { id: userId }, select: { profileImage: true } });
      existingPhotoUrl = currentAdmin?.profileImage;
    } else if (isExternalUser) {
      const currentExternal = await prisma.externalUser.findUnique({ where: { id: userId }, select: { profileImage: true } });
      existingPhotoUrl = currentExternal?.profileImage;
    } else {
      const currentStudent = await prisma.studentUser.findUnique({ where: { id: userId }, select: { profileImage: true } });
      existingPhotoUrl = currentStudent?.profileImage;
    }

    if (!existingPhotoUrl) {
      return res.status(400).json({ message: "No profile photo to remove." });
    }

    const publicId = extractCloudinaryPublicId(existingPhotoUrl);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (delErr) {
        console.warn("Failed to delete image from Cloudinary:", delErr.message);
      }
    }

    if (isAdmin) {
      await prisma.adminRole.update({ where: { id: userId }, data: { profileImage: null } });
    } else if (isExternalUser) {
      await prisma.externalUser.update({ where: { id: userId }, data: { profileImage: null } });
    } else {
      await prisma.studentUser.update({ where: { id: userId }, data: { profileImage: null } });
    }

    return res.json({ success: true, message: "Profile photo removed successfully" });
  } catch (err) {
    console.error("Profile photo delete error:", err);
    return res.status(500).json({ message: err.message || "Failed to remove photo. Please try again." });
  }
});

export default router;
