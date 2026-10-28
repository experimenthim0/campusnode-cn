import express from "express";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import crypto from "crypto";
import { signTicket } from "../services/qrSigningService.js";
import { sendWebPushNotification } from "../utils/sendPush.js";
import { calculateAcademicProgress, isStudentEligibleForEventYears } from "../utils/academicProgress.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";
import redis from "../lib/redis.js";
import { validateCustomFields } from "../utils/customFields.js";
import { MAX_WAITLIST_CAPACITY } from "../services/waitlistService.js";

const router = express.Router();

async function notifyTeamMember(io, recipientId, title, message, eventId = null, teamId = null) {
  try {
    const notification = await prisma.notification.create({
      data: {
        id: createObjectId(),
        recipientStudentId: recipientId,
        type: "TEAM_RESPONSE",
        title,
        message,
        eventId: eventId || null,
        teamId: teamId || null,
      },
    });
    const payload = {
      ...notification,
      _id: notification.id,
      sender: { name: "Campusnode", clubName: "Campusnode" },
    };
    if (io) {
      io.to(recipientId).emit("new-notification", payload);
    }
    sendWebPushNotification(recipientId, payload);
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

async function notifyInvitation(io, recipientId, eventId, teamId, teamName, eventTitle, leaderName) {
  try {
    const notification = await prisma.notification.create({
      data: {
        id: createObjectId(),
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
      sender: { name: "Campusnode", clubName: "Campusnode" },
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
    const leaderId = req.user?.userId;
    const teamLockKey = eventId && leaderId ? `lock:team:create:${eventId}:${leaderId}` : null;
    let lockAcquired = false;

    try {
      if (teamLockKey) {
        try {
          lockAcquired = await redis.acquireLock(teamLockKey, 5);
          if (!lockAcquired) {
            return res.status(429).json({
              message: "A team creation request for this event is already being processed. Please wait.",
            });
          }
        } catch (lockErr) {
          console.warn("[Team Create] Redis lock warning:", lockErr.message);
          lockAcquired = false;
        }
      }

      if (req.user.userType !== "student") {
        return res.status(403).json({ message: "Only enrolled students can create and lead teams." });
      }

      if (!eventId || !teamName || !Array.isArray(members)) {
        return res.status(400).json({ message: "Event ID, Team Name, and Members array are required." });
      }

      const allMembers = [leaderId, ...members];
      if (new Set(allMembers).size !== allMembers.length) {
        return res.status(400).json({ message: "Duplicate members are not allowed, and the leader cannot be added twice." });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ message: "Event not found" });

      if (event.reviewStatus !== "PUBLISHED") {
        return res.status(400).json({ message: "Team registration is not open. This event is not yet published." });
      }

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

      if (event.totalSeats > 0 && event.registeredCount >= event.totalSeats && event.allowWaitlist === false) {
        return res.status(400).json({
          message: "Registration closed. This event is full.",
          isFull: true,
          waitlistAllowed: false,
        });
      }

      const customFieldCheck = validateCustomFields(event.customFields, formResponses);
      if (!customFieldCheck.valid) {
        return res.status(400).json({ message: customFieldCheck.message });
      }
      const validatedResponses = customFieldCheck.sanitizedResponses;

      const teamSize = allMembers.length;
      const minSize = event.minTeamSize || 1;
      const maxSize = event.maxTeamSize || 1;

      if (teamSize < minSize || teamSize > maxSize) {
        return res.status(400).json({ message: `Team size must be between ${minSize} and ${maxSize} members.` });
      }

      const students = await prisma.studentUser.findMany({ where: { id: { in: allMembers } } });
      const studentsMap = new Map();
      students.forEach((s) => studentsMap.set(s.id, s));

      if (studentsMap.size !== teamSize) {
        return res.status(400).json({ message: "One or more team members do not exist as registered student participants." });
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
          studentId: { in: allMembers },
        },
        include: { student: true },
      });

      if (existing) {
        return res.status(400).json({
          message: `${existing.student?.name || "A member"} is already registered for this event.`,
        });
      }

      if (event.registrationFee > 0 && !transactionId) {
        return res.status(400).json({ message: "Transaction ID is required for paid events." });
      }

      const teamId = createObjectId();
      let leaderRegStatus = "REGISTERED";
      const leaderInfo = studentsMap.get(leaderId);

      await prisma.$transaction(async (tx) => {
        const events = await tx.$queryRaw`
          SELECT * FROM "Event" WHERE id = ${eventId} FOR UPDATE
        `;
        const latestEvent = events[0];
        if (!latestEvent) throw new Error("Event not found");

        const isFull = latestEvent.totalSeats > 0 && latestEvent.registeredCount >= latestEvent.totalSeats;
        if (isFull) {
          if (latestEvent.allowWaitlist === false) {
            const err = new Error("Registration closed. This event is full.");
            err.statusCode = 400;
            err.isFull = true;
            err.waitlistAllowed = false;
            throw err;
          }
          const currentWaitlistCount = (latestEvent.waitingListIds || []).length;
          if (currentWaitlistCount >= MAX_WAITLIST_CAPACITY) {
            const err = new Error(`Registration closed. The waitlist for this event is full (maximum ${MAX_WAITLIST_CAPACITY} participants allowed).`);
            err.statusCode = 400;
            err.waitlistFull = true;
            err.waitlistAllowed = true;
            throw err;
          }
          leaderRegStatus = "WAITLISTED";
        } else {
          leaderRegStatus = "REGISTERED";
        }

        await tx.team.create({
          data: {
            id: teamId,
            eventId,
            teamName,
            leaderId,
            leaderStudentId: leaderId,
            status: "active",
          },
        });

        await tx.teamMember.create({
          data: {
            id: createObjectId(),
            teamId,
            userId: leaderId,
            studentId: leaderId,
            role: "leader",
          },
        });

        const isPaid = latestEvent.registrationFee > 0;
        const paymentStatusValue = isPaid ? "PENDING" : "SUCCESS";

        await tx.participation.create({
          data: {
            id: createObjectId(),
            eventId,
            userId: leaderId,
            studentId: leaderId,
            teamId,
            status: leaderRegStatus,
            paymentStatus: paymentStatusValue,
            transactionId: transactionId || null,
            payerName: payerName || null,
            paymentRemarks: paymentRemarks || null,
            paymentTimestamp: isPaid ? new Date() : null,
            ...(() => {
              const ticketId = crypto.randomBytes(12).toString("base64url");
              const { qrPayload, qrVersion, qrKeyId } = signTicket(eventId, ticketId);
              return { qrCode: ticketId, qrPayload, qrVersion, qrKeyId };
            })(),
            formResponses: validatedResponses || {},
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
              studentId: leaderId,
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
          await tx.teamMember.create({
            data: {
              id: createObjectId(),
              teamId,
              userId: memberId,
              studentId: memberId,
              role: "member",
            },
          });

          const memberTicketId = crypto.randomBytes(12).toString("base64url");
          const { qrPayload: mPayload, qrVersion: mVer, qrKeyId: mKey } = signTicket(eventId, memberTicketId);

          await tx.participation.create({
            data: {
              id: createObjectId(),
              eventId,
              userId: memberId,
              studentId: memberId,
              teamId,
              status: "INVITED",
              paymentStatus: "SUCCESS",
              qrCode: memberTicketId,
              qrPayload: mPayload,
              qrVersion: mVer,
              qrKeyId: mKey,
              formResponses: validatedResponses || {},
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
        );
      }

      invalidatePublicResponses(["events:public:*"]);

      res.status(201).json({
        success: true,
        message:
          leaderRegStatus === "WAITLISTED"
            ? "Event is currently full. Your team has been registered on the waitlist."
            : "Team created successfully! Invitations have been sent to your team members.",
        teamId,
        status: leaderRegStatus,
      });
    } catch (err) {
      console.error("Team registration error:", err);
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          message: err.message,
          isFull: err.isFull,
          waitlistAllowed: err.waitlistAllowed,
          waitlistFull: err.waitlistFull,
        });
      }
      res.status(500).json({ message: err.message });
    } finally {
      if (lockAcquired && teamLockKey) {
        try {
          await redis.releaseLock(teamLockKey);
        } catch (releaseErr) {
          console.warn("[Team Create] Redis lock release warning:", releaseErr.message);
        }
      }
    }
  },
);

async function handleInvitationResponse(req, res) {
  const targetId = req.params.id;
  if (!req.body) req.body = {};
  const action = req.body.action;
  const userId = req.user.userId;

  if (!["accept", "decline"].includes(action)) {
    return res.status(400).json({ message: "Action must be 'accept' or 'decline'." });
  }

  try {
    let notif = await prisma.notification.findUnique({
      where: { id: targetId },
    });

    let participation;
    if (notif) {
      if (notif.recipientStudentId !== userId || notif.type !== "TEAM_INVITATION") {
        return res.status(404).json({ message: "Invitation not found." });
      }

      participation = await prisma.participation.findFirst({
        where: {
          eventId: notif.eventId,
          teamId: notif.teamId,
          status: "INVITED",
          studentId: userId,
        },
        include: {
          event: true,
          team: { include: { leaderStudent: true } },
        },
      });
    } else {
      // Find participation directly by id or teamId
      participation = await prisma.participation.findFirst({
        where: {
          id: targetId,
          status: "INVITED",
          studentId: userId,
        },
        include: {
          event: true,
          team: { include: { leaderStudent: true } },
        },
      });

      if (!participation) {
        participation = await prisma.participation.findFirst({
          where: {
            teamId: targetId,
            status: "INVITED",
            studentId: userId,
          },
          include: {
            event: true,
            team: { include: { leaderStudent: true } },
          },
        });
      }

      if (participation) {
        notif = await prisma.notification.findFirst({
          where: {
            recipientStudentId: userId,
            eventId: participation.eventId,
            teamId: participation.teamId,
            type: "TEAM_INVITATION",
          },
        });
      }
    }

    if (!participation) {
      return res.status(400).json({ message: "Invalid or already processed invitation." });
    }

    const event = participation.event;
    const targetTeamId = participation.teamId || notif?.teamId;

    if (action === "decline") {
      const student = await prisma.studentUser.findUnique({ where: { id: userId } });
      const currentTeam = await prisma.team.findUnique({
        where: { id: targetTeamId },
        select: { id: true, rejectedMembers: true, teamName: true, leaderId: true },
      });

      const currentRejected = Array.isArray(currentTeam?.rejectedMembers)
        ? currentTeam.rejectedMembers
        : [];
      const updatedRejected = [
        ...currentRejected.filter((r) => r.studentId !== userId),
        {
          studentId: userId,
          name: student?.name || "Student",
          rollNo: student?.rollNo || "",
          email: student?.email || "",
          rejectedAt: new Date().toISOString(),
        },
      ];

      await prisma.$transaction(async (tx) => {
        await tx.teamMember.deleteMany({
          where: {
            teamId: targetTeamId,
            userId,
          },
        });

        await tx.participation.delete({
          where: { id: participation.id },
        });

        await tx.team.update({
          where: { id: targetTeamId },
          data: {
            rejectedMembers: updatedRejected,
          },
        });

        if (notif) {
          await tx.notification.update({
            where: { id: notif.id },
            data: {
              title: "Declined Team Invitation",
              message: `You declined ${participation.team?.leaderStudent?.name || "the leader"}'s invitation to join team "${participation.team?.teamName || ""}" for "${participation.event?.title || "the event"}".`,
              readBy: { push: [userId] },
            },
          });
        }
      });

      const remainingMembersCount = await prisma.teamMember.count({
        where: { teamId: targetTeamId },
      });
      const minSize = event?.minTeamSize || 1;
      const isBelowMin = remainingMembersCount < minSize;

      const notifTitle = isBelowMin ? "Invitation Declined — Less Members" : "Invitation Declined";
      const notifMsg = isBelowMin
        ? `${student?.name || "A member"} declined your invitation to join team "${participation.team?.teamName || ""}". Your team now has less members (${remainingMembersCount}/${minSize}) than required. Please add more members in My Events.`
        : `${student?.name || "A member"} declined your invitation to join team "${participation.team?.teamName || ""}" for "${participation.event?.title || "the event"}".`;

      await notifyTeamMember(
        req.io,
        participation.team?.leaderId,
        notifTitle,
        notifMsg,
        event?.id,
        targetTeamId,
      );

      return res.json({ success: true, message: "Invitation declined successfully." });
    }

    let newStatus = "REGISTERED";

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

    // Validate required fields (social media handles / profile fields) for the event
    const requiredFields = Array.isArray(event?.requiredFields) ? event.requiredFields : [];
    if (requiredFields.length > 0) {
      const student = await prisma.studentUser.findUnique({
        where: { id: userId },
        include: { socialLinks: true },
      });

      const socialKeyMap = {
        githubProfile: "GITHUB",
        linkedinProfile: "LINKEDIN",
        xProfile: "X",
        instagramProfile: "INSTAGRAM",
        whatsappNumber: "WHATSAPP",
        portfolioUrl: "PORTFOLIO",
      };

      const currentLinks = {};
      student?.socialLinks?.forEach((link) => {
        const plat = (link.platform || "").toUpperCase();
        if (plat === "GITHUB") currentLinks.githubProfile = link.url;
        if (plat === "LINKEDIN") currentLinks.linkedinProfile = link.url;
        if (plat === "X") currentLinks.xProfile = link.url;
        if (plat === "INSTAGRAM") currentLinks.instagramProfile = link.url;
        if (plat === "WHATSAPP") currentLinks.whatsappNumber = link.url;
        if (plat === "PORTFOLIO") currentLinks.portfolioUrl = link.url;
      });

      // Check if incoming request provided any handles (either in req.body.socialHandles or directly in req.body)
      const incoming = req.body.socialHandles || req.body || {};
      for (const [key, platform] of Object.entries(socialKeyMap)) {
        if (incoming[key] && typeof incoming[key] === "string" && incoming[key].trim()) {
          const val = incoming[key].trim();
          if (student) {
            await prisma.studentSocialLink.upsert({
              where: {
                studentId_platform: {
                  studentId: userId,
                  platform,
                },
              },
              update: { url: val },
              create: {
                id: crypto.randomBytes(12).toString("hex"),
                studentId: userId,
                platform,
                url: val,
              },
            });
          }
          currentLinks[key] = val;
        }
      }

      if (req.user?.userType === "external" || req.user?.role === "external") {
        const ext = await prisma.externalUser.findUnique({ where: { id: userId } });
        if (ext?.portfolioUrl) currentLinks.portfolioUrl = ext.portfolioUrl;
        if (incoming.portfolioUrl?.trim()) {
          await prisma.externalUser.update({
            where: { id: userId },
            data: { portfolioUrl: incoming.portfolioUrl.trim() },
          });
          currentLinks.portfolioUrl = incoming.portfolioUrl.trim();
        }
      }

      const missing = requiredFields.filter((f) => !currentLinks[f] || !String(currentLinks[f]).trim());
      if (missing.length > 0) {
        return res.status(400).json({
          message: "This event requires you to provide your social media handles before accepting the team invitation.",
          code: "REQUIRED_FIELDS_MISSING",
          requiredFields,
          missingFields: missing,
          eventTitle: event?.title || "Event",
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      const events = await tx.$queryRaw`
        SELECT * FROM "Event" WHERE id = ${event.id} FOR UPDATE
      `;
      const latestEvent = events[0];

      const isFull = latestEvent.totalSeats > 0 && latestEvent.registeredCount >= latestEvent.totalSeats;
      if (isFull) {
        const currentWaitlistCount = (latestEvent.waitingListIds || []).length;
        if (currentWaitlistCount >= MAX_WAITLIST_CAPACITY) {
          const err = new Error("Cannot accept invitation. The event and its waitlist are completely full.");
          err.statusCode = 400;
          err.waitlistFull = true;
          throw err;
        }
        newStatus = "WAITLISTED";
      } else {
        newStatus = "REGISTERED";
      }

      await tx.participation.update({
        where: { id: participation.id },
        data: { status: newStatus },
      });

      if (newStatus === "REGISTERED") {
        await tx.event.update({
          where: { id: event.id },
          data: { registeredCount: { increment: 1 } },
        });
      } else {
        await tx.event.update({
          where: { id: event.id },
          data: { waitingListIds: { push: [participation.id] } },
        });
      }

      if (notif) {
        await tx.notification.update({
          where: { id: notif.id },
          data: {
            title: "Accepted Team Invitation",
            message: `You accepted ${participation.team?.leaderStudent?.name || "the leader"}'s invitation to join team "${participation.team?.teamName || ""}" for "${event.title}".`,
            readBy: { push: [userId] },
          },
        });
      }
    });

    const student = await prisma.studentUser.findUnique({ where: { id: userId } });
    await notifyTeamMember(
      req.io,
      participation.team?.leaderId,
      "Invitation Accepted",
      `${student?.name || "A member"} accepted your invitation to join team "${participation.team?.teamName || ""}" for "${event.title}".`,
      event.id,
      targetTeamId,
    );

    invalidatePublicResponses(["events:public:*"]);

    res.json({ success: true, status: newStatus, message: "Invitation accepted successfully." });
  } catch (err) {
    console.error("Invitation response error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message, waitlistFull: err.waitlistFull });
    }
    res.status(500).json({ message: err.message });
  }
}

router.post(
  "/invitations/:id/respond",
  verifyToken,
  handleInvitationResponse,
);

router.post(
  "/invitations/:id/accept",
  verifyToken,
  async (req, res) => {
    if (!req.body) req.body = {};
    req.body.action = "accept";
    return handleInvitationResponse(req, res);
  },
);

router.post(
  "/invitations/:id/decline",
  verifyToken,
  async (req, res) => {
    if (!req.body) req.body = {};
    req.body.action = "decline";
    return handleInvitationResponse(req, res);
  },
);

async function handleInviteMember(req, res) {
  const targetId = req.params.id;
  const leaderId = req.user.userId;
  let studentId = req.body.studentId;

  try {
    // Resolve team whether targetId is a teamId or a participationId
    let team = await prisma.team.findUnique({
      where: { id: targetId },
      include: {
        event: true,
        members: true,
      },
    });

    if (!team) {
      const part = await prisma.participation.findUnique({
        where: { id: targetId },
        include: {
          team: {
            include: {
              event: true,
              members: true,
            },
          },
        },
      });
      if (part?.team) team = part.team;
    }

    if (!team) return res.status(404).json({ message: "Team not found." });

    // If studentId wasn't passed directly, check memberIds array from frontend
    if (!studentId && Array.isArray(req.body.memberIds)) {
      studentId = req.body.memberIds.find(
        (mId) => mId && !team.members.some((m) => m.userId === mId)
      );
    }

    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required." });
    }

    if (team.leaderId !== leaderId && team.leaderStudentId !== leaderId) {
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

    const alreadyInTeam = team.members.some((m) => m.userId === studentId);
    if (alreadyInTeam) {
      return res.status(400).json({ message: "This user is already a member of your team." });
    }

    const student = await prisma.studentUser.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found." });

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

    const existing = await prisma.participation.findFirst({
      where: {
        eventId: event.id,
        studentId,
      },
    });

    if (existing) {
      return res.status(400).json({
        message: `${student.name} is already registered or invited to this event.`,
      });
    }

    const currentRejected = Array.isArray(team.rejectedMembers) ? team.rejectedMembers : [];
    const updatedRejected = currentRejected.filter((r) => r.studentId !== studentId);

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: {
          id: createObjectId(),
          teamId: team.id,
          userId: studentId,
          studentId,
          role: "member",
        },
      });

      const memberTicketId = crypto.randomBytes(12).toString("base64url");
      const { qrPayload: mPayload, qrVersion: mVer, qrKeyId: mKey } = signTicket(event.id, memberTicketId);

      await tx.participation.create({
        data: {
          id: createObjectId(),
          eventId: event.id,
          userId: studentId,
          studentId,
          teamId: team.id,
          status: "INVITED",
          paymentStatus: "SUCCESS",
          qrCode: memberTicketId,
          qrPayload: mPayload,
          qrVersion: mVer,
          qrKeyId: mKey,
          formResponses: {},
        },
      });

      if (currentRejected.length !== updatedRejected.length) {
        await tx.team.update({
          where: { id: team.id },
          data: { rejectedMembers: updatedRejected },
        });
      }
    });

    const leaderStudent = await prisma.studentUser.findUnique({ where: { id: leaderId } });
    const leaderName = leaderStudent?.name || "Team Leader";

    await notifyInvitation(
      req.io,
      studentId,
      event.id,
      team.id,
      team.teamName,
      event.title,
      leaderName,
    );

    res.json({
      success: true,
      message: `Invitation successfully sent to ${student.name}.`,
    });
  } catch (err) {
    console.error("Invite teammate error:", err);
    res.status(500).json({ message: err.message });
  }
}

async function handleRemoveMember(req, res) {
  const targetId = req.params.id;
  const { studentId } = req.params;
  const leaderId = req.user.userId;

  try {
    let team = await prisma.team.findUnique({
      where: { id: targetId },
      include: {
        event: true,
        members: true,
      },
    });

    if (!team) {
      const part = await prisma.participation.findUnique({
        where: { id: targetId },
        include: {
          team: {
            include: {
              event: true,
              members: true,
            },
          },
        },
      });
      if (part?.team) team = part.team;
    }

    if (!team) return res.status(404).json({ message: "Team not found." });

    if (team.leaderId !== leaderId && team.leaderStudentId !== leaderId) {
      return res.status(403).json({ message: "Only the team leader can remove members." });
    }

    if (studentId === team.leaderId || studentId === team.leaderStudentId) {
      return res.status(400).json({ message: "The team leader cannot be removed. To cancel registration, deregister the team." });
    }

    const memberEntry = team.members.find((m) => m.userId === studentId || m.studentId === studentId);
    if (!memberEntry) {
      return res.status(404).json({ message: "Member not found in this team." });
    }

    const event = team.event;
    if (event) {
      const now = new Date();
      if (now > new Date(event.endTime)) {
        return res.status(400).json({ message: "This event has already ended. Team modifications are closed." });
      }
    }

    const memberPart = await prisma.participation.findFirst({
      where: {
        eventId: team.eventId,
        studentId,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.deleteMany({
        where: {
          teamId: team.id,
          studentId,
        },
      });

      if (memberPart) {
        if (memberPart.status === "REGISTERED") {
          await tx.event.update({
            where: { id: team.eventId },
            data: { registeredCount: { decrement: 1 } },
          });
        }
        await tx.participation.delete({
          where: { id: memberPart.id },
        });
      }
    });

    const removedStudent = await prisma.studentUser.findUnique({ where: { id: studentId } });
    const leaderStudent = await prisma.studentUser.findUnique({ where: { id: leaderId } });

    await notifyTeamMember(
      req.io,
      studentId,
      "Removed from Team",
      `You were removed from team "${team.teamName}" for "${event?.title || "event"}" by the team leader (${leaderStudent?.name || "Leader"}).`,
      event?.id,
      team.id
    );

    invalidatePublicResponses(["events:public:*"]);

    res.json({
      success: true,
      message: `${removedStudent?.name || "Member"} was removed from the team.`,
    });
  } catch (err) {
    console.error("Remove team member error:", err);
    res.status(500).json({ message: err.message });
  }
}

router.post("/:id/invite", verifyToken, handleInviteMember);
router.post("/:id/manage-members", verifyToken, handleInviteMember);
router.delete("/:id/members/:studentId", verifyToken, handleRemoveMember);
router.delete("/:id/manage-members/:studentId", verifyToken, handleRemoveMember);

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
            { leaderStudent: { rollNo: { equals: q, mode: "insensitive" } } },
            { leaderStudent: { email: { equals: q, mode: "insensitive" } } },
            { leaderStudent: { name: { contains: q, mode: "insensitive" } } },
            { teamName: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          leaderStudent: {
            select: { id: true, name: true, rollNo: true, branch: true, email: true },
          },
          members: {
            include: {
              student: {
                select: { id: true, name: true, rollNo: true, branch: true, email: true },
              },
            },
          },
        },
      });

      if (!team) {
        return res.status(404).json({ message: "No registered team found for this leader or team name." });
      }

      const rawMembers = [
        team.leaderStudent?.name,
        ...(team.members || []).map((m) => m.student?.name),
      ].filter(Boolean);

      const memberNames = Array.from(new Set(rawMembers));

      res.json({
        id: team.id,
        teamName: team.teamName,
        leaderName: team.leaderStudent?.name,
        leaderRollNo: team.leaderStudent?.rollNo,
        leaderEmail: team.leaderStudent?.email,
        members: memberNames,
      });
    } catch (err) {
      console.error("Lookup team leader error:", err);
      res.status(500).json({ message: err.message });
    }
  },
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
          leaderStudent: {
            select: { id: true, name: true, email: true, rollNo: true, branch: true, program: true, expectedGraduationYear: true },
          },
          members: {
            include: {
              student: {
                select: { id: true, name: true, email: true, rollNo: true, branch: true, program: true, expectedGraduationYear: true },
              },
            },
          },
        },
      });

      if (!team) return res.status(404).json({ message: "Team not found" });

      const enrichedTeam = {
        ...team,
        leader: team.leaderStudent
          ? {
              ...team.leaderStudent,
              year: calculateAcademicProgress(team.leaderStudent).academicYearLabel,
              academicYear: calculateAcademicProgress(team.leaderStudent).academicYear,
              semester: calculateAcademicProgress(team.leaderStudent).semester,
            }
          : null,
        members: (team.members || []).map((m) => ({
          ...m,
          user: m.student
            ? {
                ...m.student,
                year: calculateAcademicProgress(m.student).academicYearLabel,
                academicYear: calculateAcademicProgress(m.student).academicYear,
                semester: calculateAcademicProgress(m.student).semester,
              }
            : null,
        })),
      };

      res.json(enrichedTeam);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

export default router;
