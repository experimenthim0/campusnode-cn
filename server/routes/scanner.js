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
import { verifyAttendancePermission } from "../middleware/eventStaffAuth.js";
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

    // 1. Check Faculty Coordinator (FacultyUser table)
    const faculty = await prisma.facultyUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        department: true,
        coordinatedClubs: { select: { id: true, clubName: true } },
      },
    });

    if (faculty) {
      const match = await bcrypt.compare(password, faculty.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials." });

      const clubs = faculty.coordinatedClubs || [];
      if (clubs.length === 0) {
        return res.status(403).json({ message: "Scanner access requires assigned club coordinator role." });
      }

      const token = generateToken(faculty, "facultyCoordinator", "faculty", clubs[0]?.id || null, "FACULTY");

      return res.json({
        token,
        user: {
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          role: "facultyCoordinator",
          userType: "faculty",
          clubs: clubs.map((c) => ({
            id: c.id,
            name: c.clubName,
            role: "COORDINATOR",
            canTakeAttendance: true,
          })),
        },
      });
    }

    // 2. Check Admin Role (AdminRole table)
    const admin = await prisma.adminRole.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      select: { id: true, email: true, password: true, role: true, name: true },
    });

    if (admin) {
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(401).json({ message: "Invalid credentials." });

      if (admin.role !== "admin" && admin.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Scanner access requires admin role." });
      }

      const token = generateToken(admin, admin.role, "admin", null, "ADMIN");

      return res.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          userType: "admin",
          clubs: [],
        },
      });
    }

    // 2. Check Student User
    const student = await prisma.studentUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        memberships: {
          where: { role: { in: ["CLUB_HEAD", "COORDINATOR", "MEMBER"] } },
          include: { club: { select: { id: true, clubName: true } } },
        },
      },
    });

    if (!student) return res.status(401).json({ message: "Invalid credentials." });

    const match = await bcrypt.compare(password, student.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials." });

    const scannerMemberships = student.memberships.filter(
      (m) => m.canTakeAttendance || ["CLUB_HEAD", "COORDINATOR"].includes(m.role),
    );

    if (scannerMemberships.length === 0) {
      return res.status(403).json({
        message: "Scanner access requires club membership with attendance permission.",
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
        role: primaryMembership ? primaryMembership.role : "MEMBER",
        userType: "student",
        clubs: scannerMemberships.map((m) => ({
          id: m.club.id,
          name: m.club.clubName,
          membershipId: m.id,
          role: m.role,
          canTakeAttendance: m.canTakeAttendance,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/events", verifyToken, async (req, res) => {
  try {
    const { userId, role, clubId, userType } = req.user;

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
          imageUrl: true,
          organizers: {
            include: { club: { select: { id: true, clubName: true } } },
          },
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
          clubId: e.organizers[0]?.clubId || null,
          clubName: e.organizers.map((o) => o.club.clubName).join(", ") || "Campus Event",
          registeredCount: e._count.participations,
          attendedCount: attendedCountByEvent.get(e.id) || 0,
          imageUrl: e.imageUrl,
        })),
      });
    }

    const allowedClubIds = [];
    if (userType === "admin" && clubId) {
      allowedClubIds.push(clubId);
    }

    const memberships = await prisma.clubMembership.findMany({
      where: {
        studentId: userId,
        OR: [{ canTakeAttendance: true }, { role: { in: ["CLUB_HEAD", "COORDINATOR"] } }],
      },
      select: { clubId: true },
    });
    memberships.forEach((m) => allowedClubIds.push(m.clubId));

    if (allowedClubIds.length === 0) {
      return res.json({ events: [] });
    }

    const events = await prisma.event.findMany({
      where: {
        organizers: { some: { clubId: { in: allowedClubIds } } },
        reviewStatus: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        venue: true,
        startTime: true,
        endTime: true,
        imageUrl: true,
        organizers: {
          include: { club: { select: { id: true, clubName: true } } },
        },
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
        clubId: e.organizers[0]?.clubId || null,
        clubName: e.organizers.map((o) => o.club.clubName).join(", ") || "Campus Event",
        registeredCount: e._count.participations,
        attendedCount: attendedCountByEvent.get(e.id) || 0,
        imageUrl: e.imageUrl,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/events/:eventId/offline-package", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.user;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        venue: true,
        startTime: true,
        endTime: true,
        registeredCount: true,
        organizers: {
          include: { club: { select: { id: true, clubName: true } } },
        },
      },
    });

    if (!event) return res.status(404).json({ message: "Event not found." });

    const isAuthorized = await verifyAttendancePermission(userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to access attendance package for this event." });
    }

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
        student: { select: { name: true, branch: true, rollNo: true, expectedGraduationYear: true, program: true } },
        faculty: { select: { name: true, department: true, email: true } },
        externalUser: { select: { name: true, collegeName: true, email: true } },
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

    const existingAttendance = await prisma.attendanceRecord.findMany({
      where: { eventId },
      select: { participationId: true },
    });

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
        clubId: event.organizers[0]?.clubId || null,
        clubName: event.organizers.map((o) => o.club.clubName).join(", ") || "Campus Event",
        registeredCount: hydratedParticipations.length,
      },
      tickets: hydratedParticipations.map((p) => ({
        participationId: p.id,
        ticketId: p.qrCode,
        qrPayload: p.qrPayload,
        qrVersion: p.qrVersion,
        status: p.status,
        studentName: p.faculty?.name || p.student?.name || p.externalUser?.name || "Unknown",
        branch: p.faculty ? p.faculty.department : (p.student?.branch || (p.externalUser ? p.externalUser.collegeName : null)),
        rollNo: p.faculty ? `Faculty (${p.faculty.department})` : (p.student?.rollNo || (p.externalUser ? "External" : null)),
        year: p.faculty ? "Faculty" : (p.student ? calculateAcademicProgress(p.student).academicYearLabel : null),
        externalEmail: p.externalUser?.email || p.faculty?.email || null,
        collegeName: p.faculty ? "NIT Jalandhar" : (p.externalUser?.collegeName || null),
      })),
      publicKeys: [publicKeyInfo],
      existingAttendance: existingAttendance.map((a) => a.participationId),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const sessionSchema = z.object({
  body: z.object({
    eventId: z.string().min(1),
    deviceId: z.string().optional(),
    mode: z.string().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/sessions", verifyToken, validate(sessionSchema), async (req, res) => {
  const { eventId, deviceId, mode = "ONLINE" } = req.body;
  return res.status(201).json({
    session: {
      id: createObjectId(),
      eventId,
      deviceId: deviceId || "device",
      mode,
      status: "ACTIVE",
      startedAt: new Date(),
    },
  });
});

router.post("/sessions/:sessionId/end", verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  return res.json({
    session: {
      id: sessionId,
      status: "ENDED",
      endedAt: new Date(),
    },
  });
});

const checkInSchema = z.object({
  body: z
    .object({
      eventId: z.string().min(1),
      qrPayload: z.string().optional(),
      rollNo: z.string().optional(),
      ticketId: z.string().optional(),
      scannerSessionId: z.string().optional(),
      mode: z.string().optional(),
    })
    .refine((data) => Boolean(data.qrPayload || data.rollNo || data.ticketId), {
      message: "Either qrPayload, rollNo, or ticketId must be provided.",
    }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/attendance/check-in", verifyToken, validate(checkInSchema), async (req, res) => {
  try {
    const { eventId, qrPayload, rollNo, ticketId } = req.body;
    const { userId } = req.user;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found." });

    const isAuthorized = await verifyAttendancePermission(userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to mark attendance for this event." });
    }

    let participation = null;

    if (rollNo) {
      const cleanInput = rollNo.trim();
      participation = await prisma.participation.findFirst({
        where: {
          eventId,
          OR: [
            { student: { rollNo: { equals: cleanInput, mode: "insensitive" } } },
            { student: { email: { equals: cleanInput, mode: "insensitive" } } },
            { faculty: { email: { equals: cleanInput, mode: "insensitive" } } },
            { externalUser: { email: { equals: cleanInput, mode: "insensitive" } } },
          ],
        },
        include: {
          student: { select: { name: true, branch: true, rollNo: true, expectedGraduationYear: true, program: true, email: true } },
          faculty: { select: { name: true, department: true, email: true } },
          externalUser: { select: { name: true, collegeName: true, email: true } },
        },
      });
    } else if (ticketId) {
      participation = await prisma.participation.findFirst({
        where: {
          eventId,
          OR: [{ qrCode: ticketId }, { id: ticketId }],
        },
        include: {
          student: { select: { name: true, branch: true, rollNo: true, expectedGraduationYear: true, program: true } },
          faculty: { select: { name: true, department: true, email: true } },
          externalUser: { select: { name: true, collegeName: true, email: true } },
        },
      });
    } else if (qrPayload) {
      const verification = verifyTicket(qrPayload);
      if (!verification.valid) {
        return res.status(400).json({
          status: verification.error || "INVALID_SIGNATURE",
          message: "Invalid QR code.",
        });
      }

      if (verification.eventId !== eventId) {
        return res.status(400).json({
          status: "WRONG_EVENT",
          message: "This pass is not valid for this event.",
        });
      }

      participation = await prisma.participation.findFirst({
        where: {
          eventId,
          OR: [
            { qrCode: verification.ticketId },
            { qrPayload },
          ],
        },
        include: {
          student: { select: { name: true, branch: true, rollNo: true, expectedGraduationYear: true, program: true } },
          faculty: { select: { name: true, department: true, email: true } },
          externalUser: { select: { name: true, collegeName: true, email: true } },
        },
      });
    }

    if (!participation) {
      return res.status(404).json({
        status: "UNKNOWN_TICKET",
        message: rollNo ? "No registered student found for this event with the provided roll number." : "Ticket not found.",
      });
    }

    if (participation.status === "CANCELLED") {
      return res.status(400).json({
        status: "TICKET_REVOKED",
        message: "This ticket has been cancelled.",
      });
    }

    if (participation.status === "WAITLISTED") {
      return res.status(400).json({
        status: "WAITLISTED",
        message: "This ticket is currently on the waitlist and has not been confirmed for entry.",
      });
    }

    const existingAttendance = await prisma.attendanceRecord.findUnique({
      where: { eventId_participationId: { eventId, participationId: participation.id } },
    });

    if (existingAttendance) {
      return res.status(409).json({
        status: "ALREADY_ATTENDED",
        message: "Participant already checked in.",
        participant: {
          name: participation.faculty?.name || participation.student?.name || participation.externalUser?.name || "Unknown",
          branch: participation.faculty ? participation.faculty.department : (participation.student?.branch || (participation.externalUser ? participation.externalUser.collegeName : null)),
          rollNo: participation.faculty ? `Faculty (${participation.faculty.department})` : (participation.student?.rollNo || (participation.externalUser ? "External" : null)),
          year: participation.faculty ? "Faculty" : (participation.student ? calculateAcademicProgress(participation.student).academicYearLabel : null),
          collegeName: participation.faculty ? "NIT Jalandhar" : (participation.externalUser?.collegeName || null),
        },
        attendedAt: existingAttendance.scannedAt,
      });
    }

    const attendanceId = createObjectId();
    await prisma.$transaction([
      prisma.attendanceRecord.create({
        data: {
          id: attendanceId,
          eventId,
          participationId: participation.id,
          localAttendanceId: `online_${attendanceId}`,
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
      metadata: { participantName: participation.faculty?.name || participation.student?.name || participation.externalUser?.name },
    });

    return res.json({
      status: "VALID",
      message: "Check-in successful!",
      participant: {
        name: participation.faculty?.name || participation.student?.name || participation.externalUser?.name || "Unknown",
        branch: participation.faculty ? participation.faculty.department : (participation.student?.branch || (participation.externalUser ? participation.externalUser.collegeName : null)),
        rollNo: participation.faculty ? `Faculty (${participation.faculty.department})` : (participation.student?.rollNo || (participation.externalUser ? "External" : null)),
        year: participation.faculty ? "Faculty" : (participation.student ? calculateAcademicProgress(participation.student).academicYearLabel : null),
        collegeName: participation.faculty ? "NIT Jalandhar" : (participation.externalUser?.collegeName || null),
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

const syncSchema = z.object({
  body: z.object({
    eventId: z.string().min(1),
    scannerSessionId: z.string().optional(),
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
    const { eventId, records } = req.body;
    const { userId } = req.user;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found." });

    const isAuthorized = await verifyAttendancePermission(userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({
        message: "Attendance operator access was revoked or expired. Offline records cannot be synchronized.",
      });
    }

    const results = [];

    for (const record of records) {
      try {
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
            message: "Registration cancelled.",
          });
          continue;
        }

        const attendanceId = createObjectId();
        await prisma.$transaction([
          prisma.attendanceRecord.create({
            data: {
              id: attendanceId,
              eventId,
              participationId: record.participationId,
              localAttendanceId: record.localAttendanceId,
              scannedAt: new Date(record.scannedAt),
              syncedAt: new Date(),
              verificationMode: "OFFLINE",
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

router.get("/events/:eventId/sync-state", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true },
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

router.get("/events/:eventId/search-participants", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const query = (req.query.q || req.query.rollNo || "").trim();

    if (!query) {
      return res.json({ participants: [] });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true },
    });
    if (!event) return res.status(404).json({ message: "Event not found." });

    const isAuthorized = await verifyAttendancePermission(req.user.userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to view attendance for this event." });
    }

    const participants = await prisma.participation.findMany({
      where: {
        eventId,
        status: { in: ["REGISTERED", "ATTENDED"] },
        OR: [
          { student: { rollNo: { contains: query, mode: "insensitive" } } },
          { student: { name: { contains: query, mode: "insensitive" } } },
          { faculty: { name: { contains: query, mode: "insensitive" } } },
          { faculty: { email: { contains: query, mode: "insensitive" } } },
          { faculty: { department: { contains: query, mode: "insensitive" } } },
          { externalUser: { name: { contains: query, mode: "insensitive" } } },
          { externalUser: { email: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        status: true,
        attendedAt: true,
        qrCode: true,
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            branch: true,
            program: true,
            expectedGraduationYear: true,
          },
        },
        faculty: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        externalUser: {
          select: {
            id: true,
            name: true,
            email: true,
            collegeName: true,
          },
        },
      },
      take: 15,
      orderBy: [
        { status: "asc" },
      ],
    });

    return res.json({
      participants: participants.map((p) => ({
        participationId: p.id,
        status: p.status,
        attendedAt: p.attendedAt,
        ticketId: p.qrCode,
        student: p.student || (p.faculty ? {
          id: p.faculty.id,
          name: p.faculty.name,
          rollNo: `Faculty (${p.faculty.department})`,
          branch: p.faculty.department,
          program: "Faculty",
          year: "Faculty",
        } : (p.externalUser ? {
          id: p.externalUser.id,
          name: p.externalUser.name,
          rollNo: "External",
          branch: p.externalUser.collegeName,
          program: "External",
          year: "External",
        } : null)),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get(["/keys/public", "/keys"], async (req, res) => {
  try {
    const keyInfo = getPublicKeyInfo();
    return res.json({ keys: [keyInfo] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
