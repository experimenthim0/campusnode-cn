/**
 * Vercel Serverless Function: Dynamic Event Social Preview Handler
 *
 * Handles crawler requests for /event/:slug and /events/:slug by:
 * 1. Fetching the published event from the backend API.
 * 2. Formatting event metadata (title, poster, dates in IST, venue).
 * 3. Returning self-contained HTML containing all Open Graph and Twitter Card tags.
 *
 * Normal browsers never hit this endpoint on page refresh because vercel.json
 * only rewrites known social crawlers here, serving index.html directly from Vercel CDN.
 */

const SITE_URL = (
  process.env.SITE_URL || "https://clubsetu.nikhim.me"
).replace(/\/+$/, "");

const DEFAULT_TITLE = "CampusNode - NIT Jalandhar Clubs & Events";

const DEFAULT_DESCRIPTION =
  "Discover, organize, and participate in technical, cultural, and sports events across NIT Jalandhar clubs on CampusNode.";

const DEFAULT_IMAGE = `${SITE_URL}/campusnode-og-fallback.png`;

/**
 * Escape a value before inserting it into an HTML attribute.
 */
export function escapeHtmlAttr(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape text used inside <title>.
 */
export function escapeHtmlText(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Format the event title used by browsers and social platforms.
 */
export function formatEventTitle(title) {
  if (!title || typeof title !== "string") {
    return DEFAULT_TITLE;
  }

  const clean = title.trim();

  if (!clean) {
    return DEFAULT_TITLE;
  }

  if (/campusnode/i.test(clean)) {
    return clean;
  }

  return `${clean} | CampusNode`;
}

/**
 * Timezone used for event date and time formatting.
 */
const EVENT_TIMEZONE = "Asia/Kolkata";

/**
 * Safely parse a date value into a valid Date object.
 * Returns null if the value is missing or represents an Invalid Date.
 */
function parseValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format a date in Asia/Kolkata timezone: "6 September 2026".
 */
function formatEventDate(date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatter.format(date);
}

/**
 * Format a time in Asia/Kolkata timezone: "8:00 PM".
 */
function formatEventTime(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatter.format(date).replace(/\s+/g, " ").trim();
}

/**
 * Format event details for social preview description.
 *
 * Uses ONLY:
 * - event.startTime
 * - event.endTime
 * - event.venue
 *
 * Formats:
 * - Date, time range, and venue: 📅 6 September 2026 · 8:00 PM–10:00 PM | 📍 CSH
 * - Venue missing:               📅 6 September 2026 · 8:00 PM–10:00 PM
 * - EndTime missing:             📅 6 September 2026 · 8:00 PM | 📍 CSH
 * - Only venue exists:           📍 CSH
 * - Neither exists:              Discover this event on CampusNode.
 */
export function formatEventDetails(event = {}) {
  const startDate = parseValidDate(event?.startTime);
  const endDate = parseValidDate(event?.endTime);
  const venue =
    typeof event?.venue === "string" ? event.venue.trim() : "";

  let dateTimeStr = "";

  if (startDate) {
    const dateStr = formatEventDate(startDate);
    const startTimeStr = formatEventTime(startDate);

    if (endDate) {
      const endTimeStr = formatEventTime(endDate);
      dateTimeStr = `📅 ${dateStr} · ${startTimeStr}–${endTimeStr}`;
    } else {
      dateTimeStr = `📅 ${dateStr} · ${startTimeStr}`;
    }
  }

  if (dateTimeStr && venue) {
    return `${dateTimeStr} | 📍 ${venue}`;
  }
  if (dateTimeStr) {
    return dateTimeStr;
  }
  if (venue) {
    return `📍 ${venue}`;
  }
  return "Discover this event on CampusNode.";
}

/**
 * Resolve the event image into an absolute HTTPS URL.
 */
export function resolveSocialImage(event) {
  if (!event || !event.imageUrl) {
    return DEFAULT_IMAGE;
  }

  const rawUrl = String(event.imageUrl).trim();

  if (!rawUrl) {
    return DEFAULT_IMAGE;
  }

  // Already absolute.
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // Relative image URL.
  return `${SITE_URL}${
    rawUrl.startsWith("/") ? "" : "/"
  }${rawUrl}`;
}

/**
 * Generate event-specific metadata tags.
 */
export function generateSocialMetadata(event, slug) {
  const canonicalUrl = `${SITE_URL}/event/${encodeURIComponent(slug)}`;
  const title = formatEventTitle(event?.title);
  const description = formatEventDetails(event);
  const imageUrl = resolveSocialImage(event);

  const titleAttr = escapeHtmlAttr(title);
  const descriptionAttr = escapeHtmlAttr(description);
  const imageAttr = escapeHtmlAttr(imageUrl);
  const canonicalAttr = escapeHtmlAttr(canonicalUrl);
  const titleText = escapeHtmlText(title);

  return `
  <title>${titleText}</title>

  <meta
    name="description"
    content="${descriptionAttr}"
  />

  <link
    rel="canonical"
    href="${canonicalAttr}"
  />

  <!-- Open Graph / WhatsApp / Facebook / LinkedIn / Discord -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CampusNode" />
  <meta property="og:title" content="${titleAttr}" />
  <meta property="og:description" content="${descriptionAttr}" />
  <meta property="og:url" content="${canonicalAttr}" />
  <meta property="og:image" content="${imageAttr}" />
  <meta property="og:image:secure_url" content="${imageAttr}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${titleAttr}" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@campusnode" />
  <meta name="twitter:title" content="${titleAttr}" />
  <meta name="twitter:description" content="${descriptionAttr}" />
  <meta name="twitter:image" content="${imageAttr}" />
  <meta name="twitter:image:alt" content="${titleAttr}" />

  <!-- CampusNode -->
  <link
    rel="icon"
    type="image/png"
    href="${SITE_URL}/lightthemelogo2.png"
  />

  <meta name="theme-color" content="#facc15" />
  `;
}

/**
 * Generate full self-contained HTML document for social crawlers.
 */
export function generateSocialHtml(event, slug) {
  const canonicalUrl = `${SITE_URL}/event/${encodeURIComponent(slug)}`;
  const title = formatEventTitle(event?.title);
  const description = formatEventDetails(event);
  const imageUrl = resolveSocialImage(event);

  const titleAttr = escapeHtmlAttr(title);
  const descriptionAttr = escapeHtmlAttr(description);
  const imageAttr = escapeHtmlAttr(imageUrl);
  const canonicalAttr = escapeHtmlAttr(canonicalUrl);
  const titleText = escapeHtmlText(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText}</title>
  <meta name="description" content="${descriptionAttr}">
  <link rel="canonical" href="${canonicalAttr}">

  <!-- Open Graph / WhatsApp / Facebook / LinkedIn / Discord -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CampusNode">
  <meta property="og:title" content="${titleAttr}">
  <meta property="og:description" content="${descriptionAttr}">
  <meta property="og:url" content="${canonicalAttr}">
  <meta property="og:image" content="${imageAttr}">
  <meta property="og:image:secure_url" content="${imageAttr}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${titleAttr}">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@campusnode">
  <meta name="twitter:title" content="${titleAttr}">
  <meta name="twitter:description" content="${descriptionAttr}">
  <meta name="twitter:image" content="${imageAttr}">
  <meta name="twitter:image:alt" content="${titleAttr}">

  <!-- CampusNode Favicon & Theme -->
  <link rel="icon" type="image/png" href="${SITE_URL}/lightthemelogo2.png">
  <meta name="theme-color" content="#facc15">

  <!-- Client fallback redirect for human clicks landing on preview route -->
  <meta http-equiv="refresh" content="0;url=${canonicalAttr}">
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#0a0a0a;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;text-align:center;">
  <p style="font-size:18px;color:#94a3b8;margin-bottom:12px;">Opening event...</p>
  <a href="${canonicalAttr}" style="color:#ea580c;text-decoration:none;font-weight:600;font-size:16px;">Click here if you are not redirected automatically</a>
  <script>
    try {
      window.location.replace("${canonicalAttr}");
    } catch(e) {
      window.location.href = "${canonicalAttr}";
    }
  </script>
</body>
</html>`;
}

/**
 * Generate default CampusNode social HTML for 404s, backend failures,
 * or unpublished/draft events. Prevents exposing draft or unapproved event details.
 */
export function generateDefaultSocialHtml(options = {}) {
  const homeUrl = `${SITE_URL}/events`;
  const fallbackUrl = DEFAULT_IMAGE;
  const title = DEFAULT_TITLE;
  const description = options.message || DEFAULT_DESCRIPTION;

  const titleAttr = escapeHtmlAttr(title);
  const descriptionAttr = escapeHtmlAttr(description);
  const imageAttr = escapeHtmlAttr(fallbackUrl);
  const urlAttr = escapeHtmlAttr(homeUrl);
  const titleText = escapeHtmlText(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText}</title>
  <meta name="description" content="${descriptionAttr}">
  <link rel="canonical" href="${urlAttr}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CampusNode">
  <meta property="og:title" content="${titleAttr}">
  <meta property="og:description" content="${descriptionAttr}">
  <meta property="og:url" content="${urlAttr}">
  <meta property="og:image" content="${imageAttr}">
  <meta property="og:image:secure_url" content="${imageAttr}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${titleAttr}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@campusnode">
  <meta name="twitter:title" content="${titleAttr}">
  <meta name="twitter:description" content="${descriptionAttr}">
  <meta name="twitter:image" content="${imageAttr}">
  <meta name="twitter:image:alt" content="${titleAttr}">

  <link rel="icon" type="image/png" href="${SITE_URL}/lightthemelogo2.png">
  <meta name="theme-color" content="#facc15">
  <meta http-equiv="refresh" content="0;url=${urlAttr}">
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#0a0a0a;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;text-align:center;">
  <p style="font-size:18px;color:#94a3b8;margin-bottom:12px;">Redirecting to CampusNode Events...</p>
  <a href="${urlAttr}" style="color:#ea580c;text-decoration:none;font-weight:600;font-size:16px;">Click here if you are not redirected automatically</a>
  <script>
    try {
      window.location.replace("${urlAttr}");
    } catch(e) {
      window.location.href = "${urlAttr}";
    }
  </script>
</body>
</html>`;
}

/**
 * Fetch with a timeout.
 */
async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = 5000
) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main Vercel serverless handler.
 */
export default async function handler(req, res) {
  const slug =
    typeof req.query?.slug === "string"
      ? req.query.slug.trim()
      : "";

  const apiUrl = (
    process.env.API_URL ||
    process.env.VITE_API_URL ||
    process.env.BACKEND_URL ||
    "https://campusnode-server.onrender.com"
  ).replace(/\/+$/, "");

  // If no slug provided, return safe default metadata
  if (!slug) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
    return res.status(200).send(generateDefaultSocialHtml());
  }

  try {
    const eventRes = await fetchWithTimeout(
      `${apiUrl}/api/events/${encodeURIComponent(slug)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
      5000
    );

    if (!eventRes.ok) {
      throw new Error(
        `Event lookup failed: ${eventRes.status}`
      );
    }

    const event = await eventRes.json();

    /**
     * Never expose unpublished/private event information
     * through social metadata.
     */
    if (
      !event ||
      (event.reviewStatus && event.reviewStatus !== "PUBLISHED")
    ) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
      return res.status(200).send(generateDefaultSocialHtml());
    }

    /**
     * Generate crawler-ready HTML containing dynamic event metadata.
     */
    const html = generateSocialHtml(event, slug);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    /**
     * Cache dynamic event metadata at Vercel Edge.
     * Browser: 60 seconds
     * Vercel: 10 minutes
     * Stale: 24 hours while revalidating
     */
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=600, stale-while-revalidate=86400"
    );

    return res.status(200).send(html);
  } catch (error) {
    console.error(
      `[Social Preview] Error for slug "${slug}":`,
      error?.message || error
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
    return res.status(200).send(generateDefaultSocialHtml());
  }
}