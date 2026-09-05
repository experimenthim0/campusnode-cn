/**
 * Request Security Metadata Extractor for Transactional Emails
 * Extracts client device info, geolocation, IP address, and formatted time.
 */

/**
 * Parses a User-Agent header into a clean "Browser OS" representation.
 * E.g., "Chrome macOS", "Safari iOS", "Firefox Windows".
 *
 * @param {string} [uaString]
 * @returns {string} Human-friendly device summary
 */
export function parseUserAgent(uaString) {
  if (!uaString || typeof uaString !== "string") {
    return "Unknown Device";
  }

  const ua = uaString.trim();

  // 1. Detect Browser
  let browser = "";
  if (/edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/opr\/|opera\//i.test(ua)) {
    browser = "Opera";
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = "Safari";
  } else if (/postman/i.test(ua)) {
    browser = "Postman";
  } else if (/curl/i.test(ua)) {
    browser = "cURL";
  } else {
    browser = "Browser";
  }

  // 2. Detect OS / Device
  let os = "";
  if (/iphone/i.test(ua)) {
    os = "iOS";
  } else if (/ipad/i.test(ua)) {
    os = "iPadOS";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/windows nt|windows/i.test(ua)) {
    os = "Windows";
  } else if (/android/i.test(ua)) {
    os = "Android";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  if (browser && os) {
    return `${browser} ${os}`;
  }

  return browser || os || "Unknown Device";
}

/**
 * Strips IPv6-mapped IPv4 prefixes (::ffff:) and normalizes localhost.
 *
 * @param {string} ip
 * @returns {string} Cleaned IP
 */
export function cleanIp(ip) {
  if (!ip) return "127.0.0.1";
  let cleaned = String(ip).trim();

  if (cleaned.startsWith("::ffff:")) {
    cleaned = cleaned.replace("::ffff:", "");
  }
  if (cleaned === "::1" || cleaned === "localhost") {
    cleaned = "127.0.0.1";
  }

  return cleaned;
}

/**
 * Extracts the real client IP from reverse proxies or direct socket.
 *
 * @param {object} req - Express request object
 * @returns {string} Client IP address
 */
export function extractClientIp(req) {
  if (!req) return "127.0.0.1";

  // Cloudflare header
  const cfConnectingIp = req.headers?.["cf-connecting-ip"];
  if (cfConnectingIp) return cleanIp(cfConnectingIp);

  // Standard reverse proxy forwarded header (take first/leftmost client IP)
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    const first = String(forwarded).split(",")[0].trim();
    if (first) return cleanIp(first);
  }

  // Nginx real IP header
  const realIp = req.headers?.["x-real-ip"];
  if (realIp) return cleanIp(realIp);

  // Express or raw socket
  const rawIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  return cleanIp(rawIp);
}

/**
 * Formats a Date object to match standard format (e.g., "Feb 9, 10:34 AM").
 *
 * @param {Date} [date=new Date()]
 * @param {string} [timeZone] - Optional IANA timezone string (e.g. "Asia/Kolkata")
 * @returns {string}
 */
export function formatRequestTime(date = new Date(), timeZone) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  return new Intl.DateTimeFormat("en-US", options).format(d);
}

/**
 * Extracts location from CDN headers (Vercel, Cloudflare) or client payload.
 *
 * @param {object} req - Express request object
 * @returns {string} City, Country or appropriate fallback
 */
export function extractLocation(req) {
  if (!req) return "Localhost";

  // 1. Explicit body or query override
  if (req.body?.location) return String(req.body.location).trim();

  // 2. Custom header
  if (req.headers?.["x-location"] || req.headers?.["x-client-location"]) {
    return (req.headers["x-location"] || req.headers["x-client-location"]).trim();
  }

  // 3. Vercel Geolocation headers
  const vercelCity = req.headers?.["x-vercel-ip-city"];
  const vercelCountry = req.headers?.["x-vercel-ip-country"];
  if (vercelCity && vercelCountry) {
    try {
      return `${decodeURIComponent(vercelCity)}, ${vercelCountry}`;
    } catch {
      return `${vercelCity}, ${vercelCountry}`;
    }
  } else if (vercelCountry) {
    return vercelCountry;
  }

  // 4. Cloudflare Geolocation headers
  const cfCity = req.headers?.["cf-ipcity"];
  const cfCountry = req.headers?.["cf-ipcountry"];
  if (cfCity && cfCountry) {
    return `${cfCity}, ${cfCountry}`;
  } else if (cfCountry) {
    return cfCountry;
  }

  // 5. Check if local/private network
  const ip = extractClientIp(req);
  if (ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Localhost";
  }

  return "India";
}

/**
 * Extracts complete security metadata from an Express request.
 *
 * @param {object} req - Express request
 * @param {object} [overrides={}] - Optional manual overrides
 * @returns {{ device: string, location: string, ipAddress: string, time: string }}
 */
export function extractSecurityMetadata(req, overrides = {}) {
  const device = overrides.device || (req ? parseUserAgent(req.headers?.["user-agent"]) : "Chrome macOS");
  const ipAddress = overrides.ipAddress || (req ? extractClientIp(req) : "127.0.0.1");
  const location = overrides.location || (req ? extractLocation(req) : "San Francisco, US");
  const time = overrides.time || formatRequestTime(new Date(), overrides.timeZone);

  return {
    device,
    location,
    ipAddress,
    time,
  };
}

export default extractSecurityMetadata;
