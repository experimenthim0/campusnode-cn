/**
 * CampusNode Telemetry Metrics
 *
 * Provides low-cardinality custom metric instruments for HTTP, Database,
 * Redis, BullMQ, and Node.js Event Loop health.
 *
 * Strictly adheres to low-cardinality label rules (no IDs, no emails, no raw URLs).
 */

import { metrics } from "@opentelemetry/api";
import { isTelemetryEnabled, getTelemetryConfig } from "./config.js";
import { normalizeRoute } from "./sanitizer.js";

const METER_NAME = "campusnode-metrics";
let meter = null;
let initialized = false;

// Instruments
let httpRequestsCounter = null;
let httpRequestDurationHistogram = null;
let inFlightRequestsGauge = null;
let dbQueriesCounter = null;
let dbQueryDurationHistogram = null;
let redisCommandsCounter = null;
let redisCommandDurationHistogram = null;
let eventLoopP50Gauge = null;
let eventLoopP99Gauge = null;
let eventLoopUtilizationGauge = null;

let currentEventLoopMetrics = { p50Ms: 0, p99Ms: 0, utilization: 0 };

export const initMetrics = (eventLoopSnapshotGetter = null) => {
  if (initialized || !isTelemetryEnabled()) return;

  meter = metrics.getMeter(METER_NAME);

  httpRequestsCounter = meter.createCounter("campusnode_http_requests_total", {
    description: "Total number of HTTP requests processed",
    unit: "1",
  });

  httpRequestDurationHistogram = meter.createHistogram("campusnode_http_request_duration_ms", {
    description: "HTTP request latency in milliseconds",
    unit: "ms",
  });

  inFlightRequestsGauge = meter.createUpDownCounter("campusnode_requests_in_flight", {
    description: "Current number of in-flight active HTTP requests",
    unit: "1",
  });

  dbQueriesCounter = meter.createCounter("campusnode_db_queries_total", {
    description: "Total number of database operations executed via Prisma",
    unit: "1",
  });

  dbQueryDurationHistogram = meter.createHistogram("campusnode_db_query_duration_ms", {
    description: "Database operation latency in milliseconds",
    unit: "ms",
  });

  redisCommandsCounter = meter.createCounter("campusnode_redis_commands_total", {
    description: "Total number of Redis operations executed",
    unit: "1",
  });

  redisCommandDurationHistogram = meter.createHistogram("campusnode_redis_command_duration_ms", {
    description: "Redis command latency in milliseconds",
    unit: "ms",
  });

  if (typeof eventLoopSnapshotGetter === "function") {
    eventLoopP50Gauge = meter.createObservableGauge("nodejs_event_loop_delay_p50_ms", {
      description: "Node.js Event Loop Delay 50th percentile in milliseconds",
      unit: "ms",
    });
    eventLoopP50Gauge.addCallback((observableResult) => {
      const snap = eventLoopSnapshotGetter();
      observableResult.observe(snap?.p50Ms || 0);
    });

    eventLoopP99Gauge = meter.createObservableGauge("nodejs_event_loop_delay_p99_ms", {
      description: "Node.js Event Loop Delay 99th percentile in milliseconds",
      unit: "ms",
    });
    eventLoopP99Gauge.addCallback((observableResult) => {
      const snap = eventLoopSnapshotGetter();
      observableResult.observe(snap?.p99Ms || 0);
    });

    eventLoopUtilizationGauge = meter.createObservableGauge("nodejs_event_loop_utilization_ratio", {
      description: "Node.js Event Loop Utilization ratio (0.0 to 1.0)",
      unit: "1",
    });
    eventLoopUtilizationGauge.addCallback((observableResult) => {
      const snap = eventLoopSnapshotGetter();
      observableResult.observe(snap?.utilization || 0);
    });
  }

  initialized = true;
};

/**
 * Record an HTTP request metric with bounded cardinality.
 */
export const recordHttpRequest = ({ method = "GET", route = "/", statusCode = 200, durationMs = 0 }) => {
  if (!initialized || !httpRequestsCounter) return;

  const normalizedMethod = String(method).toUpperCase();
  const normalizedRouteTemplate = normalizeRoute(route);
  const statusBucket = `${Math.floor(Number(statusCode) / 100)}xx`;
  const env = getTelemetryConfig().environment;

  const labels = {
    method: normalizedMethod,
    route: normalizedRouteTemplate,
    status_code: String(statusCode),
    status_class: statusBucket,
    environment: env,
  };

  httpRequestsCounter.add(1, labels);
  if (httpRequestDurationHistogram && durationMs >= 0) {
    httpRequestDurationHistogram.record(durationMs, {
      method: normalizedMethod,
      route: normalizedRouteTemplate,
      status_code: String(statusCode),
    });
  }
};

/**
 * Increment or decrement in-flight requests gauge.
 */
export const updateInFlightRequests = (delta) => {
  if (!initialized || !inFlightRequestsGauge) return;
  inFlightRequestsGauge.add(delta);
};

/**
 * Record a Prisma database operation metric.
 */
export const recordDbMetric = ({ model = "Other", operation = "unknown", durationMs = 0, isError = false }) => {
  if (!initialized || !dbQueriesCounter) return;

  const labels = {
    db_model: String(model || "Other"),
    db_operation: String(operation || "unknown"),
    status: isError ? "error" : "success",
  };

  dbQueriesCounter.add(1, labels);
  if (dbQueryDurationHistogram && durationMs >= 0) {
    dbQueryDurationHistogram.record(durationMs, {
      db_model: String(model || "Other"),
      db_operation: String(operation || "unknown"),
    });
  }
};

/**
 * Record a Redis command metric.
 */
export const recordRedisMetric = ({ operation = "unknown", durationMs = 0, isError = false }) => {
  if (!initialized || !redisCommandsCounter) return;

  const labels = {
    redis_operation: String(operation || "unknown").toLowerCase(),
    status: isError ? "error" : "success",
  };

  redisCommandsCounter.add(1, labels);
  if (redisCommandDurationHistogram && durationMs >= 0) {
    redisCommandDurationHistogram.record(durationMs, {
      redis_operation: String(operation || "unknown").toLowerCase(),
    });
  }
};
