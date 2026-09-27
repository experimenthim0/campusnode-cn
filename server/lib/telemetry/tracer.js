/**
 * CampusNode Safe Tracing Helper
 *
 * Provides a fail-open, zero-overhead wrapper around OpenTelemetry Tracing API.
 * Ensures spans reliably close in try/finally, records errors without swallowing them,
 * and passes through transparently when telemetry is disabled.
 */

import { trace, SpanStatusCode } from "@opentelemetry/api";
import { isTelemetryEnabled } from "./config.js";
import { sanitizeSpanAttributes, isSafeAttributeKey } from "./sanitizer.js";

const TRACER_NAME = "campusnode-core";
let defaultTracer = null;

export const getTracer = () => {
  if (!defaultTracer) {
    defaultTracer = trace.getTracer(TRACER_NAME);
  }
  return defaultTracer;
};

/**
 * Executes a function inside an active OpenTelemetry span.
 *
 * Fail-open guarantee:
 * - If telemetry is disabled, executes fn immediately without overhead.
 * - Spans always end in finally block.
 * - Errors are recorded on span and re-thrown without altering error propagation.
 *
 * @param {string} spanName - Logical name of the operation
 * @param {Record<string, any>} attributes - Safe span attributes
 * @param {Function} fn - Async or sync callback (span) => Promise<any> | any
 * @returns {Promise<any>}
 */
export const withSpan = async (spanName, attributes = {}, fn) => {
  if (!isTelemetryEnabled()) {
    return typeof fn === "function" ? fn(null) : undefined;
  }

  const tracer = getTracer();
  const safeAttributes = sanitizeSpanAttributes(attributes);

  return tracer.startActiveSpan(spanName, { attributes: safeAttributes }, async (span) => {
    try {
      return await fn(span);
    } catch (error) {
      if (span && span.isRecording()) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error?.message || "Operation failed",
        });
      }
      throw error;
    } finally {
      if (span) {
        span.end();
      }
    }
  });
};

/**
 * Safely sets an attribute on an active span after sanitization.
 */
export const setSpanAttribute = (span, key, value) => {
  if (!span || !span.isRecording() || !isSafeAttributeKey(key)) return;
  const sanitized = sanitizeSpanAttributes({ [key]: value });
  if (sanitized[key] !== undefined) {
    span.setAttribute(key, sanitized[key]);
  }
};

/**
 * Safely records an exception on a span and marks its status.
 */
export const recordSpanError = (span, error) => {
  if (!span || !span.isRecording()) return;
  if (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || "Operation error",
    });
  }
};
