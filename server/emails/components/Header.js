import { escapeHtml } from "../renderer/escapeHtml.js";
import { colors, typography, spacing } from "../config/designTokens.js";

/**
 * Header component for CampusNode emails.
 * Uses official CampusNode logo and brand typography.
 *
 * @param {object} props
 * @param {string} [props.badgeText] - Optional contextual badge (e.g. "Security", "Club Leadership")
 * @param {string} [props.subtitle] - Optional subtitle text below the logo
 * @returns {string} HTML markup
 */
export const Header = ({ badgeText, subtitle } = {}) => {
  return `
    <div style="margin-bottom: ${spacing.xxl}; text-align: center;">
      <div style="display: inline-block; vertical-align: middle;">
        <h1 style="color: ${colors.primary}; font-family: ${typography.fontFamily}; font-size: ${typography.sizes.xxl}; font-weight: ${typography.weights.bold}; margin: 0;">Campusnode</h1>
      </div>
      ${
        subtitle
          ? `<p class="email-muted-text" style="margin: ${spacing.sm} 0 0 0; font-family: ${typography.fontFamily}; font-size: ${typography.sizes.sm}; font-weight: ${typography.weights.regular}; color: ${colors.muted};">${escapeHtml(subtitle)}</p>`
          : ""
      }
    </div>
  `.trim();
};

export default Header;
