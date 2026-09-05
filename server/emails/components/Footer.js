import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * Footer component for CampusNode emails.
 *
 * @param {object} props
 * @param {string} [props.disclaimerText] - Optional custom disclaimer
 * @param {boolean} [props.includeCopyright=true] - Whether to show the copyright line
 * @returns {string} HTML markup
 */
export const Footer = ({
  disclaimerText = "If you didn't request this email from CampusNode, you can safely ignore it.",
  includeCopyright = true,
} = {}) => {
  const currentYear = new Date().getFullYear();

  return `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 400; color: #94a3b8; line-height: 1.5;">
      ${disclaimerText ? `<p style="margin: 0 0 8px 0; font-family: 'Google Sans', sans-serif; font-weight: 400;">${escapeHtml(disclaimerText)}</p>` : ""}
      ${includeCopyright ? `<p style="margin: 0; font-family: 'Google Sans', sans-serif; font-weight: 400;">&copy; ${currentYear} CampusNode. All rights reserved.</p>` : ""}
    </div>
  `.trim();
};

export default Footer;
