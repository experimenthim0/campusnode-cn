import express from "express";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import { slugifyUnique } from "../utils/slugifyUnique.js";
import prisma from "../lib/prisma.js";
import { serializeEvent } from "../utils/postgresEventSerializer.js";
import crypto from "crypto";
import { getPublicResponse, setPublicResponse } from "../utils/publicResponseCache.js";

const router = express.Router();

// Helper to verify club management permission for a given user & club
async function verifyClubAdminAccess(user, clubId) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "SUPER_ADMIN") return true;
  if ((user.role === "faculty" || user.role === "facultyCoordinator") && (user.clubId === clubId || user.id)) {
    // Check if faculty is coordinator of this club
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { facultyCoordinatorId: true } });
    if (club?.facultyCoordinatorId === user.id) return true;
  }
  if ((user.role === "club" || user.role === "CLUB") && String(user.clubId) === String(clubId)) {
    return true;
  }
  // Check if student is a CLUB_HEAD or COORDINATOR
  const membership = await prisma.clubMembership.findUnique({
    where: {
      clubId_studentId: {
        clubId: clubId,
        studentId: user.userId || user.id || user._id,
      },
    },
  });
  if (membership && (membership.role === "CLUB_HEAD" || membership.role === "COORDINATOR")) {
    return true;
  }
  return false;
}

const publicClubSelect = {
  id: true,
  clubName: true,
  slug: true,
  description: true,
  category: true,
  clubLogo: true,
  facultyName: true,
  studentCoordinators: true,
  motto: true,
  mission: true,
  establishedYear: true,
  facultyCoordinator: { select: { id: true, name: true, email: true } },
  socialLinks: true,
  memberships: {
    where: { role: { in: ["CLUB_HEAD", "COORDINATOR"] } },
    include: {
      student: { select: { id: true, name: true, email: true } }
    }
  },
};

// ── GET /clubs — all clubs with faculty coordinator ───────────────────────────

router.get("/", async (req, res) => {
  try {
    const cacheKey = "clubs:public";
    const cachedClubs = getPublicResponse(cacheKey);

    if (cachedClubs) {
      res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
      res.set("X-Public-Cache", "HIT");
      return res.json(cachedClubs);
    }

    const clubs = await prisma.club.findMany({
      select: publicClubSelect,
      orderBy: { clubName: "asc" },
    });

    const response = clubs.map((club) => {
      const coordinatorMembers = (club.memberships || []).filter((m) => m.role === "COORDINATOR");
      const headMembers = (club.memberships || []).filter((m) => m.role === "CLUB_HEAD");
      const roleCoords = coordinatorMembers.map((m) => m.student?.name).filter(Boolean);
      const roleHeads = headMembers.map((m) => m.student?.name).filter(Boolean);

      const resolvedStudentCoordinators =
        Array.isArray(club.studentCoordinators) && club.studentCoordinators.length > 0
          ? club.studentCoordinators
          : roleHeads.length > 0
          ? roleHeads
          : roleCoords;

      return {
        ...club,
        _id: club.id,
        facultyCoordinators: club.facultyCoordinator
          ? [{ ...club.facultyCoordinator, _id: club.facultyCoordinator.id }]
          : [],
        studentHeads: roleHeads,
        studentCoordinators: resolvedStudentCoordinators,
        roleCoordinators: roleCoords,
      };
    });

    setPublicResponse(cacheKey, response);
    res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
    res.set("X-Public-Cache", "MISS");
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /clubs/:id — single club with published events, announcements, achievements, media ──

router.get("/:id", async (req, res) => {
  try {
    const club = await prisma.club.findFirst({
      where: {
        OR: [{ id: req.params.id }, { slug: req.params.id }],
      },
      include: {
        facultyCoordinator: { select: { id: true, name: true, email: true } },
        socialLinks: true,
        media: { where: { eventId: null }, orderBy: { id: "desc" } },
        sponsors: { where: { eventId: null } },
        announcements: {
          where: { isPublished: true },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        },
        achievements: {
          orderBy: { createdAt: "desc" },
        },
        memberships: {
          where: { role: { in: ["CLUB_HEAD", "COORDINATOR"] } },
          include: {
            student: { select: { id: true, name: true, email: true, rollNo: true } },
          },
        },
      },
    });

    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    const coordinatorMembers = (club.memberships || []).filter((m) => m.role === "COORDINATOR");
    const headMembers = (club.memberships || []).filter((m) => m.role === "CLUB_HEAD");
    const roleCoords = coordinatorMembers.map((m) => m.student?.name).filter(Boolean);
    const roleHeads = headMembers.map((m) => m.student?.name).filter(Boolean);

    const resolvedStudentCoordinators =
      Array.isArray(club.studentCoordinators) && club.studentCoordinators.length > 0
        ? club.studentCoordinators
        : roleHeads.length > 0
        ? roleHeads
        : roleCoords;

    const [events, membersCount] = await Promise.all([
      prisma.event.findMany({
        where: { clubId: club.id, reviewStatus: "PUBLISHED" },
        include: {
          club: { select: { id: true, clubName: true, clubLogo: true, slug: true, category: true } },
          createdBy: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.clubMembership.count({
        where: { clubId: club.id },
      }),
    ]);

    const now = new Date();
    const upcomingEvents = events.filter((e) => new Date(e.startTime) > now);
    const pastEvents = events.filter((e) => new Date(e.endTime) < now);
    const liveEvents = events.filter((e) => new Date(e.startTime) <= now && new Date(e.endTime) >= now);

    // Find featured event or fallback to next upcoming event
    const featuredEvent = events.find((e) => e.isFeatured) || upcomingEvents[0] || null;

    res.json({
      club: {
        ...club,
        _id: club.id,
        studentCoordinators: resolvedStudentCoordinators,
        studentHeads: roleHeads,
        roleCoordinators: roleCoords,
        clubGallery: club.media?.map((m) => m.url) || [],
        mediaList: club.media || [],
        clubSponsors: club.sponsors?.map((s) => s.logoUrl) || [],
        announcements: club.announcements || [],
        achievements: club.achievements || [],
        stats: {
          membersCount,
          upcomingEventsCount: upcomingEvents.length + liveEvents.length,
          pastEventsCount: pastEvents.length,
        },
      },
      events: events.map(serializeEvent),
      featuredEvent: featuredEvent ? serializeEvent(featuredEvent) : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /clubs/:id — update club (admin or assigned club head) ────────────────

router.put("/:id", verifyToken, requirePermission(PERMISSIONS.CLUB_UPDATE), async (req, res) => {
  try {
    const targetClubId = req.params.id;
    const isAuthorized = await verifyClubAdminAccess(req.user, targetClubId);

    if (!isAuthorized) {
      return res.status(403).json({
        message: "Access denied. You can only update your own club.",
      });
    }

    const allowedFields = [
      "clubName",
      "description",
      "category",
      "motto",
      "mission",
      "establishedYear",
      "clubEmail",
      "facultyEmail",
      "facultyName",
      "clubLogo",
      "bankName",
      "accountHolderName",
      "accountNumber",
      "ifscCode",
      "upiId",
      "bankPhone",
      "studentCoordinators",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.clubName) {
      updates.slug = await slugifyUnique(updates.clubName, "club", "slug", targetClubId);
    }

    const updatedClub = await prisma.$transaction(async (tx) => {
      await tx.club.update({
        where: { id: targetClubId },
        data: updates,
      });

      if (req.body.socialLinks && Array.isArray(req.body.socialLinks)) {
        await tx.clubSocialLink.deleteMany({ where: { clubId: targetClubId } });
        if (req.body.socialLinks.length > 0) {
          await tx.clubSocialLink.createMany({
            data: req.body.socialLinks.map((link) => ({
              id: crypto.randomBytes(12).toString("hex"),
              clubId: targetClubId,
              platform: link.platform,
              url: link.url,
            })),
          });
        }
      }

      if (req.body.clubGallery && Array.isArray(req.body.clubGallery)) {
        await tx.media.deleteMany({ where: { clubId: targetClubId, eventId: null } });
        if (req.body.clubGallery.length > 0) {
          await tx.media.createMany({
            data: req.body.clubGallery.map((url) => ({
              id: crypto.randomBytes(12).toString("hex"),
              clubId: targetClubId,
              url,
              type: "IMAGE",
            })),
          });
        }
      }

      if (req.body.clubSponsors && Array.isArray(req.body.clubSponsors)) {
        await tx.sponsor.deleteMany({ where: { clubId: targetClubId, eventId: null } });
        if (req.body.clubSponsors.length > 0) {
          await tx.sponsor.createMany({
            data: req.body.clubSponsors.map((url) => ({
              id: crypto.randomBytes(12).toString("hex"),
              clubId: targetClubId,
              name: "Sponsor",
              logoUrl: url,
            })),
          });
        }
      }

      return tx.club.findUnique({
        where: { id: targetClubId },
        include: {
          socialLinks: true,
          media: { where: { eventId: null } },
          sponsors: { where: { eventId: null } },
          announcements: true,
          achievements: true,
        },
      });
    });

    res.json({
      message: "Club updated successfully",
      club: {
        ...updatedClub,
        _id: updatedClub.id,
        clubGallery: updatedClub.media?.map((m) => m.url) || [],
        mediaList: updatedClub.media || [],
        clubSponsors: updatedClub.sponsors?.map((s) => s.logoUrl) || [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ANNOUNCEMENTS MANAGEMENT ──────────────────────────────────────────────────

// POST /api/clubs/:id/announcements
router.post("/:id/announcements", verifyToken, async (req, res) => {
  try {
    const clubId = req.params.id;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied to manage announcements for this club." });
    }

    const { title, content, isPinned, isPublished } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required." });
    }

    const announcement = await prisma.clubAnnouncement.create({
      data: {
        id: crypto.randomBytes(12).toString("hex"),
        clubId,
        title,
        content,
        isPinned: isPinned ?? false,
        isPublished: isPublished ?? true,
        authorName: req.user.name || "Club Lead",
      },
    });

    res.status(201).json({ message: "Announcement created successfully", announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/clubs/:id/announcements/:announcementId
router.put("/:id/announcements/:announcementId", verifyToken, async (req, res) => {
  try {
    const { id: clubId, announcementId } = req.params;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { title, content, isPinned, isPublished } = req.body;
    const updated = await prisma.clubAnnouncement.update({
      where: { id: announcementId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    res.json({ message: "Announcement updated successfully", announcement: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/clubs/:id/announcements/:announcementId/pin
router.patch("/:id/announcements/:announcementId/pin", verifyToken, async (req, res) => {
  try {
    const { id: clubId, announcementId } = req.params;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    const current = await prisma.clubAnnouncement.findUnique({ where: { id: announcementId } });
    if (!current) return res.status(404).json({ message: "Announcement not found" });

    const updated = await prisma.clubAnnouncement.update({
      where: { id: announcementId },
      data: { isPinned: !current.isPinned },
    });

    res.json({ message: `Announcement ${updated.isPinned ? "pinned" : "unpinned"}`, announcement: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/clubs/:id/announcements/:announcementId
router.delete("/:id/announcements/:announcementId", verifyToken, async (req, res) => {
  try {
    const { id: clubId, announcementId } = req.params;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    await prisma.clubAnnouncement.delete({
      where: { id: announcementId },
    });

    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ACHIEVEMENTS MANAGEMENT ───────────────────────────────────────────────────

// POST /api/clubs/:id/achievements
router.post("/:id/achievements", verifyToken, async (req, res) => {
  try {
    const clubId = req.params.id;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { title, description, date, imageUrl, externalUrl } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required for achievement." });
    }

    const achievement = await prisma.clubAchievement.create({
      data: {
        id: crypto.randomBytes(12).toString("hex"),
        clubId,
        title,
        description: description || null,
        date: date || null,
        imageUrl: imageUrl || null,
        externalUrl: externalUrl || null,
      },
    });

    res.status(201).json({ message: "Achievement added successfully", achievement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/clubs/:id/achievements/:achievementId
router.put("/:id/achievements/:achievementId", verifyToken, async (req, res) => {
  try {
    const { id: clubId, achievementId } = req.params;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { title, description, date, imageUrl, externalUrl } = req.body;
    const updated = await prisma.clubAchievement.update({
      where: { id: achievementId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(externalUrl !== undefined && { externalUrl }),
      },
    });

    res.json({ message: "Achievement updated successfully", achievement: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/clubs/:id/achievements/:achievementId
router.delete("/:id/achievements/:achievementId", verifyToken, async (req, res) => {
  try {
    const { id: clubId, achievementId } = req.params;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    await prisma.clubAchievement.delete({
      where: { id: achievementId },
    });

    res.json({ message: "Achievement deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GALLERY MEDIA MANAGEMENT ──────────────────────────────────────────────────

// POST /api/clubs/:id/gallery
router.post("/:id/gallery", verifyToken, async (req, res) => {
  try {
    const clubId = req.params.id;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { url, caption, albumTitle, type } = req.body;
    if (!url) {
      return res.status(400).json({ message: "Image URL is required." });
    }

    const media = await prisma.media.create({
      data: {
        id: crypto.randomBytes(12).toString("hex"),
        clubId,
        url,
        caption: caption || null,
        albumTitle: albumTitle || "General",
        type: type || "IMAGE",
      },
    });

    res.status(201).json({ message: "Media added to gallery", media });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/clubs/:id/gallery/:mediaId
router.delete("/:id/gallery/:mediaId", verifyToken, async (req, res) => {
  try {
    const { id: clubId, mediaId } = req.params;
    const isAuthorized = await verifyClubAdminAccess(req.user, clubId);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied." });
    }

    await prisma.media.delete({
      where: { id: mediaId },
    });

    res.json({ message: "Gallery item deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
