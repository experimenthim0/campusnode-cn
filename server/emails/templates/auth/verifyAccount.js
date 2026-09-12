import { Button } from "../../components/Button.js";
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

  getSubject() {
    return "Account Verification";
  },

  render(data) {
    const { name, verifyUrl, expiryHours = 24 } = data;
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(verifyUrl);

    return `
      <h2 class="email-heading" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a; text-align: center;">
        Welcome to CampusNode!
      </h2>
      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6; text-align: center; margin: 0 0 20px 0;">
        Hi <strong>${safeName}</strong>,<br><br>
        Thank you for signing up. To complete your registration and activate your student account, please verify your email address.
      </p>

      ${Button({ label: "Verify My Account", url: verifyUrl, variant: "primary" })}

      <p class="email-muted-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 400; text-align: center; color: #64748b; margin: 16px 0 8px 0;">
        This verification link will expire in <strong>${expiryHours} hours</strong>.
      </p>
      <p class="email-muted-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 400; text-align: center; color: #64748b; margin: 0; word-break: break-all;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="${safeUrl}" style="color: #0078d4; text-decoration: underline;">${safeUrl}</a>
      </p>
    `.trim();
  },
};

export default verifyAccountTemplate;
