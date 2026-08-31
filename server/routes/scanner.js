/**
 * CampusNode Scanner API Routes
 *
 * Endpoints for the Android scanner application and web scanner interface.
 * Supports both online and offline scanning workflows with strict event-scoped authorization.
 */

import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateToken, verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { signTicket, verifyTicket, getPublicKeyInfo } from "../services/qrSigningService.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";
import { verifyAttendancePermission, EVENT_STAFF_PERMISSIONS } from "../middleware/eventStaffAuth.js";
import { createAuditLog, AUDIT_ACTIONS } from "../utils/auditLog.js";

const router = express.Router();

const getAttendedCountByEvent = async (events) => {
  if (events.length === 0) return new Map();
  const rows = await prisma.participation.groupBy({
    by: ["eventId"],
    where: { eventId: { in: events.map((event) => event.id) }, status: "ATTENDED" },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.eventId, row._count._all]));
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /scanner/login — Authenticate scanner user
// ═══════════════════════════════════════════════════════════════════════════════

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    // 1. Try ClubAccount first (Club official credentials)
    const clubAccount = await prisma.clubAccount.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" }, isActive: true },
      include: {
        club: { select: { id: true, clubName: true, slug: true, clubLogo: true } },
      },
    });

    if (clubAccount) {
      const match = await bcrypt.compare(password, clubAccount.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials." });

      const token = generateToken(clubAccount, "club", "club", clubAccount.clubId, "CLUB");

      return res.json({
        token,
        user: {
          id: clubAccount.id,
          name: clubAccount.club?.clubName || "Club Official",
          email: clubAccount.email,
          role: "club",
          userType: "club",
          clubs: [
            {
              id: clubAccount.clubId,
              name: clubAccount.club?.clubName || "Club",
              membershipId: clubAccount.id,
              role: "CLUB_HEAD",
              canTakeAttendance: true,
            },
          ],
          staffEvents: [],
        },
      });
    }

    // 2. Try InstitutionalAccount (Central Organizer entity)
    const instAccount = await prisma.institutionalAccount.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" }, isActive: true },
    });

    if (instAccount && instAccount.password) {
      const match = await bcrypt.compare(password, instAccount.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials." });

      const token = generateToken(instAccount, "central_organizer", "institutional", null, "INSTITUTIONAL");

      return res.json({
        token,
        user: {
          id: instAccount.id,
          name: instAccount.name,
          email: instAccount.email,
          role: "central_organizer",
          userType: "institutional",
          accessLevel: "central_organizer",
          clubs: [],
          staffEvents: [],
        },
      });
    }

    // 3. Try AdminRole (Faculty Coordinator / Super Admin)
    const admin = await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      select: { id: true, email: true, password: true, role: true, name: true, coordinatedClubs: { select: { id: true, clubName: true } } },
    });

    if (admin) {
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials." });

      if (admin.role !== "facultyCoordinator" && admin.role !== "admin") {
        return res.status(403).json({ message: "Scanner access requires club management role." });
      }

      const clubs = admin.coordinatedClubs;
      if (clubs.length === 0 && admin.role !== "admin") {
        return res.status(403).json({ message: "No clubs assigned." });
      }

      const token = generateToken(admin, admin.role, "admin", clubs[0]?.id || null);

      return res.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          userType: "admin",
          clubs: clubs.map((c) => ({
            id: c.id,
            name: c.clubName,
            role: "COORDINATOR",
            canTakeAttendance: true,
          })),
          staffEvents: [],
        },
      });
    }

    // 4. Try StudentUser (Club Heads, Coordinators, Attendance Operators, Event Staff, Central Organizers)
    const student = await prisma.studentUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isBlocked: true,
        accessLevel: true,
        memberships: {
          where: { role: { in: ["CLUB_HEAD", "COORDINATOR", "MEMBER"] }, status: { not: "INACTIVE" } },
          include: { club: { select: { id: true, clubName: true } } },
        },
        eventStaffAssignments: {
          where: {
            status: "ACTIVE",
            permissions: { has: EVENT_STAFF_PERMISSIONS.ATTENDANCE_OPERATOR },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: {
            event: {
              select: { id: true, title: true, slug: true, venue: true, startTime: true, endTime: true },
            },
          },
        },
      },
    });

    if (!student) return res.status(401).json({ message: "Invalid credentials." });
    if (student.isBlocked) return res.status(403).json({ message: "Account is blocked." });

    const match = await bcrypt.compare(password, student.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials." });

    // 4a. Check if user is Central Organizer
    if (student.accessLevel === "central_organizer") {
      const token = generateToken(student, "central_organizer", "student", null);
      return res.json({
        token,
        user: {
          id: student.id,
          name: student.name,
          email: student.email,
          role: "central_organizer",
          userType: "student",
          accessLevel: "central_organizer",
          clubs: [],
          staffEvents: student.eventStaffAssignments.map((s) => ({
            id: s.event.id,
            title: s.event.title,
            permissions: s.permissions,
          })),
        },
      });
    }

    // 4b. Check Club Memberships with attendance permission
    const scannerMemberships = student.memberships.filter(
      (m) => m.canTakeAttendance || ["CLUB_HEAD", "COORDINATOR"].includes(m.role),
    );

    // 4c. Check EventStaff assignments with ATTENDANCE_OPERATOR
    const activeStaffAssignments = student.eventStaffAssignments;

    if (scannerMemberships.length === 0 && activeStaffAssignments.length === 0) {
      return res.status(403).json({
        message: "Scanner access requires club membership or active event staff assignment with attendance permission.",
      });
    }

    const primaryMembership = scannerMemberships.find((m) => ["CLUB_HEAD", "COORDINATOR"].includes(m.role)) || scannerMemberships[0];
    const role = primaryMembership ? "club" : "student";
    const primaryClubId = primaryMembership?.clubId || null;

    const token = generateToken(student, role, "student", primaryClubId);

    return res.json({
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        role: primaryMembership ? primaryMembership.role : "EVENT_STAFF",
        userType: "student",
        clubs: scannerMemberships.map((m) => ({
          id: m.club.id,
          name: m.club.clubName,
          membershipId: m.id,
          role: m.role,
          canTakeAttendance: m.canTakeAttendance,
        })),
        staffEvents: activeStaffAssignments.map((s) => ({
          id: s.event.id,
          title: s.event.title,
          venue: s.event.venue,
          startTime: s.event.startTime,
          endTime: s.event.endTime,
          permissions: s.permissions,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /scanner/events — Get events the user can scan for
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/events", verifyToken, async (req, res) => {
  try {
    const { userId, role, clubId, userType } = req.user;

    // Admin can scan all published events
    if (role === "admin") {
      const events = await prisma.event.findMany({
        where: { reviewStatus: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          venue: true,
          startTime: true,
          endTime: true,
          clubId: true,
          organizerType: true,
          imageUrl: true,
          club: { select: { id: true, clubName: true } },
          _count: {
            select: {
              participations: { where: { status: { in: ["REGISTERED", "ATTENDED"] } } },
            },
          },
        },
        orderBy: { startTime: "desc" },
      });

      const attendedCountByEvent = await getAttendedCountByEvent(events);
      return res.json({
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          venue: e.venue,
          startTime: e.startTime,
          endTime: e.endTime,
          clubId: e.clubId,
          clubName: e.club?.clubName || (e.organizerType === "CENTRAL" ? "Office of DSW (Central Event)" : "College Event"),
          organizerType: e.organizerType,
          registeredCount: e._count.participations,
          attendedCount: attendedCountByEvent.get(e.id) || 0,
          imageUrl: e.imageUrl,
        })),
      });
    }

    const eventQueryOrs = [];

    // Faculty coordinator
    if (userType === "admin" && clubId) {
      eventQueryOrs.push({ clubId });
    }

    // Student club memberships with attendance rights
    const memberships = await prisma.clubMembership.findMany({
      where: {
        studentId: userId,
        OR: [{ canTakeAttendance: true }, { role: { in: ["CLUB_HEAD", "COORDINATOR"] } }],
      },
      select: { clubId: true },
    });
    if (memberships.length > 0) {
      eventQueryOrs.push({ clubId: { in: memberships.map((m) => m.clubId) } });
    }

    // Central Organizer: can scan central events
    if (role === "central_organizer") {
      eventQueryOrs.push({
        organizerType: "CENTRAL",
      });
    }

    // EventStaff with ATTENDANCE_OPERATOR
    const staffAssignments = await prisma.eventStaff.findMany({
      where: {
        userId,
        status: "ACTIVE",
        permissions: { has: EVENT_STAFF_PERMISSIONS.ATTENDANCE_OPERATOR },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { eventId: true },
    });
    if (staffAssignments.length > 0) {
      eventQueryOrs.push({ id: { in: staffAssignments.map((s) => s.eventId) } });
    }

    if (eventQueryOrs.length === 0) {
      return res.json({ events: [] });
    }

    const events = await prisma.event.findMany({
      where: {
        OR: eventQueryOrs,
        reviewStatus: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        venue: true,
        startTime: true,
        endTime: true,
        clubId: true,
        organizerType: true,
        imageUrl: true,
        club: { select: { id: true, clubName: true } },
        _count: {
          select: {
            participations: { where: { status: { in: ["REGISTERED", "ATTENDED"] } } },
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    const attendedCountByEvent = await getAttendedCountByEvent(events);
    return res.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        venue: e.venue,
        startTime: e.startTime,
        endTime: e.endTime,
        clubId: e.clubId,
        clubName: e.club?.clubName || (e.organizerType === "CENTRAL" ? "Office of DSW (Central Event)" : "College Event"),
        organizerType: e.organizerType,
        registeredCount: e._count.participations,
        attendedCount: attendedCountByEvent.get(e.id) || 0,
        imageUrl: e.imageUrl,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /scanner/events/:eventId/offline-package — Download offline scanning data
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/events/:eventId/offline-package", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.user;

    // Find event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        venue: true,
        startTime: true,
        endTime: true,
        clubId: true,
        organizerType: true,
        centralOrganizerId: true,
        registeredCount: true,
        club: { select: { id: true, clubName: true } },
      },
    });

    if (!event) return res.status(404).json({ message: "Event not found." });

    // Enforce server-side authorization check (User + Event + ATTENDANCE_OPERATOR / Club membership / Admin)
    const isAuthorized = await verifyAttendancePermission(userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to access attendance package for this event." });
    }

    // Get all registered participations
    const participations = await prisma.participation.findMany({
      where: {
        eventId,
        status: { in: ["REGISTERED", "ATTENDED"] },
      },
      select: {
        id: true,
        qrCode: true,
        qrPayload: true,
        qrVersion: true,
        status: true,
        student: { select: { name: true, branch: true, rollNo: true, expectedGraduationYear: true, academicStatus: true, program: true } },
        externalUser: { select: { name: true, collegeName: true, email: true } },
        externalName: true,
        externalEmail: true,
      },
    });

    const hydratedParticipations = await Promise.all(
      participations.map(async (participation) => {
        if (participation.qrCode && participation.qrPayload) return participation;

        const ticketId = participation.qrCode || crypto.randomBytes(12).toString("base64url");
        const signed = signTicket(eventId, ticketId);
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
      }),
    );

    // Get existing attendance records
    const existingAttendance = await prisma.attendanceRecord.findMany({
      where: { eventId },
      select: { participationId: true },
    });

    // Public key for offline verification
    const publicKeyInfo = getPublicKeyInfo();

    return res.json({
      packageVersion: 1,
      eventId: event.id,
      event: {
        title: event.title,
        slug: event.slug,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime,
        clubId: event.clubId,
        clubName: event.club?.clubName || (event.organizerType === "CENTRAL" ? "Office of DSW (Central Event)" : "College Event"),
        organizerType: event.organizerType,
        // Use the package size rather than Event.registeredCount. The counter
        // can be stale after imports/legacy data, while this is the exact set
        // the scanner has actually downloaded.
        registeredCount: hydratedParticipations.length,
      },
      tickets: hydratedParticipations.map((p) => ({
        participationId: p.id,
        ticketId: p.qrCode,
        qrPayload: p.qrPayload,
        qrVersion: p.qrVersion,
        status: p.status,
        studentName: p.student?.name || p.externalUser?.name || p.externalName || "Unknown",
        branch: p.student?.branch || (p.externalUser ? p.externalUser.collegeName : null),
        rollNo: p.student?.rollNo || (p.externalUser ? "External" : null),
        year: p.student ? calculateAcademicProgress(p.student).academicYearLabel : null,
        externalEmail: p.externalEmail || p.externalUser?.email || null,
        collegeName: p.externalUser?.collegeName || null,
      })),
      publicKeys: [publicKeyInfo],
      existingAttendance: existingAttendance.map((a) => a.participationId),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /scanner/sessions — Create a scanner session
// ═══════════════════════════════════════════════════════════════════════════════

const sessionSchema = z.object({
  body: z.object({
    eventId: z.string().min(1),
    deviceId: z.string().min(1),
    mode: z.enum(["ONLINE", "OFFLINE"]),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/sessions", verifyToken, validate(sessionSchema), async (req, res) => {
  try {
    const { eventId, deviceId, mode } = req.body;
    const { userId } = req.user;

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, clubId: true, organizerType: true, centralOrganizerId: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found." });

    // Validate user is authorized for attendance on this event
    const isAuthorized = await verifyAttendancePermission(userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to create a scanner session for this event." });
    }

    // For OFFLINE mode, check no other active offline session exists
    if (mode === "OFFLINE") {
      const existingOffline = await prisma.scannerSession.findFirst({
        where: { eventId, mode: "OFFLINE", status: "ACTIVE" },
      });
      if (existingOffline && existingOffline.deviceId !== deviceId) {
        return res.status(409).json({
          message: "Another device already has an active offline session for this event.",
          existingDeviceId: existingOffline.deviceId,
        });
      }
    }

    // Upsert session (same device + event + mode = update)
    const session = await prisma.scannerSession.upsert({
      where: { eventId_deviceId_mode: { eventId, deviceId, mode } },
      update: { status: "ACTIVE", startedAt: new Date(), endedAt: null, userId },
      create: {
        id: createObjectId(),
        eventId,
        clubId: event.clubId || null,
        userId,
        deviceId,
        mode,
      },
    });

    return res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /scanner/sessions/:sessionId/end — End a scanner session
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/sessions/:sessionId/end", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const existingSession = await prisma.scannerSession.findUnique({ where: { id: sessionId } });
    if (!existingSession) return res.status(404).json({ message: "Session not found." });

    if (req.user.role !== "admin" && existingSession.userId !== req.user.userId) {
      return res.status(403).json({ message: "Cannot end another user's session." });
    }

    const session = await prisma.scannerSession.update({
      where: { id: sessionId },
      data: { status: "ENDED", endedAt: new Date() },
    });

    return res.json({ session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /scanner/attendance/check-in — Online check-in (single scan)
// ═══════════════════════════════════════════════════════════════════════════════

const checkInSchema = z.object({
  body: z.object({
    eventId: z.string().min(1),
    qrPayload: z.string().min(1),
    scannerSessionId: z.string().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/attendance/check-in", verifyToken, validate(checkInSchema), async (req, res) => {
  try {
    const { eventId, qrPayload, scannerSessionId } = req.body;
    const { userId } = req.user;

    // Verify event exists & check authorization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, clubId: true, organizerType: true, centralOrganizerId: true, title: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found." });

    const isAuthorized = await verifyAttendancePermission(userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to mark attendance for this event." });
    }

    // If scannerSessionId provided, verify it belongs to this user and event
    if (scannerSessionId) {
      const session = await prisma.scannerSession.findUnique({ where: { id: scannerSessionId } });
      if (!session || session.eventId !== eventId || (req.user.role !== "admin" && session.userId !== userId)) {
        return res.status(403).json({ message: "Invalid scanner session." });
      }
    }

    // 1. Verify QR signature
    const verification = verifyTicket(qrPayload);
    if (!verification.valid) {
      return res.status(400).json({
        status: verification.error || "INVALID_SIGNATURE",
        message: "Invalid QR code.",
      });
    }

    // 2. Check event binding
    if (verification.eventId !== eventId) {
      return res.status(400).json({
        status: "WRONG_EVENT",
        message: "This pass is not valid for this event.",
      });
    }

    // 3. Find ticket
    const participation = await prisma.participation.findFirst({
      where: {
        eventId,
        OR: [
          { qrCode: verification.ticketId },
          // Also support a valid payload saved before the ticket-id column was
          // repaired, while still binding the lookup to this event.
          { qrPayload },
        ],
      },
      include: {
        student: { select: { name: true, branch: true, rollNo: true, expectedGraduationYear: true, academicStatus: true, program: true } },
        externalUser: { select: { name: true, collegeName: true, email: true } },
      },
    });

    if (!participation) {
      return res.status(404).json({
        status: "UNKNOWN_TICKET",
        message: "Ticket not found.",
      });
    }

    if (participation.status === "CANCELLED") {
      return res.status(400).json({
        status: "TICKET_REVOKED",
        message: "This ticket has been cancelled.",
      });
    }

    // 4. Check duplicate attendance (DB-level)
    const existingAttendance = await prisma.attendanceRecord.findUnique({
      where: { eventId_participationId: { eventId, participationId: participation.id } },
    });

    if (existingAttendance) {
      return res.status(409).json({
        status: "ALREADY_ATTENDED",
        message: "Participant already checked in.",
        participant: {
          name: participation.student?.name || participation.externalUser?.name || participation.externalName || "Unknown",
          branch: participation.student?.branch || (participation.externalUser ? participation.externalUser.collegeName : null),
          rollNo: participation.student?.rollNo || (participation.externalUser ? "External" : null),
          year: participation.student ? calculateAcademicProgress(participation.student).academicYearLabel : null,
          collegeName: participation.externalUser?.collegeName || null,
        },
        attendedAt: existingAttendance.scannedAt,
      });
    }

    // 5. Record attendance (transaction: create record + update participation status)
    const attendanceId = createObjectId();
    await prisma.$transaction([
      prisma.attendanceRecord.create({
        data: {
          id: attendanceId,
          eventId,
          participationId: participation.id,
          scannerSessionId: scannerSessionId || null,
          scannedAt: new Date(),
          verificationMode: "ONLINE",
        },
      }),
      prisma.participation.update({
        where: { id: participation.id },
        data: { status: "ATTENDED", attendedAt: new Date(), markedByMemberId: userId },
      }),
    ]);

    await createAuditLog({
      action: AUDIT_ACTIONS.ATTENDANCE_MARKED,
      actorId: userId,
      actorEmail: req.user.email,
      targetId: participation.id,
      eventId,
      source: "ONLINE",
      metadata: { participantName: participation.student?.name || participation.externalUser?.name || participation.externalName },
    });

    return res.json({
      status: "VALID",
      message: "Check-in successful!",
      participant: {
        name: participation.student?.name || participation.externalUser?.name || participation.externalName || "Unknown",
        branch: participation.student?.branch || (participation.externalUser ? participation.externalUser.collegeName : null),
        rollNo: participation.student?.rollNo || (participation.externalUser ? "External" : null),
        year: participation.student ? calculateAcademicProgress(participation.student).academicYearLabel : null,
        collegeName: participation.externalUser?.collegeName || null,
      },
      attendedAt: new Date(),
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        status: "ALREADY_ATTENDED",
        message: "Participant already checked in (concurrent scan).",
      });
    }
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /scanner/attendance/sync — Batch sync offline attendance records
// ═══════════════════════════════════════════════════════════════════════════════

const syncSchema = z.object({
  body: z.object({
    eventId: z.string().min(1),
    scannerSessionId: z.string().min(1),
    records: z.array(
      z.object({
        localAttendanceId: z.string().min(1),
        participationId: z.string().min(1),
        scannedAt: z.string().min(1),
      }),
    ),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/attendance/sync", verifyToken, validate(syncSchema), async (req, res) => {
  try {
    const { eventId, scannerSessionId, records } = req.body;
    const { userId } = req.user;

    // 1. Verify Event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, clubId: true, organizerType: true, centralOrganizerId: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found." });

    // 2. Re-validate authorization at sync time (Mandatory security: if permission revoked while offline, reject sync!)
    const isAuthorized = await verifyAttendancePermission(userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({
        message: "Attendance operator access was revoked or expired. Offline records cannot be synchronized.",
      });
    }

    // 3. Validate Scanner Session: must belong to authenticated user and match event
    let session = await prisma.scannerSession.findUnique({ where: { id: scannerSessionId } });
    if (!session) {
      // Find or create an offline session for this authorized user
      session = await prisma.scannerSession.findFirst({
        where: { eventId, userId, mode: "OFFLINE" },
      });
      if (!session) {
        session = await prisma.scannerSession.create({
          data: {
            id: createObjectId(),
            eventId,
            clubId: event.clubId || null,
            userId,
            deviceId: "synced_device",
            mode: "OFFLINE",
            status: "ACTIVE",
          },
        });
      }
    } else {
      if (session.eventId !== eventId) {
        return res.status(403).json({ message: "Scanner session does not match the event." });
      }
      if (req.user.role !== "admin" && session.userId !== userId) {
        return res.status(403).json({ message: "Scanner session does not belong to the authenticated user." });
      }
    }

    const results = [];

    for (const record of records) {
      try {
        // Check idempotency — if localAttendanceId already exists, return DUPLICATE
        const existingByLocalId = await prisma.attendanceRecord.findUnique({
          where: { localAttendanceId: record.localAttendanceId },
        });
        if (existingByLocalId) {
          results.push({
            localAttendanceId: record.localAttendanceId,
            status: "DUPLICATE",
            message: "Already synced.",
            serverAttendanceId: existingByLocalId.id,
          });
          continue;
        }

        // Check if attendance already exists for this event+participation
        const existingAttendance = await prisma.attendanceRecord.findUnique({
          where: { eventId_participationId: { eventId, participationId: record.participationId } },
        });
        if (existingAttendance) {
          results.push({
            localAttendanceId: record.localAttendanceId,
            status: "DUPLICATE",
            message: "Attendance already recorded.",
            serverAttendanceId: existingAttendance.id,
          });
          continue;
        }

        // Verify participation exists and belongs to this event
        const participation = await prisma.participation.findUnique({
          where: { id: record.participationId },
        });
        if (!participation || participation.eventId !== eventId) {
          results.push({
            localAttendanceId: record.localAttendanceId,
            status: "REJECTED",
            message: "Invalid participation.",
          });
          continue;
        }

        if (participation.status === "CANCELLED") {
          results.push({
            localAttendanceId: record.localAttendanceId,
            status: "REJECTED",
            message: "Ticket cancelled.",
          });
          continue;
        }

        // Create attendance record
        const attendanceId = createObjectId();
        await prisma.$transaction([
          prisma.attendanceRecord.create({
            data: {
              id: attendanceId,
              eventId,
              participationId: record.participationId,
              scannerSessionId: session.id,
              scannedAt: new Date(record.scannedAt),
              verificationMode: "OFFLINE",
              syncedAt: new Date(),
              localAttendanceId: record.localAttendanceId,
            },
          }),
          prisma.participation.update({
            where: { id: record.participationId },
            data: { status: "ATTENDED", attendedAt: new Date(record.scannedAt), markedByMemberId: userId },
          }),
        ]);

        results.push({
          localAttendanceId: record.localAttendanceId,
          status: "ACCEPTED",
          serverAttendanceId: attendanceId,
        });
      } catch (err) {
        if (err.code === "P2002") {
          results.push({
            localAttendanceId: record.localAttendanceId,
            status: "DUPLICATE",
            message: "Concurrent duplicate.",
          });
        } else {
          results.push({
            localAttendanceId: record.localAttendanceId,
            status: "REJECTED",
            message: err.message,
          });
        }
      }
    }

    await createAuditLog({
      action: AUDIT_ACTIONS.ATTENDANCE_SYNC,
      actorId: userId,
      actorEmail: req.user.email,
      eventId,
      source: "OFFLINE",
      metadata: {
        totalRecords: records.length,
        acceptedCount: results.filter((r) => r.status === "ACCEPTED").length,
        scannerSessionId,
      },
    });

    return res.json({
      eventId,
      syncedAt: new Date().toISOString(),
      totalRecords: records.length,
      accepted: results.filter((r) => r.status === "ACCEPTED").length,
      duplicates: results.filter((r) => r.status === "DUPLICATE").length,
      rejected: results.filter((r) => r.status === "REJECTED").length,
      results,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /scanner/events/:eventId/sync-state — Get attendance state for an event
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/events/:eventId/sync-state", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, registeredCount: true, clubId: true, organizerType: true, centralOrganizerId: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found." });

    const isAuthorized = await verifyAttendancePermission(req.user.userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized for this event." });
    }

    const attendedCount = await prisma.attendanceRecord.count({ where: { eventId } });
    const attendedIds = await prisma.attendanceRecord.findMany({
      where: { eventId },
      select: { participationId: true, scannedAt: true },
    });

    return res.json({
      eventId,
      registeredCount: event.registeredCount,
      attendedCount,
      attendedParticipations: attendedIds,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /scanner/keys/public — Get public verification keys
// ═══════════════════════════════════════════════════════════════════════════════

router.get(["/keys/public", "/keys"], async (req, res) => {
  try {
    const keyInfo = getPublicKeyInfo();
    return res.json({ keys: [keyInfo] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
