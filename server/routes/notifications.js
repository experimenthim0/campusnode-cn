import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { sendWebPushNotification } from "../utils/sendPush.js";
import redis from "../lib/redis.js";
import { withSpan, setSpanAttribute } from "../lib/telemetry/tracer.js";

const router = express.Router();

const notificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many notifications sent. Please slow down." },
});

const internalNotificationError = (res, error, message) => {
  console.error(`[Notifications] ${message}:`, error);
  return res.status(500).json({ message });
};

router.use(verifyToken);

const senderInclude = {
  club: {
    select: { id: true, clubName: true, clubLogo: true, slug: true },
  },
  senderStudent: {
    select: {
      id: true,
      name: true,
      memberships: {
        where: { role: { in: ["CLUB_HEAD", "COORDINATOR"] } },
        include: { club: { select: { id: true, clubName: true, clubLogo: true, slug: true } } },
        take: 1,
      },
    },
  },
  senderAdmin: {
    select: { id: true, name: true, email: true },
  },
};

function formatSender(notification) {
  if (
    notification.type === "TEAM_INVITATION" ||
    notification.type === "TEAM_RESPONSE" ||
    Boolean(notification.teamId) ||
    notification.title?.toLowerCase().includes("invitation") ||
    notification.title?.toLowerCase().includes("team")
  ) {
    return { name: "Campusnode", clubName: "Campusnode" };
  }

  // Prioritize official club identity
  if (notification.club) {
    return {
      _id: notification.club.id,
      id: notification.club.id,
      name: notification.club.clubName,
      clubName: notification.club.clubName,
      clubLogo: notification.club.clubLogo,
      slug: notification.club.slug,
    };
  }

  if (notification.senderStudent) {
    const s = notification.senderStudent;
    const mClub = s.memberships?.[0]?.club;
    const clubName = mClub?.clubName || "Club Announcement";
    return {
      _id: mClub?.id || s.id,
      id: mClub?.id || s.id,
      name: clubName,
      clubName: clubName,
      clubLogo: mClub?.clubLogo,
      slug: mClub?.slug,
    };
  }
  if (notification.senderAdmin) {
    const a = notification.senderAdmin;
    return { ...a, _id: a.id, clubName: a.name || "Campus Administration" };
  }
  return { name: "Campusnode", clubName: "Campusnode" };
}

router.post(
  "/",
  notificationLimiter,
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_CREATE),
  async (req, res) => {
    return withSpan("notification.send", { "notification.action": "create" }, async (span) => {
      try {
      const { targetType, eventId, title, message, clubId: requestedClubId } = req.body;
      const { userId: sender, userType } = req.user;

      if (!title || !message || !targetType) {
        return res.status(400).json({ message: "Incomplete fields" });
      }

      // Resolve and strictly validate Club Identity
      let club = null;
      if (userType === "student") {
        const targetClubId = requestedClubId || req.user.clubId;
        if (!targetClubId) {
          return res.status(400).json({
            message: "Club ID is required. Individual student broadcasting is not permitted.",
          });
        }

        const membership = await prisma.clubMembership.findFirst({
          where: {
            studentId: sender,
            clubId: targetClubId,
            role: { in: ["CLUB_HEAD", "COORDINATOR"] },
          },
          include: {
            club: { select: { id: true, clubName: true, clubLogo: true, slug: true } },
          },
        });

        if (!membership) {
          return res.status(403).json({
            message: "Access denied: You do not have coordinator or leadership permissions for this club.",
          });
        }

        club = membership.club;
      } else if (req.user.role === "facultyCoordinator") {
        const targetClubId = requestedClubId || req.user.clubId;
        club = await prisma.club.findUnique({
          where: { id: targetClubId },
          select: { id: true, clubName: true, clubLogo: true, slug: true },
        });
      } else if (userType === "admin") {
        if (requestedClubId) {
          club = await prisma.club.findUnique({
            where: { id: requestedClubId },
            select: { id: true, clubName: true, clubLogo: true, slug: true },
          });
        }
      }

      // Redis idempotency lock: reject duplicate dispatches within 5 seconds
      const idempotencyPayload = `${sender}:${club?.id || ""}:${targetType}:${eventId || ""}:${String(title).trim()}:${String(message).trim()}`;
      const idempotencyHash = crypto.createHash("sha256").update(idempotencyPayload).digest("hex");
      const lockKey = `lock:notif:${idempotencyHash}`;
      try {
        const acquired = await redis.set(lockKey, "1", "EX", 5, "NX");
        if (!acquired) {
          return res.status(429).json({
            message: "A notification with identical content is already being processed. Please wait.",
          });
        }
      } catch (lockErr) {
        console.warn("[Notifications] Redis idempotency check warning:", lockErr.message);
      }

      let recipientStudentIds = [];

      if (targetType === "REGISTERED_STUDENTS") {
        if (!eventId) {
          return res.status(400).json({ message: "Event ID is required." });
        }

        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: { organizers: true },
        });
        if (!event) return res.status(404).json({ message: "Event not found." });

        const organizerClubIds = (event.organizers || []).map((o) => o.clubId);

        if (req.user.role === "admin" || req.user.principalType === "ADMIN") {
          // allowed
        } else if (req.user.role === "facultyCoordinator") {
          if (!organizerClubIds.includes(req.user.clubId)) {
            return res.status(403).json({ message: "Access denied for this event." });
          }
        } else {
          const membership = await prisma.clubMembership.findFirst({
            where: {
              studentId: sender,
              clubId: { in: organizerClubIds },
              role: { in: ["CLUB_HEAD", "COORDINATOR"] },
            },
          });
          if (!membership && String(event.createdById) !== String(sender)) {
            return res.status(403).json({ message: "Access denied for this event." });
          }
        }

        const participations = await prisma.participation.findMany({
          where: { eventId, studentId: { not: null } },
          select: { studentId: true },
        });
        recipientStudentIds = [...new Set(participations.map((p) => p.studentId).filter(Boolean))];
      } else if (targetType === "ALL_STUDENTS") {
        const isAllowedAll =
          req.user.role === "admin" ||
          req.user.principalType === "ADMIN" ||
          req.user.role === "facultyCoordinator";

        const hasClubHeadRole = (req.user.memberships || []).some(
          (m) => m.role === "CLUB_HEAD"
        );

        if (!isAllowedAll && !hasClubHeadRole) {
          return res.status(403).json({ message: "Broadcast permission required." });
        }

        const allStudents = await prisma.studentUser.findMany({ select: { id: true } });
        recipientStudentIds = [...new Set(allStudents.map((s) => s.id))];
      } else {
        return res.status(400).json({ message: "Invalid notification target." });
      }

      if (recipientStudentIds.length === 0) {
        return res.status(200).json({ message: "No recipients found for this target." });
      }

      const notificationsData = recipientStudentIds.map((studentId) => ({
        id: createObjectId(),
        senderStudentId: userType === "student" ? sender : null,
        senderAdminId: userType === "admin" ? sender : null,
        recipientStudentId: studentId,
        clubId: club ? club.id : null,
        eventId: eventId || null,
        type: targetType === "ALL_STUDENTS" ? "BROADCAST" : "EVENT_ANNOUNCEMENT",
        title,
        message,
      }));

      await prisma.notification.createMany({
        data: notificationsData,
      });

      // Pure Club Attribution in real-time notification payload
      const broadcastPayload = {
        id: notificationsData[0]?.id || createObjectId(),
        title,
        message,
        eventId: eventId || null,
        clubId: club ? club.id : null,
        type: targetType === "ALL_STUDENTS" ? "BROADCAST" : "EVENT_ANNOUNCEMENT",
        sender: club
          ? {
              _id: club.id,
              id: club.id,
              name: club.clubName,
              clubName: club.clubName,
              clubLogo: club.clubLogo,
              slug: club.slug,
            }
          : {
              name: req.user.name || "Campus Administration",
              clubName: "Campus Administration",
            },
      };

      if (targetType === "ALL_STUDENTS") {
        req.io.emit("new-notification", broadcastPayload);
        sendWebPushNotification(null, broadcastPayload);
      } else {
        recipientStudentIds.forEach((uId) => {
          req.io.to(uId.toString()).emit("new-notification", broadcastPayload);
        });
        sendWebPushNotification(recipientStudentIds, broadcastPayload);
      }

      return res.status(201).json({
        message: `Notification sent to ${recipientStudentIds.length} recipients.`,
        recipientCount: recipientStudentIds.length,
      });
      } catch (err) {
        internalNotificationError(res, err, "Failed to send notification.");
      }
    });
  },
);

export function getNotificationRecipientFilter(user) {
  const { userId, userType, role, clubId } = user;
  if (userType === "admin") {
    const isFaculty = role === "facultyCoordinator";
    return isFaculty && clubId
      ? {
          OR: [
            { recipientStudentId: userId },
            { clubId, recipientStudentId: null },
            { clubId, type: { in: ["BROADCAST", "EVENT_ANNOUNCEMENT", "EVENT_REVIEW_REQUEST"] } },
          ],
        }
      : {
          OR: [
            { senderAdminId: userId },
            { type: { in: ["BROADCAST", "EVENT_ANNOUNCEMENT"] }, clubId: { not: null } },
            { recipientStudentId: userId },
          ],
        };
  }
  return { recipientStudentId: userId };
}

router.get(
  "/",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const { userId, userType } = req.user;
      const scope = getNotificationRecipientFilter(req.user);

      const isPaginatedRequest =
        req.query.page !== undefined ||
        req.query.limit !== undefined ||
        req.query.tab !== undefined ||
        req.query.status !== undefined ||
        req.query.search !== undefined ||
        req.query.sort !== undefined ||
        req.query.type !== undefined;

      // Handle legacy unpaginated calls (e.g. background sync, initial scripts)
      if (!isPaginatedRequest) {
        const rawNotifications = await prisma.notification.findMany({
          where: scope,
          include: senderInclude,
          orderBy: { createdAt: "desc" },
          take: userType === "admin" ? 300 : 100,
        });

        // Deduplicate broadcast copies by (title, club/sender, minute) so admin sees 1 card per broadcast
        const seen = new Set();
        const deduplicated = [];
        for (const n of rawNotifications) {
          const senderKey = n.clubId || n.senderStudentId || n.senderAdminId || "unknown";
          const dedupeKey = `${n.title}_${senderKey}_${Math.floor(new Date(n.createdAt).getTime() / 60000)}`;
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            deduplicated.push(n);
          }
        }

        const unreadCount = deduplicated.filter(
          (n) => !(n.readBy || []).includes(userId)
        ).length;

        res.setHeader("X-Total-Count", deduplicated.length);
        res.setHeader("X-Unread-Count", unreadCount);

        return res.json(
          deduplicated.map((n) => ({
            ...n,
            _id: n.id,
            sender: formatSender(n),
          })),
        );
      }

      // ── Server-side Paginated & Filtered Query ──
      const parsedPage = parseInt(req.query.page, 10);
      const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const parsedLimit = parseInt(req.query.limit, 10);
      const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 50)
        : 15;

      const rawTab = (req.query.tab || req.query.status || "all").toLowerCase().trim();
      const tab = ["unread", "read", "all"].includes(rawTab) ? rawTab : "all";

      const sort = req.query.sort === "oldest" || req.query.sort === "asc" ? "asc" : "desc";

      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
      const type = typeof req.query.type === "string" ? req.query.type.trim() : null;

      const andConditions = [scope];

      if (tab === "unread") {
        andConditions.push({ NOT: { readBy: { has: userId } } });
      } else if (tab === "read") {
        andConditions.push({ readBy: { has: userId } });
      }

      if (search) {
        andConditions.push({
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
            { club: { clubName: { contains: search, mode: "insensitive" } } },
            { senderStudent: { name: { contains: search, mode: "insensitive" } } },
            { senderAdmin: { name: { contains: search, mode: "insensitive" } } },
          ],
        });
      }

      if (type) {
        andConditions.push({ type });
      }

      const where = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

      const [rawNotifications, total, unreadCount, readCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: senderInclude,
          orderBy: { createdAt: sort },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { AND: [scope, { NOT: { readBy: { has: userId } } }] },
        }),
        prisma.notification.count({
          where: { AND: [scope, { readBy: { has: userId } }] },
        }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      const notifications = rawNotifications.map((n) => ({
        ...n,
        _id: n.id,
        sender: formatSender(n),
      }));

      res.setHeader("X-Total-Count", total);
      res.setHeader("X-Unread-Count", unreadCount);

      return res.json({
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
        unreadCount,
        readCount,
      });
    } catch (err) {
      internalNotificationError(res, err, "Failed to fetch notifications.");
    }
  },
);

router.get("/sent", verifyToken, requirePermission(PERMISSIONS.NOTIFICATION_VIEW), async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const { clubId, page: reqPage, limit: reqLimit, search: reqSearch } = req.query;

    let baseWhere;
    if (userType === "admin") {
      const isFaculty = req.user.role === "facultyCoordinator";
      baseWhere = clubId
        ? (isFaculty && String(clubId) !== String(req.user.clubId)
            ? { id: "__unauthorized__" }
            : { clubId })
        : { senderAdminId: userId };
    } else {
      const ownsClub = !clubId || (req.user.memberships || []).some((m) => String(m.clubId) === String(clubId));
      baseWhere = ownsClub ? (clubId ? { clubId } : { senderStudentId: userId }) : { id: "__unauthorized__" };
    }

    const isPaginated = reqPage !== undefined || reqLimit !== undefined || reqSearch !== undefined;
    const parsedPage = parseInt(reqPage, 10);
    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const parsedLimit = parseInt(reqLimit, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 20;

    const andConditions = [baseWhere];
    if (typeof reqSearch === "string" && reqSearch.trim()) {
      const s = reqSearch.trim().slice(0, 100);
      andConditions.push({
        OR: [
          { title: { contains: s, mode: "insensitive" } },
          { message: { contains: s, mode: "insensitive" } },
        ],
      });
    }
    const where = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    if (isPaginated) {
      const [rawNotifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: senderInclude,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      return res.json({
        notifications: rawNotifications.map((n) => ({
          ...n,
          _id: n.id,
          sender: formatSender(n),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    }

    const rawNotifications = await prisma.notification.findMany({
      where,
      include: senderInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Deduplicate broadcast copies so user sees 1 item per broadcast event
    const seen = new Set();
    const deduplicated = [];
    for (const n of rawNotifications) {
      const senderKey = n.clubId || n.senderStudentId || n.senderAdminId || "unknown";
      const dedupeKey = `${n.title}_${senderKey}_${Math.floor(new Date(n.createdAt).getTime() / 60000)}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        deduplicated.push(n);
      }
    }

    res.json(
      deduplicated.map((n) => ({
        ...n,
        _id: n.id,
        sender: formatSender(n),
      })),
    );
  } catch (err) {
    internalNotificationError(res, err, "Failed to fetch sent notifications.");
  }
});

router.put(
  "/read-all",
  verifyToken,
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  async (req, res) => {
    try {
      const { userId, userType } = req.user;

      const recipientFilter = userType === "admin"
        ? { OR: [{ recipientStudentId: userId }, { senderAdminId: userId }] }
        : { recipientStudentId: userId };

      const unread = await prisma.notification.findMany({
        where: {
          ...recipientFilter,
          NOT: { readBy: { has: userId } },
        },
        select: { id: true },
      });

      for (const n of unread) {
        await prisma.notification.update({
          where: { id: n.id },
          data: { readBy: { push: userId } },
        });
      }

      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      internalNotificationError(res, err, "Failed to mark notifications as read.");
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

       const isFaculty = req.user.role === "facultyCoordinator";
       const authorizedWhere = userId && req.user.userType === "admin"
         ? (isFaculty
             ? {
                 id: req.params.id,
                 OR: [
                   { recipientStudentId: userId },
                   { clubId: req.user.clubId, recipientStudentId: null },
                   {
                     clubId: req.user.clubId,
                     type: { in: ["BROADCAST", "EVENT_ANNOUNCEMENT", "EVENT_REVIEW_REQUEST"] },
                   },
                 ],
               }
             : { id: req.params.id, OR: [{ recipientStudentId: userId }, { senderAdminId: userId }, { type: { in: ["BROADCAST", "EVENT_ANNOUNCEMENT"] }, clubId: { not: null } }] })
         : { id: req.params.id, recipientStudentId: userId };

       const notif = await prisma.notification.findFirst({ where: authorizedWhere });

      if (!notif) {
        return res.status(404).json({ message: "Notification not found." });
      }

      // Already marked as read — skip duplicate push
      if ((notif.readBy || []).includes(userId)) {
        return res.json({ ...notif, _id: notif.id });
      }

      const updatedRows = await prisma.$queryRaw`
        UPDATE "Notification"
        SET "readBy" = array_append("readBy", ${userId})
        WHERE "id" = ${req.params.id}
          AND NOT (${userId} = ANY("readBy"))
        RETURNING *
      `;
      const updated = updatedRows[0] || notif;

      res.json({ ...updated, _id: updated.id });
    } catch (err) {
      internalNotificationError(res, err, "Failed to mark notification as read.");
    }
  },
);

export default router;
