import { Button } from "../../components/Button.js";
import { SecurityMetadataCard } from "../../components/SecurityMetadataCard.js";
import { Heading, BodyText, MutedText, LinkText } from "../../components/Typography.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";
import { formatRequestTime } from "../../utils/requestMetadata.js";

export const resetPasswordTemplate = {
  id: "auth:reset-password",
  headerBadge: "Security",

  validate(data) {
    if (!data?.resetUrl) {
      throw new Error('[resetPasswordTemplate] Missing required field: "resetUrl"');
    }
  },

  getSubject(data) {
    return data?.subject || "Password Reset Request";
  },

  getPreheader() {
    return "Use this secure link to choose a new password for your CampusNode account.";
  },

  render(data) {
    const { resetUrl, expiryMinutes = 30, device, location, ipAddress, time } = data;
    const safeUrl = escapeHtml(resetUrl);
    const resolvedTime = time || (device || location || ipAddress ? formatRequestTime(new Date()) : null);

    return `
      ${Heading({ children: "Reset Your Password", level: 2, align: "center", style: "margin: 0 0 16px 0;" })}

      

      ${BodyText({
      children: "We received a request to reset your CampusNode account password. Click the button above to choose a new password.",
      align: "center",
      style: "margin: 0 0 12px 0;",
    })}

      ${Button({ label: "Reset Password", url: resetUrl, variant: "primary" })}


      ${MutedText({
      children: `This password reset link will expire in <strong>${expiryMinutes} minutes</strong>.`,
      align: "center",
      style: "margin: 0 0 8px 0;",
    })}

      ${MutedText({
      children: `If the button doesn't work, copy and paste this URL into your browser:<br>${LinkText({ href: safeUrl })}`,
      align: "center",
      style: "margin: 0 0 20px 0; word-break: break-all;",
    })}

    
    `.trim();
  },
};

export default resetPasswordTemplate;
