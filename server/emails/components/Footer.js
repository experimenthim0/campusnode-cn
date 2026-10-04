import { escapeHtml } from "../renderer/escapeHtml.js";
import { colors, typography, spacing } from "../config/designTokens.js";

/**
 * Footer component for CampusNode transactional emails.
 * Includes security disclaimer and copyright notice.
 *
 * @param {object} props
 * @param {string} [props.disclaimerText] - Optional custom disclaimer
 * @param {boolean} [props.includeCopyright=true] - Whether to show the copyright line
 * @returns {string} HTML markup
 */
export const Footer = ({
  disclaimerText = "If you didn't request this email from Campusnode, you can safely ignore it.",
  includeCopyright = true,
} = {}) => {
  const currentYear = new Date().getFullYear();

  return `
    <div style="margin-top: ${spacing.xxxl}; padding-top: ${spacing.lg}; border-top: 1px solid ${colors.divider}; text-align: center; font-family: ${typography.fontFamily}; font-size: ${typography.sizes.xs}; font-weight: ${typography.weights.regular}; color: ${colors.subtle}; line-height: ${typography.lineHeights.normal};">
      ${disclaimerText ? `<p style="margin: 0 0 ${spacing.sm} 0; font-family: ${typography.fontFamily}; font-weight: ${typography.weights.regular};">${escapeHtml(disclaimerText)}</p>` : ""}
      ${includeCopyright ? `<p style="margin: 0; font-family: ${typography.fontFamily}; font-weight: ${typography.weights.regular};">&copy; ${currentYear} CampusNode. All rights reserved.</p>` : ""}
    </div>
  `.trim();
};

export default Footer;
