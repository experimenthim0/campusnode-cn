import express from "express";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { sendWebPushNotification } from "../utils/sendPush.js";

const router = express.Router();

// Defense-in-depth: all notification routes require authentication.
// Individual handlers still declare their own verifyToken + allowRoles for
// explicit per-route role checks, but this catches any future routes.
router.use(verifyToken);

// Include for sender — student, admin, institutional account, or club account
const senderInclude = {
  senderStudent: {
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        where: { role: { in: ["CLUB_HEAD", "COORDINATOR"] } },
        include: { club: { select: { clubName: true } } },
        take: 1,
      },
    },
  },
  senderAdmin: {
    select: { id: true, name: true, email: true },
  },
  senderInstitutionalAccount: {
    select: { id: true, name: true, email: true, type: true },
  },
  senderClubAccount: {
    select: {
      id: true,
      email: true,
      club: { select: { id: true, clubName: true, clubLogo: true } },
    },
  },
};

function formatSender(notification) {
  if (notification.senderStudent) {
    const s = notification.senderStudent;
    return {
      ...s,
      _id: s.id,
      clubName: s.memberships?.[0]?.club?.clubName || s.name,
    };
  }
  if (notification.senderAdmin) {
    const a = notification.senderAdmin;
    return { ...a, _id: a.id, clubName: a.name };
  }
  if (notification.senderInstitutionalAccount) {
    const inst = notification.senderInstitutionalAccount;
    return { ...inst, _id: inst.id, clubName: inst.name || "Dean Student Welfare (DSW)" };
  }
  if (notification.senderClubAccount) {
    const ca = notification.senderClubAccount;
    return { ...ca, _id: ca.id, clubName: ca.club?.clubName || "Club" };
  }
  return null;
}

// ── POST /notifications — create & broadcast ──────────────────────────────────

router.post("/", verifyToken, requirePermission(PERMISSIONS.NOTIFICATION_CREATE), async (req, res) => {
  try {
    const { targetType, eventId, title, message } = req.body;
    const { userId: sender, userType } = req.user;

    if (!title || !message || !targetType) {
      return res.status(400).json({ message: "Incomplete fields" });
    }

    let recipients = [];

    if (targetType === "REGISTERED_STUDENTS") {
      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required." });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found." });

      const isCentralAuth = req.user.role === "central_organizer" || req.user.principalType === "INSTITUTIONAL";
      if (!isCentralAuth) {
        if (req.user.role === "facultyCoordinator" && event.clubId !== req.user.clubId) {
          return res.status(403).json({ message: "Access denied for this event." });
        }
        if (req.user.principalType === "CLUB" && event.clubId !== req.user.clubId) {
          return res.status(403).json({ message: "Access denied for this event." });
        }
        if (req.user.role === "club") {
          const membership = await prisma.clubMembership.findFirst({
            where: {
              clubId: event.clubId,
              studentId: req.user.userId,
              OR: [{ role: "CLUB_HEAD" }, { role: "COORDINATOR" }, { canEditEvents: true }],
            },
          });
          if (!membership) return res.status(403).json({ message: "Access denied for this event." });
        }
      }

      const participations = await prisma.participation.findMany({
        where: { eventId },
        select: { studentId: true },
      });
      recipients = participations.map((p) => p.studentId).filter(Boolean);
    } else if (targetType === "ALL_STUDENTS") {
      const isAllowedAll =
        req.user.role === "admin" ||
        req.user.role === "club" ||
        req.user.role === "central_organizer" ||
        req.user.principalType === "INSTITUTIONAL" ||
        req.user.principalType === "CLUB";

      if (!isAllowedAll) {
        return res.status(403).json({ message: "Only admins, central organizers, and club heads can broadcast to all students." });
      }
    } else {
      return res.status(400).json({ message: "Invalid notification target." });
    }

    const isInst = req.user.principalType === "INSTITUTIONAL" || userType === "institutional";
    const isClubAcc = req.user.principalType === "CLUB" || userType === "club";

    const notification = await prisma.notification.create({
      data: {
        id: createObjectId(),
        senderStudentId: (!isInst && !isClubAcc && userType === "student") ? sender : null,
        senderAdminId: (!isInst && !isClubAcc && userType === "admin") ? sender : null,
        senderInstitutionalAccountId: isInst ? sender : null,
        senderClubAccountId: isClubAcc ? sender : null,
        title,
        message,
      },
      include: senderInclude,
    });

    const payload = {
      ...notification,
      _id: notification.id,
      sender: formatSender(notification),
    };

    if (targetType === "ALL_STUDENTS") {
      req.io.emit("new-notification", payload);
      sendWebPushNotification(null, payload);
    } else {
      recipients.forEach((uId) => {
        req.io.to(uId.toString()).emit("new-notification", payload);
      });
      sendWebPushNotification(recipients, payload);
    }

    res.status(201).json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /notifications — notifications for the requesting user ────────────────

router.get(
  "/",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const { userId, userType } = req.user;

      let notifications;

      if (userType === "admin") {
        notifications = await prisma.notification.findMany({
          where: { senderAdminId: userId },
          include: senderInclude,
          orderBy: { createdAt: "desc" },
        });
      } else if (req.user.principalType === "INSTITUTIONAL" || userType === "institutional") {
        notifications = await prisma.notification.findMany({
          where: { senderInstitutionalAccountId: userId },
          include: senderInclude,
          orderBy: { createdAt: "desc" },
        });
      } else if (req.user.principalType === "CLUB" || userType === "club") {
        notifications = await prisma.notification.findMany({
          where: { senderClubAccountId: userId },
          include: senderInclude,
          orderBy: { createdAt: "desc" },
        });
      } else {
        const student = await prisma.studentUser.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        });
        const userCreatedAt = student?.createdAt ?? new Date(0);

        notifications = await prisma.notification.findMany({
          where: {
            createdAt: { gte: userCreatedAt },
            OR: [
              { recipientStudentId: userId },
              {
                recipientStudentId: null,
                OR: [
                  { senderStudentId: { not: null } },
                  { senderAdminId: { not: null } },
                  { senderInstitutionalAccountId: { not: null } },
                  { senderClubAccountId: { not: null } },
                ],
              },
            ],
          },
          include: senderInclude,
          orderBy: { createdAt: "desc" },
        });
      }

      res.json(
        notifications.map((n) => ({
          ...n,
          _id: n.id,
          sender: formatSender(n),
        })),
      );
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── GET /notifications/sent — sent notifications ──────────────────────────────

router.get("/sent", verifyToken, requirePermission(PERMISSIONS.NOTIFICATION_VIEW), async (req, res) => {
  try {
    const { userId, userType } = req.user;

    const where =
      userType === "admin"
        ? { senderAdminId: userId }
        : (req.user.principalType === "INSTITUTIONAL" || userType === "institutional")
        ? { senderInstitutionalAccountId: userId }
        : (req.user.principalType === "CLUB" || userType === "club")
        ? { senderClubAccountId: userId }
        : { senderStudentId: userId };

    const notifications = await prisma.notification.findMany({
      where,
      include: senderInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json(
      notifications.map((n) => ({
        ...n,
        _id: n.id,
        sender: formatSender(n),
      })),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// IMPORTANT: /read-all must come BEFORE /:id/read to avoid Express
// matching "read-all" as an :id parameter.

// ── PUT /notifications/read-all ───────────────────────────────────────────────

router.put(
  "/read-all",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const { userId, userType } = req.user;

      let userCreatedAt;
      if (userType === "admin") {
        const admin = await prisma.adminRole.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        });
        userCreatedAt = admin?.createdAt ?? new Date(0);
      } else {
        const student = await prisma.studentUser.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        });
        userCreatedAt = student?.createdAt ?? new Date(0);
      }

      // Restore readBy tracking logic: updateMany doesn't support push.
      // We fetch IDs of notifications that the user hasn't read yet and update them.
      const unreadNotifications = await prisma.notification.findMany({
        where: {
          createdAt: { gte: userCreatedAt },
          NOT: {
            readBy: {
              has: userId
            }
          }
        },
        select: { id: true }
      });

      if (unreadNotifications.length > 0) {
        // Use a loop to update each notification
        for (const n of unreadNotifications) {
          await prisma.notification.update({
            where: { id: n.id },
            data: {
              readBy: {
                push: userId
              }
            }
          });
        }
      }

      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// ── PUT /notifications/:id/read ───────────────────────────────────────────────

router.put(
  "/:id/read",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const { userId } = req.user;
      const updated = await prisma.notification.update({
        where: { id: req.params.id },
        data: {
          readBy: {
            push: userId
          }
        }
      });

      res.json({ ...updated, _id: updated.id });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
