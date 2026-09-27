import { AsyncLocalStorage } from "node:async_hooks";
import { performance as nodePerformance, monitorEventLoopDelay } from "node:perf_hooks";
import { recordDbMetric, recordRedisMetric, recordHttpRequest, initMetrics } from "./telemetry/metrics.js";

const requestStorage = new AsyncLocalStorage();
const startedAt = process.hrtime.bigint();
const routeStats = new Map();
const MAX_ROUTE_STATS = 200;

const aggregate = {
  requests: 0,
  completed: 0,
  clientAborted: 0,
  status2xx: 0,
  status3xx: 0,
  status4xx: 0,
  status5xx: 0,
  overload503: 0,
  dbQueries: 0,
  dbErrors: 0,
  dbTimeMs: 0,
  transactionCount: 0,
  transactionTimeMs: 0,
  redisCommands: 0,
  redisErrors: 0,
  redisTimeMs: 0,
  socketConnections: 0,
  socketErrors: 0,
};

const eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 });
eventLoopMonitor.enable();

let lastEventLoopSnapshot = {
  p50Ms: 0,
  p99Ms: 0,
  maxMs: 0,
  utilization: 0,
};

const eventLoopSampler = setInterval(() => {
  const utilization = typeof nodePerformance.eventLoopUtilization === "function"
    ? nodePerformance.eventLoopUtilization()
    : null;

  lastEventLoopSnapshot = {
    p50Ms: Number(eventLoopMonitor.percentile(50) / 1e6),
    p99Ms: Number(eventLoopMonitor.percentile(99) / 1e6),
    maxMs: Number(eventLoopMonitor.max / 1e6),
    utilization: utilization?.utilization || 0,
  };
  eventLoopMonitor.reset();
}, 1000);
eventLoopSampler.unref?.();
initMetrics(() => lastEventLoopSnapshot);

const numberFromEnv = (name, fallback) => {
  const value = Number.parseFloat(process.env[name] || "");
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const elapsedMs = (startedAtNs) => Number(process.hrtime.bigint() - startedAtNs) / 1e6;

const routePath = (req) => {
  const mountedPath = req.baseUrl || "";
  const matchedPath = req.route?.path;
  const selectedPath = Array.isArray(matchedPath) ? matchedPath[0] : matchedPath;
  if (selectedPath) return `${mountedPath}${selectedPath}`.replace(/\/\/+/g, "/");
  return fallbackRoutePath(req.path || req.originalUrl || "/");
};

const staticPathSegments = new Set([
  "api", "health", "events", "event", "user", "users", "clubs", "club", "auth", "login",
  "register", "student", "faculty", "external", "admin", "payment", "notifications", "push",
  "scanner", "attendance", "sessions", "participation", "feedback", "featured-events", "venues",
  "blackouts", "certificates", "teams", "invitations", "club-members", "export-center", "preview",
  "datasets", "history", "search", "lookup", "calendar", "conflicts", "manage", "co", "all",
  "active", "candidates", "settings", "verify", "read", "read-all", "stats", "sync-state",
  "offline-package", "check-in", "manual", "download", "upload", "review", "submit", "revoke",
  "issued", "list", "members", "membership", "social-links", "profile-photo", "vapid-public-key",
  "subscribe", "unsubscribe", "login", "logout", "change-password", "forgot-password", "reset-password",
]);

const isLikelyDynamicSegment = (segment, index) => {
  if (!segment) return false;
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return true;
  if (/^[0-9a-f]{16,}$/i.test(segment)) return true;
  return index >= 2 && !staticPathSegments.has(segment.toLowerCase());
};

const fallbackRoutePath = (path) => {
  const cleanPath = String(path).split("?")[0].replace(/\/+/g, "/");
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  return `/${segments.map((segment, index) => (
    isLikelyDynamicSegment(segment, index) ? ":param" : segment
  )).join("/")}`;
};

export const classifyRoute = (reqOrPath) => {
  const path = typeof reqOrPath === "string" ? reqOrPath : routePath(reqOrPath);
  const method = typeof reqOrPath === "string" ? null : reqOrPath.method;
  const privateEventRoute = path.startsWith("/api/events/user") || path.includes("/calendar") ||
    path.includes("/conflicts") || path.includes("/club-manage") || path.includes("/registrations") ||
    path.includes("/winner-candidates") || path.includes("/check-in") || path.includes("/attendance");
  if (privateEventRoute || (path.startsWith("/api/events") && method && method !== "GET")) return "AUTHENTICATED";
  if (path.startsWith("/api/featured-events/manage") || path.startsWith("/api/featured-events/candidates") ||
      path.startsWith("/api/featured-events/settings") || (path.startsWith("/api/featured-events") && method && method !== "GET")) {
    return "ADMIN";
  }
  if (path.startsWith("/api/clubs") && method && method !== "GET") return "AUTHENTICATED";
  if (path.startsWith("/api/venues") && method && method !== "GET") return "AUTHENTICATED";
  if (path === "/health" || path === "/" || path.startsWith("/api/auth/") || path.startsWith("/api/events") ||
      path.startsWith("/api/clubs") || path.startsWith("/api/featured-events") || path.startsWith("/api/venues")) {
    return "PUBLIC";
  }
  if (path.startsWith("/api/admin")) return "ADMIN";
  if (path.startsWith("/api/scanner")) return "SCANNER";
  if (path.startsWith("/api/payment")) return "PAYMENT";
  if (path.startsWith("/api/export-center") || path.includes("/export")) return "EXPORT";
  if (path.startsWith("/api/")) return "AUTHENTICATED";
  return "PUBLIC";
};

const createContext = (req) => {
  const suppliedRequestId = String(req.headers["x-request-id"] || "")
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .slice(0, 128);
  const requestId = suppliedRequestId || cryptoRandomId();
  const eluStart = typeof nodePerformance.eventLoopUtilization === "function"
    ? nodePerformance.eventLoopUtilization()
    : null;
  return {
    requestId,
    startedAt: process.hrtime.bigint(),
    eluStart,
    req,
    authStartedAt: null,
    authDurationMs: 0,
    responseBytes: 0,
    jsonResponseCallMs: 0,
    etagMs: 0,
    compression: null,
    overload: null,
    finalized: false,
    db: {
      count: 0,
      timeMs: 0,
      errors: 0,
      slowCount: 0,
      slowest: null,
      transactionCount: 0,
      transactionTimeMs: 0,
      transactionErrors: 0,
    },
    redis: {
      count: 0,
      timeMs: 0,
      errors: 0,
      slowest: null,
    },
  };
};

const cryptoRandomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const runWithRequestContext = (req, next) => {
  const context = createContext(req);
  req.requestId = context.requestId;
  req.observability = context;
  return requestStorage.run(context, next);
};

export const getRequestContext = () => requestStorage.getStore();

export const markAuthStart = (req) => {
  const context = req?.observability || getRequestContext();
  if (context && !context.authStartedAt) context.authStartedAt = process.hrtime.bigint();
};

export const markAuthEnd = (req) => {
  const context = req?.observability || getRequestContext();
  if (context?.authStartedAt) {
    context.authDurationMs += elapsedMs(context.authStartedAt);
    context.authStartedAt = null;
  }
};

export const recordDbQuery = ({ model = null, operation = "unknown", durationMs = 0, error = null } = {}) => {
  const context = getRequestContext();
  aggregate.dbQueries += 1;
  aggregate.dbTimeMs += durationMs;
  if (error) aggregate.dbErrors += 1;
  recordDbMetric({ model, operation, durationMs, isError: Boolean(error) });
  if (!context) return;

  context.db.count += 1;
  context.db.timeMs += durationMs;
  if (error) context.db.errors += 1;
  const slowThreshold = numberFromEnv("OBSERVABILITY_SLOW_QUERY_MS", 200);
  if (durationMs >= slowThreshold) context.db.slowCount += 1;
  if (!context.db.slowest || durationMs > context.db.slowest.durationMs) {
    context.db.slowest = { model, operation, durationMs: Number(durationMs.toFixed(1)), error: Boolean(error) };
  }
};

export const recordTransaction = ({ durationMs = 0, error = null } = {}) => {
  aggregate.transactionCount += 1;
  aggregate.transactionTimeMs += durationMs;
  const context = getRequestContext();
  if (!context) return;
  context.db.transactionCount += 1;
  context.db.transactionTimeMs += durationMs;
  if (error) context.db.transactionErrors += 1;
};

export const recordRedisCommand = ({ operation = "unknown", durationMs = 0, error = null } = {}) => {
  aggregate.redisCommands += 1;
  aggregate.redisTimeMs += durationMs;
  if (error) aggregate.redisErrors += 1;
  recordRedisMetric({ operation, durationMs, isError: Boolean(error) });
  const context = getRequestContext();
  if (!context) return;
  context.redis.count += 1;
  context.redis.timeMs += durationMs;
  if (error) context.redis.errors += 1;
  if (!context.redis.slowest || durationMs > context.redis.slowest.durationMs) {
    context.redis.slowest = { operation, durationMs: Number(durationMs.toFixed(1)), error: Boolean(error) };
  }
};

export const recordEtag = (durationMs) => {
  const context = getRequestContext();
  if (context) context.etagMs += durationMs;
};

export const recordCompression = ({ encoding, inputBytes, outputBytes, durationMs, applied }) => {
  const context = getRequestContext();
  if (context) context.compression = {
    encoding,
    inputBytes,
    outputBytes,
    durationMs: Number(durationMs.toFixed(1)),
    applied,
  };
};

export const recordOverloadRejection = ({ currentInFlight, threshold }) => {
  const context = getRequestContext();
  aggregate.overload503 += 1;
  if (context) {
    context.overload = {
      rejected: true,
      currentInFlight,
      threshold,
    };
  }
};

export const recordSocketHandshake = ({ durationMs, error = null } = {}) => {
  if (error) aggregate.socketErrors += 1;
  else aggregate.socketConnections += 1;
  const payload = {
    category: "SOCKET",
    event: error ? "handshake_error" : "handshake_success",
    durationMs: Number(durationMs.toFixed(1)),
    error: error ? "unauthorized_or_socket_handshake_failed" : undefined,
  };
  const slowThreshold = numberFromEnv("SLOW_REQUEST_MS", 300);
  if (error || durationMs >= slowThreshold || process.env.OBSERVABILITY_LOG_ALL === "true") {
    console.warn(`[SocketMetrics] ${JSON.stringify(payload)}`);
  }
};

const statusBucket = (statusCode) => {
  if (statusCode >= 500) return "status5xx";
  if (statusCode >= 400) return "status4xx";
  if (statusCode >= 300) return "status3xx";
  return "status2xx";
};

const shouldLogRequest = (payload) => (
  process.env.ENABLE_REQUEST_METRICS_LOG !== "false" &&
  (
    process.env.OBSERVABILITY_LOG_ALL === "true" ||
    payload.durationMs >= numberFromEnv("SLOW_REQUEST_MS", 300) ||
    payload.statusCode >= 400 ||
    payload.clientAborted ||
    payload.overloadRejected
  )
);

export const finalizeRequest = (req, res, { clientAborted = false } = {}) => {
  const context = req.observability || getRequestContext();
  if (!context || context.finalized) return;
  context.finalized = true;

  const durationMs = elapsedMs(context.startedAt);
  const template = routePath(req);
  const category = classifyRoute(req);
  const statusCode = Number(res.statusCode || 0);
  const bucket = statusBucket(statusCode);
  const eventLoopUtilization = context.eluStart && typeof nodePerformance.eventLoopUtilization === "function"
    ? nodePerformance.eventLoopUtilization(context.eluStart)
    : null;
  const eventLoop = {
    ...lastEventLoopSnapshot,
    utilization: eventLoopUtilization?.utilization ?? lastEventLoopSnapshot.utilization,
  };
  const payload = {
    requestId: context.requestId,
    method: req.method,
    route: template,
    category,
    statusCode,
    statusClass: bucket,
    durationMs: Number(durationMs.toFixed(1)),
    authDurationMs: Number(context.authDurationMs.toFixed(1)),
    postAuthDurationMs: Number(Math.max(0, durationMs - context.authDurationMs).toFixed(1)),
    responseBytes: context.responseBytes,
    jsonResponseCallMs: Number(context.jsonResponseCallMs.toFixed(1)),
    serializationMsEstimate: Number(Math.max(0, context.jsonResponseCallMs - (context.compression?.durationMs || 0)).toFixed(1)),
    etagMs: Number(context.etagMs.toFixed(1)),
    compression: context.compression || { applied: false },
    db: {
      count: context.db.count,
      timeMs: Number(context.db.timeMs.toFixed(1)),
      poolWaitMs: null,
      poolWaitAvailable: false,
      errors: context.db.errors,
      slowCount: context.db.slowCount,
      slowest: context.db.slowest,
      transactionCount: context.db.transactionCount,
      transactionTimeMs: Number(context.db.transactionTimeMs.toFixed(1)),
      transactionErrors: context.db.transactionErrors,
    },
    redis: {
      count: context.redis.count,
      timeMs: Number(context.redis.timeMs.toFixed(1)),
      errors: context.redis.errors,
      slowest: context.redis.slowest,
    },
    eventLoop,
    overloadRejected: Boolean(context.overload?.rejected),
    overload: context.overload || undefined,
    clientAborted,
    serverResponseCompleted: !clientAborted && res.writableFinished !== false,
  };

  aggregate.requests += 1;
  if (clientAborted) aggregate.clientAborted += 1;
  else aggregate.completed += 1;
  aggregate[bucket] += 1;
  recordHttpRequest({ method: req.method, route: template, statusCode, durationMs });

  const routeKey = `${req.method} ${template}`;
  if (routeStats.size >= MAX_ROUTE_STATS && !routeStats.has(routeKey)) {
    routeStats.delete(routeStats.keys().next().value);
  }
  const routeAggregate = routeStats.get(routeKey) || { requests: 0, totalMs: 0, maxMs: 0, bytes: 0, errors: 0 };
  routeAggregate.requests += 1;
  routeAggregate.totalMs += durationMs;
  routeAggregate.maxMs = Math.max(routeAggregate.maxMs, durationMs);
  routeAggregate.bytes += context.responseBytes;
  if (statusCode >= 400) routeAggregate.errors += 1;
  routeStats.set(routeKey, routeAggregate);

  if (shouldLogRequest(payload)) {
    const output = { ...payload };
    if (!output.overload) delete output.overload;
    console.warn(`[RequestMetrics] ${JSON.stringify(output)}`);
  }
};

export const getObservabilitySnapshot = () => ({
  aggregate: { ...aggregate },
  eventLoop: { ...lastEventLoopSnapshot },
  routes: [...routeStats.entries()].map(([route, values]) => ({
    route,
    ...values,
    avgMs: values.requests ? Number((values.totalMs / values.requests).toFixed(1)) : 0,
  })),
  limitation: "PrismaPg does not expose pool acquisition wait through the current adapter API; db.timeMs is query execution/round-trip time only.",
});
