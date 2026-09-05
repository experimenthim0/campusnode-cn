import { Button } from "../../components/Button.js";
import { SecurityMetadataCard } from "../../components/SecurityMetadataCard.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";

export const resetPasswordTemplate = {
  id: "auth:reset-password",
  headerBadge: "Security",

  validate(data) {
    if (!data?.resetUrl) {
      throw new Error('[resetPasswordTemplate] Missing required field: "resetUrl"');
    }
  },

  getSubject() {
    return "Password Reset Request";
  },

  render(data) {
    const { resetUrl, expiryMinutes = 30, device, location, ipAddress, time } = data;
    const safeUrl = escapeHtml(resetUrl);

    return `
      <h2 style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a; text-align: center;">
        Reset Your Password
      </h2>
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6; text-align: center; margin: 0 0 20px 0;">
        We received a request to reset your CampusNode account password. Click the button below to choose a new password.
      </p>

      ${SecurityMetadataCard({ device, location, ipAddress, time })}

      ${Button({ label: "Reset Password", url: resetUrl, variant: "primary" })}

      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 400; text-align: center; color: #64748b; margin: 16px 0 8px 0;">
        This password reset link will expire in <strong>${expiryMinutes} minutes</strong>.
      </p>
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 400; text-align: center; color: #64748b; margin: 0; word-break: break-all;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="${safeUrl}" style="color: #ea580c; text-decoration: underline;">${safeUrl}</a>
      </p>
    `.trim();
  },
};

export default resetPasswordTemplate;
