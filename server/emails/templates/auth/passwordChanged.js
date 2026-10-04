import { SecurityMetadataCard } from "../../components/SecurityMetadataCard.js";
import { Heading, BodyText, MutedText } from "../../components/Typography.js";
import { InfoBox } from "../../components/InfoBox.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";
import { formatRequestTime } from "../../utils/requestMetadata.js";

export const passwordChangedTemplate = {
  id: "auth:password-changed",
  headerBadge: "Security Alert",

  validate(data) {
    // No mandatory token required as this is a security notification
  },

  getSubject(data) {
    return data?.subject || "Your Campusnode password has been changed";
  },

  getPreheader() {
    return "Your account password was recently changed. If you did not make this change, contact support immediately.";
  },

  render(data = {}) {
    const {
      name,
      email,
      device,
      location,
      ipAddress,
      time,
      supportEmail = "support@campusnode.in",
    } = data;

    const safeName = name ? escapeHtml(name) : (email ? escapeHtml(email) : "Campusnode User");
    const safeSupportEmail = escapeHtml(supportEmail);
    const resolvedTime = time || (device || location || ipAddress ? formatRequestTime(new Date()) : null);

    return `
      ${Heading({ children: "Password Changed", level: 2, align: "center", style: "margin: 0 0 16px 0;" })}

      ${BodyText({
        children: `Hi <strong>${safeName}</strong>,<br><br>The password for your Campusnode account was recently updated. You can now use your new password to sign in.`,
        align: "center",
        style: "margin: 0 0 16px 0;",
      })}

      ${InfoBox({
        variant: "warning",
        title: "Didn't make this change?",
        icon: "⚠️",
        children: `If you did not authorize this password update, someone may have compromised your account. Please report this immediately to campus administrators or email <a href="mailto:${safeSupportEmail}" style="color: #b45309; font-weight: 600; text-decoration: underline;">${safeSupportEmail}</a>.`,
      })}

      ${SecurityMetadataCard({ device, location, ipAddress, time: resolvedTime })}

      ${MutedText({
        children: "For security, Campusnode staff will never ask for your password or verification codes.",
        align: "center",
        style: "margin-top: 20px; font-size: 12px;",
      })}
    `.trim();
  },
};

export default passwordChangedTemplate;
