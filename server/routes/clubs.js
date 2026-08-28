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

// ── GET /clubs/leaderboard — ranking based on events, participation & feedback percentage ──

router.get("/leaderboard", async (req, res) => {
  try {
    const cacheKey = "clubs:leaderboard";
    const cachedLeaderboard = getPublicResponse(cacheKey);

    if (cachedLeaderboard) {
      res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
      res.set("X-Public-Cache", "HIT");
      return res.json(cachedLeaderboard);
    }

    // 1. Fetch all clubs
    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        clubName: true,
        slug: true,
        category: true,
        clubLogo: true,
      },
    });

    // 2. Fetch published events with verified attendance & feedback ratings
    const events = await prisma.event.findMany({
      where: { reviewStatus: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        clubId: true,
        createdById: true,
        startTime: true,
        endTime: true,
        registeredCount: true,
        participations: {
          where: { status: "ATTENDED" },
          select: { id: true },
        },
        feedbacks: {
          select: {
            overallRating: true,
            organizationRating: true,
            usefulnessRating: true,
            speakerRating: true,
            venueRating: true,
            timingRating: true,
            attendSimilar: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    const FEEDBACK_WINDOW_MS = 72 * 60 * 60 * 1000;
    const now = new Date();
    const nowMs = now.getTime();

    // 3. Aggregate statistics and calculate balanced points per club
    const stats = {};
    const clubEventsMap = {};

    events.forEach((event) => {
      const clubId = event.clubId || event.createdById;
      if (!clubId) return;

      if (!stats[clubId]) {
        stats[clubId] = {
          eventCount: 0,
          totalVerifiedAttendees: 0,
          totalPoints: 0,
          totalFeedbacks: 0,
          overallRatingSum: 0,
        };
        clubEventsMap[clubId] = [];
      }

      stats[clubId].eventCount += 1;

      // Pillar 1: Event Hosting (+10 points per approved event)
      const eventHostingPoints = 10;

      // Pillar 2: Verified Student Participation (+1 pt per verified attendee, capped at 20 pts per event)
      const verifiedAttendeesCount = Array.isArray(event.participations) && event.participations.length > 0
        ? event.participations.length
        : (event.registeredCount || 0);
      const participationPoints = Math.min(verifiedAttendeesCount, 20);
      stats[clubId].totalVerifiedAttendees += verifiedAttendeesCount;

      // Pillar 3: Feedback Quality Score (+0 to +20 points, requires 72h window closed & min 10 responses)
      const eventEndTime = new Date(event.endTime).getTime();
      const isFeedbackWindowClosed = nowMs >= eventEndTime + FEEDBACK_WINDOW_MS;
      let feedbackQualityPoints = 0;

      const feedbackList = event.feedbacks || [];
      if (isFeedbackWindowClosed && feedbackList.length >= 10) {
        const sum = feedbackList.reduce((acc, f) => acc + (f.overallRating || 0), 0);
        const eventAvgRating = sum / feedbackList.length;
        const satisfactionPct = Math.round((eventAvgRating / 5) * 100);

        if (satisfactionPct >= 90) feedbackQualityPoints = 20;
        else if (satisfactionPct >= 80) feedbackQualityPoints = 15;
        else if (satisfactionPct >= 70) feedbackQualityPoints = 10;
        else if (satisfactionPct >= 60) feedbackQualityPoints = 5;
        else feedbackQualityPoints = 0;

        stats[clubId].totalFeedbacks += feedbackList.length;
        stats[clubId].overallRatingSum += sum;
      } else if (isFeedbackWindowClosed && feedbackList.length > 0) {
        // Track overall rating sum for display/tie-breaker even if under 10 responses
        stats[clubId].totalFeedbacks += feedbackList.length;
        stats[clubId].overallRatingSum += feedbackList.reduce((acc, f) => acc + (f.overallRating || 0), 0);
      }

      // Maximum 50 points per event (10 + 20 + 20)
      const eventTotalPoints = eventHostingPoints + participationPoints + feedbackQualityPoints;
      stats[clubId].totalPoints += eventTotalPoints;

      if (clubEventsMap[clubId].length < 2) {
        const startTime = new Date(event.startTime);
        const endTime = new Date(event.endTime);
        let eventStatus = "UPCOMING";
        if (endTime < now) eventStatus = "ENDED";
        else if (startTime <= now && endTime >= now) eventStatus = "LIVE";

        clubEventsMap[clubId].push({
          _id: event.id,
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          status: eventStatus,
        });
      }
    });

    // 4. Format and rank clubs
    const leaderboard = clubs
      .map((club) => {
        const clubStat = stats[club.id] || {
          eventCount: 0,
          totalVerifiedAttendees: 0,
          totalPoints: 0,
          totalFeedbacks: 0,
          overallRatingSum: 0,
        };

        const eventCount = clubStat.eventCount;
        const participantCount = clubStat.totalVerifiedAttendees;
        const feedbackCount = clubStat.totalFeedbacks;
        const avgRating = feedbackCount > 0 ? clubStat.overallRatingSum / feedbackCount : 0;
        const feedbackPercentage = feedbackCount > 0 ? Math.round((avgRating / 5) * 100) : 0;
        const points = clubStat.totalPoints;

        return {
          _id: club.id,
          id: club.id,
          clubName: club.clubName,
          slug: club.slug,
          category: club.category,
          clubLogo: club.clubLogo,
          eventCount,
          participantCount,
          feedbackCount,
          feedbackPercentage,
          avgRating: Number(avgRating.toFixed(1)),
          points,
          score: points,
          recentEvents: clubEventsMap[club.id] || [],
        };
      })
      .filter((club) => club.eventCount > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.feedbackPercentage !== a.feedbackPercentage) return b.feedbackPercentage - a.feedbackPercentage;
        return b.eventCount - a.eventCount;
      })
      .map((club, index) => ({
        ...club,
        rank: index + 1,
      }))
      .slice(0, 10);

    // Cache leaderboard for 5 minutes (300,000 ms) for maximum server throughput
    setPublicResponse(cacheKey, leaderboard, 300_000);
    res.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.set("X-Public-Cache", "MISS");
    res.json(leaderboard);
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
