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

    // Check if input is a signed binary QR payload
    try {
      const verified = verifyTicket(rawInput);
      if (verified) {
        if (verified.valid) {
          targetTicketId = verified.ticketId;
          targetEventId = verified.eventId;
        } else if (verified.error === 'INVALID_SIGNATURE' || verified.error === 'INVALID_SIGNATURE_LENGTH') {
          return res.status(400).json({
            status: 'INVALID_SIGNATURE',
            message: 'Ticket signature verification failed.',
          });
        } else if (verified.error === 'UNSUPPORTED_VERSION') {
          return res.status(400).json({
            status: 'UNSUPPORTED_VERSION',
            message: 'Unsupported ticket QR version.',
          });
        }
      }
    } catch {
      // Not a signed binary payload, fallback to raw ticketId / qrCode string
    }

    // Step 1: Look up participation by ticketId, qrPayload, qrCode, or ID
    const participation = await prisma.participation.findFirst({
      where: {
        OR: [
          { qrCode: targetTicketId },
          { qrPayload: rawInput },
          { qrCode: rawInput },
          { id: targetTicketId },
          { id: rawInput },
        ],
      },
      include: {
        event: true,
        student: true,
        externalUser: { select: { name: true, collegeName: true, email: true } },
      },
    });

    if (!participation) {
      return res.status(404).json({
        status: 'UNKNOWN_TICKET',
        message: 'Ticket not found. Please check that this student registered for the event.',
      });
    }

    // Check event match if eventId was specified or extracted from QR signature
    const expectedEventId = eventIdFromRequest || targetEventId;
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

    // Step 3: Check cancelled
    if (participation.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'TICKET_REVOKED',
        message: 'This ticket registration has been cancelled.',
      });
    }

    // Step 4: Guard against double-marking (both participation status and AttendanceRecord check)
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: { eventId_participationId: { eventId: participation.eventId, participationId: participation.id } },
    });

    if (participation.status === 'ATTENDED' || existingRecord) {
      return res.status(409).json({
        status: 'ALREADY_ATTENDED',
        message: 'Attendance already recorded for this attendee.',
        participantName: participation.student?.name || participation.externalUser?.name || participation.externalName || 'Unknown',
        branch: participation.student?.branch || (participation.externalUser ? participation.externalUser.collegeName : null),
        rollNo: participation.student?.rollNo || (participation.externalUser ? 'External' : null),
        externalEmail: participation.externalEmail || participation.externalUser?.email || null,
        attendedAt: existingRecord?.scannedAt || participation.attendedAt || new Date(),
      });
    }

    // Step 5: Mark attendance in participation and attendanceRecord
    const attendanceId = createObjectId();
    const now = new Date();
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
          scannedAt: now,
          verificationMode: 'ONLINE',
        },
      }),
    ]);

    // Step 6: Return attendance confirmation
    const participantName = participation.student?.name || participation.externalUser?.name || participation.externalName || 'Unknown';
    const branch = participation.student?.branch || (participation.externalUser ? participation.externalUser.collegeName : null);
    const rollNo = participation.student?.rollNo || (participation.externalUser ? 'External' : null);
    const externalEmail = participation.externalEmail || participation.externalUser?.email || null;

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

// ── PATCH /verify/:qrCode — QR attendance scan (URL param) ────────────────────
router.patch('/verify/:qrCode', verifyToken, async (req, res) => {
  await handleVerify(req, res, req.params.qrCode, req.body?.eventId || req.query?.eventId);
});

// ── POST /verify — QR attendance scan (Request body) ──────────────────────────
router.post('/verify', verifyToken, async (req, res) => {
  await handleVerify(req, res, req.body?.qrCode, req.body?.eventId);
});

export default router;

