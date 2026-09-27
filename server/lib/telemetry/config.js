import "dotenv/config";

const parseHeaders = (rawHeaders) => {
  if (!rawHeaders) return {};
  if (typeof rawHeaders === "object") return rawHeaders;

  const headers = {};
  const pairs = String(rawHeaders).split(",");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx > 0) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (key && val) {
        headers[key] = val;
      }
    }
  }
  return headers;
};

const parseResourceAttributes = (rawAttributes) => {
  const attrs = {};
  if (!rawAttributes) return attrs;

  const pairs = String(rawAttributes).split(",");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx > 0) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (key && val) {
        attrs[key] = val;
      }
    }
  }
  return attrs;
};

export const getTelemetryConfig = () => {
  const isEnabled = process.env.OTEL_ENABLED === "true";
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";
  const isStaging = process.env.DEPLOYMENT_ENVIRONMENT === "staging" ||
                    process.env.APP_ENV === "staging" ||
                    (process.env.OTEL_SERVICE_NAME || "").includes("staging");

  const defaultEnvironment = isProd ? (isStaging ? "staging" : "production") : "development";
  const serviceName = process.env.OTEL_SERVICE_NAME ||
    (isStaging ? "campusnode-api-staging" : isProd ? "campusnode-api" : "campusnode-api-local");

  const rawBaseEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "";
  const baseEndpoint = rawBaseEndpoint.replace(/\/+$/, "");

  // Normalize traces & metrics endpoints
  const tracesEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    (baseEndpoint ? (baseEndpoint.endsWith("/v1/traces") ? baseEndpoint : `${baseEndpoint}/v1/traces`) : null);

  const metricsEndpoint = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    (baseEndpoint ? (baseEndpoint.endsWith("/v1/metrics") ? baseEndpoint : `${baseEndpoint}/v1/metrics`) : null);

  const headers = parseHeaders(
    process.env.OTEL_EXPORTER_OTLP_HEADERS || process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS
  );

  const customResourceAttributes = parseResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES);
  const environment = customResourceAttributes["deployment.environment"] || defaultEnvironment;

  // Sampling rate: Staging = 1.0 (100%), Production default = 0.25 (25% adaptive)
  const defaultSampleRate = environment === "production" ? 0.25 : 1.0;
  const rawSamplerArg = process.env.OTEL_TRACES_SAMPLER_ARG;
  const sampleRate = rawSamplerArg !== undefined ? Math.max(0, Math.min(1, Number(rawSamplerArg))) : defaultSampleRate;

  const metricsIntervalMs = Math.max(
    5000,
    Number.parseInt(process.env.OTEL_METRICS_INTERVAL_MS || "15000", 10) || 15000
  );

  return {
    enabled: isEnabled,
    serviceName,
    serviceVersion: process.env.npm_package_version || "1.3.0",
    environment,
    baseEndpoint,
    tracesEndpoint,
    metricsEndpoint,
    headers,
    sampleRate,
    metricsIntervalMs,
    customResourceAttributes,
  };
};

export const isTelemetryEnabled = () => {
  return process.env.OTEL_ENABLED === "true";
};
