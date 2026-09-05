import { emailConfig } from "./config/emailConfig.js";
import { templateRegistry } from "./templateRegistry.js";
import { renderEmail } from "./renderer/emailRenderer.js";
import { resendTransport } from "./transports/resendTransport.js";
import { mockTransport } from "./transports/mockTransport.js";

/**
 * Determine the active transport based on environment configuration.
 *
 * @returns {object} Transport with a `.send(payload)` method
 */
export const getActiveTransport = () => {
  if (emailConfig.isTest()) {
    return mockTransport;
  }

  const apiKey = emailConfig.getApiKey();
  if (apiKey) {
    return resendTransport;
  }

  // If no API key is set in development, safely fall back to mock
  if (!emailConfig.isProduction()) {
    return mockTransport;
  }

  // In production without an API key, return resendTransport which will throw a clear error
  return resendTransport;
};

/**
 * High-level transactional email sender.
 *
 * Supports both:
 * 1. Modern signature: sendEmail({ to, template, data, subjectOverride })
 * 2. Legacy compatibility signature: sendEmail({ email, subject, message })
 *
 * @param {object} options
 * @returns {Promise<{ id: string }>}
 */
export const sendEmail = async (options = {}) => {
  const transport = getActiveTransport();
  const from = emailConfig.getFromHeader();

  // 1. Check for modern template-based invocation
  if (options.template) {
    const to = options.to || options.email;
    if (!to) {
      throw new Error('[EmailService] Recipient address ("to" or "email") is required.');
    }

    const template = templateRegistry.get(options.template);
    const data = options.data || {};

    // Validate data payload
    if (typeof template.validate === "function") {
      template.validate(data);
    }

    // Render HTML and subject
    const rendered = renderEmail(template, data);
    const subject = options.subjectOverride || rendered.subject;

    return await transport.send({
      from,
      to,
      subject,
      html: rendered.html,
      templateId: template.id,
      templateData: data,
    });
  }

  // 2. Fallback to legacy raw HTML invocation ({ email, subject, message })
  const legacyTo = options.email || options.to;
  const legacySubject = options.subject || "CampusNode Notification";
  const legacyHtml = options.message || options.html || "";

  if (!legacyTo) {
    throw new Error('[EmailService] Recipient address ("email" or "to") is required.');
  }

  return await transport.send({
    from,
    to: legacyTo,
    subject: legacySubject,
    html: legacyHtml,
  });
};

/**
 * Render a template without dispatching (useful for tests and preview).
 *
 * @param {object} options
 * @param {string} options.template - Template ID
 * @param {object} [options.data] - Template data
 * @returns {{ subject: string, html: string }}
 */
export const renderPreview = ({ template, data = {} }) => {
  const tpl = templateRegistry.get(template);
  if (typeof tpl.validate === "function") {
    tpl.validate(data);
  }
  return renderEmail(tpl, data);
};

export default sendEmail;
