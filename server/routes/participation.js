import express from 'express';
import { z } from 'zod';
import { verifyToken } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { verifyTicket } from '../services/qrSigningService.js';
import { createObjectId } from '../utils/objectId.js';
import { verifyAttendancePermission } from '../middleware/eventStaffAuth.js';
import { createAuditLog, AUDIT_ACTIONS } from '../utils/auditLog.js';

const router = express.Router();

/**
 * Universal attendance verification logic.
 * Handles signed QR payloads (v1 Ed25519), legacy ticket IDs, and direct database lookups.
 */
async function handleVerify(req, res, qrCodeInput, eventIdFromRequest) {
  try {
    const rawInput = (qrCodeInput || '').trim();
    if (!rawInput) {
      return res.status(400).json({
        status: 'INVALID_INPUT',
        message: 'QR code or ticket identifier is required.',
      });
    }

    let targetTicketId = rawInput;
    let targetEventId = null;

    // Only test as signed QR payload if input has sufficient length (> 70 chars) and is not an explicit rollNo
    if (rawInput.length > 70) {
      try {
        const verified = verifyTicket(rawInput);
        if (verified) {
          if (verified.valid) {
            targetTicketId = verified.ticketId;
            targetEventId = verified.eventId;
          } else if (verified.error === 'INVALID_SIGNATURE') {
            return res.status(400).json({
              status: 'INVALID_SIGNATURE',
              message: 'Ticket signature verification failed.',
            });
          }
        }
      } catch {
        // Not a signed binary payload, fallback to raw string database lookup
      }
    }

    const expectedEventId = eventIdFromRequest || targetEventId;

    // Step 1: Look up participation by rollNo, ticketId, qrPayload, qrCode, or ID
    const participation = await prisma.participation.findFirst({
      where: {
        ...(expectedEventId ? { eventId: expectedEventId } : {}),
        OR: [
          { student: { rollNo: { equals: rawInput, mode: 'insensitive' } } },
          { student: { email: { equals: rawInput, mode: 'insensitive' } } },
          { externalUser: { email: { equals: rawInput, mode: 'insensitive' } } },
          { faculty: { email: { equals: rawInput, mode: 'insensitive' } } },
          { qrCode: targetTicketId },
          { qrPayload: rawInput },
          { qrCode: rawInput },
          { id: targetTicketId },
          { id: rawInput },
        ],
      },
      include: {
        event: { include: { organizers: true } },
        student: true,
        externalUser: { select: { name: true, collegeName: true, email: true } },
        faculty: { select: { id: true, name: true, email: true, department: true, designation: true } },
      },
    });

    if (!participation) {
      return res.status(404).json({
        status: 'UNKNOWN_TICKET',
        message: 'No registered student or ticket found for this event matching the provided roll number or identifier.',
      });
    }

    if (expectedEventId && participation.eventId !== expectedEventId) {
      return res.status(400).json({
        status: 'WRONG_EVENT',
        message: `This pass is registered for "${participation.event?.title || 'another event'}", not this event.`,
      });
    }

    // Step 2: Check caller has permission (Admin, Faculty Coordinator, Club Manager, Central Organizer, or Event Staff with ATTENDANCE_OPERATOR)
    const { userId } = req.user;
    const isAuthorized = await verifyAttendancePermission(userId, participation.eventId, participation.event, req.user);

    if (!isAuthorized) {
      return res.status(403).json({
        status: 'UNAUTHORIZED',
        message: 'Unauthorized: You do not have attendance operator permissions for this event.',
      });
    }

    if (participation.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'TICKET_REVOKED',
        message: 'This ticket registration has been cancelled.',
      });
    }

    // Step 3: Check check-in window (Check-in opens 4 hours before event starts and closes when event ends)
    const now = new Date();
    const event = participation.event;
    if (event?.startTime) {
      const startTime = new Date(event.startTime).getTime();
      const opensAt = startTime - 4 * 60 * 60 * 1000;
      if (now.getTime() < opensAt) {
        return res.status(403).json({
          status: 'CHECKIN_NOT_OPEN',
          message: 'Check-in is not open yet. It opens 4 hours before the event starts.',
          opensAt: new Date(opensAt),
          startTime: new Date(startTime),
        });
      }
    }

    if (event?.endTime) {
      const endTime = new Date(event.endTime).getTime();
      if (now.getTime() > endTime) {
        return res.status(403).json({
          status: 'CHECKIN_CLOSED',
          message: 'Check-in has closed as the event has already ended.',
          endTime: new Date(endTime),
        });
      }
    }

    // Step 4: Guard against double-marking (both participation status and AttendanceRecord check)
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: { eventId_participationId: { eventId: participation.eventId, participationId: participation.id } },
    });

    if (participation.status === 'ATTENDED' || existingRecord) {
      return res.status(409).json({
        status: 'ALREADY_ATTENDED',
        message: 'Attendance already recorded for this attendee.',
        participantName: participation.student?.name || participation.faculty?.name || participation.externalUser?.name || 'Unknown',
        branch: participation.student?.branch || participation.faculty?.department || (participation.externalUser ? participation.externalUser.collegeName : null),
        rollNo: participation.student?.rollNo || (participation.faculty ? 'Faculty' : (participation.externalUser ? 'External' : null)),
        externalEmail: participation.externalUser?.email || participation.faculty?.email || null,
        attendedAt: existingRecord?.scannedAt || participation.attendedAt || new Date(),
      });
    }

    // Step 5: Mark attendance in participation and attendanceRecord
    const attendanceId = createObjectId();
    await prisma.$transaction([
      prisma.participation.update({
        where: { id: participation.id },
        data: {
          status: 'ATTENDED',
          attendedAt: now,
          markedByMemberId: userId,
        },
      }),
      prisma.attendanceRecord.create({
        data: {
          id: attendanceId,
          eventId: participation.eventId,
          participationId: participation.id,
          localAttendanceId: `online_${attendanceId}`,
          scannedAt: now,
          verificationMode: 'ONLINE',
        },
      }),
    ]);

    const participantName = participation.student?.name || participation.faculty?.name || participation.externalUser?.name || 'Unknown';
    const branch = participation.student?.branch || participation.faculty?.department || (participation.externalUser ? participation.externalUser.collegeName : null);
    const rollNo = participation.student?.rollNo || (participation.faculty ? 'Faculty' : (participation.externalUser ? 'External' : null));
    const externalEmail = participation.externalUser?.email || participation.faculty?.email || null;

    return res.status(200).json({
      status: 'VALID',
      message: 'Attendance recorded successfully!',
      participantName,
      branch,
      rollNo,
      externalEmail,
      attendedAt: now,
      markedByMemberId: userId,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'ALREADY_ATTENDED',
        message: 'Attendance already recorded for this attendee.',
      });
    }
    return res.status(500).json({ message: err.message });
  }
}

router.patch('/verify/:qrCode', verifyToken, async (req, res) => {
  await handleVerify(req, res, req.params.qrCode, req.body?.eventId || req.query?.eventId);
});

router.post('/verify', verifyToken, async (req, res) => {
  const input = req.body?.rollNo || req.body?.qrCode || req.body?.identifier;
  await handleVerify(req, res, input, req.body?.eventId);
});

// Search registered students strictly for this event
router.get('/event/:eventId/search-participants', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const query = (req.query.q || req.query.rollNo || '').trim();

    if (!query) {
      return res.json({ participants: [] });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizers: true },
    });
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const isAuthorized = await verifyAttendancePermission(req.user.userId, eventId, event, req.user);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to view attendance for this event.' });
    }

    const participants = await prisma.participation.findMany({
      where: {
        eventId,
        status: { in: ['REGISTERED', 'ATTENDED'] },
        OR: [
          { student: { rollNo: { contains: query, mode: 'insensitive' } } },
          { student: { name: { contains: query, mode: 'insensitive' } } },
          { student: { email: { contains: query, mode: 'insensitive' } } },
          { faculty: { name: { contains: query, mode: 'insensitive' } } },
          { faculty: { email: { contains: query, mode: 'insensitive' } } },
          { faculty: { department: { contains: query, mode: 'insensitive' } } },
          { externalUser: { name: { contains: query, mode: 'insensitive' } } },
          { externalUser: { email: { contains: query, mode: 'insensitive' } } },
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
            email: true,
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
            designation: true,
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
        { status: 'asc' }, // REGISTERED first, then ATTENDED
      ],
    });

    return res.json({
      participants: participants.map((p) => ({
        participationId: p.id,
        status: p.status,
        attendedAt: p.attendedAt,
        ticketId: p.qrCode,
        isFaculty: !!p.faculty,
        faculty: p.faculty,
        student: p.student || (p.faculty ? {
          id: p.faculty.id,
          name: p.faculty.name,
          rollNo: 'Faculty',
          email: p.faculty.email,
          branch: p.faculty.department,
          department: p.faculty.department,
          designation: p.faculty.designation,
          isFaculty: true,
        } : (p.externalUser ? {
          id: p.externalUser.id,
          name: p.externalUser.name,
          rollNo: 'External',
          email: p.externalUser.email,
          branch: p.externalUser.collegeName,
        } : null)),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

