import { Button } from "../../components/Button.js";
import { Heading, BodyText, MutedText, LinkText } from "../../components/Typography.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";

export const verifyAccountTemplate = {
  id: "auth:verify-account",
  headerBadge: "Account Verification",

  validate(data) {
    if (!data?.name) {
      throw new Error('[verifyAccountTemplate] Missing required field: "name"');
    }
    if (!data?.verifyUrl) {
      throw new Error('[verifyAccountTemplate] Missing required field: "verifyUrl"');
    }
  },

  getSubject(data) {
    return data?.subject || "Account Verification";
  },

  getPreheader() {
    return "Confirm your email address to complete registration and activate your CampusNode account.";
  },

  render(data) {
    const { name, verifyUrl, expiryHours = 24 } = data;
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(verifyUrl);

    return `
      ${Heading({ children: "Welcome to CampusNode!", level: 2, align: "center" })}

      ${BodyText({
        children: `Hi <strong>${safeName}</strong>,<br><br>Thank you for signing up. To complete your registration and activate your student account, please verify your email address.`,
        align: "center",
      })}

      ${Button({ label: "Verify My Account", url: verifyUrl, variant: "primary" })}

      ${MutedText({
        children: `This verification link will expire in <strong>${expiryHours} hours</strong>.`,
        align: "center",
        style: "margin-top: 16px; margin-bottom: 8px;",
      })}

      ${MutedText({
        children: `If the button doesn't work, copy and paste this URL into your browser:<br>${LinkText({ href: safeUrl })}`,
        align: "center",
        style: "margin: 0; word-break: break-all;",
      })}
    `.trim();
  },
};

export default verifyAccountTemplate;
