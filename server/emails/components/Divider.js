import { colors, spacing } from "../config/designTokens.js";

/**
 * Standardized Divider component for transactional emails.
 *
 * @param {object} props
 * @param {string} [props.margin] - Vertical spacing
 * @param {string} [props.color] - Custom line color
 * @returns {string} HTML markup
 */
export const Divider = ({
  margin = `${spacing.xl} 0`,
  color = colors.divider,
} = {}) => {
  return `
    <hr class="footer-divider" style="border: none; border-top: 1px solid ${color}; margin: ${margin}; padding: 0;" />
  `.trim();
};

export default Divider;
