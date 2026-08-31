
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { createAuditLog, AUDIT_ACTIONS } from "../utils/auditLog.js";

const router = express.Router();

router.use(verifyToken);

router.get("/my-assignments", async (req, res) => {
  try {
    const userId = req.user.userId;

    const assignments = await prisma.eventStaff.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            venue: true,
            startTime: true,
            endTime: true,
            imageUrl: true,
            organizerType: true,
            registeredCount: true,
            club: { select: { id: true, clubName: true, clubLogo: true } },
            centralOrganizer: { select: { id: true, name: true, email: true } },
          },
        },
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const active = [];
    const pending = [];
    const past = [];

    for (const a of assignments) {
      if (a.status === "PENDING") {
        pending.push(a);
      } else if (a.status === "ACTIVE") {
        if (a.expiresAt && now > new Date(a.expiresAt)) {
          past.push({ ...a, status: "EXPIRED" });
        } else {
          active.push(a);
        }
      } else {
        past.push(a);
      }
    }

    res.json({ active, pending, past, all: assignments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/invitations/:staffId/accept", async (req, res) => {
  try {
    const { staffId } = req.params;
    const userId = req.user.userId;

    const staffRecord = await prisma.eventStaff.findUnique({
      where: { id: staffId },
      include: { event: { select: { id: true, title: true } } },
    });

    if (!staffRecord) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    if (staffRecord.userId !== userId) {
      return res.status(403).json({ message: "This invitation was not sent to you." });
    }

    if (staffRecord.status !== "PENDING") {
      return res.status(400).json({ message: `Invitation is already ${staffRecord.status.toLowerCase()}.` });
    }

    if (staffRecord.expiresAt && new Date() > new Date(staffRecord.expiresAt)) {
      await prisma.eventStaff.update({
        where: { id: staffId },
        data: { status: "EXPIRED" },
      });
      return res.status(400).json({ message: "This invitation has expired." });
    }

    const updated = await prisma.eventStaff.update({
      where: { id: staffId },
      data: { status: "ACTIVE" },
      include: {
        event: {
          select: { id: true, title: true, venue: true, startTime: true, endTime: true },
        },
      },
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.EVENT_STAFF_ACCEPTED,
      actorId: userId,
      actorEmail: req.user.email,
      targetId: staffId,
      eventId: staffRecord.eventId,
      metadata: { eventTitle: staffRecord.event.title, permissions: staffRecord.permissions },
    });

    res.json({
      message: "Invitation accepted. You are now active event staff!",
      staff: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/invitations/:staffId/reject", async (req, res) => {
  try {
    const { staffId } = req.params;
    const userId = req.user.userId;

    const staffRecord = await prisma.eventStaff.findUnique({
      where: { id: staffId },
      include: { event: { select: { id: true, title: true } } },
    });

    if (!staffRecord) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    if (staffRecord.userId !== userId) {
      return res.status(403).json({ message: "This invitation was not sent to you." });
    }

    if (staffRecord.status !== "PENDING") {
      return res.status(400).json({ message: `Invitation is already ${staffRecord.status.toLowerCase()}.` });
    }

    const updated = await prisma.eventStaff.update({
      where: { id: staffId },
      data: { status: "REJECTED" },
    });

    await createAuditLog({
      action: AUDIT_ACTIONS.EVENT_STAFF_REJECTED,
      actorId: userId,
      actorEmail: req.user.email,
      targetId: staffId,
      eventId: staffRecord.eventId,
      metadata: { eventTitle: staffRecord.event.title },
    });

    res.json({
      message: "Invitation rejected.",
      staff: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/events/:eventId/overview", async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    const staffRecord = await prisma.eventStaff.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!staffRecord || staffRecord.status !== "ACTIVE" || (staffRecord.expiresAt && new Date() > new Date(staffRecord.expiresAt))) {
      return res.status(403).json({ message: "Not active event staff for this event." });
    }

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
        imageUrl: true,
        description: true,
        organizerType: true,
        centralOrganizer: { select: { name: true, email: true } },
        club: { select: { clubName: true } },
      },
    });

    if (!event) return res.status(404).json({ message: "Event not found." });

    const attendedCount = await prisma.attendanceRecord.count({ where: { eventId } });

    res.json({
      event,
      attendedCount,
      registeredCount: event.registeredCount,
      permissions: staffRecord.permissions,
      expiresAt: staffRecord.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
