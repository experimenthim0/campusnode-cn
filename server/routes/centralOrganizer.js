/**
 * Central Organizer API Routes
 *
 * All routes are protected by verifyToken and verify:
 * 1. req.user.role === "central_organizer" (derived from server auth context)
 * 2. Event ownership: event.centralOrganizerId === req.user.userId
 *
 * The Central Organizer is a StudentUser with accessLevel = "central_organizer".
 * They use their existing CampusNode login. No separate auth system.
 */

import express from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";
import { slugifyUnique } from "../utils/slugifyUnique.js";
import { createAuditLog, AUDIT_ACTIONS } from "../utils/auditLog.js";
import { EVENT_STAFF_PERMISSIONS } from "../middleware/eventStaffAuth.js";

const router = express.Router();

function requireCentralOrganizer(req, res, next) {
  const isCO =
    req.user?.role === "central_organizer" ||
    req.user?.principalType === "INSTITUTIONAL" ||
    (req.user?.institutionalAssignments || []).some((a) => a.status === "ACTIVE");

  if (!isCO) {
    return res.status(403).json({ message: "Central Organizer access required." });
  }
  next();
}

async function verifyCentralEventOwnership(authenticatedUserId, eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      organizerType: true,
      centralOrganizerId: true,
      institutionalAccountId: true,
      clubId: true,
    },
  });
  if (!event) return { error: 404, message: "Event not found." };
  if (event.organizerType !== "CENTRAL" && !event.institutionalAccountId) {
    return { error: 403, message: "This is not a central event." };
  }
  return { event };
}

router.use(verifyToken, requireCentralOrganizer);

router.get("/events", async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        organizerType: "CENTRAL",
      },
      include: {
        participatingClubs: {
          include: { club: { select: { id: true, clubName: true, clubLogo: true } } },
        },
        _count: {
          select: {
            participations: true,
            eventStaff: true,
            attendanceRecords: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().nullable().optional(),
    venue: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    totalSeats: z.number().int().min(0).nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    allowedPrograms: z.array(z.string()).nullable().optional(),
    allowedYears: z.array(z.union([z.string(), z.number()])).nullable().optional(),
    allowedBranches: z.array(z.string()).nullable().optional(),
    registrationDeadline: z.string().nullable().optional(),
    registrationType: z.enum(["none", "individual", "team"]).nullable().optional(),
    reviewStatus: z.enum(["PUBLISHED", "DRAFT", "PENDING"]).nullable().optional(),
    minTeamSize: z.number().int().min(1).nullable().optional(),
    maxTeamSize: z.number().int().min(1).nullable().optional(),
    provideCertificate: z.boolean().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    registrationFee: z.number().min(0).nullable().optional(),
    paymentInstructions: z.string().nullable().optional(),
    requiredFields: z.array(z.string()).nullable().optional(),
    customFields: z.any().nullable().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/events", async (req, res) => {
  try {
    const parsed = createEventSchema.safeParse(req);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const {
      title, description, venue, startTime, endTime, totalSeats,
      imageUrl, allowedPrograms, allowedYears, allowedBranches,
      registrationDeadline, registrationType, reviewStatus, minTeamSize, maxTeamSize,
      provideCertificate, paymentMethod, registrationFee, paymentInstructions,
      requiredFields, customFields,
    } = req.body;

    const eventId = createObjectId();
    const slug = await slugifyUnique(title, "event", "slug");

    const effectiveRegType = registrationType || "individual";
    const effectiveReviewStatus = reviewStatus || "PUBLISHED";

    const dswAccount = await prisma.institutionalAccount.findFirst({
      where: { type: "DSW", isActive: true },
    });

    const isStudent = req.user.principalType === "STUDENT" || req.user.userType === "student";
    const studentCreator = isStudent ? await prisma.studentUser.findUnique({ where: { id: req.user.userId }, select: { id: true } }) : null;

    const event = await prisma.event.create({
      data: {
        id: eventId,
        title,
        description: description || null,
        venue,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        totalSeats: effectiveRegType === "none" ? 0 : (totalSeats || 0),
        imageUrl: imageUrl || null,
        organizerType: "CENTRAL",
        centralOrganizerId: studentCreator?.id || null,
        institutionalAccountId: dswAccount?.id || (req.user.principalType === "INSTITUTIONAL" ? req.user.userId : null),
        createdById: studentCreator?.id || null,
        clubId: null, // Central events have no single club owner
        slug,
        reviewStatus: effectiveReviewStatus,
        allowedPrograms: allowedPrograms || ["BTECH", "MTECH", "OTHER"],
        allowedYears: allowedYears || [],
        allowedBranches: allowedBranches || [],
        registrationDeadline: (effectiveRegType === "none" || !registrationDeadline) ? null : new Date(registrationDeadline),
        registrationType: effectiveRegType,
        minTeamSize: minTeamSize || 1,
        maxTeamSize: maxTeamSize || 1,
        provideCertificate: provideCertificate || false,
        paymentMethod: effectiveRegType === "none" ? "FREE" : (paymentMethod || "FREE"),
        registrationFee: effectiveRegType === "none" ? 0 : (registrationFee || 0),
        paymentInstructions: paymentInstructions || null,
        requiredFields: effectiveRegType === "none" ? [] : (requiredFields || []),
        customFields: customFields || null,
      },
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.CENTRAL_EVENT_CREATED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      eventId: event.id,
      metadata: { title: event.title },
    });

    res.status(201).json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/events/:eventId", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    // Only allow safe fields — NEVER accept organizerType, centralOrganizerId, clubId from body
    const {
      title, description, venue, startTime, endTime, totalSeats,
      imageUrl, allowedPrograms, allowedYears, allowedBranches,
      registrationDeadline, registrationType, minTeamSize, maxTeamSize,
      provideCertificate, paymentMethod, registrationFee, paymentInstructions,
      requiredFields, customFields, showWinner, winners, reviewStatus,
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (venue !== undefined) updateData.venue = venue;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (totalSeats !== undefined) updateData.totalSeats = totalSeats;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (allowedPrograms !== undefined) updateData.allowedPrograms = allowedPrograms;
    if (allowedYears !== undefined) updateData.allowedYears = allowedYears;
    if (allowedBranches !== undefined) updateData.allowedBranches = allowedBranches;
    if (registrationDeadline !== undefined) updateData.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null;
    if (registrationType !== undefined) {
      updateData.registrationType = registrationType;
      if (registrationType === "none") {
        updateData.registeredCount = 0;
      }
    }
    if (minTeamSize !== undefined) updateData.minTeamSize = minTeamSize;
    if (maxTeamSize !== undefined) updateData.maxTeamSize = maxTeamSize;
    if (provideCertificate !== undefined) updateData.provideCertificate = provideCertificate;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (registrationFee !== undefined) updateData.registrationFee = registrationFee;
    if (paymentInstructions !== undefined) updateData.paymentInstructions = paymentInstructions;
    if (requiredFields !== undefined) updateData.requiredFields = requiredFields;
    if (customFields !== undefined) updateData.customFields = customFields;
    if (showWinner !== undefined) updateData.showWinner = showWinner;
    if (winners !== undefined) updateData.winners = winners;
    if (reviewStatus !== undefined) updateData.reviewStatus = reviewStatus;

    const updated = await prisma.event.update({
      where: { id: req.params.eventId },
      data: updateData,
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.CENTRAL_EVENT_UPDATED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      eventId: updated.id,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    res.json({ event: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/events/:eventId", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    await prisma.featuredEvent.deleteMany({ where: { eventId: req.params.eventId } });
    await prisma.event.delete({ where: { id: req.params.eventId } });

    await createAuditLog({
      action: AUDIT_ACTIONS.CENTRAL_EVENT_DELETED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      eventId: req.params.eventId,
      metadata: { title: ownership.event.title },
    });

    res.json({ message: "Event deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/events/:eventId/clubs", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    const { clubId } = req.body;
    if (!clubId) return res.status(400).json({ message: "clubId is required." });

    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, clubName: true } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    const eventClub = await prisma.eventClub.create({
      data: {
        id: createObjectId(),
        eventId: req.params.eventId,
        clubId,
      },
    });

    res.status(201).json({ eventClub, club });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Club is already participating." });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete("/events/:eventId/clubs/:clubId", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    await prisma.eventClub.deleteMany({
      where: { eventId: req.params.eventId, clubId: req.params.clubId },
    });

    res.json({ message: "Club removed from event." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/events/:eventId/staff", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    const staff = await prisma.eventStaff.findMany({
      where: {
        eventId: req.params.eventId,
        status: { not: "REVOKED" },
      },
      include: {
        user: { select: { id: true, name: true, email: true, profileImage: true, branch: true, expectedGraduationYear: true, academicStatus: true, program: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedStaff = staff.map((st) => ({
      ...st,
      user: st.user
        ? {
            ...st.user,
            year: calculateAcademicProgress(st.user).academicYearLabel,
            academicYear: calculateAcademicProgress(st.user).academicYear,
            semester: calculateAcademicProgress(st.user).semester,
          }
        : null,
    }));

    res.json({ staff: enrichedStaff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const inviteStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    permissions: z.array(z.string()).min(1),
    expiresAt: z.string().nullable().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post("/events/:eventId/staff", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    const parsed = inviteStaffSchema.safeParse(req);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const { email, permissions, expiresAt } = req.body;

    const validPermissions = Object.values(EVENT_STAFF_PERMISSIONS);
    const invalidPerms = permissions.filter((p) => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return res.status(400).json({
        message: `Invalid permissions: ${invalidPerms.join(", ")}`,
        validPermissions,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const student = await prisma.studentUser.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
      select: { id: true, name: true, email: true, isBlocked: true },
    });

    if (!student) {
      return res.status(404).json({
        message: "No CampusNode account found for this email. The student must register first.",
      });
    }

    if (student.isBlocked) {
      return res.status(403).json({ message: "This student's account is blocked." });
    }

    if (student.id === req.user.userId) {
      return res.status(400).json({ message: "You cannot invite yourself as event staff." });
    }

    const existingStaff = await prisma.eventStaff.findFirst({
      where: {
        eventId: req.params.eventId,
        userId: student.id,
      },
    });

    const isStudent = req.user.principalType === "STUDENT" || req.user.userType === "student";
    const studentInviter = isStudent ? await prisma.studentUser.findUnique({ where: { id: req.user.userId }, select: { id: true } }) : null;

    let staffRecord;
    if (existingStaff) {
      if (existingStaff.status === "ACTIVE" || existingStaff.status === "PENDING") {
        return res.status(409).json({
          message: "This student already has an active or pending staff invitation for this event.",
        });
      }

      staffRecord = await prisma.eventStaff.update({
        where: { id: existingStaff.id },
        data: {
          invitedById: studentInviter?.id || null,
          permissions,
          status: "PENDING",
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          revokedAt: null,
        },
      });
    } else {
      const staffId = createObjectId();
      staffRecord = await prisma.eventStaff.create({
        data: {
          id: staffId,
          eventId: req.params.eventId,
          userId: student.id,
          invitedById: studentInviter?.id || null,
          permissions,
          status: "PENDING",
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
    }

    try {
      const isInst = req.user.principalType === "INSTITUTIONAL" || req.user.userType === "institutional";
      await prisma.notification.create({
        data: {
          id: createObjectId(),
          senderStudentId: studentInviter?.id || null,
          senderInstitutionalAccountId: isInst ? req.user.userId : null,
          recipientStudentId: student.id,
          eventId: req.params.eventId,
          type: "EVENT_STAFF_INVITATION",
          title: "Event Staff Invitation",
          message: `You've been invited as event staff for "${ownership.event.title}". Permissions: ${permissions.join(", ")}. ${expiresAt ? `Expires: ${new Date(expiresAt).toLocaleString()}` : ""}`,
        },
      });
    } catch (notifErr) {
      console.error("Notification creation failed:", notifErr.message);
    }

    await createAuditLog({
      action: AUDIT_ACTIONS.EVENT_STAFF_INVITED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      targetId: student.id,
      eventId: req.params.eventId,
      metadata: { permissions, expiresAt: expiresAt || null, studentEmail: student.email },
    });

    res.status(201).json({
      staff: staffRecord,
      student: { id: student.id, name: student.name, email: student.email },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "This student is already invited/assigned to this event." });
    }
    res.status(500).json({ message: err.message });
  }
});

router.put("/events/:eventId/staff/:staffId", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    const staffRecord = await prisma.eventStaff.findFirst({
      where: { id: req.params.staffId, eventId: req.params.eventId },
    });
    if (!staffRecord) return res.status(404).json({ message: "Staff record not found." });

    const updateData = {};
    if (req.body.permissions) {
      const validPermissions = Object.values(EVENT_STAFF_PERMISSIONS);
      const invalidPerms = req.body.permissions.filter((p) => !validPermissions.includes(p));
      if (invalidPerms.length > 0) {
        return res.status(400).json({ message: `Invalid permissions: ${invalidPerms.join(", ")}` });
      }
      updateData.permissions = req.body.permissions;
    }
    if (req.body.expiresAt !== undefined) {
      updateData.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    }

    const updated = await prisma.eventStaff.update({
      where: { id: req.params.staffId },
      data: updateData,
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.EVENT_STAFF_PERMISSIONS_UPDATED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      targetId: staffRecord.userId,
      eventId: req.params.eventId,
      metadata: { updatedFields: Object.keys(updateData), previousPermissions: staffRecord.permissions },
    });

    res.json({ staff: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/events/:eventId/staff/:staffId", async (req, res) => {
  try {
    const ownership = await verifyCentralEventOwnership(req.user.userId, req.params.eventId);
    if (ownership.error) {
      return res.status(ownership.error).json({ message: ownership.message });
    }

    const staffRecord = await prisma.eventStaff.findFirst({
      where: { id: req.params.staffId, eventId: req.params.eventId },
    });
    if (!staffRecord) return res.status(404).json({ message: "Staff record not found." });

    await prisma.eventStaff.update({
      where: { id: req.params.staffId },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.EVENT_STAFF_REVOKED,
      actorId: req.user.userId,
      actorEmail: req.user.email,
      targetId: staffRecord.userId,
      eventId: req.params.eventId,
    });

    res.json({ message: "Event staff access revoked." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/dashboard-stats", async (req, res) => {
  try {
    const [eventCount, upcomingEvents, totalRegistrations, totalAttendance, activeStaff] =
      await Promise.all([
        prisma.event.count({
          where: { organizerType: "CENTRAL" },
        }),
        prisma.event.count({
          where: {
            organizerType: "CENTRAL",
            startTime: { gte: new Date() },
          },
        }),
        prisma.participation.count({
          where: {
            event: { organizerType: "CENTRAL" },
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            event: { organizerType: "CENTRAL" },
          },
        }),
        prisma.eventStaff.count({
          where: {
            event: { organizerType: "CENTRAL" },
            status: "ACTIVE",
          },
        }),
      ]);

    res.json({
      totalEvents: eventCount,
      upcomingEvents,
      totalRegistrations,
      totalAttendance,
      activeStaff,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/audit-logs", async (req, res) => {
  try {
    const { eventId, action, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const coEvents = await prisma.event.findMany({
      where: {
        organizerType: "CENTRAL",
      },
      select: { id: true, title: true },
    });

    const eventIds = coEvents.map((e) => e.id);
    const eventMap = new Map(coEvents.map((e) => [e.id, e.title]));

    const whereConditions = {
      OR: [
        { actorId: req.user.userId },
        ...(eventIds.length > 0 ? [{ eventId: { in: eventIds } }] : []),
      ],
    };

    if (eventId && eventId !== "ALL") {
      if (!eventIds.includes(eventId)) {
        return res.status(403).json({ message: "You do not have access to logs for this event." });
      }
      whereConditions.eventId = eventId;
      delete whereConditions.OR;
    }

    if (action && action !== "ALL") {
      whereConditions.action = action;
    }

    if (search && search.trim()) {
      const s = search.trim();
      whereConditions.AND = [
        {
          OR: [
            { actorEmail: { contains: s, mode: "insensitive" } },
            { action: { contains: s, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: whereConditions }),
      prisma.auditLog.findMany({
        where: whereConditions,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
    ]);

    const enrichedLogs = logs.map((log) => ({
      ...log,
      eventTitle: log.eventId ? (eventMap.get(log.eventId) || "Central Event") : null,
    }));

    res.json({
      logs: enrichedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      availableActions: Object.values(AUDIT_ACTIONS),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/students/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ students: [] });
    }

    const query = q.trim();

    // Fetch non-student accounts (clubs, admins, institutional) to strictly exclude them
    const [clubAccounts, admins, instAccounts] = await Promise.all([
      prisma.clubAccount.findMany({ select: { email: true } }),
      prisma.adminRole.findMany({ select: { email: true } }),
      prisma.institutionalAccount.findMany({ select: { email: true } }),
    ]);

    const excludedEmails = [
      ...clubAccounts.map((c) => (c.email ? c.email.toLowerCase() : "")),
      ...admins.map((a) => (a.email ? a.email.toLowerCase() : "")),
      ...instAccounts.map((i) => (i.email ? i.email.toLowerCase() : "")),
    ].filter(Boolean);

    const students = await prisma.studentUser.findMany({
      where: {
        isBlocked: false,
        email: { notIn: excludedEmails },
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { rollNo: { contains: query, mode: "insensitive" } },
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
      take: 10,
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

    res.json({ students: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
