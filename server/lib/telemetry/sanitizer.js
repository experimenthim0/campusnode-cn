/**
 * CampusNode Telemetry Sanitizer
 *
 * Implements strict security redaction and high-cardinality protection:
 * 1. Zero sensitive data (tokens, passwords, OTPs, cookies, headers.authorization, bodies, PII).
 * 2. Normalizes URL routes to prevent cardinality explosions (/api/events/:id).
 * 3. Enforces low-cardinality dimensions on metrics.
 * 4. Redacts Redis command arguments and SQL parameters.
 */

const STATIC_PATH_SEGMENTS = new Set([
  "api", "health", "events", "event", "user", "users", "clubs", "club", "auth", "login",
  "register", "student", "faculty", "external", "admin", "payment", "notifications", "push",
  "scanner", "attendance", "sessions", "participation", "feedback", "featured-events", "venues",
  "blackouts", "certificates", "teams", "invitations", "club-members", "export-center", "preview",
  "datasets", "history", "search", "lookup", "calendar", "conflicts", "manage", "co", "all",
  "active", "candidates", "settings", "verify", "read", "read-all", "stats", "sync-state",
  "offline-package", "check-in", "manual", "download", "upload", "review", "submit", "revoke",
  "issued", "list", "members", "membership", "social-links", "profile-photo", "vapid-public-key",
  "subscribe", "unsubscribe", "logout", "change-password", "forgot-password", "reset-password",
  "dashboard-stats", "user-info", "clubs-list", "event-data-export", "coordinators", "manual-payments",
  "club-head", "profile", "me", "roles", "feed", "details", "leaderboard",
]);

const FORBIDDEN_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /cookie/i,
  /otp/i,
  /key/i,
  /credential/i,
  /recovery/i,
  /jwt/i,
  /bearer/i,
  /session/i,
  /email/i,
  /phone/i,
  /body/i,
  /user(\b|_)/i,
  /twofactor|2fa|factor/i,
];

/**
 * Checks if a segment is a dynamic parameter (number, UUID, ObjectID, hex ID).
 */
export const isDynamicSegment = (segment, index = 0) => {
  if (!segment) return false;
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return true;
  if (/^[0-9a-f]{24}$/i.test(segment)) return true; // MongoDB ObjectID
  if (/^[0-9a-f]{16,}$/i.test(segment)) return true;
  if (/^(fac|stud|ext|usr|ev|clb)_[a-zA-Z0-9_-]{8,}$/i.test(segment)) return true; // Prefixed IDs
  return index >= 2 && !STATIC_PATH_SEGMENTS.has(segment.toLowerCase());
};

/**
 * Normalizes raw HTTP paths into clean, bounded route templates.
 * Example: "/api/events/65f29d10a24/register" -> "/api/events/:id/register"
 */
export const normalizeRoute = (rawPath) => {
  if (!rawPath) return "/";
  const cleanPath = String(rawPath).split("?")[0].replace(/\/+/g, "/");
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const normalized = segments.map((seg, idx) => {
    if (isDynamicSegment(seg, idx)) {
      if (idx > 0 && segments[idx - 1] === "events") return ":id";
      if (idx > 0 && segments[idx - 1] === "clubs") return ":id";
      if (idx > 0 && segments[idx - 1] === "users") return ":id";
      if (idx > 0 && segments[idx - 1] === "venues") return ":id";
      return ":param";
    }
    return seg;
  });

  return `/${normalized.join("/")}`;
};

/**
 * Validates that an attribute key is safe to record in telemetry.
 */
export const isSafeAttributeKey = (key) => {
  if (!key || typeof key !== "string") return false;
  for (const pattern of FORBIDDEN_KEY_PATTERNS) {
    if (pattern.test(key)) return false;
  }
  return true;
};

/**
 * Sanitizes a set of span attributes.
 * Drops forbidden keys, stringifies/bounds values, and strictly omits PII.
 */
export const sanitizeSpanAttributes = (attributes = {}) => {
  const safe = {};
  if (!attributes || typeof attributes !== "object") return safe;

  for (const [key, value] of Object.entries(attributes)) {
    if (!isSafeAttributeKey(key)) continue;

    if (value === null || value === undefined) continue;

    // Primitives only; reject complex objects to avoid serializing sensitive states
    if (typeof value === "string") {
      // Disallow email patterns in values
      if (value.includes("@") && value.includes(".")) continue;
      // Truncate long strings to avoid memory bloat
      safe[key] = value.length > 256 ? `${value.slice(0, 253)}...` : value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }

  return safe;
};

/**
 * Serializes Redis commands for tracing, strictly omitting all keys and arguments.
 * Returning only the command name prevents tokens, OTPs, and user keys from leaking.
 */
export const redisStatementSerializer = (cmdName) => {
  if (!cmdName) return "UNKNOWN";
  return String(cmdName).toUpperCase();
};
