import nodemailer from "nodemailer";
import { emailConfig } from "../config/emailConfig.js";

let transporterInstance = null;
let sentEmails = [];

/**
 * Returns or creates the singleton Nodemailer SMTP transporter.
 * The transporter connects to Mailpit in local development and the college
 * SMTP server in production via centralized environment variables.
 *
 * @returns {import("nodemailer").Transporter}
 */
export const getSmtpTransporter = () => {
  if (!transporterInstance) {
    const smtpOpts = emailConfig.getSmtpConfig();
    transporterInstance = nodemailer.createTransport(smtpOpts);
  }
  return transporterInstance;
};

/**
 * Allows overriding or resetting the active transporter.
 * Primarily used by test suites to inject a jsonTransport or streamTransport.
 *
 * @param {import("nodemailer").Transporter|null} transporter
 */
export const setSmtpTransporter = (transporter) => {
  transporterInstance = transporter;
};

/**
 * Send an email via SMTP using Nodemailer.
 *
 * @param {object} payload
 * @param {string} payload.from - Full sender address string
 * @param {string} payload.to - Recipient email address
 * @param {string} payload.subject - Email subject
 * @param {string} payload.html - Fully rendered HTML email string
 * @param {string} [payload.text] - Optional plain text alternative
 * @returns {Promise<{ id: string, messageId: string, response?: string }>}
 */
export const sendViaSmtp = async ({ from, to, subject, html, text }) => {
  const transporter = getSmtpTransporter();

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  if (text) {
    mailOptions.text = text;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    const messageId =
      info.messageId || `smtp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const result = {
      id: messageId,
      messageId,
      response: info.response,
    };

    sentEmails.push({
      from,
      to,
      subject,
      html,
      text,
      id: messageId,
      sentAt: new Date(),
      response: info.response,
    });

    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[SmtpTransport] Email sent to "${to}" with subject: "${subject}" (ID: ${messageId})`
      );
    }

    return result;
  } catch (error) {
    console.error(`[SmtpTransport] Delivery failed for "${to}":`, error.message);
    throw error;
  }
};

/**
 * In-memory sent email history for testing & inspection.
 */
export const getSentEmails = () => [...sentEmails];
export const getLastEmail = () => (sentEmails.length > 0 ? sentEmails[sentEmails.length - 1] : null);
export const clearSentEmails = () => {
  sentEmails = [];
};

export const smtpTransport = {
  name: "smtp",
  send: sendViaSmtp,
  getTransporter: getSmtpTransporter,
  setTransporter: setSmtpTransporter,
  getSentEmails,
  getLastEmail,
  clearSentEmails,
};

export default smtpTransport;
