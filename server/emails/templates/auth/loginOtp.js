import { OtpBadge } from "../../components/OtpBadge.js";
import { SecurityMetadataCard } from "../../components/SecurityMetadataCard.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";
import { formatRequestTime } from "../../utils/requestMetadata.js";

export const loginOtpTemplate = {
  id: "auth:login-otp",
  headerBadge: "Security",

  validate(data) {
    if (!data?.otp) {
      throw new Error('[loginOtpTemplate] Missing required field: "otp"');
    }
    if (!data?.email) {
      throw new Error('[loginOtpTemplate] Missing required field: "email"');
    }
  },

  getSubject(data) {
    if (data?.subject) return data.subject;
    return data?.contextLabel === "Admin"
      ? "Admin Login Verification Code"
      : "CampusNode Login Verification Code";
  },

  render(data) {
    const { otp, email, contextLabel, expiryMinutes = 5, device, location, ipAddress, time } = data;
    const safeEmail = escapeHtml(email);
    const safeContext = contextLabel ? escapeHtml(contextLabel) : "";
    const resolvedTime = time || (device || location || ipAddress ? formatRequestTime(new Date()) : null);

    let recipientPrompt;
    if (contextLabel && contextLabel !== "Student" && contextLabel !== "External") {
      recipientPrompt = `A login was requested for the <strong>${safeContext}</strong> account (<strong>${safeEmail}</strong>).`;
    } else if (contextLabel === "Student") {
      recipientPrompt = `A login was requested for your student account (<strong>${safeEmail}</strong>).`;
    } else {
      recipientPrompt = `A login was requested for your account (<strong>${safeEmail}</strong>).`;
    }

    return `
      <h2 class="email-heading" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 12px 0; color: #0f172a; text-align: center;">
        Verify Your Login
      </h2>
      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6; text-align: center; margin: 0 0 20px 0;">
        ${recipientPrompt}
      </p>

      ${SecurityMetadataCard({ device, location, ipAddress, time: resolvedTime })}

      ${OtpBadge({ code: otp })}

      <p class="email-muted-text" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 400; color: #64748b; text-align: center; margin: 20px 0 0 0;">
        Expires in <strong>${expiryMinutes} minutes</strong>. Do not share this code.
      </p>
    `.trim();
  },
};

export default loginOtpTemplate;
