import express from "express";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
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
      if (!["APPROVED", "REJECTED", "NEED_MORE_DETAILS"].includes(status)) {
        return res.status(400).json({ message: "Invalid review status." });
      }

      const participation = await prisma.participation.findUnique({
        where: { id: participationId },
        include: {
          event: { include: { club: true } },
          student: { select: { id: true, name: true, email: true } },
        },
      });

      if (!participation) {
        return res.status(404).json({ message: "Registration not found." });
      }

      if (req.user.role !== "admin") {
        const membership = await prisma.clubMembership.findFirst({
          where: {
            clubId: participation.event.clubId,
            studentId: req.user.userId,
            OR: [{ role: "CLUB_HEAD" }, { role: "COORDINATOR" }],
          },
        });
        if (!membership) {
          return res.status(403).json({
            message: "Only club heads/coordinators can review payments.",
          });
        }
      }

      const updateData = {
        paymentStatus: status,
        paymentReviewedBy: req.user.userId,
        paymentReviewedAt: new Date(),
      };

      if (message) {
        updateData.paymentReviewMessage = message;
      }

      if (status === "APPROVED") {
        updateData.paymentStatus = "APPROVED";

        await prisma.$transaction(async (tx) => {
          await tx.participation.update({
            where: { id: participationId },
            data: updateData,
          });

          if (participation.status === "REGISTERED" || participation.status === "WAITLISTED") {
          }
        });
      } else {
        await prisma.participation.update({
          where: { id: participationId },
          data: updateData,
        });
      }

      if (participation.studentId) {
        const notificationTitle =
          status === "APPROVED"
            ? "Payment Approved"
            : status === "REJECTED"
              ? "Payment Rejected"
              : "More Details Needed";

        const notificationMessage =
          status === "APPROVED"
            ? `Your payment for "${participation.event.title}" has been approved. You are now registered!`
            : status === "REJECTED"
              ? `Your payment for "${participation.event.title}" has been rejected.${message ? ` Reason: ${message}` : ""}`
              : `More details are needed for your payment for "${participation.event.title}".${message ? ` Message: ${message}` : ""}`;

        const notification = await prisma.notification.create({
          data: {
            id: createObjectId(),
            recipientStudentId: participation.studentId,
            recipientUserId: participation.studentId || participation.externalUserId,
            targetScope: "USER",
            title: notificationTitle,
            message: notificationMessage,
            eventId: participation.eventId,
            clubId: participation.event?.clubId || null,
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
        message: `Payment ${status.toLowerCase().replace("_", " ")} successfully.`,
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

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (req.user.role !== "admin") {
        const membership = await prisma.clubMembership.findFirst({
          where: {
            clubId: event.clubId,
            studentId: req.user.userId,
            OR: [{ role: "CLUB_HEAD" }, { role: "COORDINATOR" }, { canEditEvents: true }],
          },
        });
        if (!membership) {
          return res.status(403).json({ message: "Access denied." });
        }
      }

      const where = { eventId };

      if (filterStatus && filterStatus !== "ALL") {
        where.paymentStatus = filterStatus;
      }

      const participations = await prisma.participation.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, email: true, rollNo: true },
          },
          team: {
            include: {
              leader: { select: { id: true, name: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true } },
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
          const studentName = p.student?.name?.toLowerCase() || "";
          const transactionId = p.transactionId?.toLowerCase() || "";
          const payerName = p.payerName?.toLowerCase() || "";
          const teamName = p.team?.teamName?.toLowerCase() || "";
          const leaderName = p.team?.leader?.name?.toLowerCase() || "";
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
          paymentMethod: event.paymentMethod,
          registrationFee: event.registrationFee || event.entryFee,
        },
        registrations: filtered.map((p) => ({
          id: p.id,
          studentName: p.student?.name || p.externalName || "Unknown",
          studentEmail: p.student?.email || p.externalEmail || "N/A",
          studentRollNo: p.student?.rollNo || "N/A",
          transactionId: p.transactionId || null,
          payerName: p.payerName || null,
          paymentRemarks: p.paymentRemarks || null,
          paymentStatus: p.paymentStatus,
          paymentReviewMessage: p.paymentReviewMessage || null,
          paymentReviewedAt: p.paymentReviewedAt || null,
          amountPaid: p.amountPaid || 0,
          registrationStatus: p.status,
          teamName: p.team?.teamName || null,
          leaderName: p.team?.leader?.name || null,
          createdAt: p.createdAt,
        })),
        summary: {
          total: filtered.length,
          pending: filtered.filter((p) => p.paymentStatus === "PENDING").length,
          approved: filtered.filter((p) => ["APPROVED", "SUCCESS"].includes(p.paymentStatus)).length,
          rejected: filtered.filter((p) => p.paymentStatus === "REJECTED").length,
          needMoreDetails: filtered.filter((p) => p.paymentStatus === "NEED_MORE_DETAILS").length,
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
      const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      // Permission check: admin / faculty coordinator / club management / authorized member
      if (req.user.role !== "admin") {
        if (req.user.role === "facultyCoordinator" && req.user.clubId !== event.clubId) {
          return res.status(403).json({ message: "Access denied." });
        }

        const membership = await prisma.clubMembership.findFirst({
          where: {
            clubId: event.clubId,
            studentId: req.user.userId,
            OR: [
              { role: "CLUB_HEAD" },
              { role: "COORDINATOR" },
              { canEditEvents: true },
            ],
          },
        });
        if (!membership && req.user.clubId !== event.clubId && req.user.role !== "facultyCoordinator") {
          return res.status(403).json({
            message: "Access denied. You can only view stats for your own club's events.",
          });
        }
      }

      const participations = await prisma.participation.findMany({
        where: {
          eventId: req.params.eventId,
          paymentStatus: { in: ["SUCCESS", "APPROVED"] },
        },
        include: {
          student: { select: { id: true, name: true, email: true, rollNo: true } },
        },
      });

      const totalMoneyCollected = participations.reduce(
        (sum, p) => sum + (p.amountPaid || 0),
        0,
      );

      res.json({
        eventTitle: event.title,
        totalCollected: totalMoneyCollected,
        registrations: participations.map((p) => ({
          studentName: p.student?.name || "Unknown",
          studentEmail: p.student?.email || "N/A",
          studentRollNo: p.student?.rollNo || "N/A",
          paymentId: p.paymentId || p.transactionId || "N/A",
          amountPaid: p.amountPaid || 0,
          paymentStatus: p.paymentStatus,
        })),
      });
    } catch (error) {
      res.status(500).json({ message: "Stats failed", error: error.message });
    }
  },
);

// ── PUT /payment/:participationId/update-details ── Students update their transaction details ─
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
          event: { select: { title: true, clubId: true } },
          student: { select: { name: true } }
        }
      });

      if (!participation) {
        return res.status(404).json({ message: "Registration not found." });
      }

      const isOwner =
        participation.studentId === req.user.userId ||
        participation.externalUserId === req.user.userId ||
        participation.externalEmail === req.user.email;

      if (!isOwner && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. You can only update your own registration." });
      }

      // Update the transaction details and set status back to PENDING for re-review
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
        participation: updatedParticipation
      });
    } catch (error) {
      res.status(500).json({ message: "Update failed", error: error.message });
    }
  }
);

export default router;
