/**
 * Vercel Serverless Function: Dynamic Event Social Preview Handler
 *
 * Handles /event/:slug and /events/:slug requests by:
 * 1. Fetching the published event from the backend.
 * 2. Fetching the normal Vite index.html.
 * 3. Injecting event-specific SEO / Open Graph / Twitter metadata.
 * 4. Returning the normal SPA HTML without redirecting.
 *
 * This allows:
 * - WhatsApp
 * - Facebook
 * - Instagram/Facebook crawlers
 * - LinkedIn
 * - Discord
 * - Telegram
 * - X/Twitter
 * - Google
 * - Normal browsers
 *
 * to receive the same URL while crawlers see dynamic event metadata.
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
function escapeHtmlAttr(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape text used inside <title>.
 */
function escapeHtmlText(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Format the event title used by browsers and social platforms.
 */
function formatEventTitle(title) {
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
function resolveSocialImage(event) {
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
 * Remove metadata that may already exist in Vite's index.html.
 *
 * This prevents duplicate:
 * - <title>
 * - description
 * - canonical
 * - Open Graph
 * - Twitter
 * tags.
 */
function removeExistingSocialMetadata(html) {
  return html
    // Title
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")

    // Description
    .replace(
      /<meta\b[^>]*\bname=["']description["'][^>]*>\s*/gi,
      ""
    )

    // Canonical
    .replace(
      /<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi,
      ""
    )

    // Open Graph
    .replace(
      /<meta\b[^>]*\bproperty=["']og:[^"']+["'][^>]*>\s*/gi,
      ""
    )

    // Twitter
    .replace(
      /<meta\b[^>]*\bname=["']twitter:[^"']+["'][^>]*>\s*/gi,
      ""
    );
}

/**
 * Generate event-specific metadata.
 */
export function generateSocialMetadata(event, slug) {
  const canonicalUrl =
    `${SITE_URL}/event/${encodeURIComponent(slug)}`;

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
 * Inject event metadata into the normal Vite HTML.
 */
function injectMetadataIntoHtml(baseHtml, event, slug) {
  const cleanedHtml = removeExistingSocialMetadata(baseHtml);

  const metadata = generateSocialMetadata(event, slug);

  if (!/<head\b[^>]*>/i.test(cleanedHtml)) {
    throw new Error("Vite index.html does not contain a <head> element");
  }

  return cleanedHtml.replace(
    /(<head\b[^>]*>)/i,
    `$1\n${metadata}`
  );
}

/**
 * Generate generic metadata for:
 * - missing event
 * - unpublished event
 * - backend failure
 */
function generateDefaultMetadata() {
  const titleAttr = escapeHtmlAttr(DEFAULT_TITLE);
  const descriptionAttr = escapeHtmlAttr(DEFAULT_DESCRIPTION);
  const imageAttr = escapeHtmlAttr(DEFAULT_IMAGE);

  return `
  <title>${escapeHtmlText(DEFAULT_TITLE)}</title>

  <meta
    name="description"
    content="${descriptionAttr}"
  />

  <link
    rel="canonical"
    href="${SITE_URL}/events"
  />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CampusNode" />
  <meta property="og:title" content="${titleAttr}" />
  <meta property="og:description" content="${descriptionAttr}" />
  <meta property="og:url" content="${SITE_URL}/events" />
  <meta property="og:image" content="${imageAttr}" />
  <meta property="og:image:secure_url" content="${imageAttr}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${titleAttr}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${titleAttr}" />
  <meta name="twitter:description" content="${descriptionAttr}" />
  <meta name="twitter:image" content="${imageAttr}" />

  <link
    rel="icon"
    type="image/png"
    href="${SITE_URL}/lightthemelogo2.png"
  />

  <meta name="theme-color" content="#facc15" />
  `;
}

/**
 * Inject generic metadata into the normal SPA HTML.
 */
function injectDefaultMetadata(baseHtml) {
  const cleanedHtml = removeExistingSocialMetadata(baseHtml);

  const metadata = generateDefaultMetadata();

  return cleanedHtml.replace(
    /(<head\b[^>]*>)/i,
    `$1\n${metadata}`
  );
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
 * Get the deployed Vite index.html.
 *
 * VERCEL_URL points to the current deployment and avoids
 * accidentally requesting /event/:slug again.
 */
async function getBaseIndexHtml() {
  const deploymentOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : SITE_URL;

  const indexUrl = `${deploymentOrigin}/index.html`;

  const response = await fetchWithTimeout(
    indexUrl,
    {
      headers: {
        Accept: "text/html",
      },
    },
    5000
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Vite index.html: ${response.status}`
    );
  }

  return response.text();
}

/**
 * Main Vercel serverless handler.
 */
export default async function handler(req, res) {
  const slug =
    typeof req.query?.slug === "string"
      ? req.query.slug.trim()
      : "";

  const isVercelPreview = process.env.VERCEL_ENV === "preview";
  const defaultApiUrl = isVercelPreview ? "" : "https://campusnode-server.onrender.com";

  const apiUrl = (
    process.env.API_URL ||
    process.env.VITE_API_URL ||
    process.env.BACKEND_URL ||
    defaultApiUrl
  ).replace(/\/+$/, "");

  try {
    // Always load the real SPA HTML first.
    const baseHtml = await getBaseIndexHtml();

    // In preview without API configured, serve default metadata safely without contacting production
    if (!apiUrl) {
      console.warn("[Social Preview] API_URL / VITE_API_URL not configured for Vercel preview. Serving default metadata.");
      const html = injectDefaultMetadata(baseHtml);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
      return res.status(200).send(html);
    }

    // No slug → return normal SPA with generic metadata.
    if (!slug) {
      const html = injectDefaultMetadata(baseHtml);

      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=120"
      );

      return res.status(200).send(html);
    }

    /**
     * Fetch event information from backend.
     */
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
      event?.reviewStatus &&
      event.reviewStatus !== "PUBLISHED"
    ) {
      const html = injectDefaultMetadata(baseHtml);

      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=120"
      );

      return res.status(200).send(html);
    }

    /**
     * Inject event-specific metadata into the normal SPA.
     */
    const html = injectMetadataIntoHtml(
      baseHtml,
      event,
      slug
    );

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    /**
     * Cache dynamic event metadata at Vercel.
     *
     * Browser:
     * 60 seconds
     *
     * Vercel:
     * 10 minutes
     *
     * Stale:
     * 24 hours while revalidating
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

    /**
     * Even if backend/index fetching fails, return the
     * normal SPA instead of returning a redirect page.
     */
    try {
      const baseHtml = await getBaseIndexHtml();
      const html = injectDefaultMetadata(baseHtml);

      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=120"
      );

      return res.status(200).send(html);
    } catch (fallbackError) {
      console.error(
        "[Social Preview] Fallback HTML generation failed:",
        fallbackError?.message || fallbackError
      );

      return res
        .status(200)
        .setHeader(
          "Content-Type",
          "text/html; charset=utf-8"
        )
        .send(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>${escapeHtmlText(DEFAULT_TITLE)}</title>
              <meta
                name="description"
                content="${escapeHtmlAttr(DEFAULT_DESCRIPTION)}"
              >
            </head>
            <body>
              <div id="root"></div>
            </body>
          </html>
        `);
    }
  }
}