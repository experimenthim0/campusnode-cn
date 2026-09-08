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

  // If passed an event object or eventId
  let event = null;
  let clubId = null;

  if (typeof eventOrClubId === "object" && eventOrClubId !== null) {
    event = eventOrClubId;
    clubId = event.clubId;
  } else if (typeof eventOrClubId === "string") {
    // Check if it's an event or a club
    event = await prisma.event.findUnique({
      where: { id: eventOrClubId },
      select: { id: true, clubId: true, createdById: true, organizerType: true, centralOrganizerId: true, institutionalAccountId: true }
    });
    clubId = event ? event.clubId : eventOrClubId;
  }

  if (event?.createdById && userId && String(event.createdById) === String(userId)) return true;

  if (event && (event.organizerType === "CENTRAL" || event.institutionalAccountId || event.centralOrganizerId)) {
    if (userRole === "central_organizer" || principalType === "INSTITUTIONAL") return true;
    if (userId && String(event.centralOrganizerId) === String(userId)) return true;
    const instAssignment = (user.institutionalAssignments || []).find(
      (a) => a.status === "ACTIVE" || a.status === undefined
    );
    if (instAssignment) return true;
  }

  if (clubId) {
    if ((userRole === "facultyCoordinator" || userRole === "faculty") && String(user.clubId) === String(clubId)) return true;
    if ((userRole === "club" || principalType === "CLUB") && String(user.clubId) === String(clubId)) return true;

    if (userId) {
      const membership = await prisma.clubMembership.findFirst({
        where: {
          clubId: clubId,
          studentId: userId,
          status: { not: "INACTIVE" }
        }
      });
      if (membership) {
        if (membership.role === "CLUB_HEAD" || membership.role === "COORDINATOR") return true;
        if (requiredPermission && membership[requiredPermission]) return true;
        if (membership.canTakeAttendance || membership.canEditEvents) return true;
        return true;
      }
    }
  }

  if (event?.id && userId) {
    const staff = await prisma.eventStaff.findFirst({
      where: { eventId: event.id, userId, status: "ACTIVE" }
    });
    if (staff) return true;
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
    imageUrl: z.string().url().optional().or(z.literal("")),
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
    paymentMethod: z.enum(['FREE', 'COLLEGE_PAYMENT', 'MANUAL_TRANSACTION']).optional().default('FREE'),
    registrationFee: z.coerce.number().optional().default(0),
    paymentInstructions: z.string().optional().nullable(),
    collegePaymentUrl: z.string().url().optional().nullable().or(z.literal("")),
    upiId: z.string().optional().nullable(),
    postRegistrationMessage: z.string().optional().nullable(),
    accountHolderName: z.string().optional().nullable(),
    reviewStatus: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED']).optional(),
    isDraft: z.boolean().optional(),
    sponsors: z.array(z.object({
      name: z.string().min(1),
      logoUrl: z.string().url(),
      websiteUrl: z.string().url().optional(),
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

// createdBy now comes from StudentUser
const eventInclude = {
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  reviewedBy: {
    select: { id: true, name: true },
  },
  centralOrganizer: {
    select: { id: true, name: true, email: true, profileImage: true },
  },
  participatingClubs: {
    include: { club: { select: { id: true, clubName: true, clubLogo: true, slug: true } } },
  },
  club: {
    select: { id: true, clubName: true, clubLogo: true, slug: true, category: true, socialLinks: true },
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

// The feed does not need the large sponsor/media/custom payment payloads used
// by the event detail and management screens. Keeping this selection narrow
// reduces database work, response size, and JSON serialization time.
const publicEventSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  venue: true,
  startTime: true,
  endTime: true,
  totalSeats: true,
  entryFee: true,
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
  clubId: true,
  organizerType: true,
  centralOrganizerId: true,
  registrationDeadline: true,
  reviewStatus: true,
  winners: true,
  showWinner: true,
  provideCertificate: true,
  registrationType: true,
  minTeamSize: true,
  maxTeamSize: true,
  paymentMethod: true,
  registrationFee: true,
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
  centralOrganizer: {
    select: { id: true, name: true },
  },
  participatingClubs: {
    include: { club: { select: { id: true, clubName: true, clubLogo: true, slug: true } } },
  },
  club: {
    select: {
      id: true,
      clubName: true,
      clubLogo: true,
      slug: true,
      category: true,
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
    const cachedEvents = getPublicResponse(cacheKey);

    if (cachedEvents) {
      res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
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
    setPublicResponse(cacheKey, response);
    res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
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
        clubId: req.params.clubId,
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
      where.clubId = clubId;
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
      where.clubId = req.user.clubId;
    }

    if (category && category !== "all") {
      where.club = { category };
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
      include: { club: { select: { id: true, clubName: true } } },
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
            issues.push({
              id: `conflict-${e1.id}-${e2.id}`,
              type: "Venue Conflict",
              severity: "HIGH",
              venue: e1.venue,
              event1: { id: e1.id, title: e1.title, clubName: e1.club?.clubName, startTime: e1.startTime, endTime: e1.endTime },
              event2: { id: e2.id, title: e2.title, clubName: e2.club?.clubName, startTime: e2.startTime, endTime: e2.endTime },
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
      if (req.user.role === "facultyCoordinator" && event.clubId !== req.user.clubId) {
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
        where: { clubId },
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
        where: { clubId },
        include: {
          club: { select: { clubName: true } },
          participations: true,
        },
        orderBy: { startTime: "desc" },
      });

      const exportData = events.map((e) => {
        const regCount = e.participations ? e.participations.filter(p => p.status === 'REGISTERED' || p.status === 'ATTENDED').length : 0;
        const totalAmt = e.isPaid ? regCount * (e.ticketPrice || 0) : 0;
        return {
          eventName: e.title || e.eventName || "",
          clubName: e.club?.clubName || "",
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
              { externalEmail: authEmail || userId },
              { studentId: userId },
            ],
          }
          : { studentId: userId },
        select: {
          id: true,
          eventId: true,
          studentId: true,
          externalUserId: true,
          externalEmail: true,
          externalName: true,
          status: true,
          qrCode: true,
          qrVersion: true,
          qrPayload: true,
          qrKeyId: true,
          attendedAt: true,
          paymentStatus: true,
          amountPaid: true,
          paymentId: true,
          orderId: true,
          paymentTimestamp: true,
          transactionId: true,
          payerName: true,
          paymentRemarks: true,
          paymentReviewedBy: true,
          paymentReviewedAt: true,
          paymentReviewMessage: true,
          formResponses: true,
          createdAt: true,
          updatedAt: true,
          // The old query loaded the complete event graph and every student
          // column. This projection contains what My Events/tickets need.
          event: {
            select: {
              ...publicEventSelect,
              customFields: true,
              postRegistrationMessage: true,
              paymentInstructions: true,
              collegePaymentUrl: true,
              upiId: true,
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
              academicStatus: true,
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
              leaderId: true,
              leader: { select: { id: true, name: true, email: true, rollNo: true } },
              leaderExternal: { select: { id: true, name: true, email: true, collegeName: true } },
              members: {
                select: {
                  userId: true,
                  user: { select: { id: true, name: true, email: true, rollNo: true } },
                  externalUser: { select: { id: true, name: true, email: true, collegeName: true } },
                },
              }
            }
          }
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
            academicStatus: true,
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
              upiId: true,
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

    if (!req.user.clubId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You must be associated with a club to create events.",
      });
    }

    const targetClubId = req.user.role === "admin" ? req.body.clubId : req.user.clubId;
    if (!targetClubId) {
      return res.status(400).json({ message: "Club ID is required." });
    }
    const targetClub = await prisma.club.findUnique({ where: { id: targetClubId } });
    if (!targetClub) {
      return res.status(404).json({ message: "Club not found." });
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
    const studentUserRecord = isStudentCreator ? await prisma.studentUser.findUnique({ where: { id: req.user.userId }, select: { id: true } }) : null;

    const savedEvent = await prisma.event.create({
      data: {
        id: createObjectId(),
        title,
        description: description || "",
        venue: targetVenue,
        startTime: start,
        endTime: end,
        totalSeats: totalSeats || 0,
        entryFee: Number(entryFee || 0),
        imageUrl: imageUrl || "",
        requiredFields: requiredFields || [],
        customFields: customFields || [],
        createdById: studentUserRecord?.id || null,
        clubId: targetClubId,
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
        paymentMethod: paymentMethod || "FREE",
        registrationFee: Number(registrationFee || 0),
        paymentInstructions: paymentInstructions || null,
        collegePaymentUrl: collegePaymentUrl || null,
        upiId: upiId || null,
        accountHolderName: accountHolderName || null,
        postRegistrationMessage: postRegistrationMessage || null,
        slug: await slugifyUnique(title, 'event', 'slug'),
        reviewStatus: isDraft ? "DRAFT" : "PENDING",
        sponsors: { createMany: { data: (sponsors || []).map(s => ({ id: createObjectId(), ...s })) } },
        media: { createMany: { data: (media || []).map(m => ({ id: createObjectId(), ...m })) } },
      },
      include: eventInclude,
    });

    if (!isDraft) {
      invalidatePublicResponses(["events:public:*"]);
    }

    // Notify supervised Faculty Coordinator of incoming event review request ONLY if PENDING
    if (!isDraft && savedEvent.clubId) {
      try {
        const club = await prisma.club.findUnique({
          where: { id: savedEvent.clubId },
          select: { facultyCoordinatorId: true, clubName: true },
        });
        if (club?.facultyCoordinatorId) {
          const notif = await prisma.notification.create({
            data: {
              id: createObjectId(),
              targetScope: "FACULTY_COORDINATOR",
              clubId: savedEvent.clubId,
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

      const event = await prisma.event.findUnique({ where: { id: req.params.id } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (req.user.role !== "admin" && event.clubId !== req.user.clubId) {
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
          const notif = await prisma.notification.create({
            data: {
              id: createObjectId(),
              targetScope: "USER",
              recipientStudentId: updated.createdById,
              recipientUserId: updated.createdById,
              senderAdminId: req.user.userId,
              eventId: updated.id,
              clubId: updated.clubId,
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
        include: { club: true },
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
      if (event.paymentMethod && event.paymentMethod !== "FREE") {
        if (Number(event.registrationFee || 0) <= 0) {
          errors.push("Registration fee must be greater than 0 for paid events.");
        }
        if (event.paymentMethod === "MANUAL_TRANSACTION" && !event.upiId) {
          errors.push("UPI ID is required for manual transaction payments.");
        }
        if (event.paymentMethod === "COLLEGE_PAYMENT" && !event.collegePaymentUrl) {
          errors.push("College payment URL is required for college portal payments.");
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
      } else if (targetStatus === "PENDING" && updated.clubId) {
        try {
          const club = await prisma.club.findUnique({
            where: { id: updated.clubId },
            select: { facultyCoordinatorId: true, clubName: true },
          });
          if (club?.facultyCoordinatorId) {
            const notif = await prisma.notification.create({
              data: {
                id: createObjectId(),
                targetScope: "FACULTY_COORDINATOR",
                clubId: updated.clubId,
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
    const event = await getEventByIdOrSlug(req.params.id);
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
      const isAssignedFaculty =
        decoded.role === "facultyCoordinator" &&
        (String(event.clubId) === String(decoded.clubId) || String(event.clubId) === String(decoded.club?.id));
      const isCO =
        event.organizerType === "CENTRAL" &&
        (decoded.role === "central_organizer" || event.centralOrganizerId === decoded.userId);
      const isClubAccount =
        (decoded.principalType === "CLUB" || decoded.userType === "club" || decoded.role === "club" || decoded.role === "club_account") &&
        (String(event.clubId) === String(decoded.clubId) ||
          String(event.clubId) === String(decoded.userId) ||
          String(event.clubId) === String(decoded.clubAccountId));
      const isClubOwner =
        (decoded.clubId && String(event.clubId) === String(decoded.clubId)) ||
        (decoded.userId && String(event.clubId) === String(decoded.userId));

      let isClubMemberAuthorized = false;
      if (decoded.userId && event.clubId) {
        try {
          const membership = await prisma.clubMembership.findFirst({
            where: {
              studentId: decoded.userId,
              clubId: event.clubId,
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

      if (!isCreator && !isAdmin && !isAssignedFaculty && !isCO && !isClubAccount && !isClubOwner && !isClubMemberAuthorized) {
        return res.status(403).json({ message: "This event is currently under review." });
      }
    }

    // Fire-and-forget views count increment asynchronously to prevent blocking response
    if (req.query.skipIncrement !== 'true') {
      prisma.event.update({
        where: { id: event.id },
        data: { views: { increment: 1 } },
      }).catch((err) => console.error("Async view increment error:", err.message));
    }

    res.json({
      ...serializeEvent(event),
      attendedCount
    });
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
      const { externalEmail, externalName, transactionId, payerName, paymentRemarks, formResponses } = req.body;
      const isExternalUser = req.user.userType === "external" || req.user.role === "external" || req.user.principalType === "EXTERNAL";
      const isExternal = isExternalUser || !!externalEmail;

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

      const extUserId = isExternalUser ? req.user.userId : null;
      const extEmail = isExternalUser ? req.user.email : (externalEmail || null);
      const extName = isExternalUser ? req.user.name : (externalName || null);

      if (isExternal) {
        const existing = await prisma.participation.findFirst({
          where: {
            eventId,
            OR: [
              ...(extUserId ? [{ externalUserId: extUserId }] : []),
              ...(extEmail ? [{ externalEmail: extEmail }] : []),
            ]
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

      const participationData = isExternal
        ? {
          id: createObjectId(),
          eventId,
          studentId: null,
          externalUserId: extUserId,
          externalEmail: extEmail,
          externalName: extName,
          qrCode: ticketId,
          qrPayload,
          qrVersion,
          qrKeyId,
          status,
          transactionId: transactionId || null,
          payerName: payerName || null,
          paymentRemarks: paymentRemarks || null,
          formResponses: validatedResponses,
          amountPaid: (event.paymentMethod === 'FREE') ? 0 : (event.registrationFee || event.entryFee || 0),
          paymentStatus: (event.paymentMethod === 'MANUAL_TRANSACTION') ? 'PENDING' : (event.paymentMethod === 'COLLEGE_PAYMENT') ? 'PENDING' : 'SUCCESS',
        }
        : {
          id: createObjectId(),
          eventId,
          studentId: req.user.userId,
          externalUserId: null,
          externalEmail: null,
          externalName: null,
          qrCode: ticketId,
          qrPayload,
          qrVersion,
          qrKeyId,
          status,
          transactionId: transactionId || null,
          payerName: payerName || null,
          paymentRemarks: paymentRemarks || null,
          formResponses: validatedResponses,
          amountPaid: (event.paymentMethod === 'FREE') ? 0 : (event.registrationFee || event.entryFee || 0),
          paymentStatus: (event.paymentMethod === 'MANUAL_TRANSACTION') ? 'PENDING' : (event.paymentMethod === 'COLLEGE_PAYMENT') ? 'PENDING' : 'SUCCESS',
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
              academicStatus: true,
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
              leader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  rollNo: true,
                  branch: true,
                  program: true,
                  expectedGraduationYear: true,
                  academicStatus: true,
                },
              },
              leaderExternal: {
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
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      rollNo: true,
                      branch: true,
                      program: true,
                      expectedGraduationYear: true,
                      academicStatus: true,
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
            : (p.externalUser || p.externalName || p.externalEmail)
              ? {
                id: p.externalUserId || p.externalUser?.id || null,
                _id: p.externalUserId || p.externalUser?.id || null,
                name: p.externalUser?.name || p.externalName || "External Participant",
                email: p.externalUser?.email || p.externalEmail || "",
                collegeName: p.externalUser?.collegeName || "External College",
                rollNo: p.externalUser?.collegeName || "External",
                program: p.externalUser?.program || "N/A",
                year: p.externalUser?.graduationYear ? `Class of ${p.externalUser.graduationYear}` : 'Verified Guest',
                academicYearLabel: p.externalUser?.graduationYear ? `Class of ${p.externalUser.graduationYear}` : 'Verified Guest',
                phone: p.externalUser?.phone || null,
                isExternal: true,
              }
              : null;

          const team = p.team
            ? {
              ...p.team,
              leader: p.team.leader
                ? {
                  ...p.team.leader,
                  year: calculateAcademicProgress(p.team.leader).academicYearLabel,
                  academicYear: calculateAcademicProgress(p.team.leader).academicYear,
                  semester: calculateAcademicProgress(p.team.leader).semester,
                  isExternal: false,
                }
                : p.team.leaderExternal
                  ? {
                    ...p.team.leaderExternal,
                    rollNo: p.team.leaderExternal.collegeName,
                    year: p.team.leaderExternal.graduationYear ? `Class of ${p.team.leaderExternal.graduationYear}` : 'Verified Guest',
                    isExternal: true,
                  }
                  : null,
              members: (p.team.members || []).map((m) => {
                const memberUser = m.user
                  ? {
                    ...m.user,
                    year: calculateAcademicProgress(m.user).academicYearLabel,
                    academicYear: calculateAcademicProgress(m.user).academicYear,
                    semester: calculateAcademicProgress(m.user).semester,
                    isExternal: false,
                  }
                  : m.externalUser
                    ? {
                      ...m.externalUser,
                      rollNo: m.externalUser.collegeName,
                      year: m.externalUser.graduationYear ? `Class of ${m.externalUser.graduationYear}` : 'Verified Guest',
                      isExternal: true,
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
            externalEmail: p.externalEmail,
            externalName: p.externalName,
            status: p.status,
            qrCode: p.qrCode,
            attendedAt: p.attendedAt,
            markedByMemberId: p.markedByMemberId,
            amountPaid: p.amountPaid,
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
      if (!isNaN(clientTime) && serverTime > clientTime + 3000) {
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
    if (updates.startTime) updates.startTime = new Date(updates.startTime);
    if (updates.endTime) updates.endTime = new Date(updates.endTime);
    if (updates.allowExternal !== undefined) updates.allowExternal = Boolean(updates.allowExternal);
    if (updates.allowWaitlist !== undefined) updates.allowWaitlist = Boolean(updates.allowWaitlist);
    if (updates.registrationDeadline !== undefined) updates.registrationDeadline = updates.registrationDeadline ? new Date(updates.registrationDeadline) : null;

    // Validate booking conflict if venue or times changed
    const targetVenue = updates.venue || event.venue;
    const targetStart = updates.startTime || new Date(event.startTime);
    const targetEnd = updates.endTime || new Date(event.endTime);

    if (updates.venue || updates.startTime || updates.endTime) {
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

    if (updates.registrationDeadline !== undefined) {
      updates.registrationDeadline = updates.registrationDeadline
        ? new Date(updates.registrationDeadline)
        : null;
    }
    if (updates.entryFee !== undefined) updates.entryFee = Number(updates.entryFee || 0);
    if (updates.totalSeats !== undefined) updates.totalSeats = Number(updates.totalSeats || 0);
    if (updates.minTeamSize !== undefined) updates.minTeamSize = Number(updates.minTeamSize || 1);
    if (updates.maxTeamSize !== undefined) updates.maxTeamSize = Number(updates.maxTeamSize || 1);
    if (updates.registrationType === "none") {
      updates.registeredCount = 0;
    }
    if (updates.registrationFee !== undefined) updates.registrationFee = Number(updates.registrationFee || 0);
    if (updates.paymentMethod !== undefined) updates.paymentMethod = updates.paymentMethod || "FREE";
    if (updates.paymentInstructions !== undefined) updates.paymentInstructions = updates.paymentInstructions || null;
    if (updates.collegePaymentUrl !== undefined) updates.collegePaymentUrl = updates.collegePaymentUrl || null;
    if (updates.upiId !== undefined) updates.upiId = updates.upiId || null;
    if (updates.accountHolderName !== undefined) updates.accountHolderName = updates.accountHolderName || null;

    let promotedCandidates = [];
    const updatedEvent = await prisma.$transaction(async (tx) => {
      if (sponsors !== undefined) {
        await tx.sponsor.deleteMany({ where: { eventId: req.params.id } });
        await tx.sponsor.createMany({
          data: sponsors.map(s => ({ id: createObjectId(), eventId: req.params.id, ...s })),
        });
      }

      if (media !== undefined) {
        await tx.media.deleteMany({ where: { eventId: req.params.id } });
        await tx.media.createMany({
          data: media.map(m => ({ id: createObjectId(), eventId: req.params.id, ...m })),
        });
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

router.delete("/:id", verifyToken, requirePermission(PERMISSIONS.EVENT_DELETE), async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isCreator = event.createdById === req.user.userId;
    const isClubOwner = (req.user.clubId && String(event.clubId) === String(req.user.clubId)) || (req.user.userId && String(event.clubId) === String(req.user.userId));
    const isAdmin = req.user.role === "admin";
    const isFaculty = req.user.role === "facultyCoordinator";

    if (!isCreator && !isClubOwner && !isAdmin && !isFaculty) {
      return res.status(403).json({ message: "Unauthorized to request deletion of this event." });
    }

    // Admin / Faculty Coordinator role: can delete/approve deletion immediately
    if (isAdmin || isFaculty) {
      if (isFaculty && req.user.clubId && String(event.clubId) !== String(req.user.clubId)) {
        return res.status(403).json({ message: "You can only delete events for your assigned club." });
      }

      await prisma.featuredEvent.deleteMany({ where: { eventId: req.params.id } });
      await prisma.event.delete({ where: { id: req.params.id } });
      return res.json({ message: "Event deleted successfully." });
    }

    // Club / Member role: submit deletion request for faculty approval
    await prisma.event.update({
      where: { id: req.params.id },
      data: { reviewStatus: "DELETION_REQUESTED" }
    });

    const eventToDel = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { title: true, clubId: true, club: { select: { facultyCoordinatorId: true, clubName: true } } }
    });
    if (eventToDel?.club?.facultyCoordinatorId) {
      try {
        const notif = await prisma.notification.create({
          data: {
            id: createObjectId(),
            targetScope: "FACULTY_COORDINATOR",
            clubId: eventToDel.clubId,
            recipientUserId: eventToDel.club.facultyCoordinatorId,
            eventId: req.params.id,
            type: "EVENT_DELETION_REQUEST",
            title: `Deletion Requested: ${eventToDel.title}`,
            message: `${eventToDel.club?.clubName || "A club"} has requested approval to delete "${eventToDel.title}".`,
          }
        });
        if (req.io) {
          req.io.to(eventToDel.club.facultyCoordinatorId).emit("new-notification", {
            ...notif,
            _id: notif.id,
            sender: { name: eventToDel.club?.clubName || "Club" }
          });
        }
      } catch (delErr) {
        console.error("Failed to notify faculty of deletion request:", delErr.message);
      }
    }

    return res.json({ message: "Deletion request submitted for faculty approval." });
  } catch (err) {
    res.status(550).json({ message: err.message });
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
              { externalEmail: req.user.email },
              { externalEmail: studentId },
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
            const isLeader = team.leaderId === (userId || studentId);
            if (!isLeader && req.user?.role !== "admin") {
              return res.status(403).json({ message: "Only the team leader can deregister a team registration." });
            }

            // Leader deregistering deletes the whole team registration
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
          include: { leader: true }
        });

        if (team) {
          const isLeader = team.leaderId === studentId;
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
            if (tp.studentId && tp.studentId !== team.leaderId) {
              await notifyMemberDeregistered(
                req.io,
                tp.studentId,
                "Team Deregistered",
                `The team leader ${team.leader?.name || 'leader'} has deregistered team "${team.teamName}" for event "${event.title}". Your registration has been cancelled.`
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

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (!(await checkEventAccess(req, event.clubId, "canTakeAttendance"))) {
        return res.status(403).json({ message: "Unauthorized scanner." });
      }

      // Check both internal and external participations
      let participation = await prisma.participation.findFirst({
        where: { qrCode, eventId },
        include: { student: { select: { name: true, rollNo: true } } },
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
          participantName: type === "internal" ? participation.student?.name : participation.externalName,
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
          name: type === "internal" ? participation.student?.name : participation.externalName,
          details: type === "internal" ? participation.student?.rollNo : participation.externalEmail,
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

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (!(await checkEventAccess(req, event.clubId, "canTakeAttendance"))) {
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
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ message: "Event not found" });

    // If club event, unset any other featured event in this club if enabling
    const newFeaturedState = !event.isFeatured;
    if (newFeaturedState && event.clubId) {
      await prisma.event.updateMany({
        where: { clubId: event.clubId, isFeatured: true },
        data: { isFeatured: false },
      });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { isFeatured: newFeaturedState },
      include: {
        club: { select: { id: true, clubName: true, clubLogo: true, slug: true } },
      },
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

