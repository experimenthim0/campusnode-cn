import { emailConfig } from "./config/emailConfig.js";
import { templateRegistry } from "./templateRegistry.js";
import { renderEmail } from "./renderer/emailRenderer.js";
import { resendTransport } from "./transports/resendTransport.js";
import { mockTransport } from "./transports/mockTransport.js";
import { enqueueEmail } from "./emailQueue.js";

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
 * Direct transactional email sender.
 * Executes the render and network/mock transport directly.
 *
 * @param {object} options
 * @returns {Promise<{ id: string }>}
 */
export const sendEmailDirect = async (options = {}) => {
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

    // Render HTML, subject, and preheader
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
 * High-level transactional email sender.
 *
 * Automatically delegates to the BullMQ background queue (or asynchronous
 * fallback in dev) so route handlers return instantly in sub-5ms.
 *
 * Pass `sync: true` or run in test environment (`NODE_ENV=test`) to bypass
 * the queue and send synchronously.
 *
 * @param {object} options
 * @returns {Promise<{ id: string, queued?: boolean }>}
 */
export const sendEmail = async (options = {}) => {
  return await enqueueEmail(options);
};

/**
 * Helper: Send an Account Verification Email.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.name - User's display name
 * @param {string} params.verifyUrl - Full verification link
 * @param {number} [params.expiryHours=24] - Token validity in hours
 * @param {boolean} [params.sync=false] - Send synchronously
 * @returns {Promise<{ id: string, queued?: boolean }>}
 */
export const sendVerificationEmail = async ({
  to,
  name,
  verifyUrl,
  expiryHours = 24,
  sync = false,
} = {}) => {
  return await sendEmail({
    to,
    template: "auth:verify-account",
    sync,
    data: {
      name,
      verifyUrl,
      expiryHours,
    },
  });
};

/**
 * Helper: Send a Login 2FA OTP Email.
 *
 * @param {object} params
 * @param {string} [params.to] - Recipient email
 * @param {string} [params.email] - Alternative recipient key
 * @param {string} params.otp - 6-digit one-time passcode
 * @param {string} [params.contextLabel] - Role label (Student / Admin / Faculty)
 * @param {number} [params.expiryMinutes=5] - OTP lifetime in minutes
 * @param {string} [params.device] - Requesting device / browser
 * @param {string} [params.location] - Requesting geographic location
 * @param {string} [params.ipAddress] - Requesting client IP
 * @param {string} [params.time] - Request timestamp
 * @param {boolean} [params.sync=false] - Send synchronously
 * @param {string} [params.subject] - Optional custom subject override
 * @returns {Promise<{ id: string, queued?: boolean }>}
 */
export const sendLoginOtpEmail = async ({
  to,
  email,
  otp,
  contextLabel,
  expiryMinutes = 5,
  device,
  location,
  ipAddress,
  time,
  sync = false,
  subject,
} = {}) => {
  const recipient = to || email;
  return await sendEmail({
    to: recipient,
    template: "auth:login-otp",
    sync,
    data: {
      email: recipient,
      otp,
      contextLabel,
      expiryMinutes,
      device,
      location,
      ipAddress,
      time,
      subject,
    },
  });
};

/**
 * Helper: Send a Password Reset Email.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.resetUrl - Full password reset URL
 * @param {number} [params.expiryMinutes=30] - Token expiration in minutes
 * @param {string} [params.device] - Requesting device
 * @param {string} [params.location] - Requesting location
 * @param {string} [params.ipAddress] - Requesting IP
 * @param {string} [params.time] - Request timestamp
 * @param {boolean} [params.sync=false] - Send synchronously
 * @returns {Promise<{ id: string, queued?: boolean }>}
 */
export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
  expiryMinutes = 30,
  device,
  location,
  ipAddress,
  time,
  sync = false,
} = {}) => {
  return await sendEmail({
    to,
    template: "auth:reset-password",
    sync,
    data: {
      resetUrl,
      expiryMinutes,
      device,
      location,
      ipAddress,
      time,
    },
  });
};

/**
 * Helper: Send a Password Changed Confirmation / Alert Email.
 *
 * @param {object} params
 * @param {string} [params.to] - Recipient email
 * @param {string} [params.email] - Alternative recipient key
 * @param {string} [params.name] - User's display name
 * @param {string} [params.device] - Device from which the change occurred
 * @param {string} [params.location] - Geographic location
 * @param {string} [params.ipAddress] - Client IP address
 * @param {string} [params.time] - Timestamp
 * @param {string} [params.supportEmail] - Support contact email
 * @param {boolean} [params.sync=false] - Send synchronously
 * @returns {Promise<{ id: string, queued?: boolean }>}
 */
export const sendPasswordChangedEmail = async ({
  to,
  email,
  name,
  device,
  location,
  ipAddress,
  time,
  supportEmail,
  sync = false,
} = {}) => {
  const recipient = to || email;
  return await sendEmail({
    to: recipient,
    template: "auth:password-changed",
    sync,
    data: {
      name,
      email: recipient,
      device,
      location,
      ipAddress,
      time,
      supportEmail,
    },
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
export const renderPreview = ({ template, data = {}, theme = null }) => {
  const tpl = templateRegistry.get(template);
  if (typeof tpl.validate === "function") {
    tpl.validate(data);
  }
  return renderEmail(tpl, data, { theme });
};

export default sendEmail;
