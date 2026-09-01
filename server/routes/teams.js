import express from "express";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import crypto from "crypto";
import { signTicket } from "../services/qrSigningService.js";
import { sendWebPushNotification } from "../utils/sendPush.js";
import { calculateAcademicProgress, isStudentEligibleForEventYears } from "../utils/academicProgress.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";

const router = express.Router();
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

      const allMembers = [leaderId, ...members];
      if (new Set(allMembers).size !== allMembers.length) {
        return res.status(400).json({ message: "Duplicate members are not allowed, and the leader cannot be added twice." });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      const now = new Date();
      if (now > new Date(event.endTime)) {
        return res.status(400).json({ message: "This event has already ended. Team registration is closed." });
      }

      const registrationDeadline = event.registrationDeadline
        ? new Date(event.registrationDeadline)
        : new Date(event.startTime);

      if (now > registrationDeadline) {
        return res.status(400).json({ message: "Registration deadline has passed for this event." });
      }

      if (event.registrationType !== "team" && event.registrationType !== "both") {
        return res.status(400).json({ message: "This event does not support team registration." });
      }

      const teamSize = allMembers.length;
      const minSize = event.minTeamSize || 1;
      const maxSize = event.maxTeamSize || 1;

      if (teamSize < minSize || teamSize > maxSize) {
        return res.status(400).json({ message: `Team size must be between ${minSize} and ${maxSize} members.` });
      }

      const [students, externalUsers] = await Promise.all([
        prisma.studentUser.findMany({ where: { id: { in: allMembers } } }),
        prisma.externalUser.findMany({ where: { id: { in: allMembers } } }),
      ]);

      const allUsersMap = new Map();
      students.forEach(s => allUsersMap.set(s.id, { ...s, isExternal: false }));
      externalUsers.forEach(e => allUsersMap.set(e.id, { ...e, isExternal: true }));

      if (allUsersMap.size !== teamSize) {
        return res.status(400).json({ message: "One or more team members do not exist as registered participants." });
      }

      const hasExternalMember = externalUsers.length > 0;
      if (hasExternalMember && event.allowExternal === false) {
        return res.status(403).json({ message: "This event is exclusive to internal NITJ students only. External participants cannot join this event." });
      }

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

      const existing = await prisma.participation.findFirst({
        where: {
          eventId,
          OR: [
            { studentId: { in: allMembers } },
            { externalUserId: { in: allMembers } },
          ],
        },
        include: { student: true, externalUser: true },
      });

      if (existing) {
        return res.status(400).json({
          message: `${existing.student?.name || existing.externalUser?.name || "A member"} is already registered for this event.`,
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

      const leaderInfo = allUsersMap.get(leaderId);
      const isLeaderExternal = leaderInfo?.isExternal;

      await prisma.$transaction(async (tx) => {
        const events = await tx.$queryRaw`
          SELECT * FROM "Event" WHERE id = ${eventId} FOR UPDATE
        `;
        const latestEvent = events[0];
        if (!latestEvent) throw new Error("Event not found");

        leaderRegStatus =
          latestEvent.totalSeats > 0 && latestEvent.registeredCount >= latestEvent.totalSeats
            ? "WAITLISTED"
            : "REGISTERED";

        await tx.team.create({
          data: {
            id: teamId,
            eventId,
            teamName,
            leaderId,
            leaderStudentId: isLeaderExternal ? null : leaderId,
            leaderExternalId: isLeaderExternal ? leaderId : null,
            status: "active",
          },
        });

        await tx.teamMember.create({
          data: {
            id: createObjectId(),
            teamId,
            userId: leaderId,
            studentId: isLeaderExternal ? null : leaderId,
            externalUserId: isLeaderExternal ? leaderId : null,
            role: "leader",
          },
        });

        const isPaid = latestEvent.entryFee > 0 || (latestEvent.registrationFee > 0 && latestEvent.paymentMethod !== 'FREE');
        paymentStatusValue = latestEvent.paymentMethod === 'MANUAL_TRANSACTION' ? 'PENDING' : (latestEvent.paymentMethod === 'COLLEGE_PAYMENT' ? 'PENDING' : 'SUCCESS');
        await tx.participation.create({
          data: {
            id: createObjectId(),
            eventId,
            studentId: isLeaderExternal ? null : leaderId,
            externalUserId: isLeaderExternal ? leaderId : null,
            externalEmail: isLeaderExternal ? leaderInfo.email : null,
            externalName: isLeaderExternal ? leaderInfo.name : null,
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

        if (leaderRegStatus === "REGISTERED") {
          await tx.event.update({
            where: { id: eventId },
            data: { registeredCount: { increment: 1 } },
          });
        } else {
          const leaderPart = await tx.participation.findFirst({
            where: {
              teamId,
              OR: [
                { studentId: leaderId },
                { externalUserId: leaderId },
              ],
            },
            select: { id: true },
          });
          if (leaderPart) {
            await tx.event.update({
              where: { id: eventId },
              data: { waitingListIds: { push: [leaderPart.id] } },
            });
          }
        }

        for (const memberId of members) {
          const memberInfo = allUsersMap.get(memberId);
          const isMemberExternal = memberInfo?.isExternal;

          await tx.teamMember.create({
            data: {
              id: createObjectId(),
              teamId,
              userId: memberId,
              studentId: isMemberExternal ? null : memberId,
              externalUserId: isMemberExternal ? memberId : null,
              role: "member",
            },
          });

          const memberTicketId = crypto.randomBytes(12).toString("base64url");
          const { qrPayload: mPayload, qrVersion: mVer, qrKeyId: mKey } = signTicket(eventId, memberTicketId);

          await tx.participation.create({
            data: {
              id: createObjectId(),
              eventId,
              studentId: isMemberExternal ? null : memberId,
              externalUserId: isMemberExternal ? memberId : null,
              externalEmail: isMemberExternal ? memberInfo.email : null,
              externalName: isMemberExternal ? memberInfo.name : null,
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

      const leaderName = leaderInfo?.name || "Team Leader";

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

      invalidatePublicResponses(["events:public:*"]);

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

      const isExternalUser =
        req.user.userType === "external" ||
        req.user.role === "external" ||
        req.user.principalType === "EXTERNAL";

      const participation = await prisma.participation.findFirst({
        where: {
          eventId: notif.eventId,
          teamId: notif.teamId,
          status: "INVITED",
          OR: [
            { studentId: userId },
            { externalUserId: userId },
          ],
        },
        include: {
          event: true,
          team: { include: { leader: true, leaderExternal: true } }
        }
      });

      if (!participation) {
        return res.status(400).json({ message: "Invalid or already processed invitation." });
      }

      let newStatus = "REGISTERED";
      const event = participation.event;

      if (event && isExternalUser && event.allowExternal === false) {
        return res.status(403).json({
          message: "This event is exclusive to internal NITJ students only. External participants cannot join this event.",
        });
      }

      if (event) {
        const now = new Date();
        if (now > new Date(event.endTime)) {
          return res.status(400).json({ message: "This event has already ended. Invitations can no longer be accepted." });
        }

        const registrationDeadline = event.registrationDeadline
          ? new Date(event.registrationDeadline)
          : new Date(event.startTime);

        if (now > registrationDeadline) {
          return res.status(400).json({ message: "Registration deadline has passed for this event. Invitations can no longer be accepted." });
        }
      }

      await prisma.$transaction(async (tx) => {
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

        await tx.notification.update({
          where: { id: notificationId },
          data: {
            title: "Accepted Team Invitation",
            message: `You accepted ${participation.team.leader?.name}'s invitation to join team "${participation.team.teamName}" for "${event.title}".`,
            readBy: { push: [userId] }
          }
        });
      });

      const student = await prisma.studentUser.findUnique({ where: { id: userId } });
      await notifyTeamMember(
        req.io,
        participation.team.leaderId,
        "Invitation Accepted",
        `${student?.name || "A member"} accepted your invitation to join team "${participation.team.teamName}" for "${event.title}".`,
        userId
      );

      invalidatePublicResponses(["events:public:*"]);

      res.json({ success: true, status: newStatus, message: "Invitation accepted successfully." });
    } catch (err) {
      console.error("Accept invitation error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

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
        await tx.teamMember.deleteMany({
          where: {
            teamId: notif.teamId,
            userId: userId
          }
        });

        await tx.participation.delete({
          where: { id: participation.id }
        });

        await tx.notification.update({
          where: { id: notificationId },
          data: {
            title: "Declined Team Invitation",
            message: `You declined ${participation.team.leader?.name}'s invitation to join team "${participation.team.teamName}" for "${participation.event.title}".`,
            readBy: { push: [userId] }
          }
        });
      });

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

      if (event) {
        const now = new Date();
        if (now > new Date(event.endTime)) {
          return res.status(400).json({ message: "This event has already ended. Team modifications are closed." });
        }

        const registrationDeadline = event.registrationDeadline
          ? new Date(event.registrationDeadline)
          : new Date(event.startTime);

        if (now > registrationDeadline) {
          return res.status(400).json({ message: "Registration deadline has passed for this event." });
        }
      }

      const currentSize = team.members.length;
      const maxSize = event.maxTeamSize || 1;
      if (currentSize >= maxSize) {
        return res.status(400).json({ message: `Team is already at its maximum size of ${maxSize} members.` });
      }

      const alreadyInTeam = team.members.some(m => m.userId === studentId);
      if (alreadyInTeam) {
        return res.status(400).json({ message: "This user is already a member of your team." });
      }

      const [student, externalUser] = await Promise.all([
        prisma.studentUser.findUnique({ where: { id: studentId } }),
        prisma.externalUser.findUnique({ where: { id: studentId } }),
      ]);

      if (!student && !externalUser) return res.status(404).json({ message: "User not found." });

      const isTargetExternal = Boolean(externalUser);

      if (isTargetExternal && event.allowExternal === false) {
        return res.status(403).json({
          message: "This event is exclusive to internal NITJ students only. External participants cannot join this event.",
        });
      }

      if (student) {
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

      const existing = await prisma.participation.findFirst({
        where: {
          eventId: event.id,
          OR: [
            { studentId: studentId },
            { externalUserId: studentId },
          ],
        },
      });

      if (existing) {
        return res.status(400).json({
          message: `${student?.name || externalUser?.name || "This user"} is already registered or invited to this event.`,
        });
      }

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
            studentId: isTargetExternal ? null : studentId,
            externalUserId: isTargetExternal ? externalUser.id : null,
            externalEmail: isTargetExternal ? externalUser.email : null,
            externalName: isTargetExternal ? externalUser.name : null,
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

      const [leaderStudent, leaderExternal] = await Promise.all([
        prisma.studentUser.findUnique({ where: { id: leaderId } }),
        prisma.externalUser.findUnique({ where: { id: leaderId } }),
      ]);
      const leaderName = leaderStudent?.name || leaderExternal?.name || "Team Leader";

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

      res.json({
        success: true,
        message: `Invitation successfully sent to ${student?.name || externalUser?.name || "the participant"}.`,
      });
    } catch (err) {
      console.error("Invite teammate error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

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
