import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { verifyToken } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { getEffectivePermissions, EXTERNAL_USER_PERMISSIONS } from "../utils/rbac.js";
import profileUpload from "../middleware/profileUpload.js";
import { validateFileSignature, processProfileImage, generateProfileFilename } from "../utils/imageProcessor.js";
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
    if (principalType === "CLUB" || userType === "club") {
      const clubAccount = await prisma.clubAccount.findUnique({
        where: { id: req.user.clubAccountId || userId },
        include: {
          club: {
            select: {
              id: true,
              clubName: true,
              slug: true,
              clubLogo: true,
              description: true,
              category: true,
              motto: true,
              mission: true,
              establishedYear: true,
              clubEmail: true,
              facultyEmail: true,
              facultyName: true,
              socialLinks: true,
            },
          },
        },
      });

      if (!clubAccount) {
        return res.status(404).json({ message: "Club account not found." });
      }

      const socialMap = {};
      (clubAccount.club?.socialLinks || []).forEach((l) => {
        const plat = (l.platform || "").toLowerCase();
        if (plat === "instagram") socialMap.instagramProfile = l.url;
        if (plat === "linkedin") socialMap.linkedinProfile = l.url;
        if (plat === "x" || plat === "twitter") socialMap.xProfile = l.url;
        if (plat === "whatsapp") socialMap.whatsappNumber = l.url;
        if (plat === "website") socialMap.portfolioUrl = l.url;
        if (plat === "github") socialMap.githubProfile = l.url;
      });

      const safeUser = {
        id: clubAccount.id,
        clubAccountId: clubAccount.id,
        email: clubAccount.email,
        name: clubAccount.club?.clubName,
        clubName: clubAccount.club?.clubName,
        clubId: clubAccount.clubId,
        slug: clubAccount.club?.slug,
        clubLogo: clubAccount.club?.clubLogo,
        profileImage: clubAccount.club?.clubLogo,
        category: clubAccount.club?.category,
        motto: clubAccount.club?.motto,
        mission: clubAccount.club?.mission,
        establishedYear: clubAccount.club?.establishedYear,
        description: clubAccount.club?.description,
        principalType: "CLUB",
        club: clubAccount.club,
        socialLinks: clubAccount.club?.socialLinks || [],
        instagramProfile: socialMap.instagramProfile || "",
        linkedinProfile: socialMap.linkedinProfile || "",
        xProfile: socialMap.xProfile || "",
        whatsappNumber: socialMap.whatsappNumber || "",
        portfolioUrl: socialMap.portfolioUrl || "",
        githubProfile: socialMap.githubProfile || "",
      };

      const effectivePermissions = getEffectivePermissions(req.user, clubAccount.clubId);

      return res.json({
        user: safeUser,
        role: "club",
        userType: "club",
        principalType: "CLUB",
        effectivePermissions,
      });
    }

    if (principalType === "INSTITUTIONAL" || userType === "institutional") {
      const inst = await prisma.institutionalAccount.findUnique({
        where: { id: req.user.institutionalAccountId || userId },
      });
      if (!inst) {
        return res.status(404).json({ message: "Institutional account not found." });
      }

      const safeUser = {
        id: inst.id,
        institutionalAccountId: inst.id,
        name: inst.name,
        email: inst.email,
        type: inst.type,
        role: "central_organizer",
        userType: "institutional",
        principalType: "INSTITUTIONAL",
      };

      const effectivePermissions = getEffectivePermissions(req.user, null);

      return res.json({
        user: safeUser,
        role: "central_organizer",
        userType: "institutional",
        principalType: "INSTITUTIONAL",
        effectivePermissions,
      });
    }

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
        githubProfile: externalUser.githubProfile,
        linkedinProfile: externalUser.linkedinProfile,
        xProfile: externalUser.xProfile,
        instagramProfile: externalUser.instagramProfile,
        whatsappNumber: externalUser.whatsappNumber,
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

    const user = await prisma.studentUser.findUnique({ where: { id: userId } });
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
    safeUser.academicStatus = user.academicStatus || progress.academicStatus;
    safeUser.year = progress.academicYearLabel;

    const { role, clubId, memberships, institutionalAssignments } = await getStudentRoleAndClub(user.id);
    safeUser.clubId = clubId;
    safeUser.memberships = memberships;
    safeUser.institutionalAssignments = institutionalAssignments;

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

// The :role segment is kept for URL compatibility; actual table is determined by JWT userType.

router.put("/:role/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { userId, userType, role, principalType, clubId, clubAccountId } = req.u  // Strict check: Only genuine club accounts (ClubAccount table) enter the club branch
  const isClub = (userType === "club" || principalType === "CLUB") && userType !== "student" && principalType !== "STUDENT";

  const isSelf = (userId === id) || (clubAccountId === id) || (clubId === id) || (req.user.id === id);
  if (!isSelf && role !== "admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    if (isClub) {
      let effectiveClubId = clubId;
      if (!effectiveClubId) {
        const ca = await prisma.clubAccount.findFirst({
          where: { OR: [{ id }, { id: userId }, { clubId: id }] },
          select: { clubId: true },
        });
        effectiveClubId = ca?.clubId;
      }
      if (!effectiveClubId) {
        const directClub = await prisma.club.findUnique({
          where: { id },
          select: { id: true },
        });
        effectiveClubId = directClub?.id;
      }

      if (!effectiveClubId) {
        return res.status(404).json({ message: "Club not found for this account." });
      }

      const clubDataUpdates = {};
      if (req.body.name) clubDataUpdates.clubName = String(req.body.name).trim();
      if (req.body.clubName) clubDataUpdates.clubName = String(req.body.clubName).trim();
      if (req.body.motto !== undefined) clubDataUpdates.motto = req.body.motto ? String(req.body.motto).trim() : null;
      if (req.body.mission !== undefined) clubDataUpdates.mission = req.body.mission ? String(req.body.mission).trim() : null;
      if (req.body.category !== undefined) clubDataUpdates.category = req.body.category ? String(req.body.category).trim() : null;
      if (req.body.description !== undefined) clubDataUpdates.description = req.body.description ? String(req.body.description).trim() : null;
      if (req.body.establishedYear !== undefined) clubDataUpdates.establishedYear = req.body.establishedYear ? String(req.body.establishedYear).trim() : null;

      const socialLinksList = [];
      const addLink = (platform, url) => {
        if (url && typeof url === "string" && url.trim()) {
          socialLinksList.push({ platform, url: url.trim() });
        }
      };

      if (req.body.instagramProfile !== undefined || req.body.clubInstagram !== undefined) {
        addLink("instagram", req.body.instagramProfile || req.body.clubInstagram);
      }
      if (req.body.linkedinProfile !== undefined || req.body.clubLinkedin !== undefined) {
        addLink("linkedin", req.body.linkedinProfile || req.body.clubLinkedin);
      }
      if (req.body.xProfile !== undefined || req.body.clubX !== undefined) {
        addLink("twitter", req.body.xProfile || req.body.clubX);
      }
      if (req.body.portfolioUrl !== undefined || req.body.clubWebsite !== undefined) {
        addLink("website", req.body.portfolioUrl || req.body.clubWebsite);
      }
      if (req.body.whatsappNumber !== undefined || req.body.clubWhatsapp !== undefined) {
        addLink("whatsapp", req.body.whatsappNumber || req.body.clubWhatsapp);
      }
      if (req.body.githubProfile !== undefined || req.body.clubGithub !== undefined) {
        addLink("github", req.body.githubProfile || req.body.clubGithub);
      }

      await prisma.$transaction(async (tx) => {
        if (Object.keys(clubDataUpdates).length > 0) {
          await tx.club.update({
            where: { id: effectiveClubId },
            data: clubDataUpdates,
          });
        }

        const linkFields = [
          "instagramProfile", "linkedinProfile", "xProfile", "portfolioUrl", "whatsappNumber", "githubProfile",
          "clubInstagram", "clubLinkedin", "clubX", "clubWebsite", "clubWhatsapp", "clubGithub", "socialLinks"
        ];
        const hasLinkInBody = linkFields.some((f) => req.body[f] !== undefined);
        if (hasLinkInBody) {
          await tx.clubSocialLink.deleteMany({ where: { clubId: effectiveClubId } });
          for (const item of socialLinksList) {
            await tx.clubSocialLink.create({
              data: {
                id: crypto.randomBytes(12).toString("hex"),
                clubId: effectiveClubId,
                platform: item.platform,
                url: item.url,
              },
            });
          }
        }
      });

      const updatedClub = await prisma.club.findUnique({
        where: { id: effectiveClubId },
        include: { socialLinks: true },
      });

      const clubAccount = await prisma.clubAccount.findFirst({
        where: { OR: [{ id: userId }, { clubId: effectiveClubId }] },
      });

      const socialMap = {};
      (updatedClub?.socialLinks || []).forEach((l) => {
        const plat = (l.platform || "").toLowerCase();
        if (plat === "instagram") socialMap.instagramProfile = l.url;
        if (plat === "linkedin") socialMap.linkedinProfile = l.url;
        if (plat === "x" || plat === "twitter") socialMap.xProfile = l.url;
        if (plat === "whatsapp") socialMap.whatsappNumber = l.url;
        if (plat === "website") socialMap.portfolioUrl = l.url;
        if (plat === "github") socialMap.githubProfile = l.url;
      });

      const safeClubUser = {
        id: clubAccount?.id || id,
        clubAccountId: clubAccount?.id || id,
        email: clubAccount?.email || req.user.email,
        name: updatedClub?.clubName,
        clubName: updatedClub?.clubName,
        clubId: updatedClub?.id,
        slug: updatedClub?.slug,
        clubLogo: updatedClub?.clubLogo,
        profileImage: updatedClub?.clubLogo,
        category: updatedClub?.category,
        motto: updatedClub?.motto,
        mission: updatedClub?.mission,
        establishedYear: updatedClub?.establishedYear,
        description: updatedClub?.description,
        principalType: "CLUB",
        club: updatedClub,
        socialLinks: updatedClub?.socialLinks || [],
        instagramProfile: socialMap.instagramProfile || "",
        linkedinProfile: socialMap.linkedinProfile || "",
        xProfile: socialMap.xProfile || "",
        whatsappNumber: socialMap.whatsappNumber || "",
        portfolioUrl: socialMap.portfolioUrl || "",
        githubProfile: socialMap.githubProfile || "",
      };

      return res.json({ message: "Club profile updated successfully", user: safeClubUser, role: "club", userType: "club", principalType: "CLUB" });
    }

    const isExternal = userType === "external" || principalType === "EXTERNAL" || role === "external";
    const externalAllowedFields = [
      "name", "collegeName", "phone", "whatsappNumber", "isTwoStepEnabled",
      "githubProfile", "linkedinProfile", "xProfile", "instagramProfile", "portfolioUrl", "program", "graduationYear"
    ];
    const studentAllowedFields = [
      "name", "isTwoStepEnabled",
      "githubProfile", "linkedinProfile", "xProfile", "instagramProfile", "whatsappNumber", "portfolioUrl"
    ];
    const adminAllowedFields = ["name", "isTwoStepEnabled"];
    const allowedFields = userType === "admin" ? adminAllowedFields : isExternal ? externalAllowedFields : studentAllowedFields;
    
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key) && req.body[key] !== undefined),
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No allowed profile fields provided." });
    }

    let user;

    if (userType === "admin") {
      user = await prisma.adminRole.update({ where: { id: userId || id }, data: updates });
    } else if (isExternal) {
      user = await prisma.externalUser.update({ where: { id: userId || id }, data: updates });
    } else {
      user = await prisma.studentUser.update({ where: { id: userId || id }, data: updates });
    }

    const safeUser = Object.fromEntries(
      Object.entries(user).filter(([key]) => !["password", "otp", "otpExpire"].includes(key)),
    );

    if (isExternal) {
      safeUser.role = "external";
      safeUser.userType = "external";
      safeUser.principalType = "EXTERNAL";
      return res.json({ message: "Profile updated successfully", user: safeUser, role: "external", userType: "external", principalType: "EXTERNAL" });
    }

    if (userType === "admin") {
      const isFaculty = user.role === "facultyCoordinator";
      safeUser.principalType = isFaculty ? "FACULTY" : "ADMIN";
      const clubInfo = isFaculty ? await prisma.club.findFirst({ where: { facultyCoordinatorId: user.id } }) : null;
      safeUser.clubId = clubInfo?.id ?? null;
      safeUser.memberships = clubInfo ? [{
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
      return res.json({ message: "Profile updated successfully", user: safeUser, role: user.role, userType: "admin", principalType: safeUser.principalType });
    } else {
      const { role: studentRole, clubId: studentClubId, memberships, institutionalAssignments } = await getStudentRoleAndClub(user.id);
      const progress = calculateAcademicProgress(user);
      safeUser.academicYear = progress.academicYear;
      safeUser.academicYearLabel = progress.academicYearLabel;
      safeUser.semester = progress.semester;
      safeUser.semesterLabel = progress.semesterLabel;
      safeUser.expectedGraduationYear = user.expectedGraduationYear || progress.expectedGraduationYear;
      safeUser.academicStatus = user.academicStatus || progress.academicStatus;
      safeUser.year = progress.academicYearLabel;
      safeUser.principalType = "STUDENT";
      safeUser.clubId = studentClubId;
      safeUser.memberships = memberships;
      safeUser.institutionalAssignments = institutionalAssignments;

      return res.json({ message: "Profile updated successfully", user: safeUser, role: studentRole, userType: "student", principalType: "STUDENT" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", verifyToken, async (req, res) => {
  const { query } = req.query;
  const q = String(query || "").trim();
  if (!q || q.length < 2) {
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
        rollNo: e.collegeName, // Display college name as rollNo placeholder
        collegeName: e.collegeName,
        isExternal: true,
      })));
    }

    const students = await prisma.studentUser.findMany({
      where: {
        isBlocked: false,
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
        academicStatus: true,
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
    return res.status(400).json({ message: "Roll number is required." });
  }
  try {
    const student = await prisma.studentUser.findFirst({
      where: {
        rollNo: { equals: q, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        rollNo: true,
        branch: true,
        expectedGraduationYear: true,
        academicStatus: true,
        program: true,
      },
    });
    if (!student) {
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

      const { userId, userType, clubId, principalType } = req.user;
      const isClub = userType === "club" || principalType === "CLUB" || (clubId && userType === "club");
      const isAdmin = userType === "admin" || principalType === "ADMIN" || principalType === "FACULTY";

      let effectiveClubId = null;
      if (isClub) {
        effectiveClubId = clubId;
        if (!effectiveClubId) {
          const ca = await prisma.clubAccount.findUnique({ where: { id: userId }, select: { clubId: true } });
          effectiveClubId = ca?.clubId;
        }
      }

      const isExternalUser = userType === "external" || principalType === "EXTERNAL" || req.user.role === "external";

      // Fetch current user / club details to check for existing photo and build public_id
      let existingPhotoUrl = null;
      let folder = "profile-photos";
      let publicId = null;

      if (isClub && effectiveClubId) {
        folder = "club-logos";
        const currentClub = await prisma.club.findUnique({
          where: { id: effectiveClubId },
          select: { clubLogo: true, slug: true, clubName: true },
        });
        existingPhotoUrl = currentClub?.clubLogo;
        const identifier = currentClub?.slug || (currentClub?.clubName ? currentClub.clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null) || `club-${effectiveClubId}`;
        publicId = identifier;
      } else if (isAdmin) {
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
          select: { profileImage: true, rollNumber: true },
        });
        existingPhotoUrl = currentStudent?.profileImage;
        const rollOrId = currentStudent?.rollNumber ? currentStudent.rollNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-') : userId;
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

      if (isClub && effectiveClubId) {
        await prisma.club.update({ where: { id: effectiveClubId }, data: { clubLogo: versionedUrl } });
      } else if (isAdmin) {
        await prisma.adminRole.update({ where: { id: userId }, data: { profileImage: versionedUrl } });
      } else if (isExternalUser) {
        await prisma.externalUser.update({ where: { id: userId }, data: { profileImage: versionedUrl } });
      } else {
        await prisma.studentUser.update({ where: { id: userId }, data: { profileImage: versionedUrl } });
      }

      return res.json({
        success: true,
        imageUrl: versionedUrl,
        message: isClub ? "Club logo updated successfully" : "Profile photo updated successfully",
      });
    } catch (err) {
      console.error("Profile photo upload error:", err);
      return res.status(500).json({ message: "Upload failed. Please try again." });
    }
  }
);

router.delete("/profile-photo", verifyToken, async (req, res) => {
  try {
    const { userId, userType, clubId, principalType } = req.user;
    const isClub = userType === "club" || principalType === "CLUB" || (clubId && userType === "club");
    const isAdmin = userType === "admin" || principalType === "ADMIN" || principalType === "FACULTY";

    let effectiveClubId = null;
    if (isClub) {
      effectiveClubId = clubId;
      if (!effectiveClubId) {
        const ca = await prisma.clubAccount.findUnique({ where: { id: userId }, select: { clubId: true } });
        effectiveClubId = ca?.clubId;
      }
    }

    let existingPhotoUrl = null;
    if (isClub && effectiveClubId) {
      const currentClub = await prisma.club.findUnique({ where: { id: effectiveClubId }, select: { clubLogo: true } });
      existingPhotoUrl = currentClub?.clubLogo;
    } else if (isAdmin) {
      const currentAdmin = await prisma.adminRole.findUnique({ where: { id: userId }, select: { profileImage: true } });
      existingPhotoUrl = currentAdmin?.profileImage;
    } else {
      const currentStudent = await prisma.studentUser.findUnique({ where: { id: userId }, select: { profileImage: true } });
      existingPhotoUrl = currentStudent?.profileImage;
    }

    if (!existingPhotoUrl) {
      return res.status(400).json({ message: isClub ? "No club logo to remove." : "No profile photo to remove." });
    }

    const publicId = extractCloudinaryPublicId(existingPhotoUrl);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (delErr) {
        console.warn("Failed to delete image from Cloudinary:", delErr.message);
      }
    }

    if (isClub && effectiveClubId) {
      await prisma.club.update({ where: { id: effectiveClubId }, data: { clubLogo: null } });
    } else if (isAdmin) {
      await prisma.adminRole.update({ where: { id: userId }, data: { profileImage: null } });
    } else {
      await prisma.studentUser.update({ where: { id: userId }, data: { profileImage: null } });
    }

    return res.json({ success: true, message: isClub ? "Club logo removed successfully" : "Profile photo removed successfully" });
  } catch (err) {
    console.error("Profile photo delete error:", err);
    return res.status(500).json({ message: "Failed to remove photo. Please try again." });
  }
});

export default router;
