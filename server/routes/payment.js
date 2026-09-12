import express from "express";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { sendWebPushNotification } from "../utils/sendPush.js";

const router = express.Router();

router.put(
  "/:participationId/review",
  verifyToken,
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  async (req, res) => {
    const { status, message } = req.body;
    const { participationId } = req.params;

    try {
      let resolvedStatus = status;
      if (status === "APPROVED") resolvedStatus = "SUCCESS";
      if (status === "REJECTED" || status === "NEED_MORE_DETAILS") resolvedStatus = "FAILED";

      if (!["SUCCESS", "FAILED", "PENDING"].includes(resolvedStatus)) {
        return res.status(400).json({ message: "Invalid review status. Must be SUCCESS, FAILED, or PENDING." });
      }

      const participation = await prisma.participation.findUnique({
        where: { id: participationId },
        include: {
          event: { include: { organizers: true } },
          student: { select: { id: true, name: true, email: true } },
        },
      });

      if (!participation) {
        return res.status(404).json({ message: "Registration not found." });
      }

      if (participation.paymentStatus === resolvedStatus) {
        return res.json({
          success: true,
          message: `Payment is already marked as ${resolvedStatus === "SUCCESS" ? "approved" : resolvedStatus.toLowerCase()}.`,
          alreadyProcessed: true,
          paymentStatus: resolvedStatus,
        });
      }

      const organizerClubIds = (participation.event.organizers || []).map((o) => o.clubId);

      if (req.user.role !== "admin" && req.user.principalType !== "ADMIN") {
        const isFaculty = req.user.role === "facultyCoordinator" && req.user.clubId && organizerClubIds.includes(req.user.clubId);
        const membership = await prisma.clubMembership.findFirst({
          where: {
            clubId: { in: organizerClubIds },
            studentId: req.user.userId,
            OR: [{ role: "CLUB_HEAD" }, { role: "COORDINATOR" }],
          },
        });

        if (!isFaculty && !membership) {
          return res.status(403).json({
            message: "Only club heads or coordinators can review payments.",
          });
        }
      }

      const updateData = {
        paymentStatus: resolvedStatus,
        paymentReviewedBy: req.user.userId,
        paymentReviewedAt: new Date(),
      };

      if (message) {
        updateData.paymentReviewMessage = message;
      }

      await prisma.participation.update({
        where: { id: participationId },
        data: updateData,
      });

      if (participation.studentId) {
        const notificationTitle =
          resolvedStatus === "SUCCESS"
            ? "Payment Approved"
            : resolvedStatus === "FAILED"
              ? "Payment Rejected"
              : "Payment Under Review";

        const notificationMessage =
          resolvedStatus === "SUCCESS"
            ? `Your payment for "${participation.event.title}" has been approved. You are now registered!`
            : resolvedStatus === "FAILED"
              ? `Your payment for "${participation.event.title}" was not approved.${message ? ` Reason: ${message}` : ""}`
              : `Your payment for "${participation.event.title}" is being reviewed.${message ? ` Message: ${message}` : ""}`;

        const notification = await prisma.notification.create({
          data: {
            id: createObjectId(),
            recipientStudentId: participation.studentId,
            title: notificationTitle,
            message: notificationMessage,
            eventId: participation.eventId,
            type: "PAYMENT_REVIEW",
          },
        });

        const payload = {
          ...notification,
          _id: notification.id,
          sender: { name: "System" },
          link: `/my-events?eventId=${participation.eventId}`,
        };

        if (req.io) {
          req.io.to(participation.studentId).emit("new-notification", payload);
        }
        sendWebPushNotification(participation.studentId, payload);
      }

      res.json({
        success: true,
        message: `Payment status updated to ${resolvedStatus}.`,
      });
    } catch (error) {
      res.status(500).json({ message: "Review failed", error: error.message });
    }
  },
);

router.get(
  "/event/:eventId/registrations",
  verifyToken,
  requirePermission(PERMISSIONS.PAYMENT_VIEW),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { search, status: filterStatus } = req.query;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { organizers: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const organizerClubIds = (event.organizers || []).map((o) => o.clubId);

      if (req.user.role !== "admin" && req.user.principalType !== "ADMIN") {
        const isFaculty = req.user.role === "facultyCoordinator" && req.user.clubId && organizerClubIds.includes(req.user.clubId);
        const membership = await prisma.clubMembership.findFirst({
          where: {
            clubId: { in: organizerClubIds },
            studentId: req.user.userId,
            OR: [{ role: "CLUB_HEAD" }, { role: "COORDINATOR" }, { canEditEvents: true }],
          },
        });
        if (!isFaculty && !membership) {
          return res.status(403).json({ message: "Access denied." });
        }
      }

      const where = { eventId };

      if (filterStatus && filterStatus !== "ALL") {
        if (filterStatus === "APPROVED") {
          where.paymentStatus = "SUCCESS";
        } else if (filterStatus === "REJECTED") {
          where.paymentStatus = "FAILED";
        } else {
          where.paymentStatus = filterStatus;
        }
      }

      const participations = await prisma.participation.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, email: true, rollNo: true },
          },
          externalUser: {
            select: { id: true, name: true, email: true, collegeName: true },
          },
          team: {
            include: {
              leaderStudent: { select: { id: true, name: true } },
              members: {
                include: {
                  student: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      let filtered = participations;
      if (search) {
        const q = search.toLowerCase();
        filtered = participations.filter((p) => {
          const studentName = p.student?.name?.toLowerCase() || p.externalUser?.name?.toLowerCase() || "";
          const transactionId = p.transactionId?.toLowerCase() || "";
          const payerName = p.payerName?.toLowerCase() || "";
          const teamName = p.team?.teamName?.toLowerCase() || "";
          const leaderName = p.team?.leaderStudent?.name?.toLowerCase() || "";
          return (
            studentName.includes(q) ||
            transactionId.includes(q) ||
            payerName.includes(q) ||
            teamName.includes(q) ||
            leaderName.includes(q)
          );
        });
      }

      res.json({
        event: {
          id: event.id,
          title: event.title,
          registrationFee: event.registrationFee,
        },
        registrations: filtered.map((p) => ({
          id: p.id,
          studentName: p.student?.name || p.externalUser?.name || "Unknown",
          studentEmail: p.student?.email || p.externalUser?.email || "N/A",
          studentRollNo: p.student?.rollNo || (p.externalUser ? "External" : "N/A"),
          transactionId: p.transactionId || null,
          payerName: p.payerName || null,
          paymentRemarks: p.paymentRemarks || null,
          paymentStatus: p.paymentStatus,
          paymentReviewMessage: p.paymentReviewMessage || null,
          paymentReviewedAt: p.paymentReviewedAt || null,
          amountPaid: event.registrationFee || 0,
          registrationStatus: p.status,
          teamName: p.team?.teamName || null,
          leaderName: p.team?.leaderStudent?.name || null,
          createdAt: p.createdAt,
        })),
        summary: {
          total: filtered.length,
          pending: filtered.filter((p) => p.paymentStatus === "PENDING").length,
          approved: filtered.filter((p) => p.paymentStatus === "SUCCESS").length,
          rejected: filtered.filter((p) => p.paymentStatus === "FAILED").length,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch registrations", error: error.message });
    }
  },
);

router.get(
  "/event/:eventId/stats",
  verifyToken,
  async (req, res) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
        include: { organizers: true },
      });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const organizerClubIds = (event.organizers || []).map((o) => o.clubId);

      if (req.user.role !== "admin" && req.user.principalType !== "ADMIN") {
        const isFaculty = req.user.role === "facultyCoordinator" && req.user.clubId && organizerClubIds.includes(req.user.clubId);
        const membership = await prisma.clubMembership.findFirst({
          where: {
            clubId: { in: organizerClubIds },
            studentId: req.user.userId,
            OR: [
              { role: "CLUB_HEAD" },
              { role: "COORDINATOR" },
              { canEditEvents: true },
            ],
          },
        });
        if (!isFaculty && !membership) {
          return res.status(403).json({
            message: "Access denied. You can only view stats for your own club's events.",
          });
        }
      }

      const participations = await prisma.participation.findMany({
        where: {
          eventId: req.params.eventId,
          paymentStatus: "SUCCESS",
        },
        include: {
          student: { select: { id: true, name: true, email: true, rollNo: true } },
          externalUser: { select: { id: true, name: true, email: true, collegeName: true } },
        },
      });

      const totalMoneyCollected = participations.length * (event.registrationFee || 0);

      res.json({
        eventTitle: event.title,
        totalCollected: totalMoneyCollected,
        registrations: participations.map((p) => ({
          studentName: p.student?.name || p.externalUser?.name || "Unknown",
          studentEmail: p.student?.email || p.externalUser?.email || "N/A",
          studentRollNo: p.student?.rollNo || (p.externalUser ? "External" : "N/A"),
          transactionId: p.transactionId || "N/A",
          amountPaid: event.registrationFee || 0,
          paymentStatus: p.paymentStatus,
        })),
      });
    } catch (error) {
      res.status(500).json({ message: "Stats failed", error: error.message });
    }
  },
);

router.put(
  "/:participationId/update-details",
  verifyToken,
  async (req, res) => {
    const { transactionId, payerName, paymentRemarks } = req.body;
    const { participationId } = req.params;

    try {
      if (!transactionId) {
        return res.status(400).json({ message: "Transaction ID / UTR is required." });
      }

      const participation = await prisma.participation.findUnique({
        where: { id: participationId },
        include: {
          event: { select: { title: true } },
          student: { select: { name: true } },
        },
      });

      if (!participation) {
        return res.status(404).json({ message: "Registration not found." });
      }

      const isOwner =
        participation.studentId === req.user.userId ||
        participation.externalUserId === req.user.userId ||
        participation.userId === req.user.userId;

      if (!isOwner && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. You can only update your own registration." });
      }

      const updatedParticipation = await prisma.participation.update({
        where: { id: participationId },
        data: {
          transactionId,
          payerName: payerName || null,
          paymentRemarks: paymentRemarks || null,
          paymentStatus: "PENDING",
        },
      });

      res.json({
        success: true,
        message: "Payment details updated successfully. Pending coordinator review.",
        participation: updatedParticipation,
      });
    } catch (error) {
      res.status(500).json({ message: "Update failed", error: error.message });
    }
  },
);

export default router;
