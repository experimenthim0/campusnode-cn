import express from "express";
import jwt from "jsonwebtoken";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS, hasPermission } from "../utils/rbac.js";
import { slugifyUnique } from "../utils/slugifyUnique.js";
import prisma from "../lib/prisma.js";
import { serializeEvent, serializeParticipation } from "../utils/postgresEventSerializer.js";
import { createObjectId } from "../utils/objectId.js";
import { z } from "zod";
import { validate, objectIdSchema } from "../middleware/validate.js";
import multer from "multer";
import crypto from "crypto";
import { uploadImage } from "../utils/cloudinary.js";
import { getPublicResponse, setPublicResponse, invalidatePublicResponses } from "../utils/publicResponseCache.js";
import { validateBooking, checkEventConflict } from "../services/conflictService.js";
import { signTicket } from "../services/qrSigningService.js";
import { calculateAcademicProgress, isStudentEligibleForEventYears } from "../utils/academicProgress.js";
import { validateCustomFields } from "../utils/customFields.js";
import { generateEventSocialHtml, generateDefaultSocialHtml } from "../utils/eventSocialMetadata.js";
import { MAX_WAITLIST_CAPACITY, promoteWaitlistCandidates, notifyWaitlistCleared } from "../services/waitlistService.js";

const router = express.Router();

// Older registrations may predate signed QR payloads. Repair them when they
// are read so every ticket returned to the web app or scanner is usable and
// the generated payload is persisted for future requests.
const ensureParticipationTicket = async (participation) => {
  if (participation?.qrCode && participation?.qrPayload) return participation;

  const ticketId = participation?.qrCode || crypto.randomBytes(12).toString("base64url");
  const signed = signTicket(participation.eventId, ticketId);
  const updated = await prisma.participation.update({
    where: { id: participation.id },
    data: {
      qrCode: ticketId,
      qrPayload: signed.qrPayload,
      qrVersion: signed.qrVersion,
      qrKeyId: signed.qrKeyId,
    },
  });

  return { ...participation, ...updated };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, png, webp, gif) are allowed."), false);
    }
  },
});

// POST /api/events/upload - Handle image upload for event poster
router.post("/upload", verifyToken, requirePermission(PERMISSIONS.EVENT_CREATE), upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { title, slug, eventId } = req.body || {};
    let publicId = undefined;
    if (slug) {
      publicId = `poster-${slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    } else if (title) {
      const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45);
      publicId = `poster-${cleanTitle}-${Date.now()}`;
    } else if (eventId) {
      publicId = `poster-event-${eventId}`;
    }

    const uploadOptions = {
      folder: "event-posters",
      unique_filename: publicId ? false : true,
      overwrite: true,
    };
    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await uploadImage(req.file.buffer, "event-posters", uploadOptions);
    res.json({
      secure_url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error("Upload Route Error:", error);
    res.status(500).json({ message: "Upload failed.", error: error.message });
  }
});

async function checkEventAccess(req, eventOrClubId, requiredPermission = null) {
  const user = req.user;
  if (!user) return false;

  const userId = user.userId || user.id || user.studentId || user._id;
  const userRole = user.role;
  const principalType = user.principalType;

  if (userRole === "admin" || userRole === "SUPER_ADMIN" || principalType === "ADMIN") return true;

  let event = null;
  let clubIds = [];

  if (typeof eventOrClubId === "object" && eventOrClubId !== null) {
    event = eventOrClubId;
    if (event.organizers) {
      clubIds = event.organizers.map(o => o.clubId);
    } else if (event.id) {
      const orgs = await prisma.eventOrganizer.findMany({ where: { eventId: event.id }, select: { clubId: true } });
      clubIds = orgs.map(o => o.clubId);
    }
  } else if (typeof eventOrClubId === "string") {
    event = await prisma.event.findUnique({
      where: { id: eventOrClubId },
      select: { id: true, createdById: true, organizers: { select: { clubId: true } } }
    });
    if (event) {
      clubIds = event.organizers.map(o => o.clubId);
    } else {
      clubIds = [eventOrClubId];
    }
  }

  if (event?.createdById && userId && String(event.createdById) === String(userId)) return true;

  if (clubIds.length > 0) {
    if ((userRole === "facultyCoordinator" || userRole === "faculty") && clubIds.some(cid => String(user.clubId) === String(cid))) {
      return true;
    }

    if (userId) {
      const memberships = await prisma.clubMembership.findMany({
        where: {
          clubId: { in: clubIds },
          studentId: userId,
          status: { not: "INACTIVE" }
        }
      });
      for (const membership of memberships) {
        if (membership.role === "CLUB_HEAD" || membership.role === "COORDINATOR") return true;
        if (requiredPermission && membership[requiredPermission]) return true;
        if (membership.canTakeAttendance || membership.canEditEvents) return true;
      }
    }
  }

  return false;
}

const eventSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().optional().nullable(),
    venue: z.string().optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    totalSeats: z.coerce.number().int().optional(),
    entryFee: z.coerce.number().optional(),
    imageUrl: z.string().url().optional().nullable().or(z.literal("")),
    requiredFields: z.array(z.string()).optional(),
    allowedPrograms: z.array(z.string()).optional(),
    allowedYears: z.array(z.union([z.string(), z.number()])).optional(),
    allowedBranches: z.array(z.string()).optional(),
    registrationDeadline: z.coerce.date().optional().nullable(),
    registrationType: z.enum(['individual', 'team', 'both', 'none']).optional().default('individual'),
    minTeamSize: z.coerce.number().int().min(1).optional().default(1),
    maxTeamSize: z.coerce.number().int().min(1).optional().default(1),
    winners: z.array(z.any()).optional(),
    showWinner: z.boolean().optional(),
    provideCertificate: z.boolean().optional(),
    feedbackEnabled: z.boolean().optional().default(true),
    allowWaitlist: z.boolean().optional().default(true),
    certificateTemplate: z.any().optional(),
    registrationFee: z.coerce.number().optional().default(0),
    paymentInstructions: z.string().optional().nullable(),
    collegePaymentUrl: z.string().optional().nullable().or(z.literal("")),
    postRegistrationMessage: z.string().optional().nullable(),
    accountHolderName: z.string().optional().nullable(),
    reviewStatus: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED']).optional(),
    isDraft: z.boolean().optional(),
    clubIds: z.array(z.string()).optional(),
    clubId: z.string().optional(),
    sponsors: z.array(z.object({
      name: z.string().min(1),
      logoUrl: z.string().url(),
      websiteUrl: z.string().url().optional().nullable().or(z.literal("")),
    })).optional(),
    media: z.array(z.object({
      url: z.string().url(),
      type: z.enum(['IMAGE', 'VIDEO', 'SPONSOR_LOGO']),
    })).optional(),
  }).passthrough(),
  query: z.object({}).passthrough().optional(),
  params: z.object({}).passthrough().optional(),
});

const eventUpdateSchema = z.object({
  body: eventSchema.shape.body.partial().passthrough(),
  query: z.object({}).passthrough().optional(),
  params: z.object({}).passthrough().optional(),
});

// createdBy comes from StudentUser
const eventInclude = {
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  reviewedBy: {
    select: { id: true, name: true },
  },
  organizers: {
    include: {
      club: {
        select: { id: true, clubName: true, clubLogo: true, slug: true, category: true, socialLinks: true },
      },
    },
  },
  sponsors: true,
  media: true,
  _count: {
    select: {
      participations: {
        where: {
          status: { in: ["REGISTERED", "ATTENDED"] },
        },
      },
    },
  },
};

const publicEventSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  venue: true,
  startTime: true,
  endTime: true,
  totalSeats: true,
  registrationFee: true,
  allowExternal: true,
  allowedPrograms: true,
  allowedYears: true,
  allowedBranches: true,
  imageUrl: true,
  registeredCount: true,
  views: true,
  waitingListIds: true,
  requiredFields: true,
  createdById: true,
  registrationDeadline: true,
  reviewStatus: true,
  winners: true,
  showWinner: true,
  provideCertificate: true,
  registrationType: true,
  minTeamSize: true,
  maxTeamSize: true,
  collegePaymentUrl: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      participations: {
        where: {
          status: { in: ["REGISTERED", "ATTENDED"] },
        },
      },
    },
  },
  createdBy: {
    select: { id: true, name: true },
  },
  organizers: {
    include: {
      club: {
        select: { id: true, clubName: true, clubLogo: true, slug: true, category: true },
      },
    },
  },
  sponsors: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  },
};
// Decode token without middleware — for optional auth on event detail endpoint
const getDecodedToken = (req) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader) || req.cookies?.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

const getEventByIdOrSlug = async (id) =>
  prisma.event.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: eventInclude,
  });


router.get("/", async (req, res) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10)
    const requestedLimit = Number.parseInt(req.query.limit, 10)
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 50
    const skip = (page - 1) * limit;
    const cacheKey = "events:public:" + page + ":" + limit;
    const cachedEvents = await getPublicResponse(cacheKey);

    if (cachedEvents) {
      res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
      res.set("X-Public-Cache", "HIT");
      return res.json(cachedEvents);
    }

    const events = await prisma.event.findMany({
      where: { reviewStatus: "PUBLISHED" },
      select: publicEventSelect,
      orderBy: { startTime: "asc" },
      skip,
      take: limit,
    });

    const response = events.map(serializeEvent);
    await setPublicResponse(cacheKey, response, 60_000);
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
    res.set("X-Public-Cache", "MISS");
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


const clubIdParamSchema = z.object({
  params: z.object({ clubId: objectIdSchema }).passthrough(),
  body: z.any().optional(),
  query: z.any().optional(),
});

router.get("/club/:clubId", validate(clubIdParamSchema), async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        organizers: { some: { clubId: req.params.clubId } },
        reviewStatus: "PUBLISHED",
      },
      include: eventInclude,
      orderBy: { startTime: "asc" },
    });
    res.json(events.map(serializeEvent));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /events/calendar — Admin date-range query for Calendar & Venue Timeline ─
router.get("/calendar", verifyToken, requirePermission(PERMISSIONS.EVENT_VIEW), async (req, res) => {
  try {
    const { start, end, venue, clubId, reviewStatus, category } = req.query;

    const where = {};

    if (start && end) {
      const sDate = new Date(start);
      const eDate = new Date(end);
      where.OR = [
        {
          startTime: {
            gte: sDate,
            lte: eDate,
          },
        },
        {
          AND: [
            { startTime: { lte: eDate } },
            { endTime: { gte: sDate } },
          ],
        },
      ];
    }

    // Venue filter (supports comma-separated multi-select)
    if (venue && venue !== "all") {
      const venueList = venue.split(",").map(v => v.trim()).filter(Boolean);
      if (venueList.length === 1) {
        where.venue = venueList[0];
      } else if (venueList.length > 1) {
        where.venue = { in: venueList };
      }
    }

    if (clubId && clubId !== "all") {
      where.organizers = { some: { clubId } };
    }

    const isAdminOrFC = req.user.role === "admin" || req.user.role === "facultyCoordinator";
    if (reviewStatus && reviewStatus !== "all") {
      where.reviewStatus = reviewStatus;
    } else if (!isAdminOrFC) {
      where.reviewStatus = "PUBLISHED";
    } else {
      where.reviewStatus = { not: "DRAFT" };
    }

    // Role scoping: if faculty coordinator, scope to assigned club if not admin
    if (req.user.role === "facultyCoordinator" && req.user.clubId) {
      where.organizers = { some: { clubId: req.user.clubId } };
    }

    if (category && category !== "all") {
      where.organizers = { some: { club: { category } } };
    }

    const events = await prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { startTime: "asc" },
    });

    // Also fetch venue blackouts for the date range
    const blackoutWhere = {};
    if (start && end) {
      blackoutWhere.startTime = { lt: new Date(end) };
      blackoutWhere.endTime = { gt: new Date(start) };
    }
    if (where.venue) {
      blackoutWhere.venue = where.venue;
    }

    let blackouts = [];
    try {
      if (prisma.venueBlackout) {
        blackouts = await prisma.venueBlackout.findMany({
          where: blackoutWhere,
          orderBy: { startTime: "asc" }
        });
      }
    } catch {
      blackouts = [];
    }

    res.json({
      events: events.map(serializeEvent),
      blackouts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/conflicts", verifyToken, requirePermission(PERMISSIONS.EVENT_VIEW), async (req, res) => {
  try {
    const publishedEvents = await prisma.event.findMany({
      where: { reviewStatus: "PUBLISHED" },
      include: {
        organizers: {
          include: { club: { select: { id: true, clubName: true } } },
        },
      },
      orderBy: { startTime: "asc" }
    });

    let blackouts = [];
    try {
      if (prisma.venueBlackout) {
        blackouts = await prisma.venueBlackout.findMany({ orderBy: { startTime: "asc" } });
      }
    } catch {
      blackouts = [];
    }

    const issues = [];

    for (let i = 0; i < publishedEvents.length; i++) {
      for (let j = i + 1; j < publishedEvents.length; j++) {
        const e1 = publishedEvents[i];
        const e2 = publishedEvents[j];

        if (e1.venue === e2.venue) {
          const s1 = new Date(e1.startTime);
          const e1End = new Date(e1.endTime);
          const s2 = new Date(e2.startTime);
          const e2End = new Date(e2.endTime);

          if (s1 < e2End && e1End > s2) {
            const e1Club = e1.organizers?.[0]?.club?.clubName;
            const e2Club = e2.organizers?.[0]?.club?.clubName;
            issues.push({
              id: `conflict-${e1.id}-${e2.id}`,
              type: "Venue Conflict",
              severity: "HIGH",
              venue: e1.venue,
              event1: { id: e1.id, title: e1.title, clubName: e1Club, startTime: e1.startTime, endTime: e1.endTime },
              event2: { id: e2.id, title: e2.title, clubName: e2Club, startTime: e2.startTime, endTime: e2.endTime },
              message: `Venue "${e1.venue}" is double-booked between "${e1.title}" and "${e2.title}".`
            });
          }
        }
      }
    }

    for (const e of publishedEvents) {
      for (const b of blackouts) {
        if (e.venue === b.venue) {
          const s1 = new Date(e.startTime);
          const e1End = new Date(e.endTime);
          const s2 = new Date(b.startTime);
          const bEnd = new Date(b.endTime);

          if (s1 < bEnd && e1End > s2) {
            issues.push({
              id: `blackout-${e.id}-${b.id}`,
              type: "Blackout Conflict",
              severity: "CRITICAL",
              venue: e.venue,
              event: { id: e.id, title: e.title, clubName: e.club?.clubName, startTime: e.startTime, endTime: e.endTime },
              blackout: { id: b.id, title: b.title, reason: b.reason, startTime: b.startTime, endTime: b.endTime },
              message: `Event "${e.title}" overlaps with blackout window "${b.title}" in ${e.venue}.`
            });
          }
        }
      }
    }

    for (const e of publishedEvents) {
      if (e.totalSeats > 0 && e.registeredCount >= e.totalSeats) {
        issues.push({
          id: `capacity-${e.id}`,
          type: "Capacity Warning",
          severity: "MEDIUM",
          venue: e.venue,
          event: { id: e.id, title: e.title, clubName: e.club?.clubName, registeredCount: e.registeredCount, totalSeats: e.totalSeats },
          message: `Event "${e.title}" has reached maximum seat capacity (${e.registeredCount}/${e.totalSeats}).`
        });
      }
    }

    res.json({
      totalIssues: issues.length,
      issues
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/reschedule", verifyToken, requirePermission(PERMISSIONS.EVENT_UPDATE), async (req, res) => {
  try {
    const { startTime, endTime, venue } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "Start time and end time are required for rescheduling." });
    }

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: eventInclude
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    if (req.user.role !== "admin" && event.createdById !== req.user.userId) {
      const eventClubIds = (event.organizers || []).map(o => o.clubId);
      if (req.user.role === "facultyCoordinator" && !eventClubIds.includes(req.user.clubId)) {
        return res.status(403).json({ message: "You can only reschedule events for your assigned club." });
      }
    }

    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);
    const newVenue = venue || event.venue;

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    if (newStart >= newEnd) {
      return res.status(400).json({ message: "Start time must be before end time." });
    }

    // Run authoritative booking validation
    const validation = await validateBooking({
      venue: newVenue,
      startTime: newStart,
      endTime: newEnd,
      excludeEventId: req.params.id
    });

    if (validation.hasConflict) {
      return res.status(409).json({
        message: validation.message || "Selected venue/time conflicts with another booking or blackout.",
        conflict: validation
      });
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        startTime: newStart,
        endTime: newEnd,
        venue: newVenue
      },
      include: eventInclude
    });

    // Notify creator if admin rescheduled their event
    if (event.createdById && event.createdById !== req.user.userId) {
      try {
        const notifTitle = `Event Rescheduled: ${event.title}`;
        const notifMsg = `Your event "${event.title}" has been rescheduled to ${newStart.toLocaleDateString()} ${newStart.toLocaleTimeString()} at ${newVenue}.`;

        await prisma.notification.create({
          data: {
            id: createObjectId(),
            recipientStudentId: event.createdById,
            recipientUserId: event.createdById,
            senderAdminId: req.user.role === "admin" ? req.user.userId : null,
            targetScope: "USER",
            type: "EVENT_RESCHEDULED",
            eventId: event.id,
            title: notifTitle,
            message: notifMsg
          }
        });

        if (req.io) {
          req.io.to(event.createdById).emit("new-notification", {
            title: notifTitle,
            message: notifMsg,
            eventId: event.id
          });
        }
      } catch (notifErr) {
        console.error("Failed to send reschedule notification:", notifErr.message);
      }
    }

    res.json({
      message: "Event rescheduled successfully",
      event: serializeEvent(updated)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get(
  "/club-co/:id",
  verifyToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.user.userId !== req.params.id) {
        return res.status(403).json({ message: "Access denied." });
      }

      const events = await prisma.event.findMany({
        where: { createdById: req.params.id },
        include: eventInclude,
        orderBy: { startTime: "asc" },
      });
      res.json(events.map(serializeEvent));
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);


router.get(
  "/club-manage/:clubId",
  verifyToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const events = await prisma.event.findMany({
        where: {
          organizers: { some: { clubId } },
        },
        include: eventInclude,
        orderBy: { startTime: "desc" },
      });
      res.json(events.map(serializeEvent));
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


router.get(
  "/club-manage/:clubId/export",
  verifyToken,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const events = await prisma.event.findMany({
        where: {
          organizers: { some: { clubId } },
        },
        include: {
          organizers: {
            include: {
              club: { select: { clubName: true } },
            },
          },
          participations: true,
        },
        orderBy: { startTime: "desc" },
      });

      const exportData = events.map((e) => {
        const regCount = e.participations ? e.participations.filter(p => p.status === 'REGISTERED' || p.status === 'ATTENDED').length : 0;
        const fee = e.registrationFee || 0;
        const totalAmt = fee * (e.participations ? e.participations.filter(p => p.paymentStatus === 'SUCCESS').length : 0);
        return {
          eventName: e.title || e.eventName || "",
          clubName: e.organizers?.[0]?.club?.clubName || "",
          totalRegistrations: regCount,
          eventDate: e.startTime,
          totalAmountReceived: totalAmt,
        };
      });

      res.json({ events: exportData });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


router.get(
  "/user/:userId",
  verifyToken,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { userId: authUserId, userType, role, email: authEmail } = req.user;

      if (authUserId !== userId && authEmail !== userId && role !== "admin" && role !== "facultyCoordinator" && role !== "club") {
        return res.status(403).json({ message: "Access denied." });
      }

      const isExternal = userType === "external" || role === "external" || req.user.principalType === "EXTERNAL";

      const participations = await prisma.participation.findMany({
        where: isExternal
          ? {
            OR: [
              { externalUserId: userId },
              { externalUserId: authUserId },
              { studentId: userId },
            ],
          }
          : { studentId: userId },
        select: {
          id: true,
          eventId: true,
          studentId: true,
          externalUserId: true,
          status: true,
          qrCode: true,
          qrVersion: true,
          qrPayload: true,
          qrKeyId: true,
          attendedAt: true,
          paymentStatus: true,
          paymentTimestamp: true,
          transactionId: true,
          payerName: true,
          paymentRemarks: true,
          paymentReviewedBy: true,
          paymentReviewedAt: true,
          paymentReviewMessage: true,
          formResponses: true,
          createdAt: true,
          event: {
            select: {
              ...publicEventSelect,
              customFields: true,
              postRegistrationMessage: true,
              paymentInstructions: true,
              collegePaymentUrl: true,
              accountHolderName: true,
              certificateTemplate: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              rollNo: true,
              profileImage: true,
              branch: true,
              program: true,
              expectedGraduationYear: true,
            },
          },
          externalUser: {
            select: {
              id: true,
              name: true,
              email: true,
              collegeName: true,
              profileImage: true,
              phone: true,
              program: true,
            },
          },
          team: {
            select: {
              id: true,
              teamName: true,
              leaderStudentId: true,
              leaderStudent: { select: { id: true, name: true, email: true, rollNo: true } },
              members: {
                select: {
                  id: true,
                  studentId: true,
                  student: { select: { id: true, name: true, email: true, rollNo: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!isExternal) {
        const registeredEventIds = new Set(participations.map((p) => p.eventId));
        const studentInfo = await prisma.studentUser.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            rollNo: true,
            profileImage: true,
            branch: true,
            program: true,
            expectedGraduationYear: true,
          },
        });
        if (studentInfo) {
          const eventsWithWinners = await prisma.event.findMany({
            where: {
              winners: { not: null },
              id: { notIn: Array.from(registeredEventIds) },
            },
            select: {
              ...publicEventSelect,
              customFields: true,
              postRegistrationMessage: true,
              paymentInstructions: true,
              collegePaymentUrl: true,
              accountHolderName: true,
              certificateTemplate: true,
            },
          });
          for (const ev of eventsWithWinners) {
            if (Array.isArray(ev.winners) && ev.winners.length > 0) {
              const isWinner = ev.winners.some((w) =>
                (w.studentId && String(w.studentId) === String(studentInfo.id)) ||
                (w.rollNo && studentInfo.rollNo && String(w.rollNo).trim().toLowerCase() === studentInfo.rollNo.trim().toLowerCase()) ||
                (w.email && studentInfo.email && String(w.email).trim().toLowerCase() === studentInfo.email.trim().toLowerCase()) ||
                (w.name && studentInfo.name && String(w.name).toLowerCase().includes(studentInfo.name.toLowerCase()))
              );
              if (isWinner) {
                participations.push({
                  id: `win_${ev.id}_${studentInfo.id}`,
                  eventId: ev.id,
                  studentId: studentInfo.id,
                  status: "ATTENDED",
                  paymentStatus: "SUCCESS",
                  createdAt: ev.createdAt,
                  updatedAt: ev.updatedAt,
                  event: ev,
                  student: studentInfo,
                });
              }
            }
          }
        }
      }

      const hydratedParticipations = await Promise.all(
        participations.map((participation) => ensureParticipationTicket(participation)),
      );

      res.json(
        hydratedParticipations.map((p) => {
          const serialized = serializeParticipation({
            ...p,
          });
          return {
            ...serialized,
            // Frontend compatibility: eventId is often treated as the object
            eventId: serialized.event,
          };
        }),
      );
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);


router.post("/", verifyToken, requirePermission(PERMISSIONS.EVENT_CREATE), validate(eventSchema), async (req, res) => {
  try {
    const {
      title,
      description,
      venue,
      startTime,
      endTime,
      totalSeats,
      entryFee,
      imageUrl,
      requiredFields,
      customFields,
      allowedPrograms,
      allowedYears,
      allowedBranches,
      registrationDeadline,
      registrationType,
      minTeamSize,
      maxTeamSize,
      sponsors,
      media,
      showWinner,
      provideCertificate,
      feedbackEnabled,
      allowWaitlist,
      paymentMethod,
      registrationFee,
      paymentInstructions,
      collegePaymentUrl,
      upiId,
      accountHolderName,
      postRegistrationMessage,
    } = req.body;

    let targetClubIds = [];
    if (Array.isArray(req.body.clubIds) && req.body.clubIds.length > 0) {
      targetClubIds = req.body.clubIds;
    } else if (req.body.clubId) {
      targetClubIds = [req.body.clubId];
    } else if (req.user.clubId) {
      targetClubIds = [req.user.clubId];
    }

    if (targetClubIds.length === 0 && req.user.role !== "admin") {
      return res.status(400).json({ message: "At least one club ID is required." });
    }

    const clubs = await prisma.club.findMany({ where: { id: { in: targetClubIds } } });
    if (clubs.length !== targetClubIds.length && req.user.role !== "admin") {
      return res.status(404).json({ message: "One or more clubs not found." });
    }

    const isDraft = req.body.reviewStatus === "DRAFT" || req.body.isDraft === true;
    if (!isDraft) {
      if (!startTime || !endTime) {
        return res.status(400).json({ message: "Start time and end time are required." });
      }
      if (!venue || !venue.trim()) {
        return res.status(400).json({ message: "Venue is required." });
      }
    }

    const start = startTime ? new Date(startTime) : new Date(Date.now() + 86400000);
    const end = endTime ? new Date(endTime) : new Date(Date.now() + 86400000 + 7200000);
    const targetVenue = venue?.trim() || "TBD";

    if (!isDraft && targetVenue !== "TBD") {
      const bookingValidation = await validateBooking({ venue: targetVenue, startTime: start, endTime: end });
      if (bookingValidation.hasConflict) {
        return res.status(409).json({
          message: bookingValidation.message || "Venue is already booked.",
          conflict: bookingValidation
        });
      }
    }

    const isStudentCreator = req.user.principalType === "STUDENT" || req.user.userType === "student";
    let effectiveUpiId = typeof upiId === 'string' && upiId.trim() ? upiId.trim() : null;
    let effectiveCollegeUrl = typeof collegePaymentUrl === 'string' && collegePaymentUrl.trim() ? collegePaymentUrl.trim() : null;

    if (req.body.paymentMethod === 'COLLEGE_PAYMENT') {
      effectiveUpiId = null;
    } else if (req.body.paymentMethod === 'MANUAL_TRANSACTION') {
      effectiveCollegeUrl = null;
    } else if (req.body.paymentMethod === 'FREE') {
      effectiveUpiId = null;
      effectiveCollegeUrl = null;
    } else if (effectiveCollegeUrl && effectiveCollegeUrl.includes('@') && !effectiveCollegeUrl.startsWith('http')) {
      if (!effectiveUpiId) effectiveUpiId = effectiveCollegeUrl;
    }

    let finalPaymentInstructions = typeof paymentInstructions === 'string' ? paymentInstructions.trim() : '';
    if (req.body.paymentMethod === 'COLLEGE_PAYMENT' && finalPaymentInstructions) {
      finalPaymentInstructions = finalPaymentInstructions
        .split('\n')
        .filter(l => !l.trim().toLowerCase().startsWith('upi id:'))
        .join('\n')
        .trim();
    } else if (effectiveUpiId && (!finalPaymentInstructions || !finalPaymentInstructions.includes(effectiveUpiId))) {
      finalPaymentInstructions = finalPaymentInstructions
        ? `${finalPaymentInstructions}\nUPI ID: ${effectiveUpiId}`
        : `UPI ID: ${effectiveUpiId}`;
    }

    const savedEvent = await prisma.event.create({
      data: {
        id: createObjectId(),
        title,
        description: description || "",
        venue: targetVenue,
        startTime: start,
        endTime: end,
        totalSeats: totalSeats || 0,
        registrationFee: Number(registrationFee || entryFee || 0),
        imageUrl: imageUrl || "",
        requiredFields: requiredFields || [],
        customFields: customFields || [],
        createdById: studentUserRecord?.id || null,
        allowedPrograms: allowedPrograms || ["BTECH", "MTECH", "OTHER"],
        allowedYears: allowedYears || [],
        allowedBranches: allowedBranches || [],
        allowExternal: req.body.allowExternal !== undefined ? Boolean(req.body.allowExternal) : true,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        registrationType: registrationType || "individual",
        minTeamSize: minTeamSize !== undefined ? Number(minTeamSize) : 1,
        maxTeamSize: maxTeamSize !== undefined ? Number(maxTeamSize) : 1,
        showWinner: showWinner || false,
        provideCertificate: provideCertificate || false,
        feedbackEnabled: feedbackEnabled !== undefined ? Boolean(feedbackEnabled) : true,
        allowWaitlist: allowWaitlist !== undefined ? Boolean(allowWaitlist) : true,
        paymentInstructions: finalPaymentInstructions || null,
        collegePaymentUrl: effectiveCollegeUrl?.startsWith('http') ? effectiveCollegeUrl : (effectiveCollegeUrl && !effectiveCollegeUrl.includes('@') ? effectiveCollegeUrl : null),
        accountHolderName: accountHolderName || null,
        postRegistrationMessage: postRegistrationMessage || null,
        slug: await slugifyUnique(title, 'event', 'slug'),
        reviewStatus: isDraft ? "DRAFT" : "PENDING",
        organizers: {
          createMany: {
            data: targetClubIds.map(clubId => ({
              id: createObjectId(),
              clubId,
            })),
          },
        },
        sponsors: { createMany: { data: (sponsors || []).map(s => ({ id: createObjectId(), ...s })) } },
        media: { createMany: { data: (media || []).map(m => ({ id: createObjectId(), ...m })) } },
      },
      include: eventInclude,
    });

    if (!isDraft) {
      invalidatePublicResponses(["events:public:*"]);
    }

    // Notify supervised Faculty Coordinator of incoming event review request ONLY if PENDING
    if (!isDraft && targetClubIds.length > 0) {
      try {
        const clubsWithFC = await prisma.club.findMany({
          where: { id: { in: targetClubIds }, facultyCoordinatorId: { not: null } },
          select: { id: true, facultyCoordinatorId: true, clubName: true },
        });
        for (const club of clubsWithFC) {
          if (club.facultyCoordinatorId) {
            const notif = await prisma.notification.create({
              data: {
                id: createObjectId(),
                targetScope: "FACULTY_COORDINATOR",
                clubId: club.id,
                recipientUserId: club.facultyCoordinatorId,
                eventId: savedEvent.id,
                type: "EVENT_REVIEW_REQUEST",
                title: `New Event Pending Approval: ${savedEvent.title}`,
                message: `${club.clubName || "A club"} has submitted "${savedEvent.title}" for faculty review and approval.`,
              },
            });
            if (req.io) {
              req.io.to(club.facultyCoordinatorId).emit("new-notification", {
                ...notif,
                _id: notif.id,
                sender: { name: club.clubName || "Club" },
              });
            }
          }
        }
      } catch (fErr) {
        console.error("Failed to notify faculty coordinator of new event:", fErr.message);
      }
    }

    res.status(201).json(serializeEvent(savedEvent));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


router.put(
  "/:id/review",
  verifyToken,
  requirePermission(PERMISSIONS.EVENT_APPROVE),
  async (req, res) => {
    try {
      const { status, comment } = req.body;
      if (!["PUBLISHED", "REJECTED"].includes(status)) {
        return res.status(400).json({ message: "Invalid review status." });
      }

      const event = await prisma.event.findUnique({
        where: { id: req.params.id },
        include: { organizers: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const eventClubIds = event.organizers.map(o => o.clubId);
      if (req.user.role !== "admin" && (!req.user.clubId || !eventClubIds.includes(req.user.clubId))) {
        return res.status(403).json({
          message: "You can only review events for your assigned club.",
        });
      }

      const updated = await prisma.event.update({
        where: { id: req.params.id },
        data: {
          reviewStatus: status,
          reviewComment: comment,
          reviewedById: req.user.userId,
        },
        include: eventInclude,
      });

      if (updated.createdById) {
        try {
          const primaryClubId = updated.organizers?.[0]?.clubId || null;
          const notif = await prisma.notification.create({
            data: {
              id: createObjectId(),
              targetScope: "USER",
              recipientStudentId: updated.createdById,
              recipientUserId: updated.createdById,
              senderAdminId: req.user.userId,
              eventId: updated.id,
              clubId: primaryClubId,
              type: "EVENT_REVIEW_RESULT",
              title: `Event ${status === "PUBLISHED" ? "Approved" : "Rejected"}: ${updated.title}`,
              message: status === "PUBLISHED"
                ? `Your event "${updated.title}" has been reviewed and published!`
                : `Your event "${updated.title}" was not approved.${comment ? ` Reason: ${comment}` : ""}`,
            },
          });
          if (req.io) {
            req.io.to(updated.createdById).emit("new-notification", {
              ...notif,
              _id: notif.id,
              sender: { name: req.user.name || "Faculty Coordinator" },
            });
          }
        } catch (revNotifErr) {
          console.error("Failed to notify event creator of review result:", revNotifErr.message);
        }
      }

      res.json({
        message: `Event ${status.toLowerCase()} successfully`,
        event: serializeEvent(updated),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  "/:id/submit",
  verifyToken,
  requirePermission(PERMISSIONS.EVENT_UPDATE),
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: req.params.id },
        include: { organizers: { include: { club: true } } },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const isAuthorized = hasPermission(req.user, PERMISSIONS.EVENT_UPDATE, event);
      if (!isAuthorized) {
        return res.status(403).json({ message: "Unauthorized to submit this event." });
      }

      if (event.reviewStatus === "PUBLISHED") {
        return res.status(400).json({ message: "Event is already published." });
      }
      if (event.reviewStatus === "PENDING") {
        return res.status(400).json({ message: "Event is already submitted and pending review." });
      }

      // Authoritative completeness validation
      const errors = [];
      if (!event.title || event.title.trim().length < 3) {
        errors.push("Event title must be at least 3 characters.");
      }
      if (!event.description || event.description.trim().length < 10) {
        errors.push("Event description is required (minimum 10 characters).");
      }
      if (!event.venue || event.venue.trim() === "" || event.venue.trim() === "TBD") {
        errors.push("Valid event venue is required.");
      }
      if (!event.startTime || isNaN(new Date(event.startTime).getTime())) {
        errors.push("Valid start time is required.");
      }
      if (!event.endTime || isNaN(new Date(event.endTime).getTime())) {
        errors.push("Valid end time is required.");
      }
      if (event.startTime && event.endTime && new Date(event.startTime) >= new Date(event.endTime)) {
        errors.push("End time must be after start time.");
      }
      if (event.registrationDeadline && new Date(event.registrationDeadline) > new Date(event.startTime)) {
        errors.push("Registration deadline must be before or on event start time.");
      }
      if (event.registrationType === "team" || event.registrationType === "both") {
        if (event.minTeamSize > event.maxTeamSize) {
          errors.push("Minimum team size cannot exceed maximum team size.");
        }
      }

      if (errors.length > 0) {
        return res.status(422).json({
          message: "Event cannot be submitted because required fields are incomplete or invalid.",
          errors,
        });
      }

      // Check venue conflicts
      const bookingValidation = await validateBooking({
        venue: event.venue,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        excludeEventId: event.id,
      });

      if (bookingValidation.hasConflict) {
        return res.status(409).json({
          message: bookingValidation.message || "Venue is already booked for the selected time.",
          conflict: bookingValidation,
        });
      }

      const canDirectPublish =
        req.user.role === "admin" ||
        hasPermission(req.user, PERMISSIONS.EVENT_PUBLISH, event);
      const shouldDirectPublish = Boolean(req.body.directPublish && canDirectPublish);
      const targetStatus = shouldDirectPublish ? "PUBLISHED" : "PENDING";

      const updated = await prisma.event.update({
        where: { id: event.id },
        data: {
          reviewStatus: targetStatus,
          reviewComment: null,
          reviewedById: shouldDirectPublish ? req.user.userId : null,
        },
        include: eventInclude,
      });

      if (targetStatus === "PUBLISHED") {
        invalidatePublicResponses(["events:public:*"]);
      } else if (targetStatus === "PENDING" && updated.organizers?.length > 0) {
        try {
          const clubIds = updated.organizers.map(o => o.clubId);
          const clubsWithFC = await prisma.club.findMany({
            where: { id: { in: clubIds }, facultyCoordinatorId: { not: null } },
            select: { id: true, facultyCoordinatorId: true, clubName: true },
          });
          for (const club of clubsWithFC) {
            if (club.facultyCoordinatorId) {
              const notif = await prisma.notification.create({
                data: {
                  id: createObjectId(),
                  targetScope: "FACULTY_COORDINATOR",
                  clubId: club.id,
                  recipientUserId: club.facultyCoordinatorId,
                  eventId: updated.id,
                  type: "EVENT_REVIEW_REQUEST",
                  title: `New Event Pending Approval: ${updated.title}`,
                  message: `${club.clubName || "A club"} has submitted "${updated.title}" for faculty review and approval.`,
                },
              });
              if (req.io) {
                req.io.to(club.facultyCoordinatorId).emit("new-notification", {
                  ...notif,
                  _id: notif.id,
                  sender: { name: club.clubName || "Club" },
                });
              }
            }
          }
        } catch (notifErr) {
          console.error("Failed to notify faculty coordinator on submission:", notifErr.message);
        }
      }

      res.json({
        message:
          targetStatus === "PUBLISHED"
            ? "Event published successfully."
            : "Event submitted for faculty approval successfully.",
        event: serializeEvent(updated),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);


// ── GET /api/events/:id/preview — dynamic Open Graph & social crawler preview ──
router.get("/:id/preview", async (req, res) => {
  try {
    const host = req.headers.host;
    const clientOrigin = process.env.CLIENT_URL || "https://campusnode.in";
    const event = await getEventByIdOrSlug(req.params.id);

    if (!event || event.reviewStatus !== "PUBLISHED") {
      // For 404 or unapproved/draft events, return clean fallback metadata to prevent data leaks
      const fallbackHtml = generateDefaultSocialHtml({
        host,
        canonicalDomain: clientOrigin,
        message: event ? "This event is currently under review." : undefined,
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
      return res.status(200).send(fallbackHtml);
    }

    const html = generateEventSocialHtml(event, {
      host,
      canonicalDomain: clientOrigin,
      slug: req.params.id,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (err) {
    console.error("Preview generation error:", err);
    const fallbackHtml = generateDefaultSocialHtml({
      host: req.headers.host,
      canonicalDomain: process.env.CLIENT_URL || "https://campusnode.in",
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(fallbackHtml);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const eventIdOrSlug = req.params.id;
    const cacheKey = `events:detail:${eventIdOrSlug}`;
    const isAnonymous = !req.headers.authorization && !req.cookies?.token;

    // Use cached response for anonymous public requests
    if (isAnonymous && req.query.skipIncrement !== "true") {
      const cached = await getPublicResponse(cacheKey);
      if (cached) {
        if (cached.id) {
          prisma.$executeRaw`UPDATE "Event" SET "views" = "views" + 1 WHERE "id" = ${cached.id}`.catch(() => {});
        }
        res.set("X-Public-Cache", "HIT");
        return res.json(cached);
      }
    }

    const event = await getEventByIdOrSlug(eventIdOrSlug);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const attendedCount = await prisma.participation.count({
      where: { eventId: event.id, status: 'ATTENDED' }
    });

    if (event.reviewStatus !== "PUBLISHED") {
      const decoded = getDecodedToken(req);
      if (!decoded) {
        return res.status(403).json({ message: "This event is currently under review." });
      }

      const isCreator = Boolean(event.createdById && (event.createdById === decoded.userId || event.createdById === decoded.id));
      const isAdmin = decoded.role === "admin";
      const eventClubIds = (event.organizers || []).map((o) => o.clubId).concat(event.clubId ? [event.clubId] : []);
      const isAssignedFaculty =
        decoded.role === "facultyCoordinator" &&
        eventClubIds.some((cid) => String(cid) === String(decoded.clubId));
      const isClubOwner =
        decoded.clubId && eventClubIds.some((cid) => String(cid) === String(decoded.clubId));

      let isClubMemberAuthorized = false;
      if (decoded.userId && eventClubIds.length > 0) {
        try {
          const membership = await prisma.clubMembership.findFirst({
            where: {
              studentId: decoded.userId,
              clubId: { in: eventClubIds },
              status: { not: "INACTIVE" },
            },
          });
          if (membership) {
            if (event.reviewStatus === "DRAFT") {
              if (
                ["CLUB_HEAD", "COORDINATOR"].includes(membership.role) ||
                membership.canEditEvents
              ) {
                isClubMemberAuthorized = true;
              }
            } else {
              if (
                ["CLUB_HEAD", "COORDINATOR", "CORE_MEMBER", "MEMBER"].includes(membership.role) ||
                membership.canEditEvents ||
                membership.canTakeAttendance
              ) {
                isClubMemberAuthorized = true;
              }
            }
          }
        } catch {
        }
      }

      if (!isCreator && !isAdmin && !isAssignedFaculty && !isClubOwner && !isClubMemberAuthorized) {
        return res.status(403).json({ message: "This event is currently under review." });
      }
    }

    // Fire-and-forget views count increment asynchronously via raw SQL to prevent modifying event.updatedAt
    if (req.query.skipIncrement !== 'true') {
      prisma.$executeRaw`UPDATE "Event" SET "views" = "views" + 1 WHERE "id" = ${event.id}`.catch((err) =>
        console.error("Async view increment error:", err.message)
      );
    }

    const response = {
      ...serializeEvent(event),
      attendedCount
    };

    if (event.reviewStatus === "PUBLISHED") {
      await setPublicResponse(cacheKey, response, 60_000);
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /events/:id/register — register for an event (unified Participation) ─

const registerParamSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough().optional(),
  params: z.object({ id: objectIdSchema }),
});

router.post(
  "/:id/register",
  verifyToken,
  requirePermission(PERMISSIONS.REGISTRATION_CREATE),
  validate(registerParamSchema),
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const { transactionId, payerName, paymentRemarks, formResponses } = req.body;
      const isExternal = req.user.userType === "external" || req.user.role === "external" || req.user.principalType === "EXTERNAL";

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (event.reviewStatus !== "PUBLISHED") {
        return res.status(400).json({
          message: "Registration is not open. This event is not yet published.",
        });
      }

      const now = new Date();
      if (now > new Date(event.endTime)) {
        return res.status(400).json({
          message: "This event has already ended. Registration is closed.",
        });
      }

      const registrationDeadline = event.registrationDeadline
        ? new Date(event.registrationDeadline)
        : new Date(event.startTime);

      if (now > registrationDeadline) {
        return res.status(400).json({
          message: "Registration deadline has passed for this event.",
        });
      }

      if (isExternal && event.allowExternal === false) {
        return res.status(403).json({
          message: "This event is exclusive to internal NITJ students only. External participation is not allowed for this event.",
        });
      }

      if (event.registrationType === "none") {
        return res.status(400).json({
          message: "This event is open entry (walk-in) and does not require registration.",
        });
      }

      if (event.registrationType === "team") {
        return res.status(400).json({
          message: "This event only allows team registration. Please register with a team.",
        });
      }

      // Validate required and typed custom fields
      const customFieldCheck = validateCustomFields(event.customFields, formResponses);
      if (!customFieldCheck.valid) {
        return res.status(400).json({ message: customFieldCheck.message });
      }
      const validatedResponses = Object.keys(customFieldCheck.sanitizedResponses).length > 0
        ? customFieldCheck.sanitizedResponses
        : null;

      if (isExternal) {
        const extUserId = req.user.userId;
        const existing = await prisma.participation.findFirst({
          where: {
            eventId,
            externalUserId: extUserId,
          },
        });
        if (existing) return res.status(400).json({ message: "Already registered for this event." });
      } else {
        const studentId = req.user.userId;
        const student = await prisma.studentUser.findUnique({ where: { id: studentId } });
        if (!student) return res.status(404).json({ message: "User not found." });

        if (
          event.allowedPrograms?.length > 0 &&
          student.program &&
          !event.allowedPrograms.includes(student.program)
        ) {
          return res.status(403).json({
            message: `Ineligible program. This event is open only to [${event.allowedPrograms.join(", ")}] students (your program: ${student.program}).`,
            allowedPrograms: event.allowedPrograms,
            userProgram: student.program,
          });
        }

        if (!isStudentEligibleForEventYears(student, event.allowedYears)) {
          const progress = calculateAcademicProgress(student);
          return res.status(403).json({
            message: `Ineligible year. This event is open only to Year [${event.allowedYears.join(", ")}] students (your standing: ${progress.academicYearLabel}).`,
            allowedYears: event.allowedYears,
            userYear: progress.academicYearLabel,
            academicYear: progress.academicYear,
          });
        }

        if (
          event.allowedBranches?.length > 0 &&
          student.branch &&
          !event.allowedBranches.includes(student.branch)
        ) {
          return res.status(403).json({
            message: `Ineligible branch. This event is open only to [${event.allowedBranches.join(", ")}] branch students (your branch: ${student.branch}).`,
            allowedBranches: event.allowedBranches,
            userBranch: student.branch,
          });
        }

        const existing = await prisma.participation.findFirst({
          where: { eventId, studentId },
        });
        if (existing) return res.status(400).json({ message: "Already registered for this event." });
      }

      if (event.totalSeats > 0 && event.registeredCount >= event.totalSeats) {
        if (event.allowWaitlist === false) {
          return res.status(400).json({
            message: "Registration closed. This event is full.",
            isFull: true,
            waitlistAllowed: false,
          });
        }
        const waitlistCount = (event.waitingListIds || []).length;
        if (waitlistCount >= MAX_WAITLIST_CAPACITY) {
          return res.status(400).json({
            message: `Registration closed. The waitlist for this event is full (maximum ${MAX_WAITLIST_CAPACITY} participants allowed).`,
            waitlistFull: true,
            waitlistAllowed: true,
          });
        }
      }

      const status =
        event.totalSeats > 0 && event.registeredCount >= event.totalSeats
          ? "WAITLISTED"
          : "REGISTERED";

      const ticketId = crypto.randomBytes(12).toString("base64url");
      const { qrPayload, qrVersion, qrKeyId } = signTicket(eventId, ticketId);

      const unifiedUserId = req.user.userId;
      const isFree = Number(event.registrationFee || 0) === 0;
      const initialPaymentStatus = isFree ? "SUCCESS" : "PENDING";

      const participationData = isExternal
        ? {
          id: createObjectId(),
          eventId,
          userId: unifiedUserId,
          studentId: null,
          externalUserId: req.user.userId,
          qrCode: ticketId,
          qrPayload,
          qrVersion,
          qrKeyId,
          status,
          transactionId: transactionId || null,
          payerName: payerName || null,
          paymentRemarks: paymentRemarks || null,
          formResponses: validatedResponses,
          paymentStatus: initialPaymentStatus,
        }
        : {
          id: createObjectId(),
          eventId,
          userId: unifiedUserId,
          studentId: req.user.userId,
          externalUserId: null,
          qrCode: ticketId,
          qrPayload,
          qrVersion,
          qrKeyId,
          status,
          transactionId: transactionId || null,
          payerName: payerName || null,
          paymentRemarks: paymentRemarks || null,
          formResponses: validatedResponses,
          paymentStatus: initialPaymentStatus,
        };

      const participation = await prisma.$transaction(async (tx) => {
        const events = await tx.$queryRaw`
          SELECT * FROM "Event" WHERE id = ${eventId} FOR UPDATE
        `;
        const latestEvent = events[0];
        if (!latestEvent) throw new Error("Event not found");

        const isFull = latestEvent.totalSeats > 0 && latestEvent.registeredCount >= latestEvent.totalSeats;
        if (isFull) {
          if (latestEvent.allowWaitlist === false) {
            const err = new Error("Registration closed. This event is full.");
            err.statusCode = 400;
            err.isFull = true;
            err.waitlistAllowed = false;
            throw err;
          }
          const currentWaitlistCount = (latestEvent.waitingListIds || []).length;
          if (currentWaitlistCount >= MAX_WAITLIST_CAPACITY) {
            const err = new Error(`Registration closed. The waitlist for this event is full (maximum ${MAX_WAITLIST_CAPACITY} participants allowed).`);
            err.statusCode = 400;
            err.waitlistFull = true;
            err.waitlistAllowed = true;
            throw err;
          }
        }

        const latestStatus = isFull ? "WAITLISTED" : "REGISTERED";

        const created = await tx.participation.create({
          data: { ...participationData, status: latestStatus },
        });

        if (latestStatus === "REGISTERED") {
          await tx.event.update({
            where: { id: eventId },
            data: { registeredCount: { increment: 1 } },
          });
        } else {
          await tx.event.update({
            where: { id: eventId },
            data: { waitingListIds: { push: created.id } },
          });
        }

        return created;
      });

      invalidatePublicResponses(["events:public:*"]);

      res.status(201).json({
        message: "Registration successful",
        status: participation.status,
        qrCode: participation.qrCode,
        paymentStatus: participation.paymentStatus,
        postRegistrationMessage: event.postRegistrationMessage || null
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          message: err.message,
          waitlistFull: err.waitlistFull,
          waitlistAllowed: err.waitlistAllowed,
          isFull: err.isFull,
        });
      }
      res.status(500).json({ message: err.message });
    }
  },
);


const registrationsParamSchema = z.object({
  params: z.object({ id: objectIdSchema }).passthrough(),
  body: z.any().optional(),
  query: z.any().optional(),
});

router.get(
  "/:id/registrations",
  verifyToken,
  validate(registrationsParamSchema),
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({ where: { id: req.params.id } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const hasAccess = await checkEventAccess(req, event);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied. You don't have permission to view registrations." });
      }

      const participations = await prisma.participation.findMany({
        where: { eventId: req.params.id },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              rollNo: true,
              branch: true,
              expectedGraduationYear: true,
              program: true,
            },
          },
          externalUser: {
            select: {
              id: true,
              name: true,
              email: true,
              collegeName: true,
              program: true,
              graduationYear: true,
              phone: true,
            },
          },
          team: {
            include: {
              leaderStudent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  rollNo: true,
                  branch: true,
                  program: true,
                  expectedGraduationYear: true,
                },
              },
              members: {
                include: {
                  student: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      rollNo: true,
                      branch: true,
                      program: true,
                      expectedGraduationYear: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      res.json({
        participations: participations.map((p) => {
          const student = p.student
            ? {
              ...p.student,
              year: calculateAcademicProgress(p.student).academicYearLabel,
              academicYear: calculateAcademicProgress(p.student).academicYear,
              academicYearLabel: calculateAcademicProgress(p.student).academicYearLabel,
              semester: calculateAcademicProgress(p.student).semester,
              semesterLabel: calculateAcademicProgress(p.student).semesterLabel,
              isExternal: false,
            }
            : p.externalUser
              ? {
                id: p.externalUserId || p.externalUser.id,
                _id: p.externalUserId || p.externalUser.id,
                name: p.externalUser.name || "External Participant",
                email: p.externalUser.email || "",
                collegeName: p.externalUser.collegeName || "External College",
                rollNo: p.externalUser.collegeName || "External",
                program: p.externalUser.program || "N/A",
                year: p.externalUser.graduationYear ? `Class of ${p.externalUser.graduationYear}` : 'External Student',
                academicYearLabel: p.externalUser.graduationYear ? `Class of ${p.externalUser.graduationYear}` : 'External Student',
                phone: p.externalUser.phone || null,
                isExternal: true,
              }
              : null;

          const team = p.team
            ? {
              ...p.team,
              leader: p.team.leaderStudent
                ? {
                  ...p.team.leaderStudent,
                  year: calculateAcademicProgress(p.team.leaderStudent).academicYearLabel,
                  academicYear: calculateAcademicProgress(p.team.leaderStudent).academicYear,
                  semester: calculateAcademicProgress(p.team.leaderStudent).semester,
                  isExternal: false,
                }
                : null,
              members: (p.team.members || []).map((m) => {
                const memberUser = m.student
                  ? {
                    ...m.student,
                    year: calculateAcademicProgress(m.student).academicYearLabel,
                    academicYear: calculateAcademicProgress(m.student).academicYear,
                    semester: calculateAcademicProgress(m.student).semester,
                    isExternal: false,
                  }
                  : null;
                return {
                  ...m,
                  user: memberUser,
                  student: memberUser,
                };
              }),
            }
            : null;

          return {
            id: p.id,
            studentId: p.studentId,
            externalUserId: p.externalUserId,
            userId: p.userId,
            status: p.status,
            qrCode: p.qrCode,
            attendedAt: p.attendedAt,
            markedByMemberId: p.markedByMemberId,
            amountPaid: event.registrationFee || 0,
            formResponses: p.formResponses,
            createdAt: p.createdAt,
            timestamp: p.createdAt,
            student,
            teamId: p.teamId,
            team,
            transactionId: p.transactionId || null,
            payerName: p.payerName || null,
            paymentRemarks: p.paymentRemarks || null,
            paymentStatus: p.paymentStatus || "SUCCESS",
            paymentReviewedBy: p.paymentReviewedBy || null,
            paymentReviewedAt: p.paymentReviewedAt || null,
            paymentReviewMessage: p.paymentReviewMessage || null,
          };
        }),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);


router.put("/:id", verifyToken, requirePermission(PERMISSIONS.EVENT_UPDATE), validate(eventUpdateSchema), async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isAuthorized = hasPermission(req.user, PERMISSIONS.EVENT_UPDATE, event);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to update this event." });
    }

    if (req.body.expectedUpdatedAt) {
      const clientTime = new Date(req.body.expectedUpdatedAt).getTime();
      const serverTime = new Date(event.updatedAt).getTime();
      if (!isNaN(clientTime) && serverTime > clientTime + 5000) {
        return res.status(409).json({
          message: "Conflict: Event has been modified by a newer request.",
          code: "STALE_DATA_CONFLICT",
          serverUpdatedAt: event.updatedAt,
        });
      }
    }

    const { sponsors, media } = req.body;

    const allowedFields = [
      "title",
      "description",
      "venue",
      "startTime",
      "endTime",
      "totalSeats",
      "entryFee",
      "imageUrl",
      "requiredFields",
      "customFields",
      "allowedPrograms",
      "allowedYears",
      "allowedBranches",
      "allowExternal",
      "registrationDeadline",
      "registrationType",
      "minTeamSize",
      "maxTeamSize",
      "winners",
      "showWinner",
      "provideCertificate",
      "feedbackEnabled",
      "allowWaitlist",
      "certificateTemplate",
      "postRegistrationMessage",
      "paymentMethod",
      "registrationFee",
      "paymentInstructions",
      "collegePaymentUrl",
      "upiId",
      "accountHolderName",
    ];

    const updates = {};
    const isCompleted = new Date(event.endTime) < new Date();
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        // Lock feedbackEnabled once event is completed
        if (field === "feedbackEnabled" && isCompleted) {
          return;
        }
        updates[field] = req.body[field];
      }
    });

    if (updates.title && updates.title !== event.title) updates.slug = await slugifyUnique(updates.title, 'event', 'slug', req.params.id);

    if (updates.startTime) {
      const d = new Date(updates.startTime);
      if (!isNaN(d.getTime())) {
        updates.startTime = d;
      } else {
        delete updates.startTime;
      }
    } else if (updates.startTime === null) {
      delete updates.startTime;
    }

    if (updates.endTime) {
      const d = new Date(updates.endTime);
      if (!isNaN(d.getTime())) {
        updates.endTime = d;
      } else {
        delete updates.endTime;
      }
    } else if (updates.endTime === null) {
      delete updates.endTime;
    }

    if (updates.allowExternal !== undefined) updates.allowExternal = Boolean(updates.allowExternal);
    if (updates.allowWaitlist !== undefined) updates.allowWaitlist = Boolean(updates.allowWaitlist);

    if (updates.registrationDeadline !== undefined) {
      if (!updates.registrationDeadline) {
        updates.registrationDeadline = null;
      } else {
        const d = new Date(updates.registrationDeadline);
        updates.registrationDeadline = !isNaN(d.getTime()) ? d : null;
      }
    }

    // Validate booking conflict if venue or times changed
    const targetVenue = updates.venue || event.venue;
    const targetStart = updates.startTime || new Date(event.startTime);
    const targetEnd = updates.endTime || new Date(event.endTime);

    if (updates.venue || updates.startTime || updates.endTime) {
      if (!isNaN(targetStart.getTime()) && !isNaN(targetEnd.getTime()) && targetStart < targetEnd) {
        const validation = await validateBooking({
          venue: targetVenue,
          startTime: targetStart,
          endTime: targetEnd,
          excludeEventId: req.params.id,
        });

        if (validation.hasConflict) {
          return res.status(409).json({
            message: validation.message || "Venue is already booked for the selected time.",
            conflict: validation,
          });
        }
      }
    }

    if (updates.entryFee !== undefined) {
      if (updates.registrationFee === undefined) {
        updates.registrationFee = Number(updates.entryFee || 0);
      }
      delete updates.entryFee;
    }
    if (updates.totalSeats !== undefined) updates.totalSeats = Number(updates.totalSeats || 0);
    if (updates.minTeamSize !== undefined) updates.minTeamSize = Number(updates.minTeamSize || 1);
    if (updates.maxTeamSize !== undefined) updates.maxTeamSize = Number(updates.maxTeamSize || 1);
    if (updates.registrationType === "none") {
      updates.registeredCount = 0;
    }
    if (updates.registrationFee !== undefined) updates.registrationFee = Number(updates.registrationFee || 0);
    const targetPayMethod = updates.paymentMethod;
    if (targetPayMethod !== undefined) {
      if (targetPayMethod === 'COLLEGE_PAYMENT') {
        delete updates.upiId;
        if (updates.paymentInstructions) {
          updates.paymentInstructions = updates.paymentInstructions
            .split('\n')
            .filter(l => !l.trim().toLowerCase().startsWith('upi id:'))
            .join('\n')
            .trim() || null;
        }
      } else if (targetPayMethod === 'MANUAL_TRANSACTION') {
        updates.collegePaymentUrl = null;
      } else if (targetPayMethod === 'FREE') {
        updates.collegePaymentUrl = null;
        delete updates.upiId;
        updates.paymentInstructions = null;
      }
      delete updates.paymentMethod;
    }
    if (updates.upiId !== undefined) {
      if (updates.upiId && !updates.paymentInstructions?.includes(updates.upiId)) {
        updates.paymentInstructions = updates.paymentInstructions
          ? `${updates.paymentInstructions} (UPI: ${updates.upiId})`
          : `UPI ID: ${updates.upiId}`;
      }
      delete updates.upiId;
    }
    if (updates.paymentInstructions !== undefined) updates.paymentInstructions = updates.paymentInstructions || null;
    if (updates.collegePaymentUrl !== undefined) {
      const cUrl = typeof updates.collegePaymentUrl === 'string' ? updates.collegePaymentUrl.trim() : '';
      if (cUrl && cUrl.includes('@') && !cUrl.startsWith('http')) {
        if (!updates.paymentInstructions?.includes(cUrl)) {
          updates.paymentInstructions = updates.paymentInstructions
            ? `${updates.paymentInstructions}\nUPI ID: ${cUrl}`
            : `UPI ID: ${cUrl}`;
        }
        updates.collegePaymentUrl = null;
      } else {
        updates.collegePaymentUrl = cUrl || null;
      }
    }
    if (updates.accountHolderName !== undefined) updates.accountHolderName = updates.accountHolderName || null;
    if (updates.postRegistrationMessage !== undefined) updates.postRegistrationMessage = updates.postRegistrationMessage || null;

    let promotedCandidates = [];
    const updatedEvent = await prisma.$transaction(async (tx) => {
      if (sponsors !== undefined) {
        await tx.sponsor.deleteMany({ where: { eventId: req.params.id } });
        const validSponsors = sponsors
          .filter(s => s && s.name && s.name.trim() && s.logoUrl && s.logoUrl.trim())
          .map(s => ({
            id: createObjectId(),
            eventId: req.params.id,
            name: s.name.trim(),
            logoUrl: s.logoUrl.trim(),
            websiteUrl: s.websiteUrl?.trim() || null,
          }));
        if (validSponsors.length > 0) {
          await tx.sponsor.createMany({
            data: validSponsors,
          });
        }
      }

      if (media !== undefined) {
        await tx.media.deleteMany({ where: { eventId: req.params.id } });
        const validMedia = media
          .filter(m => m && m.url && m.url.trim())
          .map(m => ({
            id: createObjectId(),
            eventId: req.params.id,
            url: m.url.trim(),
            type: m.type,
          }));
        if (validMedia.length > 0) {
          await tx.media.createMany({
            data: validMedia,
          });
        }
      }

      const updated = await tx.event.update({
        where: { id: req.params.id },
        data: updates,
        include: eventInclude,
      });

      // Auto-clear waitlist if tickets/totalSeats increased
      if (updates.totalSeats !== undefined && updates.totalSeats > 0) {
        const availableSeats = Math.max(0, updates.totalSeats - updated.registeredCount);
        if (availableSeats > 0) {
          const promotionResult = await promoteWaitlistCandidates(tx, req.params.id, availableSeats);
          promotedCandidates = promotionResult.promotedCandidates;
        }
      }

      // Re-fetch event if promotions updated registeredCount / waitingListIds
      if (promotedCandidates.length > 0) {
        return tx.event.findUnique({
          where: { id: req.params.id },
          include: eventInclude,
        });
      }

      return updated;
    });

    if (promotedCandidates.length > 0) {
      notifyWaitlistCleared(req.io, promotedCandidates, updatedEvent).catch((err) => {
        console.error("Waitlist cleared notification error on seat increase:", err);
      });
    }

    res.json(serializeEvent(updatedEvent));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", verifyToken, requirePermission([PERMISSIONS.EVENT_DELETE, PERMISSIONS.EVENT_DELETE_REQUEST]), async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        organizers: {
          include: {
            club: { select: { id: true, clubName: true, facultyCoordinatorId: true } },
          },
        },
      },
    });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const eventClubIds = event.organizers.map(o => o.clubId);
    const isCreator = event.createdById === req.user.userId;
    const isClubOwner = (req.user.clubId && eventClubIds.includes(req.user.clubId)) ||
      (req.user.memberships && req.user.memberships.some(m => eventClubIds.includes(m.clubId) && ["CLUB_HEAD", "STUDENT_LEAD", "COORDINATOR"].includes((m.role || "").toUpperCase())));
    const isAdmin = req.user.role === "admin" || req.user.role === "SUPER_ADMIN";
    const isFaculty = req.user.role === "facultyCoordinator";

    if (!isCreator && !isClubOwner && !isAdmin && !isFaculty) {
      return res.status(403).json({ message: "Unauthorized to request deletion of this event." });
    }

    // Admin / Faculty Coordinator role: can delete/approve deletion immediately
    if (isAdmin || isFaculty) {
      if (isFaculty && req.user.clubId && !eventClubIds.includes(req.user.clubId)) {
        return res.status(403).json({ message: "You can only delete events for your assigned club." });
      }

      await prisma.featuredEvent.deleteMany({ where: { eventId: req.params.id } });
      await prisma.event.delete({ where: { id: req.params.id } });
      return res.json({ message: "Event deleted successfully." });
    }

    // Student Lead / Club Member role: submit deletion request for faculty approval
    await prisma.event.update({
      where: { id: req.params.id },
      data: { reviewStatus: "DELETION_REQUESTED" }
    });

    for (const org of event.organizers) {
      if (org.club?.facultyCoordinatorId) {
        try {
          const notif = await prisma.notification.create({
            data: {
              id: createObjectId(),
              targetScope: "FACULTY_COORDINATOR",
              clubId: org.clubId,
              recipientUserId: org.club.facultyCoordinatorId,
              eventId: req.params.id,
              type: "EVENT_DELETION_REQUEST",
              title: `Deletion Requested: ${event.title}`,
              message: `${org.club.clubName || "A club"} has requested approval to delete "${event.title}".`,
            }
          });
          if (req.io) {
            req.io.to(org.club.facultyCoordinatorId).emit("new-notification", {
              ...notif,
              _id: notif.id,
              sender: { name: org.club.clubName || "Club" }
            });
          }
        } catch (delErr) {
          console.error("Failed to notify faculty of deletion request:", delErr.message);
        }
      }
    }

    return res.json({ message: "Deletion request submitted for faculty approval." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function notifyMemberDeregistered(io, recipientId, title, message) {
  try {
    const notification = await prisma.notification.create({
      data: {
        id: createObjectId(),
        recipientStudentId: recipientId,
        recipientUserId: recipientId,
        targetScope: "USER",
        type: "REGISTRATION_CANCELLED",
        title,
        message,
      },
    });
    if (io) {
      io.to(recipientId).emit("new-notification", {
        ...notification,
        _id: notification.id,
        sender: { name: "System" },
      });
    }
  } catch (err) {
    console.error("Failed to send deregistration notification:", err);
  }
}

router.delete(
  "/:id/register",
  verifyToken,
  requirePermission(PERMISSIONS.REGISTRATION_CANCEL),
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const { studentId } = req.body;
      const { userId, userType } = req.user;

      if (userId !== studentId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized to deregister this user." });
      }

      if (userType === "external" || req.user.role === "external" || req.user.principalType === "EXTERNAL") {
        const p = await prisma.participation.findFirst({
          where: {
            eventId,
            OR: [
              { externalUserId: userId },
              { externalUserId: studentId },
            ],
          },
          include: { event: true },
        });
        if (!p) return res.status(404).json({ message: "Registration not found." });

        if (p.teamId) {
          const team = await prisma.team.findUnique({
            where: { id: p.teamId },
          });

          if (team) {
            const isLeader = team.leaderStudentId === (userId || studentId);
            if (!isLeader && req.user?.role !== "admin") {
              return res.status(403).json({ message: "Only the team leader can deregister a team registration." });
            }

            const teamParticipations = await prisma.participation.findMany({
              where: { teamId: p.teamId },
            });
            let promotedCandidates = [];
            await prisma.$transaction(async (tx) => {
              await tx.participation.deleteMany({ where: { teamId: p.teamId } });
              await tx.teamMember.deleteMany({ where: { teamId: p.teamId } });
              await tx.team.delete({ where: { id: p.teamId } });
              const registeredMembersCount = teamParticipations.filter(tp => tp.status === "REGISTERED").length;
              if (registeredMembersCount > 0) {
                await tx.event.update({
                  where: { id: eventId },
                  data: { registeredCount: { decrement: registeredMembersCount } },
                });
                const promo = await promoteWaitlistCandidates(tx, eventId, registeredMembersCount);
                promotedCandidates = promo.promotedCandidates;
              }
            });
            invalidatePublicResponses(["events:public:*"]);
            if (promotedCandidates.length > 0) {
              notifyWaitlistCleared(req.io, promotedCandidates, p.event || { id: eventId }).catch(console.error);
            }
            return res.json({ message: "Team and all member registrations cancelled successfully." });
          }
        }

        let promotedCandidates = [];
        await prisma.$transaction(async (tx) => {
          await tx.participation.delete({ where: { id: p.id } });
          if (p.status === "REGISTERED") {
            await tx.event.update({
              where: { id: eventId },
              data: { registeredCount: { decrement: 1 } },
            });
            const promo = await promoteWaitlistCandidates(tx, eventId, 1);
            promotedCandidates = promo.promotedCandidates;
          } else {
            const latestEvent = await tx.event.findUnique({ where: { id: eventId } });
            await tx.event.update({
              where: { id: eventId },
              data: {
                waitingListIds: (latestEvent?.waitingListIds || []).filter(
                  (id) => id !== p.id,
                ),
              },
            });
          }
        });

        invalidatePublicResponses(["events:public:*"]);
        if (promotedCandidates.length > 0) {
          notifyWaitlistCleared(req.io, promotedCandidates, p.event || { id: eventId }).catch(console.error);
        }

        return res.json({ message: "Deregistered successfully." });
      }

      const participation = await prisma.participation.findFirst({
        where: { eventId, studentId: studentId },
        include: { event: true }
      });
      if (!participation) return res.status(404).json({ message: "Registration not found." });

      const event = participation.event;

      // Check if it is a team registration
      if (participation.teamId) {
        const team = await prisma.team.findUnique({
          where: { id: participation.teamId },
          include: { leaderStudent: true }
        });

        if (team) {
          const isLeader = team.leaderStudentId === studentId;
          if (!isLeader && req.user.role !== "admin") {
            return res.status(403).json({ message: "Only the team leader can deregister a team registration." });
          }

          // The student deregistering is the team leader (or admin).
          // Deregister the entire team!
          const teamParticipations = await prisma.participation.findMany({
            where: { teamId: participation.teamId },
            include: { student: true }
          });

          let promotedCandidates = [];
          await prisma.$transaction(async (tx) => {
            let freedCount = 0;
            for (const tp of teamParticipations) {
              await tx.participation.delete({ where: { id: tp.id } });

              if (tp.status === "REGISTERED") {
                await tx.event.update({
                  where: { id: eventId },
                  data: { registeredCount: { decrement: 1 } },
                });
                freedCount += 1;
              } else {
                const latestEvent = await tx.event.findUnique({ where: { id: eventId } });
                await tx.event.update({
                  where: { id: eventId },
                  data: {
                    waitingListIds: (latestEvent?.waitingListIds || []).filter(
                      (id) => id !== tp.id,
                    ),
                  },
                });
              }
            }

            await tx.teamMember.deleteMany({ where: { teamId: participation.teamId } });
            await tx.team.delete({ where: { id: participation.teamId } });

            if (freedCount > 0) {
              const promo = await promoteWaitlistCandidates(tx, eventId, freedCount);
              promotedCandidates = promo.promotedCandidates;
            }
          });

          invalidatePublicResponses(["events:public:*"]);

          if (promotedCandidates.length > 0) {
            notifyWaitlistCleared(req.io, promotedCandidates, event).catch(console.error);
          }

          // Send notifications to all team members (except the leader)
          for (const tp of teamParticipations) {
            if (tp.studentId && tp.studentId !== team.leaderStudentId) {
              await notifyMemberDeregistered(
                req.io,
                tp.studentId,
                "Team Deregistered",
                `The team leader ${team.leaderStudent?.name || 'leader'} has deregistered team "${team.teamName}" for event "${event.title}". Your registration has been cancelled.`
              );
            }
          }

          return res.json({ message: "Team and all members deregistered successfully." });
        }
      }

      // Individual registration
      let promotedCandidates = [];
      await prisma.$transaction(async (tx) => {
        await tx.participation.delete({ where: { id: participation.id } });

        if (participation.status === "REGISTERED") {
          await tx.event.update({
            where: { id: eventId },
            data: { registeredCount: { decrement: 1 } },
          });
          const promo = await promoteWaitlistCandidates(tx, eventId, 1);
          promotedCandidates = promo.promotedCandidates;
        } else {
          const latestEvent = await tx.event.findUnique({ where: { id: eventId } });
          await tx.event.update({
            where: { id: eventId },
            data: {
              waitingListIds: (latestEvent?.waitingListIds || []).filter(
                (id) => id !== participation.id,
              ),
            },
          });
        }
      });

      invalidatePublicResponses(["events:public:*"]);

      if (promotedCandidates.length > 0) {
        notifyWaitlistCleared(req.io, promotedCandidates, event).catch(console.error);
      }

      res.json({ message: "Deregistered successfully." });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  "/:id/check-in",
  verifyToken,
  requirePermission(PERMISSIONS.EVENT_ATTENDANCE),
  async (req, res) => {
    try {
      const { id: eventId } = req.params;
      const { qrCode } = req.body;
      const scannerId = req.user.userId;

      if (!qrCode) return res.status(400).json({ message: "QR Code is required." });

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { organizers: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (!(await checkEventAccess(req, event, "canTakeAttendance"))) {
        return res.status(403).json({ message: "Unauthorized scanner." });
      }

      // Check both internal and external participations
      let participation = await prisma.participation.findFirst({
        where: { qrCode, eventId },
        include: {
          student: { select: { name: true, rollNo: true } },
          externalUser: { select: { name: true, collegeName: true, email: true } },
        },
      });

      let type = "internal";
      if (participation && !participation.studentId) {
        // Handle as external if studentId is null
        type = "external";
      }

      if (!participation) {
        return res.status(404).json({ message: "Invalid QR scan or participant not registered." });
      }

      if (participation.status === "ATTENDED") {
        return res.status(400).json({
          message: "Participant already marked as attended.",
          alreadyAttended: true,
          participantName: type === "internal" ? participation.student?.name : (participation.externalUser?.name || "External Participant"),
        });
      }

      // Update participation using the unified Participation model
      await prisma.participation.update({
        where: { id: participation.id },
        data: {
          status: "ATTENDED",
          attendedAt: new Date(),
          markedByMemberId: scannerId,
        },
      });

      res.json({
        success: true,
        message: "Check-in successful!",
        participant: {
          name: type === "internal" ? participation.student?.name : (participation.externalUser?.name || "External Participant"),
          details: type === "internal" ? participation.student?.rollNo : (participation.externalUser?.collegeName || participation.externalUser?.email || "External"),
          type,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.post(
  "/:id/attendance-manual",
  verifyToken,
  requirePermission(PERMISSIONS.EVENT_ATTENDANCE),
  async (req, res) => {
    try {
      const { id: eventId } = req.params;
      const { participationId, type } = req.body;
      const scannerId = req.user.userId;

      if (!participationId || !type) {
        return res.status(400).json({ message: "Participation ID and type are required." });
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { organizers: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (!(await checkEventAccess(req, event, "canTakeAttendance"))) {
        return res.status(403).json({ message: "Unauthorized to mark attendance for this club." });
      }

      const data = { status: "ATTENDED", attendedAt: new Date(), markedByMemberId: scannerId };

      const updated = await prisma.participation.updateMany({
        where: { id: participationId, eventId },
        data,
      });
      if (updated.count === 0) {
        return res.status(404).json({ message: "Participation not found for this event." });
      }

      res.json({ message: "Participant marked as attended successfully." });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// PATCH /api/events/:id/feature - Toggle featured status for event (Club Admin/Event Manager)
router.patch("/:id/feature", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: { organizers: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const newFeaturedState = !event.isFeatured;
    const primaryClubId = event.organizers?.[0]?.clubId;
    if (newFeaturedState && primaryClubId) {
      await prisma.event.updateMany({
        where: {
          organizers: { some: { clubId: primaryClubId } },
          isFeatured: true,
        },
        data: { isFeatured: false },
      });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { isFeatured: newFeaturedState },
      include: eventInclude,
    });

    invalidatePublicResponses("events");
    invalidatePublicResponses("clubs");

    res.json({
      message: `Event ${newFeaturedState ? "featured" : "unfeatured"} successfully`,
      event: serializeEvent(updated),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

