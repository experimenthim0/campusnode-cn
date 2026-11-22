import { Heading, BodyText, MutedText } from "../../components/Typography.js";
import { InfoBox } from "../../components/InfoBox.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";

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
    return "Your Campusnode password was changed.";
  },

  render(data = {}) {
    const {
      name,
      email,
      supportEmail = "support@campusnode.in",
    } = data;

    const safeName = name ? escapeHtml(name) : (email ? escapeHtml(email) : "Campusnode User");
    const safeSupportEmail = escapeHtml(supportEmail);

    return `
      ${Heading({ children: "Password Changed", level: 2, align: "center", style: "margin: 0 0 16px 0;" })}

      ${BodyText({
        children: `Hi <strong>${safeName}</strong>,<br><br>The password for your Campusnode account was changed successfully.`,
        align: "center",
        style: "margin: 0 0 16px 0;",
      })}

      ${InfoBox({
        variant: "warning",
        title: "Didn't make this change?",
        icon: "⚠️",
        children: `If you did not authorize this change, please contact <a href="mailto:${safeSupportEmail}" style="color: #b45309; font-weight: 600; text-decoration: underline;">${safeSupportEmail}</a> immediately.`,
      })}

      ${MutedText({
        children: "Campusnode staff will never ask for your password or verification codes.",
        align: "center",
        style: "margin-top: 20px; font-size: 12px;",
      })}
    `.trim();
  },
};

export default passwordChangedTemplate;
