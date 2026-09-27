/**
 * CampusNode OpenTelemetry Root Bootstrap
 *
 * Starts the OpenTelemetry Node SDK before application modules load.
 * Exports traces and metrics to Grafana Cloud via OTLP/HTTP.
 *
 * Guarantees:
 * - Fail-open: Telemetry failure never breaks the application.
 * - Zero PII: Strips credentials, tokens, OTPs, cookies, and raw bodies.
 * - High-cardinality protection: Routes normalized; metrics strictly bounded.
 * - Low-overhead: Asynchronous batching and selective instrumentation.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes, defaultResource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter as OTLPTraceExporterProto } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter as OTLPMetricExporterProto } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter as OTLPTraceExporterHttp } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter as OTLPMetricExporterHttp } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor, ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

import { getTelemetryConfig, isTelemetryEnabled } from "./config.js";
import { redisStatementSerializer } from "./sanitizer.js";
import { initMetrics } from "./metrics.js";

let sdkInstance = null;
let isStarted = false;

const startTelemetry = () => {
  if (isStarted) return;
  if (!isTelemetryEnabled()) {
    if (process.env.NODE_ENV !== "test" && process.env.OTEL_DEBUG === "true") {
      console.log("[CampusNode OTel] Telemetry disabled (OTEL_ENABLED != true).");
    }
    return;
  }

  const config = getTelemetryConfig();

  try {
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: config.serviceName,
        [ATTR_SERVICE_VERSION]: config.serviceVersion,
        "deployment.environment": config.environment,
        ...config.customResourceAttributes,
      })
    );

    const isProtobuf = (process.env.OTEL_EXPORTER_OTLP_PROTOCOL || "http/protobuf").includes("protobuf");
    const SelectedTraceExporter = isProtobuf ? OTLPTraceExporterProto : OTLPTraceExporterHttp;
    const SelectedMetricExporter = isProtobuf ? OTLPMetricExporterProto : OTLPMetricExporterHttp;

    // Trace Exporter & Processor
    let traceExporter = null;
    let spanProcessor = null;

    if (config.tracesEndpoint) {
      traceExporter = new SelectedTraceExporter({
        url: config.tracesEndpoint,
        headers: config.headers,
        timeoutMillis: 5000,
      });

      spanProcessor = new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 5000,
      });
    }

    // Metric Exporter & Reader
    let metricReader = null;
    if (config.metricsEndpoint) {
      const metricExporter = new SelectedMetricExporter({
        url: config.metricsEndpoint,
        headers: config.headers,
        timeoutMillis: 5000,
      });

      metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: config.metricsIntervalMs,
        exportTimeoutMillis: 5000,
      });
    }

    // Parent-based Ratio Sampler (100% in staging/dev, 25% adaptive in prod)
    const ratioSampler = new TraceIdRatioBasedSampler(config.sampleRate);
    const sampler = new ParentBasedSampler({ root: ratioSampler });

    // Auto-instrumentations configuration with strict overhead & security limits
    const autoInstrumentations = getNodeAutoInstrumentations({
      // Disable noisy filesystem, DNS, and raw network hooks
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-net": { enabled: false },

      // HTTP & Express
      "@opentelemetry/instrumentation-http": {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          const url = req.url || "";
          if (url.startsWith("/public/") || url.endsWith(".ico") || url.endsWith(".png")) return true;
          if (url === "/health" && process.env.OTEL_TRACE_HEALTH !== "true") return true;
          return false;
        },
        headersToSpanAttributes: {
          client: { requestHeaders: [], responseHeaders: [] },
          server: {
            requestHeaders: ["user-agent", "x-request-id"],
            responseHeaders: ["content-type", "x-response-time", "x-route-category"],
          },
        },
      },
      "@opentelemetry/instrumentation-express": { enabled: true },

      // Redis — Command Name only, never arguments (protects OTPs, tokens, and keys)
      "@opentelemetry/instrumentation-ioredis": {
        enabled: true,
        dbStatementSerializer: (cmdName) => redisStatementSerializer(cmdName),
      },

      // PostgreSQL — Query text only, never parameter arrays
      "@opentelemetry/instrumentation-pg": {
        enabled: true,
        enhancedDatabaseReporting: false,
      },
    });

    sdkInstance = new NodeSDK({
      resource,
      sampler,
      spanProcessor: spanProcessor || undefined,
      metricReader: metricReader || undefined,
      instrumentations: [autoInstrumentations],
    });

    sdkInstance.start();
    isStarted = true;

    // Initialize custom metric instruments
    initMetrics();

    console.log(
      `[CampusNode OTel] Initialized successfully. Service: "${config.serviceName}" | Env: "${config.environment}" | SampleRate: ${config.sampleRate * 100}%`
    );

    // Graceful, non-blocking shutdown
    const shutdownTelemetry = async () => {
      if (!isStarted || !sdkInstance) return;
      try {
        await sdkInstance.shutdown();
        isStarted = false;
        console.log("[CampusNode OTel] SDK shut down gracefully.");
      } catch (err) {
        console.warn("[CampusNode OTel] Warning during shutdown:", err.message);
      }
    };

    process.once("SIGTERM", shutdownTelemetry);
    process.once("SIGINT", shutdownTelemetry);
  } catch (err) {
    // Fail-open: Never allow telemetry initialization to crash CampusNode
    console.error("[CampusNode OTel] Initialization warning (operating without telemetry):", err.message);
  }
};

// Auto-run on module import
startTelemetry();

export { sdkInstance, isStarted, startTelemetry };
export * from "./config.js";
export * from "./sanitizer.js";
export * from "./tracer.js";
export * from "./metrics.js";
