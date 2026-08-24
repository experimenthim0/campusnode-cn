import express from "express";
import jwt from "jsonwebtoken";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
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

    const result = await uploadImage(req.file.buffer, "event-posters");
    res.json({ 
      secure_url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error("Upload Route Error:", error);
    res.status(500).json({ message: "Upload failed.", error: error.message });
  }
});

// Helper function to check if a user has access to a club's events
async function checkEventAccess(req, eventClubId, requiredPermission = null) {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'facultyCoordinator') return String(req.user.clubId) === String(eventClubId);

  if (['club', 'member', 'student'].includes(req.user.role)) {
    const membership = await prisma.clubMembership.findFirst({
      where: { studentId: req.user.userId, clubId: eventClubId }
    });
    if (!membership && String(req.user.clubId) === String(eventClubId)) return true;
    if (!membership) return false;
    if (membership.role === 'CLUB_HEAD' || membership.role === 'COORDINATOR') return true;
    if (requiredPermission && !membership[requiredPermission]) return false;
    return true;
  }
  return false;
}

const eventSchema = z.object({
  body: z.object({
    title: z.string().min(3),

    venue: z.string().optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    totalSeats: z.coerce.number().int().optional(),
    entryFee: z.coerce.number().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    requiredFields: z.array(z.string()).optional(),
    allowedPrograms: z.array(z.string()).optional(),
    allowedYears: z.array(z.string()).optional(),
    allowedBranches: z.array(z.string()).optional(),
    registrationDeadline: z.coerce.date().optional().nullable(),
    registrationType: z.enum(['individual', 'team', 'both']).optional().default('individual'),
    minTeamSize: z.coerce.number().int().min(1).optional().default(1),
    maxTeamSize: z.coerce.number().int().min(1).optional().default(1),
    winners: z.array(z.any()).optional(),
    showWinner: z.boolean().optional(),
    provideCertificate: z.boolean().optional(),
    certificateTemplate: z.any().optional(),
    paymentMethod: z.enum(['FREE', 'COLLEGE_PAYMENT', 'MANUAL_TRANSACTION']).optional().default('FREE'),
    registrationFee: z.coerce.number().optional().default(0),
    paymentInstructions: z.string().optional().nullable(),
    collegePaymentUrl: z.string().url().optional().nullable().or(z.literal("")),
    upiId: z.string().optional().nullable(),
    postRegistrationMessage: z.string().optional().nullable(),
    accountHolderName: z.string().optional().nullable(),
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
};
// Decode token without middleware — for optional auth on event detail endpoint
const getDecodedToken = (req) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
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

// ── GET /events — published events ────────────────────────────────────────────

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

// ── GET /events/club/:clubId — public club events ─────────────────────────────

const clubIdParamSchema = z.object({
  params: z.object({ clubId: objectIdSchema }).passthrough(),
  body: z.any().optional(),
  query: z.any().optional(),
});

router.get("/club/:clubId", validate(clubIdParamSchema), async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { clubId: req.params.clubId },
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

    // Date range filter
    if (start && end) {
      const sDate = new Date(start);
      const eDate = new Date(end);
      where.startTime = { lt: eDate };
      where.endTime = { gt: sDate };
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

    // Club filter
    if (clubId && clubId !== "all") {
      where.clubId = clubId;
    }

    // Review Status filter
    if (reviewStatus && reviewStatus !== "all") {
      where.reviewStatus = reviewStatus;
    }

    // Role scoping: if faculty coordinator, scope to assigned club if not admin
    if (req.user.role === "facultyCoordinator" && req.user.clubId) {
      where.clubId = req.user.clubId;
    }

    // Category filter
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

// ── GET /events/conflicts — Conflict Center backend operational status report ──
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

    // 1. Check event vs event venue conflicts
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

    // 2. Check event vs blackout conflicts
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

    // 3. Capacity warnings (registered >= totalSeats when totalSeats > 0)
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

// ── PUT /events/:id/reschedule — Administrative event rescheduling with validation ──
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

    // Authorization check
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
            senderAdminId: req.user.role === "admin" ? req.user.userId : null,
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

// ── GET /events/club-co/:id — events created by a specific user ───────────────

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

// ── GET /events/club-manage/:clubId — management view of events for a club ───

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

// ── GET /events/club-manage/:clubId/export — export event registration stats ──

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
        const regCount = e.participations ? e.participations.length : 0;
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

// ── GET /events/user/:userId — events a user is registered for ────────────────

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

      const isExternal = userType === "external";

      const participations = await prisma.participation.findMany({
        where: isExternal ? { externalEmail: userId } : { studentId: userId },
        select: {
          id: true,
          eventId: true,
          studentId: true,
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
              year: true,
            },
          },
          team: {
            select: {
              id: true,
              teamName: true,
              leaderId: true,
              leader: { select: { id: true, name: true, email: true, rollNo: true } },
              members: {
                select: {
                  userId: true,
                  user: { select: { id: true, name: true, email: true, rollNo: true } },
                },
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });

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

// ── POST /events — create event ───────────────────────────────────────────────

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

    const start = new Date(startTime);
    const end = new Date(endTime);

    const bookingValidation = await validateBooking({ venue, startTime: start, endTime: end });
    if (bookingValidation.hasConflict) {
      return res.status(409).json({
        message: bookingValidation.message || "Venue is already booked.",
        conflict: bookingValidation
      });
    }

    const savedEvent = await prisma.event.create({
      data: {
        id: createObjectId(),
        title,
        description,
        venue,
        startTime: start,
        endTime: end,
        totalSeats: totalSeats || 0,
        entryFee: Number(entryFee || 0),
        imageUrl: imageUrl || "",
        requiredFields: requiredFields || [],
        customFields: customFields || [],
        createdById: req.user.userId,
        clubId: targetClubId,
        allowedPrograms: allowedPrograms || ["BTECH", "MTECH", "OTHER"],
        allowedYears: allowedYears || [],
        allowedBranches: allowedBranches || [],
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        registrationType: registrationType || "individual",
        minTeamSize: minTeamSize !== undefined ? Number(minTeamSize) : 1,
        maxTeamSize: maxTeamSize !== undefined ? Number(maxTeamSize) : 1,
        showWinner: showWinner || false,
        provideCertificate: provideCertificate || false,
        paymentMethod: paymentMethod || "FREE",
        registrationFee: Number(registrationFee || 0),
        paymentInstructions: paymentInstructions || null,
        collegePaymentUrl: collegePaymentUrl || null,
        upiId: upiId || null,
        accountHolderName: accountHolderName || null,
        postRegistrationMessage: postRegistrationMessage || null,
        slug: await slugifyUnique(title, 'event', 'slug'),
        reviewStatus: "PENDING",
        sponsors: { createMany: { data: (sponsors || []).map(s => ({ id: createObjectId(), ...s })) } },
        media: { createMany: { data: (media || []).map(m => ({ id: createObjectId(), ...m })) } },
      },
      include: eventInclude,
    });

    invalidatePublicResponses(["events:public:*"]);

    res.status(201).json(serializeEvent(savedEvent));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PUT /events/:id/review — faculty/admin reviews an event ──────────────────

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

      res.json({
        message: `Event ${status.toLowerCase()} successfully`,
        event: serializeEvent(updated),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── GET /events/:id — single event (optional auth for draft/pending) ──────────

router.get("/:id", async (req, res) => {
  try {
    const event = await getEventByIdOrSlug(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Calculate attended count dynamically
    const attendedCount = await prisma.participation.count({
      where: { eventId: event.id, status: 'ATTENDED' }
    });

    if (event.reviewStatus !== "PUBLISHED") {
      const decoded = getDecodedToken(req);
      const isCreator = decoded && event.createdById === decoded.userId;
      const isAdmin = decoded?.role === "admin";
      const isAssignedFaculty =
        decoded?.role === "facultyCoordinator" && event.clubId === decoded.clubId;
      const isCO =
        decoded && event.organizerType === "CENTRAL" && (decoded.role === "central_organizer" || event.centralOrganizerId === decoded.userId);

      if (!isCreator && !isAdmin && !isAssignedFaculty && !isCO) {
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
      const { externalEmail, externalName, transactionId, payerName, paymentRemarks } = req.body;
      const isExternal = !!externalEmail;
      if (req.user.role === "external" && externalEmail !== req.user.email) {
        return res.status(403).json({ message: "External users can only register with their own email." });
      }
      if (req.user.role !== "external" && isExternal) {
        return res.status(403).json({ message: "Only external users can submit external registration details." });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      // Duplicate check
      if (isExternal) {
        const existing = await prisma.participation.findFirst({
          where: { eventId, externalEmail },
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

        if (
          event.allowedYears?.length > 0 &&
          student.year &&
          !event.allowedYears.includes(student.year)
        ) {
          return res.status(403).json({
            message: `Ineligible year. This event is open only to Year [${event.allowedYears.join(", ")}] students (your year: ${student.year}).`,
            allowedYears: event.allowedYears,
            userYear: student.year,
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
          externalEmail,
          externalName: externalName || null,
          qrCode: ticketId,
          qrPayload,
          qrVersion,
          qrKeyId,
          status,
        }
        : {
          id: createObjectId(),
          eventId,
          studentId: req.user.userId,
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
          amountPaid: (event.paymentMethod === 'FREE') ? 0 : (event.registrationFee || event.entryFee || 0),
          paymentStatus: (event.paymentMethod === 'MANUAL_TRANSACTION') ? 'PENDING' : (event.paymentMethod === 'COLLEGE_PAYMENT') ? 'PENDING' : 'SUCCESS',
        };

      const participation = await prisma.$transaction(async (tx) => {
        const events = await tx.$queryRaw`
          SELECT * FROM "Event" WHERE id = ${eventId} FOR UPDATE
        `;
        const latestEvent = events[0];
        if (!latestEvent) throw new Error("Event not found");

        const latestStatus =
          latestEvent.totalSeats > 0 && latestEvent.registeredCount >= latestEvent.totalSeats
            ? "WAITLISTED"
            : "REGISTERED";

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
      res.status(500).json({ message: err.message });
    }
  },
);

// ── GET /events/:id/registrations — list participants (club/admin) ─────────────

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

      // Permission check: admin or facultyCoordinator always allowed;
      // otherwise require ClubMembership with canTakeAttendance OR canEditEvents
      const { role, userId } = req.user;
      if (role === "facultyCoordinator" && event.clubId !== req.user.clubId) {
        return res.status(403).json({ message: "Access denied. You can only view registrations for your assigned club." });
      }
      if (role !== "admin" && role !== "facultyCoordinator") {
        const membership = await prisma.clubMembership.findFirst({
          where: {
            clubId: event.clubId,
            studentId: userId,
            OR: [
              { role: "CLUB_HEAD" },
              { role: "COORDINATOR" },
              { canTakeAttendance: true },
              { canEditEvents: true },
            ],
          },
        });
        if (!membership) {
          return res.status(403).json({ message: "Access denied. You don't have permission to view registrations." });
        }
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
              year: true,
              program: true,
            },
          },
          team: {
            include: {
              leader: { select: { id: true, name: true } },
              members: { include: { user: { select: { id: true, name: true } } } }
            }
          }
        },
      });

      res.json({
        participations: participations.map((p) => ({
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
          student: p.student || null,
          teamId: p.teamId,
          team: p.team || null,
          transactionId: p.transactionId || null,
          payerName: p.payerName || null,
          paymentRemarks: p.paymentRemarks || null,
          paymentStatus: p.paymentStatus || 'SUCCESS',
          paymentReviewedBy: p.paymentReviewedBy || null,
          paymentReviewedAt: p.paymentReviewedAt || null,
          paymentReviewMessage: p.paymentReviewMessage || null,
        })),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── PUT /events/:id — update event ────────────────────────────────────────────

router.put("/:id", verifyToken, requirePermission(PERMISSIONS.EVENT_UPDATE), validate(eventUpdateSchema), async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isCreator = event.createdById === req.user.userId;
    const isCentralOrg = event.organizerType === "CENTRAL" && (req.user.role === "central_organizer" || event.centralOrganizerId === req.user.userId);
    const isClubOwner = (req.user.clubId && String(event.clubId) === String(req.user.clubId)) || (req.user.userId && String(event.clubId) === String(req.user.userId));
    const isAdminOrFaculty = req.user.role === "admin" || req.user.role === "facultyCoordinator";

    if (!isCreator && !isCentralOrg && !isClubOwner && !isAdminOrFaculty) {
      return res.status(403).json({ message: "Unauthorized to update this event." });
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
      "registrationDeadline",
      "registrationType",
      "minTeamSize",
      "maxTeamSize",
      "winners",
      "showWinner",
      "provideCertificate",
      "certificateTemplate",
      "postRegistrationMessage",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.title && updates.title !== event.title) updates.slug = await slugifyUnique(updates.title, 'event', 'slug', req.params.id);
    if (updates.startTime) updates.startTime = new Date(updates.startTime);
    if (updates.endTime) updates.endTime = new Date(updates.endTime);

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

      return tx.event.update({
        where: { id: req.params.id },
        data: updates,
        include: eventInclude,
      });
    });

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

      await prisma.event.delete({ where: { id: req.params.id } });
      return res.json({ message: "Event deleted successfully." });
    }

    // Club / Member role: submit deletion request for faculty approval
    await prisma.event.update({
      where: { id: req.params.id },
      data: { reviewStatus: "DELETION_REQUESTED" }
    });
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

// ── DELETE /events/:id/register — deregister from event ──────────────────────
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

      if (userType === "external") {
        const p = await prisma.participation.findFirst({
          where: { eventId, externalEmail: studentId },
        });
        if (!p) return res.status(404).json({ message: "Registration not found." });

        await prisma.$transaction(async (tx) => {
          await tx.participation.delete({ where: { id: p.id } });
          if (p.status === "REGISTERED") {
            await tx.event.update({
              where: { id: eventId },
              data: { registeredCount: { decrement: 1 } },
            });
          }
        });

        invalidatePublicResponses(["events:public:*"]);

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

        if (team && team.leaderId === studentId) {
          // The student deregistering is the team leader.
          // Deregister the entire team!
          const teamParticipations = await prisma.participation.findMany({
            where: { teamId: participation.teamId },
            include: { student: true }
          });

          await prisma.$transaction(async (tx) => {
            for (const tp of teamParticipations) {
              await tx.participation.delete({ where: { id: tp.id } });

              if (tp.status === "REGISTERED") {
                await tx.event.update({
                  where: { id: eventId },
                  data: { registeredCount: { decrement: 1 } },
                });
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

            // Delete team members and the team
            await tx.teamMember.deleteMany({ where: { teamId: participation.teamId } });
            await tx.team.delete({ where: { id: participation.teamId } });
          });

          invalidatePublicResponses(["events:public:*"]);

          // Send notifications to all team members (except the leader)
          for (const tp of teamParticipations) {
            if (tp.studentId && tp.studentId !== team.leaderId) {
              await notifyMemberDeregistered(
                req.io,
                tp.studentId,
                "Team Deregistered",
                `The team leader ${team.leader?.name || 'leader'} has deregistered team "${team.teamName}" from "${event.title}". Your registration has been cancelled.`
              );
            }
          }

          return res.json({ message: "Team and all members deregistered successfully." });
        } else if (team) {
          // Teammate leaving individually
          await prisma.$transaction(async (tx) => {
            await tx.participation.delete({ where: { id: participation.id } });
            await tx.teamMember.deleteMany({
              where: {
                teamId: participation.teamId,
                userId: studentId
              }
            });

            if (participation.status === "REGISTERED") {
              await tx.event.update({
                where: { id: eventId },
                data: { registeredCount: { decrement: 1 } },
              });
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

          // Notify the leader that a teammate left
          const student = await prisma.studentUser.findUnique({ where: { id: studentId } });
          await notifyMemberDeregistered(
            req.io,
            team.leaderId,
            "Teammate Left Team",
            `${student?.name || 'A teammate'} has left team "${team.teamName}" for event "${event.title}".`
          );

          return res.json({ message: "Deregistered successfully from the team." });
        }
      }

      // Individual registration
      await prisma.$transaction(async (tx) => {
        await tx.participation.delete({ where: { id: participation.id } });

        if (participation.status === "REGISTERED") {
          await tx.event.update({
            where: { id: eventId },
            data: { registeredCount: { decrement: 1 } },
          });
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

