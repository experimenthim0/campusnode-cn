import { sendEmail as centralizedSendEmail } from "../emails/emailService.js";

/**
 * Backward-compatibility facade for email dispatching.
 * Delegates to the centralized email subsystem in `server/emails/`.
 *
 * Supports both:
 * 1. Legacy: sendEmail({ email, subject, message })
 * 2. Modern: sendEmail({ to, template, data })
 *
 * @param {object} options
 * @returns {Promise<{ id: string }>}
 */
const sendEmail = async (options) => {
  return await centralizedSendEmail(options);
};

export default sendEmail;

