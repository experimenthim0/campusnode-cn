import { z } from "zod";

const DEFAULT_MODEL = "openrouter/free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const aiFeedbackReviewSchema = z.object({
  overallSentiment: z.enum([
    "very_positive",
    "positive",
    "mixed",
    "negative",
    "very_negative",
    "insufficient_data",
  ]).default("positive"),
  overallSummary: z.string().default("Attendee feedback analyzed."),
  whatStudentsLiked: z.array(
    z.object({
      theme: z.string(),
      summary: z.string(),
      evidenceCount: z.number().int().optional(),
    })
  ).default([]),
  improvementAreas: z.array(
    z.object({
      theme: z.string(),
      summary: z.string(),
      evidenceCount: z.number().int().optional(),
      priority: z.enum(["high", "medium", "low"]).default("medium"),
    })
  ).default([]),
  keyTakeaways: z.array(z.string()).default([]),
  recommendations: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(["high", "medium", "low"]).default("medium"),
      evidenceCount: z.number().int().optional(),
    })
  ).default([]),
  positiveHighlights: z.array(
    z.object({
      quote: z.string(),
      reason: z.string(),
    })
  ).default([]),
  constructiveHighlights: z.array(
    z.object({
      quote: z.string(),
      reason: z.string(),
    })
  ).default([]),
  attendAgain: z
    .object({
      yesPercentage: z.number(),
      maybePercentage: z.number(),
      noPercentage: z.number(),
    })
    .optional(),
});

export function normalizeAIReviewResponse(raw) {
  if (!raw || typeof raw !== "object") {
    raw = {};
  }

  // 1. Normalize sentiment
  let sentiment = (raw.overallSentiment || raw.sentiment || "positive")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  const validSentiments = ["very_positive", "positive", "mixed", "negative", "very_negative", "insufficient_data"];
  if (!validSentiments.includes(sentiment)) {
    if (sentiment.includes("very_pos") || sentiment.includes("excellent")) sentiment = "very_positive";
    else if (sentiment.includes("pos")) sentiment = "positive";
    else if (sentiment.includes("mix") || sentiment.includes("neutral")) sentiment = "mixed";
    else if (sentiment.includes("very_neg") || sentiment.includes("terrible")) sentiment = "very_negative";
    else if (sentiment.includes("neg")) sentiment = "negative";
    else sentiment = "positive";
  }

  const summary = (
    raw.overallSummary ||
    raw.summary ||
    raw.executiveSummary ||
    raw.overview ||
    "The event attendee feedback has been analyzed."
  ).toString().trim();

  let rawTakeaways = raw.keyTakeaways || raw.takeaways || raw.takeaway || raw.points || [];
  if (!Array.isArray(rawTakeaways)) {
    rawTakeaways = typeof rawTakeaways === "string" ? [rawTakeaways] : [];
  }
  const keyTakeaways = rawTakeaways
    .map((t) => (typeof t === "string" ? t.trim() : t?.text || t?.summary || JSON.stringify(t)))
    .filter(Boolean);
  if (keyTakeaways.length === 0) {
    keyTakeaways.push(summary.slice(0, 150));
  }

  let rawLiked = raw.whatStudentsLiked || raw.positiveThemes || raw.liked || raw.likes || raw.positives || [];
  if (!Array.isArray(rawLiked)) rawLiked = [];
  const whatStudentsLiked = rawLiked.map((item) => {
    if (typeof item === "string") {
      return { theme: item, summary: item, evidenceCount: 1 };
    }
    return {
      theme: item?.theme || item?.title || item?.name || "Positive Highlight",
      summary: item?.summary || item?.description || item?.text || "",
      evidenceCount: typeof item?.evidenceCount === "number" ? item.evidenceCount : undefined,
    };
  });

  let rawImprovements = raw.improvementAreas || raw.areasForImprovement || raw.improvements || raw.constructiveAreas || [];
  if (!Array.isArray(rawImprovements)) rawImprovements = [];
  const improvementAreas = rawImprovements.map((item) => {
    if (typeof item === "string") {
      return { theme: item, summary: item, priority: "medium" };
    }
    let priority = (item?.priority || "medium").toString().toLowerCase();
    if (!["high", "medium", "low"].includes(priority)) priority = "medium";
    return {
      theme: item?.theme || item?.title || item?.name || "Area for Improvement",
      summary: item?.summary || item?.description || item?.text || "",
      priority,
      evidenceCount: typeof item?.evidenceCount === "number" ? item.evidenceCount : undefined,
    };
  });

  let rawRecs = raw.recommendations || raw.actionableRecommendations || raw.actions || raw.actionItems || raw.recommendedActions || [];
  if (!Array.isArray(rawRecs)) rawRecs = [];
  const recommendations = rawRecs.map((item) => {
    if (typeof item === "string") {
      return { title: item, description: item, priority: "medium" };
    }
    let priority = (item?.priority || "medium").toString().toLowerCase();
    if (!["high", "medium", "low"].includes(priority)) priority = "medium";
    return {
      title: item?.title || item?.name || item?.action || "Action Item",
      description: item?.description || item?.details || item?.summary || item?.text || "",
      priority,
      evidenceCount: typeof item?.evidenceCount === "number" ? item.evidenceCount : undefined,
    };
  });

  let rawPosQuotes = raw.positiveHighlights || raw.positiveQuotes || raw.quotes?.positive || [];
  if (!Array.isArray(rawPosQuotes)) rawPosQuotes = [];
  const positiveHighlights = rawPosQuotes.map((item) => ({
    quote: (typeof item === "string" ? item : item?.quote || "").toString().trim(),
    reason: (item?.reason || item?.context || "Positive student mention").toString().trim(),
  })).filter((q) => q.quote.length > 0);

  let rawNegQuotes = raw.constructiveHighlights || raw.constructiveQuotes || raw.quotes?.constructive || [];
  if (!Array.isArray(rawNegQuotes)) rawNegQuotes = [];
  const constructiveHighlights = rawNegQuotes.map((item) => ({
    quote: (typeof item === "string" ? item : item?.quote || "").toString().trim(),
    reason: (item?.reason || item?.context || "Constructive student suggestion").toString().trim(),
  })).filter((q) => q.quote.length > 0);

  return {
    overallSentiment: sentiment,
    overallSummary: summary,
    whatStudentsLiked,
    improvementAreas,
    keyTakeaways,
    recommendations,
    positiveHighlights,
    constructiveHighlights,
  };
}

export function sanitizeFeedbackForAI(event, feedbacks, totalAttendees) {
  const sanitizedFeedbacks = feedbacks.map((f, index) => {
    const entry = {
      id: `response_${index + 1}`,
      ratings: {
        overall: f.overallRating,
        organization: f.organizationRating,
        usefulness: f.usefulnessRating,
        speaker: f.speakerRating,
        venue: f.venueRating,
        timing: f.timingRating,
      },
      recommendation: f.attendSimilar,
    };

    if (f.liked && f.liked.trim()) entry.liked = f.liked.trim();
    if (f.improvements && f.improvements.trim()) entry.improvements = f.improvements.trim();
    if (f.comments && f.comments.trim()) entry.comments = f.comments.trim();

    return entry;
  });

  return {
    eventTitle: event.title,
    venue: event.venue || "Campus",
    totalAttendees: totalAttendees || feedbacks.length,
    totalResponses: feedbacks.length,
    feedbacks: sanitizedFeedbacks,
  };
}

export function verifyQuoteIntegrity(highlights, rawComments) {
  if (!Array.isArray(highlights) || highlights.length === 0) return [];
  if (!rawComments || rawComments.length === 0) return [];

  const lowerComments = rawComments.map((c) => c.toLowerCase().trim());

  return highlights.filter((item) => {
    if (!item?.quote || typeof item.quote !== "string") return false;
    const qLower = item.quote.toLowerCase().trim();
    if (qLower.length < 5) return false;

    const matches = lowerComments.some(
      (c) => c.includes(qLower) || qLower.includes(c)
    );
    return matches;
  });
}

export async function generateAIFeedbackReview({
  event,
  feedbacks,
  totalAttendees,
  apiKey = process.env.OPENROUTER_API_KEY,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
}) {
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  }

  if (!feedbacks || feedbacks.length === 0) {
    throw new Error("No feedback responses available to analyze.");
  }

  const sanitizedData = sanitizeFeedbackForAI(event, feedbacks, totalAttendees);

  const allStudentRawComments = [];
  feedbacks.forEach((f) => {
    if (f.liked?.trim()) allStudentRawComments.push(f.liked.trim());
    if (f.improvements?.trim()) allStudentRawComments.push(f.improvements.trim());
    if (f.comments?.trim()) allStudentRawComments.push(f.comments.trim());
  });

  const systemPrompt = `You are an expert event evaluation psychologist and student feedback analyst for CampusNode at NIT Jalandhar.
Your mission is to objectively analyze the complete submitted attendee feedback dataset for an event and provide a concise, highly actionable review for club organizers.

CRITICAL RULES & CONSTRAINTS:
1. Grounding & Truthfulness: Base all observations, themes, and evidence counts strictly on the provided dataset. Never invent facts, percentages, or student sentiments.
2. Quote Integrity: When providing "positiveHighlights" and "constructiveHighlights", you MUST use the EXACT verbatim text from the student responses ("liked", "improvements", "comments"). DO NOT rephrase, correct grammar, or fabricate quotes. If no suitable quote exists in the data, return an empty array.
3. Proportionality & Distinction:
   - Distinguish isolated feedback (1 person) from recurring feedback (multiple students) and strong recurring issues (significant portion).
   - Do NOT turn an isolated student's complaint into a generalized claim about all attendees.
4. Actionable Takeaways: Keep "keyTakeaways" strictly between 3 to 5 clear, concise points for quick executive decision-making.
5. Structured JSON Output: Return a single valid JSON object strictly matching this schema:
{
  "overallSentiment": "very_positive" | "positive" | "mixed" | "negative" | "very_negative" | "insufficient_data",
  "overallSummary": "Concise executive summary (2-3 sentences)",
  "whatStudentsLiked": [
    { "theme": "Theme title", "summary": "Brief explanation", "evidenceCount": number }
  ],
  "improvementAreas": [
    { "theme": "Theme title", "summary": "Brief explanation", "evidenceCount": number, "priority": "high" | "medium" | "low" }
  ],
  "keyTakeaways": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3"
  ],
  "recommendations": [
    { "title": "Actionable title", "description": "Specific action with context", "priority": "high" | "medium" | "low", "evidenceCount": number }
  ],
  "positiveHighlights": [
    { "quote": "Verbatim quote from student feedback", "reason": "Why this feedback is valuable" }
  ],
  "constructiveHighlights": [
    { "quote": "Verbatim quote from student feedback", "reason": "Why this feedback is valuable" }
  ]
}

DO NOT wrap the response in markdown code fences unless standard json block is required. Return raw valid JSON.`;

  const userPrompt = `Here is the anonymized event feedback dataset to analyze:

Event Title: "${sanitizedData.eventTitle}"
Venue: "${sanitizedData.venue}"
Total Attendees: ${sanitizedData.totalAttendees}
Total Feedback Responses: ${sanitizedData.totalResponses}

Dataset Responses:
${JSON.stringify(sanitizedData.feedbacks, null, 2)}

Analyze this complete dataset and return the structured JSON review now:`;

  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (process.env.OPENROUTER_SITE_URL) {
    requestHeaders["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  }
  if (process.env.OPENROUTER_SITE_NAME) {
    requestHeaders["X-Title"] = process.env.OPENROUTER_SITE_NAME;
  }

  const candidateModels = Array.from(
    new Set([
      model,
      "openrouter/free",
      "google/gemma-4-31b-it:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "mistralai/mistral-small-24b-instruct-2501:free",
      "deepseek/deepseek-r1:free",
      "google/gemini-2.0-flash-001",
    ])
  );

  let rawContent = null;
  let modelActuallyUsed = model;
  let lastError = null;

  for (const currentModel of candidateModels) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail = "";
        try {
          const errJson = await response.json();
          errorDetail = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errorDetail = await response.text();
        }

        // If it's a model not found (400), rate limit (429), or temporary provider outage (502, 503), try next fallback model
        const isRecoverableError =
          (response.status === 400 && (errorDetail.includes("not a valid model") || errorDetail.includes("model"))) ||
          response.status === 429 ||
          response.status === 502 ||
          response.status === 503;

        if (isRecoverableError) {
          console.warn(`[CampusNode AI] Model "${currentModel}" failed with ${response.status} (${errorDetail}), trying fallback model...`);
          lastError = new Error(`OpenRouter API error (${response.status}): ${errorDetail}`);
          continue;
        }

        throw new Error(`OpenRouter API error (${response.status}): ${errorDetail}`);
      }

      const data = await response.json();
      rawContent = data.choices?.[0]?.message?.content;
      modelActuallyUsed = currentModel;
      if (rawContent) break;
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        throw new Error("AI Review request timed out after 45 seconds.");
      }
      lastError = fetchErr;
      if (
        fetchErr.message?.includes("OpenRouter API error (400)") ||
        fetchErr.message?.includes("OpenRouter API error (429)") ||
        fetchErr.message?.includes("OpenRouter API error (502)") ||
        fetchErr.message?.includes("OpenRouter API error (503)")
      ) {
        continue;
      }
      throw fetchErr;
    }
  }

  if (!rawContent) {
    throw lastError || new Error("OpenRouter returned an empty completion.");
  }

  let parsedJson;
  try {
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsedJson = JSON.parse(cleaned);
  } catch (parseErr) {
    throw new Error(`Invalid JSON returned by AI model: ${parseErr.message}`);
  }

  const normalizedJson = normalizeAIReviewResponse(parsedJson);

  const validated = aiFeedbackReviewSchema.safeParse(normalizedJson);
  if (!validated.success) {
    const errorDetails = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`AI Review failed schema validation: ${errorDetails}`);
  }

  const reviewData = validated.data;

  if (allStudentRawComments.length > 0) {
    reviewData.positiveHighlights = verifyQuoteIntegrity(
      reviewData.positiveHighlights,
      allStudentRawComments
    );
    reviewData.constructiveHighlights = verifyQuoteIntegrity(
      reviewData.constructiveHighlights,
      allStudentRawComments
    );
  } else {
    reviewData.positiveHighlights = [];
    reviewData.constructiveHighlights = [];
  }

  return {
    ...reviewData,
    modelUsed: modelActuallyUsed || model,
  };
}
