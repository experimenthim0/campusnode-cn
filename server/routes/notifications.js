import express from "express";
import rateLimit from "express-rate-limit";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { sendWebPushNotification } from "../utils/sendPush.js";

const router = express.Router();

// Rate limiter: notification creation — prevent notification spam
const notificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many notifications sent. Please slow down." },
});

// Defense-in-depth: all notification routes require authentication.
router.use(verifyToken);

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

export async function getNotificationRecipientFilter(user) {
  const { userId, userType, principalType, role, clubId } = user;
  const isSuperAdmin = role === "admin";
  const isPaymentAdmin = role === "paymentAdmin";
  const isLostFoundAdmin = role === "lostFoundAdmin";
  const isFaculty = role === "facultyCoordinator" || principalType === "FACULTY";
  const isInstitutional =
    principalType === "INSTITUTIONAL" || userType === "institutional" || role === "central_organizer";
  const isClub = principalType === "CLUB" || userType === "club";
  const isExternal = principalType === "EXTERNAL" || userType === "external" || role === "external";

  if (isFaculty) {
    const facultyClubs = await prisma.club.findMany({
      where: { facultyCoordinatorId: userId },
      select: { id: true },
    });
    const facultyClubIds = facultyClubs.map((c) => c.id);
    if (clubId && !facultyClubIds.includes(clubId)) {
      facultyClubIds.push(clubId);
    }

    return {
      OR: [
        { recipientUserId: userId },
        ...(facultyClubIds.length > 0
          ? [{ targetScope: "FACULTY_COORDINATOR", clubId: { in: facultyClubIds } }]
          : []),
        { targetScope: "GLOBAL" },
      ],
    };
  }

  if (isSuperAdmin || isPaymentAdmin || isLostFoundAdmin) {
    return {
      OR: [
        { recipientUserId: userId },
        { targetScope: "ADMIN" },
        { targetScope: "GLOBAL" },
      ],
    };
  }

  if (isInstitutional) {
    const managedEvents = await prisma.event.findMany({
      where: {
        OR: [{ institutionalAccountId: userId }, { centralOrganizerId: userId }],
      },
      select: { id: true },
    });
    const eventIds = managedEvents.map((e) => e.id);

    return {
      OR: [
        { recipientUserId: userId },
        { targetScope: "ODSW" },
        ...(eventIds.length > 0
          ? [{ targetScope: "EVENT_STAFF", eventId: { in: eventIds } }]
          : []),
        { targetScope: "GLOBAL" },
      ],
    };
  }

  if (isClub) {
    let effectiveClubId = clubId;
    if (!effectiveClubId) {
      const clubAcc = await prisma.clubAccount.findUnique({
        where: { id: userId },
        select: { clubId: true },
      });
      effectiveClubId = clubAcc?.clubId;
    }

    return {
      OR: [
        { recipientUserId: userId },
        ...(effectiveClubId
          ? [{ targetScope: "CLUB_MEMBERS", clubId: effectiveClubId }]
          : []),
        { targetScope: "GLOBAL" },
      ],
    };
  }

  if (isExternal) {
    const participations = await prisma.participation.findMany({
      where: { externalUserId: userId, status: { in: ["REGISTERED", "ATTENDED"] } },
      select: { eventId: true },
    });
    const regEventIds = participations.map((p) => p.eventId);

    return {
      OR: [
        { recipientUserId: userId },
        ...(regEventIds.length > 0
          ? [{ targetScope: "EVENT_PARTICIPANTS", eventId: { in: regEventIds } }]
          : []),
        { targetScope: "GLOBAL" },
      ],
    };
  }

  // Student user
  const [participations, staffAssignments, memberships] = await Promise.all([
    prisma.participation.findMany({
      where: { studentId: userId, status: { in: ["REGISTERED", "ATTENDED"] } },
      select: { eventId: true },
    }),
    prisma.eventStaff.findMany({
      where: { userId, status: "ACTIVE" },
      select: { eventId: true },
    }),
    prisma.clubMembership.findMany({
      where: { studentId: userId, status: "ACTIVE" },
      select: { clubId: true },
    }),
  ]);

  const regEventIds = participations.map((p) => p.eventId);
  const staffEventIds = staffAssignments.map((s) => s.eventId);
  const memberClubIds = memberships.map((m) => m.clubId);

  return {
    OR: [
      { recipientStudentId: userId },
      { recipientUserId: userId },
      { targetScope: "GLOBAL" },
      ...(regEventIds.length > 0
        ? [{ targetScope: "EVENT_PARTICIPANTS", eventId: { in: regEventIds } }]
        : []),
      ...(staffEventIds.length > 0
        ? [{ targetScope: "EVENT_STAFF", eventId: { in: staffEventIds } }]
        : []),
      ...(memberClubIds.length > 0
        ? [{ targetScope: "CLUB_MEMBERS", clubId: { in: memberClubIds } }]
        : []),
    ],
  };
}

router.post(
  "/",
  notificationLimiter,
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_CREATE),
  async (req, res) => {
    try {
      const { targetType, eventId, title, message } = req.body;
      const { userId: sender, userType } = req.user;

      if (!title || !message || !targetType) {
        return res.status(400).json({ message: "Incomplete fields" });
      }

      let recipients = [];
      let targetScope = "GLOBAL";
      let targetClubId = null;

      if (targetType === "REGISTERED_STUDENTS") {
        if (!eventId) {
          return res.status(400).json({ message: "Event ID is required." });
        }

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: "Event not found." });
        targetClubId = event.clubId || null;
        targetScope = "EVENT_PARTICIPANTS";

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
        targetScope = "GLOBAL";
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
          targetScope,
          eventId: targetScope === "EVENT_PARTICIPANTS" ? eventId : null,
          clubId: targetClubId,
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

router.get(
  "/",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const recipientFilter = await getNotificationRecipientFilter(req.user);

      let userCreatedAt = new Date(0);
      if (req.user.userType === "student") {
        const student = await prisma.studentUser.findUnique({
          where: { id: req.user.userId },
          select: { createdAt: true },
        });
        if (student?.createdAt) userCreatedAt = student.createdAt;
      }

      const notifications = await prisma.notification.findMany({
        where: {
          createdAt: { gte: userCreatedAt },
          ...recipientFilter,
        },
        include: senderInclude,
        orderBy: { createdAt: "desc" },
        take: 100,
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
  },
);

router.get("/sent", verifyToken, requirePermission(PERMISSIONS.NOTIFICATION_VIEW), async (req, res) => {
  try {
    const { userId, userType, principalType, role } = req.user;
    const isFaculty = role === "facultyCoordinator" || principalType === "FACULTY";
    const isAdminUser = userType === "admin" || principalType === "ADMIN" || role === "admin" || role === "paymentAdmin";

    const where =
      isFaculty || isAdminUser
        ? { senderAdminId: userId }
        : (principalType === "INSTITUTIONAL" || userType === "institutional")
          ? { senderInstitutionalAccountId: userId }
          : (principalType === "CLUB" || userType === "club")
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

// IMPORTANT: /read-all must come BEFORE /:id/read to avoid Express routing collision

router.put(
  "/read-all",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const { userId, userType } = req.user;
      const recipientFilter = await getNotificationRecipientFilter(req.user);

      let userCreatedAt = new Date(0);
      if (userType === "admin") {
        const admin = await prisma.adminRole.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        });
        if (admin?.createdAt) userCreatedAt = admin.createdAt;
      } else if (userType === "student") {
        const student = await prisma.studentUser.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        });
        if (student?.createdAt) userCreatedAt = student.createdAt;
      }

      const unreadNotifications = await prisma.notification.findMany({
        where: {
          createdAt: { gte: userCreatedAt },
          ...recipientFilter,
          NOT: {
            readBy: {
              has: userId,
            },
          },
        },
        select: { id: true },
      });

      if (unreadNotifications.length > 0) {
        for (const n of unreadNotifications) {
          await prisma.notification.update({
            where: { id: n.id },
            data: {
              readBy: {
                push: userId,
              },
            },
          });
        }
      }

      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.put(
  "/:id/read",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const { userId } = req.user;
      const recipientFilter = await getNotificationRecipientFilter(req.user);

      const notif = await prisma.notification.findFirst({
        where: {
          id: req.params.id,
          ...recipientFilter,
        },
      });

      if (!notif) {
        return res.status(404).json({ message: "Notification not found or access denied." });
      }

      const updated = await prisma.notification.update({
        where: { id: req.params.id },
        data: {
          readBy: {
            push: userId,
          },
        },
      });

      res.json({ ...updated, _id: updated.id });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
