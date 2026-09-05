import { Resend } from "resend";
import { emailConfig } from "../config/emailConfig.js";

let resendInstance = null;

const getResendClient = () => {
  if (!resendInstance) {
    const apiKey = emailConfig.getApiKey();
    if (!apiKey) {
      throw new Error(
        "[ResendTransport] RESEND_API_KEY environment variable is not configured."
      );
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
};

/**
 * Resend email delivery transport.
 *
 * @param {object} payload
 * @param {string} payload.from - Full sender header string
 * @param {string} payload.to - Recipient email address
 * @param {string} payload.subject - Email subject
 * @param {string} payload.html - Fully rendered HTML email string
 * @returns {Promise<{ id: string }>}
 */
export const sendViaResend = async ({ from, to, subject, html }) => {
  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[ResendTransport] Delivery error from Resend API:", error);
    throw error;
  }

  return data;
};

export const resendTransport = {
  name: "resend",
  send: sendViaResend,
};

export default resendTransport;
