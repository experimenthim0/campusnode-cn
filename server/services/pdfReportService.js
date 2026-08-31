import PDFDocument from "pdfkit";

export function generateFeedbackReviewPDF({ event, review, analytics, stream }) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `CampusNode AI Feedback Review - ${event.title}`,
      Author: "CampusNode NITJ",
      Subject: "Event Attendee AI Feedback Review & Actionable Insights",
    },
  });

  doc.pipe(stream);

  const colors = {
    primary: "#ea580c", // Orange
    dark: "#0f172a",    // Slate 900
    text: "#334155",    // Slate 700
    muted: "#64748b",   // Slate 500
    border: "#e2e8f0",  // Slate 200
    bgCard: "#f8fafc",  // Slate 50
    success: "#16a34a", // Green
    warning: "#d97706", // Amber
    danger: "#dc2626",  // Red
  };

  doc.rect(40, 40, 515, 60).fillAndStroke("#18181b", "#27272a");
  doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text("CampusNode", 55, 52);
  doc.fontSize(10).font("Helvetica").fillColor("#fdba74").text("AI EVENT FEEDBACK REVIEW & ANALYTICS REPORT", 55, 75);
  doc.fontSize(9).font("Helvetica").fillColor("#a1a1aa").text(`Review #${review.reviewNumber} • ${new Date(review.generatedAt).toLocaleDateString()}`, 380, 75, { align: "right", width: 160 });

  doc.moveDown(3);
  doc.y = 115;

  doc.rect(40, doc.y, 515, 65).fillAndStroke(colors.bgCard, colors.border);
  const cardY = doc.y + 10;
  doc.fillColor(colors.dark).fontSize(14).font("Helvetica-Bold").text(event.title, 55, cardY, { width: 485 });
  
  const metaText = `Club: ${event.club?.clubName || "Campus Event"}   |   Venue: ${event.venue || "Campus"}   |   Date: ${new Date(event.startTime).toLocaleDateString()}`;
  doc.fillColor(colors.muted).fontSize(9).font("Helvetica").text(metaText, 55, cardY + 22);

  const statText = `Total Attendees: ${analytics?.overview?.totalAttendees || review.attendeeCount || "N/A"}   •   Responses Analyzed: ${review.responseCount}   •   Response Rate: ${analytics?.overview?.responseRate || 0}%   •   Overall Score: ${analytics?.averageRatings?.overall || "N/A"}/5.0`;
  doc.fillColor(colors.primary).fontSize(9).font("Helvetica-Bold").text(statText, 55, cardY + 38);

  doc.y = cardY + 65;

  if (analytics) {
    doc.moveDown(0.6);
    doc.fillColor(colors.dark).fontSize(11).font("Helvetica-Bold").text("CORE PERFORMANCE METRICS", 40, doc.y);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, 515, 1).fill(colors.border);
    doc.moveDown(0.4);

    const startY = doc.y;
    
    doc.fillColor(colors.muted).fontSize(9).font("Helvetica-Bold").text("CATEGORY RATINGS (1–5)", 45, startY);
    let catY = startY + 14;
    const catLabels = [
      { label: "Overall Experience", score: analytics.averageRatings?.overall },
      { label: "Event Organization", score: analytics.averageRatings?.organization },
      { label: "Usefulness & Content", score: analytics.averageRatings?.usefulness },
      { label: "Speaker / Host", score: analytics.averageRatings?.speaker },
      { label: "Venue & Facilities", score: analytics.averageRatings?.venue },
      { label: "Timing & Punctuality", score: analytics.averageRatings?.timing },
    ];
    catLabels.forEach((c) => {
      doc.fillColor(colors.text).fontSize(8.5).font("Helvetica").text(`${c.label}:`, 45, catY);
      doc.fillColor(colors.dark).font("Helvetica-Bold").text(`${c.score || "N/A"} / 5`, 180, catY);
      catY += 12;
    });

    doc.fillColor(colors.muted).fontSize(9).font("Helvetica-Bold").text("ATTENDANCE INTENT & RATINGS", 285, startY);
    let rightY = startY + 14;
    const yes = analytics.recommendationAnalytics?.yes?.percentage ?? 0;
    const maybe = analytics.recommendationAnalytics?.maybe?.percentage ?? 0;
    const no = analytics.recommendationAnalytics?.no?.percentage ?? 0;
    doc.fillColor(colors.success).fontSize(8.5).font("Helvetica-Bold").text(`Would Attend Again: ${yes}% YES (${analytics.recommendationAnalytics?.yes?.count || 0} votes)`, 285, rightY);
    rightY += 12;
    doc.fillColor(colors.warning).font("Helvetica").text(`Maybe: ${maybe}%   |   No: ${no}%`, 285, rightY);
    rightY += 16;

    if (Array.isArray(analytics.ratingDistribution)) {
      doc.fillColor(colors.muted).fontSize(8.5).font("Helvetica-Bold").text("Rating Distribution:", 285, rightY);
      rightY += 12;
      analytics.ratingDistribution.forEach((d) => {
        doc.fillColor(colors.text).font("Helvetica").fontSize(8).text(`${d.stars} Stars: ${d.count} responses (${d.percentage}%)`, 285, rightY);
        rightY += 10;
      });
    }

    doc.y = Math.max(catY, rightY) + 6;
  }

  doc.moveDown(0.8);
  if (doc.y > 660) doc.addPage();
  const sentimentFormatted = (review.overallSentiment || "positive").toUpperCase().replace("_", " ");
  
  doc.fillColor(colors.dark).fontSize(11).font("Helvetica-Bold").text("AI EXECUTIVE SUMMARY", 40, doc.y);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(colors.primary).text(`[ Sentiment: ${sentimentFormatted} ]`, 220, doc.y - 12);
  doc.moveDown(0.4);

  doc.rect(40, doc.y, 515, 1).fill(colors.border);
  doc.moveDown(0.6);

  doc.fillColor(colors.text).fontSize(10).font("Helvetica").text(review.overallSummary, 40, doc.y, {
    width: 515,
    lineGap: 3,
  });

  if (Array.isArray(review.keyTakeaways) && review.keyTakeaways.length > 0) {
    doc.moveDown(1);
    doc.fillColor(colors.dark).fontSize(12).font("Helvetica-Bold").text("KEY TAKEAWAYS", 40, doc.y);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, 515, 1).fill(colors.border);
    doc.moveDown(0.5);

    review.keyTakeaways.forEach((takeaway, idx) => {
      doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(10).text(`${idx + 1}.`, 45, doc.y, { continued: true });
      doc.fillColor(colors.text).font("Helvetica").fontSize(9.5).text(`  ${takeaway}`, { width: 490, lineGap: 2 });
      doc.moveDown(0.3);
    });
  }

  if (doc.y > 620) {
    doc.addPage();
  }

  if (Array.isArray(review.whatStudentsLiked) && review.whatStudentsLiked.length > 0) {
    doc.moveDown(0.8);
    doc.fillColor(colors.success).fontSize(11).font("Helvetica-Bold").text("POSITIVE THEMES (WHAT STUDENTS LIKED)", 40, doc.y);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, 515, 1).fill(colors.border);
    doc.moveDown(0.4);

    review.whatStudentsLiked.forEach((item) => {
      const countLabel = item.evidenceCount ? ` (${item.evidenceCount} responses)` : "";
      doc.fillColor(colors.dark).font("Helvetica-Bold").fontSize(9.5).text(`• ${item.theme}${countLabel}: `, 45, doc.y, { continued: true });
      doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(item.summary, { width: 490, lineGap: 2 });
      doc.moveDown(0.3);
    });
  }

  if (Array.isArray(review.improvementAreas) && review.improvementAreas.length > 0) {
    doc.moveDown(0.8);
    doc.fillColor(colors.danger).fontSize(11).font("Helvetica-Bold").text("AREAS FOR IMPROVEMENT", 40, doc.y);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, 515, 1).fill(colors.border);
    doc.moveDown(0.4);

    review.improvementAreas.forEach((item) => {
      const countLabel = item.evidenceCount ? ` (${item.evidenceCount} mentions)` : "";
      const priorityLabel = item.priority ? ` [${item.priority.toUpperCase()} PRIORITY]` : "";
      doc.fillColor(colors.dark).font("Helvetica-Bold").fontSize(9.5).text(`• ${item.theme}${priorityLabel}${countLabel}: `, 45, doc.y, { continued: true });
      doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(item.summary, { width: 490, lineGap: 2 });
      doc.moveDown(0.3);
    });
  }

  if (doc.y > 580) {
    doc.addPage();
  }

  if (Array.isArray(review.recommendations) && review.recommendations.length > 0) {
    doc.moveDown(0.8);
    doc.fillColor(colors.dark).fontSize(11).font("Helvetica-Bold").text("ACTIONABLE RECOMMENDATIONS FOR ORGANIZERS", 40, doc.y);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, 515, 1).fill(colors.border);
    doc.moveDown(0.5);

    review.recommendations.forEach((rec, idx) => {
      const pColor = rec.priority === "high" ? colors.danger : rec.priority === "low" ? colors.success : colors.warning;
      doc.fillColor(pColor).font("Helvetica-Bold").fontSize(9.5).text(`${idx + 1}. [${(rec.priority || "MEDIUM").toUpperCase()}] `, 45, doc.y, { continued: true });
      doc.fillColor(colors.dark).font("Helvetica-Bold").text(`${rec.title}`);
      doc.fillColor(colors.text).font("Helvetica").fontSize(9).text(`    ${rec.description}`, { width: 490, lineGap: 2 });
      doc.moveDown(0.4);
    });
  }

  const hasQuotes = (Array.isArray(review.positiveHighlights) && review.positiveHighlights.length > 0) ||
                    (Array.isArray(review.constructiveHighlights) && review.constructiveHighlights.length > 0);

  if (hasQuotes) {
    if (doc.y > 600) doc.addPage();

    doc.moveDown(0.8);
    doc.fillColor(colors.dark).fontSize(11).font("Helvetica-Bold").text("VERBATIM STUDENT HIGHLIGHTS", 40, doc.y);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, 515, 1).fill(colors.border);
    doc.moveDown(0.5);

    (review.positiveHighlights || []).forEach((item) => {
      doc.fillColor(colors.success).font("Helvetica-Bold").fontSize(9).text("Positive Quote:", 45, doc.y);
      doc.fillColor(colors.text).font("Helvetica-Oblique").fontSize(9).text(`"${item.quote}"`, 55, doc.y + 1, { width: 480 });
      doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5).text(`Note: ${item.reason}`, 55, doc.y + 2);
      doc.moveDown(0.5);
    });

    (review.constructiveHighlights || []).forEach((item) => {
      doc.fillColor(colors.warning).font("Helvetica-Bold").fontSize(9).text("Constructive Quote:", 45, doc.y);
      doc.fillColor(colors.text).font("Helvetica-Oblique").fontSize(9).text(`"${item.quote}"`, 55, doc.y + 1, { width: 480 });
      doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5).text(`Note: ${item.reason}`, 55, doc.y + 2);
      doc.moveDown(0.5);
    });
  }

  doc.moveDown(1.5);
  doc.fillColor(colors.muted).fontSize(8).font("Helvetica").text(
    "Generated securely by CampusNode Event Feedback AI Service. Grounded directly in attendee feedback without student identifying information.",
    40,
    780,
    { align: "center", width: 515 }
  );

  doc.end();
}
