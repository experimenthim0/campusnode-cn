import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { verifyToken } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { getStudentRoleAndClub, getAdminClubId } from "./auth.js";
import { getEffectivePermissions } from "../utils/rbac.js";
import profileUpload from "../middleware/profileUpload.js";
import { validateFileSignature, processProfileImage, generateProfileFilename } from "../utils/imageProcessor.js";
import { uploadImage, deleteImage } from "../utils/cloudinary.js";

const router = express.Router();

// Rate limit profile photo uploads — 10 per 15 minutes
const photoUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many upload attempts. Please try again later." },
});

// GET /api/users/me — fetch the authenticated user's profile
router.get("/me", verifyToken, async (req, res) => {
  const { userId, userType, principalType } = req.user;

  try {
    // 1. Club Account
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
              bankName: true,
              accountHolderName: true,
              accountNumber: true,
              ifscCode: true,
              upiId: true,
              bankPhone: true,
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
        bankName: clubAccount.club?.bankName,
        accountHolderName: clubAccount.club?.accountHolderName,
        accountNumber: clubAccount.club?.accountNumber,
        ifscCode: clubAccount.club?.ifscCode,
        upiId: clubAccount.club?.upiId,
        bankPhone: clubAccount.club?.bankPhone,
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

    // 1.5 Institutional Account (Central Organizer)
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

    // 2. Admin / Faculty
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
      if (clubInfo) {
        safeUser.bankName = clubInfo.bankName;
        safeUser.accountHolderName = clubInfo.accountHolderName;
        safeUser.accountNumber = clubInfo.accountNumber;
        safeUser.ifscCode = clubInfo.ifscCode;
        safeUser.upiId = clubInfo.upiId;
        safeUser.bankPhone = clubInfo.bankPhone;
      }
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

    // 3. Student
    const user = await prisma.studentUser.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const safeUser = sanitizeUser(user);
    safeUser.principalType = "STUDENT";

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

// PUT /api/users/:role/:id — update profile for the authenticated user
// The :role segment is kept for URL compatibility; actual table is determined by JWT userType.

router.put("/:role/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { userId, userType, role, principalType, clubId, clubAccountId } = req.user;

  const isClub = userType === "club" || principalType === "CLUB" || role === "club";

  const isSelf = (userId === id) || (clubAccountId === id) || (clubId === id) || (req.user.id === id);
  if (!isSelf && role !== "admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    // ─── 1. CLUB PRINCIPAL / USER ───
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

      const bankFields = ["bankName", "accountHolderName", "accountNumber", "ifscCode", "upiId", "bankPhone"];
      bankFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          clubDataUpdates[field] = req.body[field] ? String(req.body[field]).trim() : null;
        }
      });

      // Prepare social links to synchronize
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
        addLink("x", req.body.xProfile || req.body.clubX);
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
        bankName: updatedClub?.bankName,
        accountHolderName: updatedClub?.accountHolderName,
        accountNumber: updatedClub?.accountNumber,
        ifscCode: updatedClub?.ifscCode,
        upiId: updatedClub?.upiId,
        bankPhone: updatedClub?.bankPhone,
      };

      return res.json({ message: "Club profile updated successfully", user: safeClubUser });
    }

    // ─── 2. ADMIN / FACULTY OR STUDENT ───
    const studentAllowedFields = [
      "name", "isTwoStepEnabled",
      "githubProfile", "linkedinProfile", "xProfile", "instagramProfile", "whatsappNumber", "portfolioUrl"
    ];
    const adminAllowedFields = ["name", "isTwoStepEnabled"];
    const allowedFields = userType === "admin" ? adminAllowedFields : studentAllowedFields;
    
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key) && req.body[key] !== undefined),
    );

    const clubAllowedFields = [
      "bankName",
      "accountHolderName",
      "accountNumber",
      "ifscCode",
      "upiId",
      "bankPhone"
    ];

    const clubUpdates = (role === "facultyCoordinator" || role === "club")
      ? Object.fromEntries(
          Object.entries(req.body).filter(([key]) => clubAllowedFields.includes(key) && req.body[key] !== undefined),
        )
      : {};

    if (Object.keys(updates).length === 0 && Object.keys(clubUpdates).length === 0) {
      return res.status(400).json({ message: "No allowed profile fields provided." });
    }

    let user;

    if (userType === "admin") {
      if (Object.keys(updates).length > 0) {
        user = await prisma.adminRole.update({ where: { id }, data: updates });
      } else {
        user = await prisma.adminRole.findUnique({ where: { id } });
      }
    } else if (userType === "external") {
      // External users no longer have a separate table — treat as studentUser or skip
      return res.status(400).json({ message: "External user profile updates are not supported." });
    } else {
      user = await prisma.studentUser.update({ where: { id }, data: updates });
    }

    if ((role === "facultyCoordinator" || role === "club") && req.user.clubId && Object.keys(clubUpdates).length > 0) {
      await prisma.club.update({
        where: { id: req.user.clubId },
        data: clubUpdates
      });
    }

    const safeUser = Object.fromEntries(
      Object.entries(user).filter(([key]) => !["password", "otp", "otpExpire"].includes(key)),
    );

    // Re-attach club associations and memberships
    if (userType === "admin") {
        const clubInfo = (user.role === "facultyCoordinator" || user.role === "club") 
            ? await prisma.club.findFirst({ where: { facultyCoordinatorId: user.id } }) 
            : null;
        safeUser.clubId = clubInfo?.id ?? null;
        if (clubInfo) {
            safeUser.bankName = clubInfo.bankName;
            safeUser.accountHolderName = clubInfo.accountHolderName;
            safeUser.accountNumber = clubInfo.accountNumber;
            safeUser.ifscCode = clubInfo.ifscCode;
            safeUser.upiId = clubInfo.upiId;
            safeUser.bankPhone = clubInfo.bankPhone;
        }
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
    } else {
        const { role: studentRole, clubId: studentClubId, memberships } = await getStudentRoleAndClub(user.id);
        safeUser.clubId = studentClubId;
        safeUser.memberships = memberships;
        if (studentRole === "club" && studentClubId) {
            const clubInfo = await prisma.club.findUnique({ where: { id: studentClubId } });
            if (clubInfo) {
                safeUser.bankName = clubInfo.bankName;
                safeUser.accountHolderName = clubInfo.accountHolderName;
                safeUser.accountNumber = clubInfo.accountNumber;
                safeUser.ifscCode = clubInfo.ifscCode;
                safeUser.upiId = clubInfo.upiId;
                safeUser.bankPhone = clubInfo.bankPhone;
            }
        }
    }

    res.json({ message: "Profile updated successfully", user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/search — search student by roll number, email, or name
router.get("/search", verifyToken, async (req, res) => {
  const { query } = req.query;
  const q = String(query || "").trim();
  if (!q || q.length < 2) {
    return res.json([]);
  }
  try {
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
        year: true,
        program: true,
      },
      take: 15,
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/lookup/:rollNo — lookup student name and branch by roll number
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
        year: true,
        program: true,
      },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }
    return res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Profile Photo Endpoints ──────────────────────────────────────────────────

/**
 * Helper to extract Cloudinary public_id from a full URL.
 * e.g. "https://res.cloudinary.com/.../profile-photos/abc123" → "profile-photos/abc123"
 */
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

// POST /api/users/profile-photo — upload or replace profile photo
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

      // Process image: auto-orient, strip EXIF, resize ≤800px, convert to WEBP
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

      // Fetch current user / club to check for existing photo
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

      // Delete old photo from Cloudinary if exists
      if (existingPhotoUrl) {
        const oldPublicId = extractCloudinaryPublicId(existingPhotoUrl);
        if (oldPublicId) {
          try {
            await deleteImage(oldPublicId);
          } catch (delErr) {
            console.warn("Failed to delete old image from Cloudinary:", delErr.message);
          }
        }
      }

      const result = await uploadImage(processedBuffer, isClub ? "club-logos" : "profile-photos");
      const versionedUrl = `${result.secure_url}?v=${Date.now()}`;

      if (isClub && effectiveClubId) {
        await prisma.club.update({ where: { id: effectiveClubId }, data: { clubLogo: versionedUrl } });
      } else if (isAdmin) {
        await prisma.adminRole.update({ where: { id: userId }, data: { profileImage: versionedUrl } });
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

// DELETE /api/users/profile-photo — remove profile photo
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

    // Delete from Cloudinary
    const publicId = extractCloudinaryPublicId(existingPhotoUrl);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (delErr) {
        console.warn("Failed to delete image from Cloudinary:", delErr.message);
      }
    }

    // Clear from database
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
