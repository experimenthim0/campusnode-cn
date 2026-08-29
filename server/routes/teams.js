import express from "express";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import crypto from "crypto";
import { signTicket } from "../services/qrSigningService.js";
import { sendWebPushNotification } from "../utils/sendPush.js";
import { calculateAcademicProgress, isStudentEligibleForEventYears } from "../utils/academicProgress.js";

const router = express.Router();
// helper to format/send notifications
async function notifyTeamMember(io, recipientId, title, message, senderStudentId = null) {
  try {
    const notification = await prisma.notification.create({
      data: {
        id: createObjectId(),
        senderStudentId,
        recipientStudentId: recipientId,
        title,
        message,
      },
    });
    const payload = {
      ...notification,
      _id: notification.id,
      sender: { name: "System" },
    };
    if (io) {
      io.to(recipientId).emit("new-notification", payload);
    }
    sendWebPushNotification(recipientId, payload);
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

async function notifyInvitation(io, recipientId, eventId, teamId, teamName, eventTitle, leaderName, senderStudentId) {
  try {
    const notification = await prisma.notification.create({
      data: {
        id: createObjectId(),
        senderStudentId,
        recipientStudentId: recipientId,
        title: "Team Invitation",
        message: `${leaderName} invited you to join team "${teamName}" for the event "${eventTitle}".`,
        eventId,
        teamId,
        type: "TEAM_INVITATION",
      },
    });
    const payload = {
      ...notification,
      _id: notification.id,
      sender: { name: leaderName },
    };
    if (io) {
      io.to(recipientId).emit("new-notification", payload);
    }
    sendWebPushNotification(recipientId, payload);
  } catch (err) {
    console.error("Failed to send invitation notification:", err);
  }
}

// ── POST /api/teams — register a team ───────────────────────────────────────────
router.post(
  "/",
  verifyToken,
  requirePermission(PERMISSIONS.TEAM_CREATE),
  async (req, res) => {
    const { eventId, teamName, members, formResponses, transactionId, payerName, paymentRemarks } = req.body;
    const leaderId = req.user.userId;

    try {
      if (!eventId || !teamName || !Array.isArray(members)) {
        return res.status(400).json({ message: "Event ID, Team Name, and Members array are required." });
      }

      // Check duplicates in members
      const allMembers = [leaderId, ...members];
      if (new Set(allMembers).size !== allMembers.length) {
        return res.status(400).json({ message: "Duplicate members are not allowed, and the leader cannot be added twice." });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (event.registrationType !== "team" && event.registrationType !== "both") {
        return res.status(400).json({ message: "This event does not support team registration." });
      }

      const teamSize = allMembers.length;
      const minSize = event.minTeamSize || 1;
      const maxSize = event.maxTeamSize || 1;

      if (teamSize < minSize || teamSize > maxSize) {
        return res.status(400).json({ message: `Team size must be between ${minSize} and ${maxSize} members.` });
      }

      // Fetch all student details for eligibility checks
      const students = await prisma.studentUser.findMany({
        where: { id: { in: allMembers } },
      });

      if (students.length !== teamSize) {
        return res.status(400).json({ message: "One or more team members do not exist as registered students." });
      }

      // Validate program, year, branch for each member
      for (const student of students) {
        if (
          event.allowedPrograms?.length > 0 &&
          student.program &&
          !event.allowedPrograms.includes(student.program)
        ) {
          return res.status(400).json({ message: `${student.name} is ineligible due to their program (${student.program}).` });
        }

        if (!isStudentEligibleForEventYears(student, event.allowedYears)) {
          const progress = calculateAcademicProgress(student);
          return res.status(400).json({ message: `${student.name} is ineligible due to their academic standing (${progress.academicYearLabel}).` });
        }

        if (
          event.allowedBranches?.length > 0 &&
          student.branch &&
          !event.allowedBranches.includes(student.branch)
        ) {
          return res.status(400).json({ message: `${student.name} is ineligible due to their branch (${student.branch}).` });
        }
      }

      // Check if any member already registered for this event
      const existing = await prisma.participation.findFirst({
        where: {
          eventId,
          studentId: { in: allMembers },
        },
        include: { student: true },
      });

      if (existing) {
        return res.status(400).json({
          message: `${existing.student?.name || "A member"} is already registered for this event.`,
        });
      }

      // Validate payment details if paid event with manual transaction
      if (event.entryFee > 0 || (event.registrationFee > 0 && event.paymentMethod === 'MANUAL_TRANSACTION')) {
        if (!transactionId) {
          return res.status(400).json({ message: "Transaction ID is required for paid events." });
        }
      }

      const teamId = createObjectId();
      let leaderRegStatus = "REGISTERED";
      let paymentStatusValue = "SUCCESS";

      await prisma.$transaction(async (tx) => {
        // Lock event row for safe registration counts
        const events = await tx.$queryRaw`
          SELECT * FROM "Event" WHERE id = ${eventId} FOR UPDATE
        `;
        const latestEvent = events[0];
        if (!latestEvent) throw new Error("Event not found");

        leaderRegStatus =
          latestEvent.totalSeats > 0 && latestEvent.registeredCount >= latestEvent.totalSeats
            ? "WAITLISTED"
            : "REGISTERED";

        // Create the Team
        await tx.team.create({
          data: {
            id: teamId,
            eventId,
            teamName,
            leaderId,
            status: "active",
          },
        });

        // Create Leader TeamMember & Participation
        await tx.teamMember.create({
          data: {
            id: createObjectId(),
            teamId,
            userId: leaderId,
            role: "leader",
          },
        });

        const isPaid = latestEvent.entryFee > 0 || (latestEvent.registrationFee > 0 && latestEvent.paymentMethod !== 'FREE');
        paymentStatusValue = latestEvent.paymentMethod === 'MANUAL_TRANSACTION' ? 'PENDING' : (latestEvent.paymentMethod === 'COLLEGE_PAYMENT' ? 'PENDING' : 'SUCCESS');
        await tx.participation.create({
          data: {
            id: createObjectId(),
            eventId,
            studentId: leaderId,
            teamId,
            status: leaderRegStatus,
            paymentStatus: paymentStatusValue,
            amountPaid: isPaid ? (latestEvent.registrationFee || latestEvent.entryFee) : 0,
            transactionId: transactionId || null,
            payerName: payerName || null,
            paymentRemarks: paymentRemarks || null,
            paymentTimestamp: isPaid ? new Date() : null,
            ...(() => {
              const ticketId = crypto.randomBytes(12).toString("base64url");
              const { qrPayload, qrVersion, qrKeyId } = signTicket(eventId, ticketId);
              return { qrCode: ticketId, qrPayload, qrVersion, qrKeyId };
            })(),
            formResponses: formResponses || {},
          },
        });

        // Increment registeredCount by 1 (for leader)
        if (leaderRegStatus === "REGISTERED") {
          await tx.event.update({
            where: { id: eventId },
            data: { registeredCount: { increment: 1 } },
          });
        } else {
          // Add leader participation ID to waitlist
          const leaderPart = await tx.participation.findFirst({
            where: { teamId, studentId: leaderId },
            select: { id: true },
          });
          if (leaderPart) {
            await tx.event.update({
              where: { id: eventId },
              data: { waitingListIds: { push: [leaderPart.id] } },
            });
          }
        }

        // Create TeamMembers and Participation records for invited members with status "INVITED"
        for (const memberId of members) {
          await tx.teamMember.create({
            data: {
              id: createObjectId(),
              teamId,
              userId: memberId,
              role: "member",
            },
          });

          const memberTicketId = crypto.randomBytes(12).toString("base64url");
          const { qrPayload: mPayload, qrVersion: mVer, qrKeyId: mKey } = signTicket(eventId, memberTicketId);

          await tx.participation.create({
            data: {
              id: createObjectId(),
              eventId,
              studentId: memberId,
              teamId,
              status: "INVITED",
              paymentStatus: "SUCCESS",
              amountPaid: 0,
              qrCode: memberTicketId,
              qrPayload: mPayload,
              qrVersion: mVer,
              qrKeyId: mKey,
              formResponses: formResponses || {},
            },
          });
        }
      });

      // Send invitation notifications to members
      const leaderUser = students.find(s => s.id === leaderId);
      const leaderName = leaderUser?.name || "Team Leader";

      for (const memberId of members) {
        await notifyInvitation(
          req.io,
          memberId,
          eventId,
          teamId,
          teamName,
          event.title,
          leaderName,
          leaderId
        );
      }

      res.status(201).json({
        success: true,
        message: "Team registration successful. Invitations sent to teammates.",
        teamId,
        status: leaderRegStatus,
        paymentStatus: paymentStatusValue,
        postRegistrationMessage: event.postRegistrationMessage || null,
      });
    } catch (err) {
      console.error("Team registration error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

// ── POST /api/teams/invitations/:id/accept — accept invitation ──────────────────
router.post(
  "/invitations/:id/accept",
  verifyToken,
  async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user.userId;

    try {
      const notif = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notif || notif.recipientStudentId !== userId || notif.type !== "TEAM_INVITATION") {
        return res.status(404).json({ message: "Invitation not found." });
      }

      // Find the user's participation for this team/event
      const participation = await prisma.participation.findFirst({
        where: {
          eventId: notif.eventId,
          studentId: userId,
          teamId: notif.teamId,
          status: "INVITED"
        },
        include: {
          event: true,
          team: { include: { leader: true } }
        }
      });

      if (!participation) {
        return res.status(400).json({ message: "Invalid or already processed invitation." });
      }

      let newStatus = "REGISTERED";
      const event = participation.event;

      await prisma.$transaction(async (tx) => {
        // Lock event row
        const events = await tx.$queryRaw`
          SELECT * FROM "Event" WHERE id = ${event.id} FOR UPDATE
        `;
        const latestEvent = events[0];

        newStatus =
          latestEvent.totalSeats > 0 && latestEvent.registeredCount >= latestEvent.totalSeats
            ? "WAITLISTED"
            : "REGISTERED";

        await tx.participation.update({
          where: { id: participation.id },
          data: { status: newStatus }
        });

        if (newStatus === "REGISTERED") {
          await tx.event.update({
            where: { id: event.id },
            data: { registeredCount: { increment: 1 } }
          });
        } else {
          await tx.event.update({
            where: { id: event.id },
            data: { waitingListIds: { push: [participation.id] } }
          });
        }

        // Update notification to indicate acceptance
        await tx.notification.update({
          where: { id: notificationId },
          data: {
            title: "Accepted Team Invitation",
            message: `You accepted ${participation.team.leader?.name}'s invitation to join team "${participation.team.teamName}" for "${event.title}".`,
            readBy: { push: [userId] }
          }
        });
      });

      // Notify the leader
      const student = await prisma.studentUser.findUnique({ where: { id: userId } });
      await notifyTeamMember(
        req.io,
        participation.team.leaderId,
        "Invitation Accepted",
        `${student?.name || "A member"} accepted your invitation to join team "${participation.team.teamName}" for "${event.title}".`,
        userId
      );

      res.json({ success: true, status: newStatus, message: "Invitation accepted successfully." });
    } catch (err) {
      console.error("Accept invitation error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

// ── POST /api/teams/invitations/:id/decline — decline invitation ────────────────
router.post(
  "/invitations/:id/decline",
  verifyToken,
  async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user.userId;

    try {
      const notif = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notif || notif.recipientStudentId !== userId || notif.type !== "TEAM_INVITATION") {
        return res.status(404).json({ message: "Invitation not found." });
      }

      // Find the user's participation for this team/event
      const participation = await prisma.participation.findFirst({
        where: {
          eventId: notif.eventId,
          studentId: userId,
          teamId: notif.teamId,
          status: "INVITED"
        },
        include: {
          event: true,
          team: { include: { leader: true } }
        }
      });

      if (!participation) {
        return res.status(400).json({ message: "Invalid or already processed invitation." });
      }

      await prisma.$transaction(async (tx) => {
        // Delete teamMember and participation
        await tx.teamMember.deleteMany({
          where: {
            teamId: notif.teamId,
            userId: userId
          }
        });

        await tx.participation.delete({
          where: { id: participation.id }
        });

        // Update notification to indicate declination
        await tx.notification.update({
          where: { id: notificationId },
          data: {
            title: "Declined Team Invitation",
            message: `You declined ${participation.team.leader?.name}'s invitation to join team "${participation.team.teamName}" for "${participation.event.title}".`,
            readBy: { push: [userId] }
          }
        });
      });

      // Notify the leader
      const student = await prisma.studentUser.findUnique({ where: { id: userId } });
      await notifyTeamMember(
        req.io,
        participation.team.leaderId,
        "Invitation Declined",
        `${student?.name || "A member"} declined your invitation to join team "${participation.team.teamName}" for "${participation.event.title}".`,
        userId
      );

      res.json({ success: true, message: "Invitation declined successfully." });
    } catch (err) {
      console.error("Decline invitation error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

// ── POST /api/teams/:id/invite — invite a new member to an existing team ─────────
router.post(
  "/:id/invite",
  verifyToken,
  async (req, res) => {
    const teamId = req.params.id;
    const leaderId = req.user.userId;
    const { studentId } = req.body;

    try {
      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required." });
      }

      // Check if team exists and caller is the leader
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          event: true,
          members: true
        }
      });

      if (!team) return res.status(404).json({ message: "Team not found." });
      if (team.leaderId !== leaderId) {
        return res.status(403).json({ message: "Only the team leader can add new members." });
      }

      const event = team.event;

      // Check if team is already at max size
      const currentSize = team.members.length;
      const maxSize = event.maxTeamSize || 1;
      if (currentSize >= maxSize) {
        return res.status(400).json({ message: `Team is already at its maximum size of ${maxSize} members.` });
      }

      // Check if student already in the team
      const alreadyInTeam = team.members.some(m => m.userId === studentId);
      if (alreadyInTeam) {
        return res.status(400).json({ message: "This student is already a member of your team." });
      }

      // Fetch student details
      const student = await prisma.studentUser.findUnique({ where: { id: studentId } });
      if (!student) return res.status(404).json({ message: "Student not found." });

      // Validate eligibility
      if (
        event.allowedPrograms?.length > 0 &&
        student.program &&
        !event.allowedPrograms.includes(student.program)
      ) {
        return res.status(400).json({ message: `${student.name} is ineligible due to their program (${student.program}).` });
      }

      if (!isStudentEligibleForEventYears(student, event.allowedYears)) {
        const progress = calculateAcademicProgress(student);
        return res.status(400).json({ message: `${student.name} is ineligible due to their academic standing (${progress.academicYearLabel}).` });
      }

      if (
        event.allowedBranches?.length > 0 &&
        student.branch &&
        !event.allowedBranches.includes(student.branch)
      ) {
        return res.status(400).json({ message: `${student.name} is ineligible due to their branch (${student.branch}).` });
      }

      // Check if student is already registered for this event (individually or in another team)
      const existing = await prisma.participation.findFirst({
        where: {
          eventId: event.id,
          studentId: studentId
        }
      });

      if (existing) {
        return res.status(400).json({ message: `${student.name} is already registered or invited to this event.` });
      }

      // Add to database as INVITED
      await prisma.$transaction(async (tx) => {
        await tx.teamMember.create({
          data: {
            id: createObjectId(),
            teamId,
            userId: studentId,
            role: "member"
          }
        });

        const memberTicketId = crypto.randomBytes(12).toString("base64url");
        const { qrPayload: mPayload, qrVersion: mVer, qrKeyId: mKey } = signTicket(event.id, memberTicketId);

        await tx.participation.create({
          data: {
            id: createObjectId(),
            eventId: event.id,
            studentId,
            teamId,
            status: "INVITED",
            paymentStatus: "SUCCESS",
            amountPaid: 0,
            qrCode: memberTicketId,
            qrPayload: mPayload,
            qrVersion: mVer,
            qrKeyId: mKey,
            formResponses: {}
          }
        });
      });

      // Send notification
      const leaderUser = await prisma.studentUser.findUnique({ where: { id: leaderId } });
      const leaderName = leaderUser?.name || "Team Leader";

      await notifyInvitation(
        req.io,
        studentId,
        event.id,
        teamId,
        team.teamName,
        event.title,
        leaderName,
        leaderId
      );

      res.json({ success: true, message: `Invitation successfully sent to ${student.name}.` });
    } catch (err) {
      console.error("Invite teammate error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

// ── GET /api/teams/event/:eventId/lookup-leader — fetch team details by leader name/rollNo/teamName ──
router.get(
  "/event/:eventId/lookup-leader",
  verifyToken,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { query } = req.query;

      if (!query || !query.trim()) {
        return res.status(400).json({ message: "Search query is required." });
      }

      const q = query.trim();

      const team = await prisma.team.findFirst({
        where: {
          eventId,
          OR: [
            { leader: { rollNo: { equals: q, mode: 'insensitive' } } },
            { leader: { name: { contains: q, mode: 'insensitive' } } },
            { teamName: { contains: q, mode: 'insensitive' } }
          ]
        },
        include: {
          leader: {
            select: { id: true, name: true, rollNo: true, branch: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, rollNo: true, branch: true }
              }
            }
          }
        }
      });

      if (!team) {
        return res.status(404).json({ message: "No registered team found for this leader or team name." });
      }

      const rawMembers = [
        team.leader?.name,
        ...(team.members || []).map(m => m.user?.name)
      ].filter(Boolean);

      const memberNames = Array.from(new Set(rawMembers));

      res.json({
        id: team.id,
        teamName: team.teamName,
        leaderName: team.leader?.name,
        leaderRollNo: team.leader?.rollNo,
        members: memberNames
      });
    } catch (err) {
      console.error("Lookup team leader error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

// ── GET /api/teams/:id — fetch team details ─────────────────────────────────────
router.get(
  "/:id",
  verifyToken,
  async (req, res) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: req.params.id },
        include: {
          event: true,
          leader: {
            select: { id: true, name: true, email: true, rollNo: true, branch: true, program: true, expectedGraduationYear: true, academicStatus: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, rollNo: true, branch: true, program: true, expectedGraduationYear: true, academicStatus: true }
              }
            }
          }
        }
      });

      if (!team) return res.status(404).json({ message: "Team not found" });

      const enrichedTeam = {
        ...team,
        leader: team.leader
          ? {
              ...team.leader,
              year: calculateAcademicProgress(team.leader).academicYearLabel,
              academicYear: calculateAcademicProgress(team.leader).academicYear,
              semester: calculateAcademicProgress(team.leader).semester,
            }
          : null,
        members: (team.members || []).map((m) => ({
          ...m,
          user: m.user
            ? {
                ...m.user,
                year: calculateAcademicProgress(m.user).academicYearLabel,
                academicYear: calculateAcademicProgress(m.user).academicYear,
                semester: calculateAcademicProgress(m.user).semester,
              }
            : null,
        })),
      };

      res.json(enrichedTeam);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
