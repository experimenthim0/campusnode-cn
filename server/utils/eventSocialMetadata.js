/**
 * CampusNode Event Social & Open Graph Metadata Generator
 *
 * Produces crawler-friendly HTML responses with authoritative Open Graph
 * and Twitter Card metadata for social link previews (WhatsApp, Facebook,
 * LinkedIn, Twitter/X, Telegram, Discord, Slack, iMessage, etc.).
 */

/**
 * Escapes characters for safe inclusion in HTML attributes and content.
 * @param {string} [str=""]
 * @returns {string}
 */
export function escapeHtmlAttr(str = "") {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Formats the page title according to brand guidelines:
 * "<Event Title> | CampusNode"
 * Does NOT append "| CampusNode" if the title already includes "CampusNode".
 *
 * @param {string} [title]
 * @returns {string}
 */
export function formatEventTitle(title) {
  if (!title || typeof title !== "string") {
    return "CampusNode - Event Management";
  }
  const clean = title.trim();
  if (/campusnode/i.test(clean)) {
    return clean;
  }
  return `${clean} | CampusNode`;
}

/**
 * Cleans event descriptions by stripping Markdown formatting and HTML tags,
 * generating a rich context-aware fallback if missing/empty, and truncating cleanly.
 *
 * @param {string} [description]
 * @param {object} [event={}]
 * @returns {string}
 */
export function cleanEventDescription(description, event = {}) {
  let text = String(description || "").trim();

  // 1. Strip Markdown elements
  text = text
    .replace(/^#+\s+/gm, "") // Headers
    .replace(/!\[.*?\]\(.*?\)/g, "") // Images
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Links -> anchor text
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // Bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // Italics
    .replace(/`{1,3}(.*?)`{1,3}/gs, "$1") // Inline code / code blocks
    .replace(/^>\s+/gm, "") // Blockquotes
    .replace(/^[-*+]\s+/gm, "") // Unordered lists
    .replace(/^\d+\.\s+/gm, ""); // Ordered lists

  // 2. Strip HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // 3. Normalize punctuation spacing and whitespace
  text = text
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  // 4. Fallback generation if empty or too brief (< 15 characters, e.g. "<p></p>")
  if (text.length < 15) {
    const title = event.title ? event.title.trim() : "this event";
    const club =
      event.club?.clubName ||
      (event.organizerType === "CENTRAL" ? "Central Student Body" : "CampusNode");
    const venue = event.venue ? ` at ${event.venue.trim()}` : " at NIT Jalandhar";
    text = `Join ${title} organized by ${club}${venue}. View event details, schedule, and register online on CampusNode.`;
  }

  // 5. Truncate cleanly on word boundary (max ~175 characters)
  const maxLength = 175;
  if (text.length > maxLength) {
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    text = (lastSpace > 120 ? truncated.slice(0, lastSpace) : truncated) + "...";
  }

  return text;
}

/**
 * Resolves an absolute public HTTPS URL for the social image.
 *
 * @param {object} [event]
 * @param {string} [baseUrl="https://clubsetu.nikhim.me"]
 * @returns {string}
 */
export function resolveSocialImage(event, baseUrl = "https://clubsetu.nikhim.me") {
  const normalizedBase = String(baseUrl).replace(/\/+$/, "");
  const fallbackUrl = `${normalizedBase}/campusnode-og-fallback.png`;

  if (!event || !event.imageUrl) {
    return fallbackUrl;
  }

  const rawUrl = String(event.imageUrl).trim();
  if (!rawUrl) {
    return fallbackUrl;
  }

  // Already an absolute public URL (Cloudinary, S3, external HTTPS)
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // Relative path on this host
  return `${normalizedBase}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
}

/**
 * Generates crawler-ready HTML with Open Graph & Twitter Card tags for an event.
 *
 * @param {object} event - The published Event record
 * @param {object} options
 * @param {string} [options.host] - Request host header
 * @param {string} [options.canonicalDomain] - Preferred canonical domain (e.g. "https://campusnode.in")
 * @param {string} [options.slug] - Event slug
 * @returns {string} Full HTML document
 */
export function generateEventSocialHtml(event, options = {}) {
  const domain =
    options.canonicalDomain ||
    (options.host ? `https://${options.host}` : "https://clubsetu.nikhim.me");
  const normalizedDomain = domain.replace(/\/+$/, "");

  const slug = event.slug || options.slug || event.id;
  const canonicalUrl = `${normalizedDomain}/events/${slug}`;

  const rawTitle = formatEventTitle(event.title);
  const rawDescription = cleanEventDescription(event.description, event);
  const imageUrl = resolveSocialImage(event, normalizedDomain);

  const titleEscaped = escapeHtmlAttr(rawTitle);
  const descEscaped = escapeHtmlAttr(rawDescription);
  const imageEscaped = escapeHtmlAttr(imageUrl);
  const urlEscaped = escapeHtmlAttr(canonicalUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleEscaped}</title>
  <meta name="description" content="${descEscaped}">
  <link rel="canonical" href="${urlEscaped}">

  <!-- Open Graph / Facebook / WhatsApp / LinkedIn -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CampusNode">
  <meta property="og:title" content="${titleEscaped}">
  <meta property="og:description" content="${descEscaped}">
  <meta property="og:url" content="${urlEscaped}">
  <meta property="og:image" content="${imageEscaped}">
  <meta property="og:image:secure_url" content="${imageEscaped}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${titleEscaped}">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@campusnode">
  <meta name="twitter:title" content="${titleEscaped}">
  <meta name="twitter:description" content="${descEscaped}">
  <meta name="twitter:image" content="${imageEscaped}">
  <meta name="twitter:image:alt" content="${titleEscaped}">

  <!-- Favicon / Theme -->
  <link rel="icon" type="image/png" href="${normalizedDomain}/lightthemelogo2.png">
  <meta name="theme-color" content="#ea580c">

  <!-- Fallback client redirect for human browser clicks landing on preview route -->
  <meta http-equiv="refresh" content="0;url=${urlEscaped}">
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#0a0a0a;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;text-align:center;">
  <p style="font-size:18px;color:#94a3b8;margin-bottom:12px;">Opening event...</p>
  <a href="${urlEscaped}" style="color:#ea580c;text-decoration:none;font-weight:600;font-size:16px;">Click here if you are not redirected automatically</a>
  <script>
    try {
      window.location.replace("${urlEscaped}");
    } catch(e) {
      window.location.href = "${urlEscaped}";
    }
  </script>
</body>
</html>`;
}

/**
 * Generates default CampusNode social HTML for 404s or private/unpublished events.
 * Prevents exposing draft or unapproved event details to public crawlers.
 *
 * @param {object} options
 * @param {string} [options.host]
 * @param {string} [options.canonicalDomain]
 * @param {string} [options.message]
 * @returns {string}
 */
export function generateDefaultSocialHtml(options = {}) {
  const domain =
    options.canonicalDomain ||
    (options.host ? `https://${options.host}` : "https://clubsetu.nikhim.me");
  const normalizedDomain = domain.replace(/\/+$/, "");
  const fallbackUrl = `${normalizedDomain}/campusnode-og-fallback.png`;
  const homeUrl = `${normalizedDomain}/events`;

  const title = "CampusNode - NIT Jalandhar Clubs & Events";
  const description =
    options.message ||
    "Discover, organize, and participate in technical, cultural, and sports events across NIT Jalandhar clubs on CampusNode.";

  const titleEscaped = escapeHtmlAttr(title);
  const descEscaped = escapeHtmlAttr(description);
  const imageEscaped = escapeHtmlAttr(fallbackUrl);
  const urlEscaped = escapeHtmlAttr(homeUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleEscaped}</title>
  <meta name="description" content="${descEscaped}">
  <link rel="canonical" href="${urlEscaped}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CampusNode">
  <meta property="og:title" content="${titleEscaped}">
  <meta property="og:description" content="${descEscaped}">
  <meta property="og:url" content="${urlEscaped}">
  <meta property="og:image" content="${imageEscaped}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@campusnode">
  <meta name="twitter:title" content="${titleEscaped}">
  <meta name="twitter:description" content="${descEscaped}">
  <meta name="twitter:image" content="${imageEscaped}">

  <link rel="icon" type="image/png" href="${normalizedDomain}/lightthemelogo2.png">
  <meta name="theme-color" content="#ea580c">
  <meta http-equiv="refresh" content="0;url=${urlEscaped}">
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#0a0a0a;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;text-align:center;">
  <p style="font-size:18px;color:#94a3b8;margin-bottom:12px;">Redirecting to CampusNode Events...</p>
  <a href="${urlEscaped}" style="color:#ea580c;text-decoration:none;font-weight:600;font-size:16px;">Click here if you are not redirected automatically</a>
  <script>
    try {
      window.location.replace("${urlEscaped}");
    } catch(e) {
      window.location.href = "${urlEscaped}";
    }
  </script>
</body>
</html>`;
}
