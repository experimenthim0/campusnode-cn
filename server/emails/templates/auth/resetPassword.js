import { Button } from "../../components/Button.js";
import { Heading, BodyText, MutedText, LinkText } from "../../components/Typography.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";

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
    return "Use this link to set a new password for your Campusnode account.";
  },

  render(data) {
    const { resetUrl, expiryMinutes = 30 } = data;
    const safeUrl = escapeHtml(resetUrl);

    return `
      ${Heading({ children: "Reset Your Password", level: 2, align: "center", style: "margin: 0 0 16px 0;" })}

      ${BodyText({
        children: "We received a request to reset your Campusnode account password. Click below to set a new password.",
        align: "center",
        style: "margin: 0 0 16px 0;",
      })}

      ${Button({ label: "Reset Password", url: resetUrl, variant: "primary" })}

      ${MutedText({
        children: `This password reset link will expire in <strong>${expiryMinutes} minutes</strong>.`,
        align: "center",
        style: "margin: 16px 0 8px 0;",
      })}

      ${MutedText({
        children: `If the button doesn't work, open this link in your browser:<br>${LinkText({ href: safeUrl })}`,
        align: "center",
        style: "margin: 0; word-break: break-all;",
      })}
    `.trim();
  },
};

export default resetPasswordTemplate;
