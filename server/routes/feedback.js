import express from "express";
import { verifyToken, allowRoles } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { z } from "zod";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";

const router = express.Router();

const FEEDBACK_WINDOW_HOURS = 72;
const FEEDBACK_WINDOW_MS = FEEDBACK_WINDOW_HOURS * 60 * 60 * 1000;

const feedbackSubmissionSchema = z.object({
  overallRating: z.coerce.number().int().min(1, "Overall rating must be between 1 and 5").max(5),
  organizationRating: z.coerce.number().int().min(1, "Organization rating must be between 1 and 5").max(5),
  usefulnessRating: z.coerce.number().int().min(1, "Usefulness rating must be between 1 and 5").max(5),
  speakerRating: z.coerce.number().int().min(1, "Speaker/Host rating must be between 1 and 5").max(5),
  venueRating: z.coerce.number().int().min(1, "Venue rating must be between 1 and 5").max(5),
  timingRating: z.coerce.number().int().min(1, "Timing rating must be between 1 and 5").max(5),
  attendSimilar: z.enum(["YES", "MAYBE", "NO"], {
    errorMap: () => ({ message: "Recommendation must be YES, MAYBE, or NO" }),
  }),
  liked: z.string().max(1000).optional().nullable(),
  improvements: z.string().max(1000).optional().nullable(),
  comments: z.string().max(2000).optional().nullable(),
});

async function canAccessEventAnalytics(user, event) {
  if (!user || !event) return false;
  if (user.role === "admin" || user.role === "SUPER_ADMIN" || user.principalType === "ADMIN") return true;

  const eventWithOrganizers = event.organizers ? event : await prisma.event.findUnique({
    where: { id: event.id },
    include: { organizers: true },
  });
  const organizerClubIds = (eventWithOrganizers?.organizers || []).map((o) => o.clubId);

  if (user.role === "facultyCoordinator" && user.clubId && organizerClubIds.includes(user.clubId)) return true;

  const membership = (user.memberships || []).find(
    (m) => organizerClubIds.includes(m.clubId)
  );
  if (membership && ["CLUB_HEAD", "COORDINATOR"].includes(membership.role)) return true;

  if (String(event.createdById) === String(user.userId || user.id || user.studentId)) return true;

  return false;
}

router.get("/pending", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.studentId;
    if (!userId) {
      return res.status(401).json({ message: "Student authentication required." });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - FEEDBACK_WINDOW_MS);

    const attendedParticipations = await prisma.participation.findMany({
      where: {
        studentId: userId,
        status: "ATTENDED",
        event: {
          reviewStatus: "PUBLISHED",
          feedbackEnabled: true,
          endTime: {
            lt: now,
            gte: cutoff,
          },
        },
      },
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
            organizers: {
              include: {
                club: {
                  select: {
                    id: true,
                    clubName: true,
                    clubLogo: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attendedParticipations.length) {
      return res.json({
        pendingFeedbackCount: 0,
        nextPendingFeedback: null,
        pendingEvents: [],
      });
    }

    const eventIds = attendedParticipations.map((p) => p.eventId);

    const submittedFeedbacks = await prisma.eventFeedback.findMany({
      where: {
        userId,
        eventId: { in: eventIds },
      },
      select: { eventId: true },
    });

    const submittedSet = new Set(submittedFeedbacks.map((f) => f.eventId));

    const pendingEvents = attendedParticipations
      .filter((p) => !submittedSet.has(p.eventId) && p.event)
      .map((p) => {
        const endTime = new Date(p.event.endTime);
        const feedbackOpenAt = endTime.toISOString();
        const feedbackDeadline = new Date(endTime.getTime() + FEEDBACK_WINDOW_MS).toISOString();
        return {
          id: p.event.id,
          eventId: p.event.id,
          title: p.event.title,
          slug: p.event.slug,
          venue: p.event.venue,
          startTime: p.event.startTime,
          endTime: p.event.endTime,
          imageUrl: p.event.imageUrl,
          club: p.event.organizers?.[0]?.club || null,
          feedbackOpenAt,
          feedbackDeadline,
          attendedAt: p.attendedAt,
        };
      })
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    res.json({
      pendingFeedbackCount: pendingEvents.length,
      nextPendingFeedback: pendingEvents[0] || null,
      pendingEvents,
    });
  } catch (error) {
    console.error("GET /api/feedback/pending Error:", error);
    res.status(500).json({ message: "Failed to fetch pending feedback.", error: error.message });
  }
});

router.get("/my-feedback", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.studentId;
    if (!userId) {
      return res.status(401).json({ message: "Student authentication required." });
    }

    const feedbacks = await prisma.eventFeedback.findMany({
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
            organizers: {
              include: {
                club: {
                  select: {
                    id: true,
                    clubName: true,
                    clubLogo: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    res.json({
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        eventId: f.eventId,
        event: {
          ...f.event,
          club: f.event?.organizers?.[0]?.club || null,
        },
        overallRating: f.overallRating,
        organizationRating: f.organizationRating,
        usefulnessRating: f.usefulnessRating,
        speakerRating: f.speakerRating,
        venueRating: f.venueRating,
        timingRating: f.timingRating,
        attendSimilar: f.attendSimilar,
        liked: f.liked,
        improvements: f.improvements,
        comments: f.comments,
        submittedAt: f.submittedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/feedback/my-feedback Error:", error);
    res.status(500).json({ message: "Failed to fetch feedback history.", error: error.message });
  }
});

router.post(["/:eventId", "/events/:eventId"], verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?.studentId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required to submit feedback." });
    }

    const parsed = feedbackSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid feedback submission data.",
        errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const {
      overallRating,
      organizationRating,
      usefulnessRating,
      speakerRating,
      venueRating,
      timingRating,
      attendSimilar,
      liked,
      improvements,
      comments,
    } = parsed.data;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.reviewStatus !== "PUBLISHED") {
      return res.status(400).json({ message: "Feedback is only available for published events." });
    }

    if (event.feedbackEnabled === false) {
      return res.status(400).json({ message: "Feedback collection is disabled for this event." });
    }

    const now = new Date();
    const eventEndTime = new Date(event.endTime);

    if (now < eventEndTime) {
      return res.status(400).json({ message: "Feedback can only be submitted after the event has completed." });
    }

    // 4. 72-hour feedback window check
    const deadline = new Date(eventEndTime.getTime() + FEEDBACK_WINDOW_MS);
    if (now > deadline) {
      return res.status(400).json({
        message: "The 72-hour feedback window for this event has closed.",
        feedbackDeadline: deadline.toISOString(),
      });
    }

    const participation = await prisma.participation.findFirst({
      where: {
        eventId,
        studentId: userId,
        status: "ATTENDED",
      },
    });

    if (!participation) {
      return res.status(403).json({
        message: "Feedback is only available to students who officially attended the event.",
      });
    }

    const existingFeedback = await prisma.eventFeedback.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existingFeedback) {
      return res.status(409).json({
        message: "You have already submitted feedback for this event.",
      });
    }

    const newFeedback = await prisma.eventFeedback.create({
      data: {
        id: createObjectId(),
        eventId,
        userId,
        overallRating,
        organizationRating,
        usefulnessRating,
        speakerRating,
        venueRating,
        timingRating,
        attendSimilar,
        liked: liked ? liked.trim() : null,
        improvements: improvements ? improvements.trim() : null,
        comments: comments ? comments.trim() : null,
        submittedAt: now,
      },
    });

    res.status(201).json({
      success: true,
      message: "Your feedback has been submitted successfully.",
      feedback: {
        id: newFeedback.id,
        eventId: newFeedback.eventId,
        submittedAt: newFeedback.submittedAt,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "You have already submitted feedback for this event." });
    }
    console.error("POST /api/feedback Error:", error);
    res.status(500).json({ message: "Failed to submit feedback.", error: error.message });
  }
});

router.get(["/:eventId/analytics", "/events/:eventId/analytics"], verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { filter = "all", search = "" } = req.query;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizers: {
          include: {
            club: { select: { id: true, clubName: true, clubLogo: true } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const isAuthorized = await canAccessEventAnalytics(req.user, event);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied. Organizer permissions required." });
    }

    const totalAttendees = await prisma.participation.count({
      where: {
        eventId,
        status: "ATTENDED",
      },
    });

    const allFeedbacks = await prisma.eventFeedback.findMany({
      where: { eventId },
      orderBy: { submittedAt: "desc" },
    });

    const totalResponses = allFeedbacks.length;
    const responseRate = totalAttendees > 0 ? Math.round((totalResponses / totalAttendees) * 100) : 0;

    const calculateAvg = (key) => {
      if (!totalResponses) return 0;
      const sum = allFeedbacks.reduce((acc, f) => acc + (f[key] || 0), 0);
      return Number((sum / totalResponses).toFixed(1));
    };

    const averageRatings = {
      overall: calculateAvg("overallRating"),
      organization: calculateAvg("organizationRating"),
      usefulness: calculateAvg("usefulnessRating"),
      speaker: calculateAvg("speakerRating"),
      venue: calculateAvg("venueRating"),
      timing: calculateAvg("timingRating"),
    };

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allFeedbacks.forEach((f) => {
      if (ratingDistribution[f.overallRating] !== undefined) {
        ratingDistribution[f.overallRating]++;
      }
    });

    const distributionArray = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratingDistribution[stars],
      percentage: totalResponses > 0 ? Math.round((ratingDistribution[stars] / totalResponses) * 100) : 0,
    }));

    const recCounts = { YES: 0, MAYBE: 0, NO: 0 };
    allFeedbacks.forEach((f) => {
      if (recCounts[f.attendSimilar] !== undefined) {
        recCounts[f.attendSimilar]++;
      }
    });

    const recommendationAnalytics = {
      yes: {
        count: recCounts.YES,
        percentage: totalResponses > 0 ? Math.round((recCounts.YES / totalResponses) * 100) : 0,
      },
      maybe: {
        count: recCounts.MAYBE,
        percentage: totalResponses > 0 ? Math.round((recCounts.MAYBE / totalResponses) * 100) : 0,
      },
      no: {
        count: recCounts.NO,
        percentage: totalResponses > 0 ? Math.round((recCounts.NO / totalResponses) * 100) : 0,
      },
    };

    let writtenResponses = allFeedbacks
      .filter((f) => Boolean(f.liked || f.improvements || f.comments))
      .map((f) => {
        let sentiment = "neutral";
        if (f.overallRating >= 4) sentiment = "positive";
        else if (f.overallRating <= 2) sentiment = "negative";

        return {
          id: f.id,
          overallRating: f.overallRating,
          organizationRating: f.organizationRating,
          usefulnessRating: f.usefulnessRating,
          speakerRating: f.speakerRating,
          venueRating: f.venueRating,
          timingRating: f.timingRating,
          attendSimilar: f.attendSimilar,
          liked: f.liked,
          improvements: f.improvements,
          comments: f.comments,
          submittedAt: f.submittedAt,
          sentiment,
        };
      });

    if (filter && filter !== "all") {
      writtenResponses = writtenResponses.filter((r) => r.sentiment === filter.toLowerCase());
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      writtenResponses = writtenResponses.filter(
        (r) =>
          (r.liked && r.liked.toLowerCase().includes(q)) ||
          (r.improvements && r.improvements.toLowerCase().includes(q)) ||
          (r.comments && r.comments.toLowerCase().includes(q))
      );
    }

    res.json({
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime,
        feedbackEnabled: event.feedbackEnabled,
      },
      overview: {
        totalResponses,
        totalAttendees,
        responseRate,
      },
      averageRatings,
      ratingDistribution: distributionArray,
      recommendationAnalytics,
      writtenResponses,
    });
  } catch (error) {
    console.error("GET /api/feedback/:eventId/analytics Error:", error);
    res.status(500).json({ message: "Failed to fetch feedback analytics.", error: error.message });
  }
});

export default router;

