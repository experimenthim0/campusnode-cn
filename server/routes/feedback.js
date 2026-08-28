import express from "express";
import { verifyToken, allowRoles } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { z } from "zod";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";
import { generateAIFeedbackReview } from "../services/openRouterService.js";
import { generateFeedbackReviewPDF } from "../services/pdfReportService.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";

const router = express.Router();

const FEEDBACK_WINDOW_HOURS = 72;
const FEEDBACK_WINDOW_MS = FEEDBACK_WINDOW_HOURS * 60 * 60 * 1000;

// Schema for feedback submission
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

/**
 * Check if the user has organizer access to the event
 */
async function canAccessEventAnalytics(user, event) {
  if (!user || !event) return false;
  if (user.role === "admin" || user.role === "SUPER_ADMIN" || user.principalType === "ADMIN") return true;

  if (event.organizerType === "CENTRAL" || event.institutionalAccountId) {
    if (user.role === "central_organizer" || user.principalType === "INSTITUTIONAL") return true;
    const instAssignment = (user.institutionalAssignments || []).find(
      (a) => a.status === "ACTIVE" || a.status === undefined
    );
    if (instAssignment) return true;
  }

  if (event.clubId) {
    if (user.role === "facultyCoordinator" && String(user.clubId) === String(event.clubId)) return true;
    if (user.principalType === "CLUB" && String(user.clubId) === String(event.clubId)) return true;
    const membership = (user.memberships || []).find(
      (m) => String(m.clubId) === String(event.clubId) && m.status !== "INACTIVE"
    );
    if (membership && ["CLUB_HEAD", "COORDINATOR"].includes(membership.role)) return true;
  }

  if (String(event.createdById) === String(user.userId || user.id || user.studentId)) return true;

  // Event staff check
  const staff = await prisma.eventStaff.findFirst({
    where: { eventId: event.id, userId: user.userId || user.id, status: "ACTIVE" },
  });
  if (staff) return true;

  return false;
}

/**
 * ── GET /api/feedback/pending ───────────────────────────────────────────────
 * Returns pending feedback count, queue of eligible events, and next event.
 */
router.get("/pending", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?.studentId;
    if (!userId) {
      return res.status(401).json({ message: "Student authentication required." });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - FEEDBACK_WINDOW_MS);

    // 1. Find all participations where student attended and event is completed within 72h
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
            clubId: true,
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
    });

    if (!attendedParticipations.length) {
      return res.json({
        pendingFeedbackCount: 0,
        nextPendingFeedback: null,
        pendingEvents: [],
      });
    }

    const eventIds = attendedParticipations.map((p) => p.eventId);

    // 2. Find already submitted feedbacks
    const submittedFeedbacks = await prisma.eventFeedback.findMany({
      where: {
        userId,
        eventId: { in: eventIds },
      },
      select: { eventId: true },
    });

    const submittedSet = new Set(submittedFeedbacks.map((f) => f.eventId));

    // 3. Filter eligible pending events
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
          club: p.event.club,
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

/**
 * ── GET /api/feedback/my-feedback ───────────────────────────────────────────
 * Returns previously submitted feedback by the current student.
 */
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
      orderBy: { submittedAt: "desc" },
    });

    res.json({
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        eventId: f.eventId,
        event: f.event,
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

/**
 * ── POST /api/feedback/:eventId & POST /api/events/:eventId/feedback ────────
 * Submits feedback for an attended, completed event within 72h.
 */
router.post(["/:eventId", "/events/:eventId"], verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?.studentId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required to submit feedback." });
    }

    // 1. Validate payload structure
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

    // 2. Fetch event
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

    // 3. Event completion check
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

    // 5. Attendance verification check
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

    // 6. Duplicate check (prevent multiple submissions)
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

    // 7. Save feedback record
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

/**
 * ── GET /api/feedback/:eventId/analytics & /api/events/:eventId/feedback/analytics ──
 * Returns aggregated and anonymized feedback analytics for event organizers.
 */
router.get(["/:eventId/analytics", "/events/:eventId/analytics"], verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { filter = "all", search = "" } = req.query;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        club: { select: { id: true, clubName: true, clubLogo: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Authorization check
    const isAuthorized = await canAccessEventAnalytics(req.user, event);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied. Organizer permissions required." });
    }

    // 1. Total attended count
    const totalAttendees = await prisma.participation.count({
      where: {
        eventId,
        status: "ATTENDED",
      },
    });

    // 2. All feedbacks for this event
    const allFeedbacks = await prisma.eventFeedback.findMany({
      where: { eventId },
      orderBy: { submittedAt: "desc" },
    });

    const totalResponses = allFeedbacks.length;
    const responseRate = totalAttendees > 0 ? Math.round((totalResponses / totalAttendees) * 100) : 0;

    // 3. Average ratings calculation
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

    // 4. Rating distribution for Overall (5★ to 1★)
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

    // 5. Recommendation Breakdown
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

    // 6. Anonymized written responses
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

    // Apply sentiment filter
    if (filter && filter !== "all") {
      writtenResponses = writtenResponses.filter((r) => r.sentiment === filter.toLowerCase());
    }

    // Apply search filter
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

/**
 * ── GET /api/feedback/:eventId/ai-reviews ──────────────────────────────────
 * Returns existing AI reviews (Review #1 & #2), review counts, and 72h window status.
 */
router.get("/:eventId/ai-reviews", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }] },
      include: { club: { select: { id: true, clubName: true, slug: true } } },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const hasAccess = await canAccessEventAnalytics(req.user, event);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied. Organizer permissions required." });
    }

    const reviews = await prisma.eventAIReview.findMany({
      where: { eventId: event.id, status: "COMPLETED" },
      orderBy: { reviewNumber: "asc" },
    });

    const now = new Date();
    const eventEnd = new Date(event.endTime);
    const windowClosesAt = new Date(eventEnd.getTime() + FEEDBACK_WINDOW_MS);
    const isWindowLocked = now < windowClosesAt;

    const completedCount = reviews.length;
    const remainingReviews = Math.max(0, 2 - completedCount);

    res.json({
      eventId: event.id,
      eventTitle: event.title,
      completedCount,
      remainingReviews,
      maxAllowed: 2,
      isWindowLocked,
      windowClosesAt: windowClosesAt.toISOString(),
      reviews,
    });
  } catch (error) {
    console.error("GET /api/feedback/:eventId/ai-reviews Error:", error);
    res.status(500).json({ message: "Failed to fetch AI reviews.", error: error.message });
  }
});

/**
 * ── POST /api/feedback/:eventId/ai-review ───────────────────────────────────
 * Generates an AI review for the event using OpenRouter.
 * Enforces:
 * 1. Organizer authorization.
 * 2. 72-hour window completion.
 * 3. Maximum 2 completed AI reviews per event (atomic database reservation).
 * 4. Failure-safe rollback (failed/timeout calls never consume a review slot).
 */
router.post("/:eventId/ai-review", verifyToken, async (req, res) => {
  let reservationId = null;
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }] },
      include: { club: { select: { id: true, clubName: true, slug: true } } },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const hasAccess = await canAccessEventAnalytics(req.user, event);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied. Organizer permissions required to generate AI review." });
    }

    // 1. 72-Hour Window Gating Check
    const now = new Date();
    const eventEnd = new Date(event.endTime);
    const windowClosesAt = new Date(eventEnd.getTime() + FEEDBACK_WINDOW_MS);

    if (now < windowClosesAt) {
      return res.status(400).json({
        message: `AI review is only available after the 72-hour feedback collection window completes (${windowClosesAt.toLocaleString()}).`,
        windowClosesAt: windowClosesAt.toISOString(),
        isWindowLocked: true,
      });
    }

    // 2. Count existing completed reviews & cleanup stale in-progress attempts (> 60s)
    const [completedReviews, totalAttendees] = await Promise.all([
      prisma.eventAIReview.findMany({
        where: { eventId: event.id, status: "COMPLETED" },
        orderBy: { reviewNumber: "asc" },
      }),
      prisma.participation.count({
        where: { eventId: event.id, status: "ATTENDED" },
      }),
    ]);

    if (completedReviews.length >= 2) {
      return res.status(429).json({
        message: "Maximum AI review limit reached (2 / 2 reviews used). No additional AI reviews are available for this event.",
        completedCount: 2,
        remainingReviews: 0,
      });
    }

    // Clean up any stale IN_PROGRESS reservations older than 60s
    await prisma.eventAIReview.deleteMany({
      where: {
        eventId: event.id,
        status: "IN_PROGRESS",
        createdAt: { lt: new Date(Date.now() - 60000) },
      },
    });

    // Check if an active IN_PROGRESS generation is currently running
    const activeLock = await prisma.eventAIReview.findFirst({
      where: {
        eventId: event.id,
        status: "IN_PROGRESS",
      },
    });

    if (activeLock) {
      return res.status(409).json({
        message: "An AI review generation is already currently in progress. Please wait a moment.",
      });
    }

    const reviewNumber = completedReviews.length + 1;

    // 3. Atomically reserve slot
    const newReservationId = createObjectId();
    const reservation = await prisma.eventAIReview.create({
      data: {
        id: newReservationId,
        eventId: event.id,
        reviewNumber,
        status: "IN_PROGRESS",
        responseCount: 0,
        attendeeCount: totalAttendees,
        overallSentiment: "insufficient_data",
        overallSummary: "Generating...",
        whatStudentsLiked: [],
        improvementAreas: [],
        keyTakeaways: [],
        recommendations: [],
        positiveHighlights: [],
        constructiveHighlights: [],
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free",
        generatedById: req.user.userId || req.user.id || null,
      },
    });
    reservationId = reservation.id;

    // 4. Fetch all feedbacks for this event
    const allFeedbacks = await prisma.eventFeedback.findMany({
      where: { eventId: event.id },
      orderBy: { submittedAt: "desc" },
    });

    if (!allFeedbacks.length) {
      await prisma.eventAIReview.delete({ where: { id: reservationId } });
      reservationId = null;
      return res.status(400).json({
        message: "There is not enough feedback to generate an AI review.",
      });
    }

    // Calculate objective attendAgain breakdown from database
    const recCounts = { YES: 0, MAYBE: 0, NO: 0 };
    allFeedbacks.forEach((f) => {
      if (recCounts[f.attendSimilar] !== undefined) recCounts[f.attendSimilar]++;
    });

    const attendAgainSummary = {
      yesPercentage: Math.round((recCounts.YES / allFeedbacks.length) * 100),
      maybePercentage: Math.round((recCounts.MAYBE / allFeedbacks.length) * 100),
      noPercentage: Math.round((recCounts.NO / allFeedbacks.length) * 100),
    };

    // 5. Generate AI Review via OpenRouter
    let aiResult;
    try {
      aiResult = await generateAIFeedbackReview({
        event,
        feedbacks: allFeedbacks,
        totalAttendees,
      });
    } catch (aiErr) {
      // Rollback reservation on any failure — DO NOT consume review slot
      await prisma.eventAIReview.delete({ where: { id: reservationId } });
      reservationId = null;
      console.error("AI Generation Failed:", aiErr.message);
      return res.status(502).json({
        message: "AI review could not be generated. Your review limit has not been used. Please try again.",
        error: aiErr.message,
      });
    }

    // 6. Complete and save review
    const completedReview = await prisma.eventAIReview.update({
      where: { id: reservation.id },
      data: {
        status: "COMPLETED",
        responseCount: allFeedbacks.length,
        attendeeCount: totalAttendees,
        overallSentiment: aiResult.overallSentiment,
        overallSummary: aiResult.overallSummary,
        whatStudentsLiked: aiResult.whatStudentsLiked,
        improvementAreas: aiResult.improvementAreas,
        keyTakeaways: aiResult.keyTakeaways,
        recommendations: aiResult.recommendations,
        positiveHighlights: aiResult.positiveHighlights,
        constructiveHighlights: aiResult.constructiveHighlights,
        attendAgainSummary,
        model: aiResult.modelUsed || process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free",
        generatedAt: new Date(),
      },
    });

    res.status(201).json({
      message: "AI Feedback Review generated successfully.",
      review: completedReview,
      completedCount: reviewNumber,
      remainingReviews: Math.max(0, 2 - reviewNumber),
    });
  } catch (error) {
    if (reservationId) {
      try {
        await prisma.eventAIReview.delete({ where: { id: reservationId } });
      } catch {
        // ignore rollback cleanup error
      }
    }
    console.error("POST /api/feedback/:eventId/ai-review Error:", error);
    res.status(500).json({
      message: "An unexpected error occurred while generating the AI review. Your review limit was not used.",
      error: error.message,
    });
  }
});

/**
 * ── GET /api/feedback/:eventId/ai-reviews/:reviewNumber/pdf ──────────────────
 * Streams a clean publication-ready PDF report of the stored AI review (0 AI consumption).
 */
router.get("/:eventId/ai-reviews/:reviewNumber/pdf", verifyToken, async (req, res) => {
  try {
    const { eventId, reviewNumber } = req.params;
    const rNum = parseInt(reviewNumber, 10);

    if (isNaN(rNum) || rNum < 1 || rNum > 2) {
      return res.status(400).json({ message: "Invalid review number. Must be 1 or 2." });
    }

    const event = await prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }] },
      include: { club: { select: { id: true, clubName: true, slug: true } } },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const hasAccess = await canAccessEventAnalytics(req.user, event);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied." });
    }

    const review = await prisma.eventAIReview.findFirst({
      where: { eventId: event.id, reviewNumber: rNum, status: "COMPLETED" },
    });

    if (!review) {
      return res.status(404).json({ message: `AI Review #${rNum} has not been generated for this event.` });
    }

    const [allFeedbacks, totalAttendees] = await Promise.all([
      prisma.eventFeedback.findMany({ where: { eventId: event.id } }),
      prisma.participation.count({ where: { eventId: event.id, status: "ATTENDED" } }),
    ]);

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
      if (ratingDistribution[f.overallRating] !== undefined) ratingDistribution[f.overallRating]++;
    });
    const distributionArray = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratingDistribution[stars],
      percentage: totalResponses > 0 ? Math.round((ratingDistribution[stars] / totalResponses) * 100) : 0,
    }));

    const recCounts = { YES: 0, MAYBE: 0, NO: 0 };
    allFeedbacks.forEach((f) => {
      if (recCounts[f.attendSimilar] !== undefined) recCounts[f.attendSimilar]++;
    });
    const recommendationAnalytics = {
      yes: { count: recCounts.YES, percentage: totalResponses > 0 ? Math.round((recCounts.YES / totalResponses) * 100) : 0 },
      maybe: { count: recCounts.MAYBE, percentage: totalResponses > 0 ? Math.round((recCounts.MAYBE / totalResponses) * 100) : 0 },
      no: { count: recCounts.NO, percentage: totalResponses > 0 ? Math.round((recCounts.NO / totalResponses) * 100) : 0 },
    };

    const analytics = {
      overview: { totalResponses, totalAttendees, responseRate },
      averageRatings,
      ratingDistribution: distributionArray,
      recommendationAnalytics,
    };

    const sanitizedTitle = (event.title || "event").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="CampusNode-AI-Feedback-Review-${sanitizedTitle}-R${rNum}.pdf"`);

    generateFeedbackReviewPDF({ event, review, analytics, stream: res });
  } catch (error) {
    console.error("GET /api/feedback/:eventId/ai-reviews/:reviewNumber/pdf Error:", error);
    res.status(500).json({ message: "Failed to generate review PDF.", error: error.message });
  }
});

/**
 * ── GET /api/feedback/:eventId/ai-reviews/:reviewNumber/json ─────────────────
 * Returns structured JSON for export (0 AI consumption).
 */
router.get("/:eventId/ai-reviews/:reviewNumber/json", verifyToken, async (req, res) => {
  try {
    const { eventId, reviewNumber } = req.params;
    const rNum = parseInt(reviewNumber, 10);

    const event = await prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }] },
      include: { club: { select: { id: true, clubName: true, slug: true } } },
    });

    if (!event) return res.status(404).json({ message: "Event not found." });

    const hasAccess = await canAccessEventAnalytics(req.user, event);
    if (!hasAccess) return res.status(403).json({ message: "Access denied." });

    const review = await prisma.eventAIReview.findFirst({
      where: { eventId: event.id, reviewNumber: rNum, status: "COMPLETED" },
    });

    if (!review) {
      return res.status(404).json({ message: `AI Review #${rNum} not found.` });
    }

    res.json({ event, review });
  } catch (error) {
    res.status(500).json({ message: "Failed to export review JSON.", error: error.message });
  }
});

export default router;


