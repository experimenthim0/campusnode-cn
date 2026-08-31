import zlib from "node:zlib";
import { randomUUID, createHash } from "node:crypto";

const DEFAULT_MAX_IN_FLIGHT = 250;
let inFlightRequests = 0;

const numberFromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const getPerformanceStats = () => ({
  inFlightRequests,
  maxInFlightRequests: numberFromEnv("MAX_IN_FLIGHT_REQUESTS", DEFAULT_MAX_IN_FLIGHT),
});

export const overloadProtection = (req, res, next) => {
  if (req.method === "OPTIONS" || req.path === "/health") return next();

  const maxInFlight = numberFromEnv("MAX_IN_FLIGHT_REQUESTS", DEFAULT_MAX_IN_FLIGHT);
  if (inFlightRequests >= maxInFlight) {
    res.set("Retry-After", process.env.OVERLOAD_RETRY_AFTER_SECONDS || "15");
    return res.status(503).json({
      success: false,
      code: "MAINTENANCE_OVERLOAD",
      message: "The website is temporarily busy. Please try again shortly.",
    });
  }

  inFlightRequests += 1;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      inFlightRequests = Math.max(0, inFlightRequests - 1);
    }
  };
  res.once("finish", release);
  res.once("close", release);
  next();
};

export const requestMetrics = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.setHeader("X-Request-Id", req.headers["x-request-id"] || randomUUID());
  const originalEnd = res.end.bind(res);
  res.end = (chunk, encoding, callback) => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    res.setHeader("X-Response-Time", `${durationMs.toFixed(1)}ms`);
    return originalEnd(chunk, encoding, callback);
  };

  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const slowThreshold = numberFromEnv("SLOW_REQUEST_MS", 300);
    if (durationMs >= slowThreshold || res.statusCode >= 500) {
      console.warn(`[Performance] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
    }
  });
  next();
};

// Instead of a blanket max-age=15 for all public GETs, each route gets
// a Cache-Control header matched to its data freshness requirements.
// | Route Pattern             | Cache-Control                                    |
// |---------------------------|--------------------------------------------------|
// | GET /api/events (list)    | public, max-age=300, stale-while-revalidate=600  |
// | GET /api/events/:slug     | public, max-age=300, stale-while-revalidate=900  |
// | GET /api/clubs (list)     | public, max-age=3600, stale-while-revalidate=21600|
// | GET /api/clubs/:id        | public, max-age=3600, stale-while-revalidate=21600|
// | GET /api/notifications    | private, max-age=30, must-revalidate             |
// | GET /api/admin/*          | private, no-cache, no-store                      |
// | POST/PUT/DELETE /api/*    | no-cache, no-store                               |
// | Registration/check-in     | no-cache, no-store, must-revalidate              |

/**
 * Route-specific cache rules. Order matters — first match wins.
 * @type {Array<{test: (method: string, path: string) => boolean, header: string}>}
 */
const CACHE_RULES = [
  {
    test: (method) => method !== "GET",
    header: "no-cache, no-store",
  },
  {
    test: (_, path) =>
      path.includes("/register") ||
      path.includes("/check-in") ||
      path.includes("/verify"),
    header: "no-cache, no-store, must-revalidate",
  },
  {
    test: (_, path) => path.startsWith("/api/auth/"),
    header: "no-cache, no-store",
  },
  {
    test: (_, path) => path.startsWith("/api/payment/"),
    header: "no-cache, no-store",
  },
  {
    test: (_, path) => path.startsWith("/api/admin/"),
    header: "private, no-cache, no-store",
  },
  {
    test: (_, path) => path.startsWith("/api/notifications"),
    header: "private, max-age=30, must-revalidate",
  },
  // Registration membership and status are mutable per-user data. Never let
  // the browser/proxy reuse a response after register or deregister.
  {
    test: (_, path) => path.startsWith("/api/events/user/"),
    header: "private, no-cache, no-store, must-revalidate",
  },
  {
    test: (_, path, req) =>
      path.startsWith("/api/users/") ||
      path.startsWith("/api/events/user/") ||
      path.startsWith("/api/teams/") ||
      req.headers.authorization ||
      req.headers.cookie,
    header: "private, max-age=60, must-revalidate",
  },
  {
    test: (method, path) =>
      method === "GET" && /^\/api\/events\/?$/.test(path),
    header: "public, max-age=15, stale-while-revalidate=30",
  },
  {
    test: (method, path) =>
      method === "GET" && /^\/api\/events\/[^/]+\/?$/.test(path),
    header: "public, max-age=15, stale-while-revalidate=30",
  },
  {
    test: (method, path) =>
      method === "GET" && /^\/api\/clubs\/?$/.test(path),
    header: "public, max-age=3600, stale-while-revalidate=21600",
  },
  {
    test: (method, path) =>
      method === "GET" && /^\/api\/clubs\/[^/]+\/?$/.test(path),
    header: "public, max-age=3600, stale-while-revalidate=21600",
  },
  {
    test: (method, path) =>
      method === "GET" &&
      path.startsWith("/api/") &&
      !path.includes("/download") &&
      !path.includes("/export"),
    header: "public, max-age=60, stale-while-revalidate=120",
  },
];

export const publicReadCache = (req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();

  for (const rule of CACHE_RULES) {
    if (rule.test(req.method, req.path, req)) {
      res.setHeader("Cache-Control", rule.header);
      break;
    }
  }

  next();
};

// Generates weak ETags from response body hashes for public GET API routes.
// Checks incoming If-None-Match headers and returns 304 Not Modified
// if the content hasn't changed — zero body transfer, lower bandwidth.
//
// Only applies to:
//   - GET requests on /api/* routes
//   - NOT admin, auth, mutation, download, or export routes
//   - NOT requests with authorization (private data has unique per-user content)

export const etagSupport = (req, res, next) => {
  // Only apply to public GET API routes
  if (
    req.method !== "GET" ||
    !req.path.startsWith("/api/") ||
    req.path.startsWith("/api/auth/") ||
    req.path.startsWith("/api/admin/") ||
    req.path.startsWith("/api/payment/") ||
    req.path.includes("/download") ||
    req.path.includes("/export") ||
    req.path.includes("/register") ||
    req.path.includes("/check-in") ||
    req.headers.authorization ||
    req.headers.cookie
  ) {
    return next();
  }

  // Intercept res.json() to compute ETag before sending
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      const bodyStr = JSON.stringify(body);
      const hash = createHash("md5").update(bodyStr).digest("hex").slice(0, 16);
      const etag = `W/"${hash}"`;

      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", new Date().toUTCString());

      // Check if client sent If-None-Match and it matches
      const clientEtag = req.headers["if-none-match"];
      if (clientEtag && clientEtag === etag) {
        return res.status(304).end();
      }
    } catch {
      // If ETag computation fails, just send normally
    }

    return originalJson(body);
  };

  next();
};

export const apiCompression = (req, res, next) => {
  if (!req.path.startsWith("/api/") || req.path.includes("/download") || req.path.includes("/export")) {
    return next();
  }

  const accepts = String(req.headers["accept-encoding"] || "");
  const encoding = accepts.includes("br") ? "br" : accepts.includes("gzip") ? "gzip" : null;
  if (!encoding) return next();

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const chunks = [];
  const toBuffer = (chunk, args) => Buffer.isBuffer(chunk)
    ? chunk
    : Buffer.from(chunk, typeof args[0] === "string" ? args[0] : undefined);
  res.write = (chunk, ...args) => {
    if (chunk) chunks.push(toBuffer(chunk, args));
    return true;
  };
  res.end = (chunk, ...args) => {
    if (chunk) chunks.push(toBuffer(chunk, args));
    const body = Buffer.concat(chunks);
    const contentType = String(res.getHeader("Content-Type") || "");
    const compressible = contentType.includes("json") || contentType.startsWith("text/") || contentType.includes("javascript");

    if (!compressible || body.length < 1024 || res.headersSent) {
      res.write = originalWrite;
      res.end = originalEnd;
      return originalEnd(body, ...args);
    }

    const compressed = encoding === "br" ? zlib.brotliCompressSync(body) : zlib.gzipSync(body);
    res.removeHeader("Content-Length");
    res.setHeader("Content-Encoding", encoding);
    res.setHeader("Vary", "Accept-Encoding");
    return originalEnd(compressed);
  };
  next();
};