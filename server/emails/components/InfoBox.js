import { escapeHtml } from "../renderer/escapeHtml.js";
import { colors, typography, spacing, radii } from "../config/designTokens.js";

/**
 * Standardized InfoBox component for callout notices, security warnings, and tips.
 *
 * @param {object} props
 * @param {string} props.children - HTML or text content
 * @param {"info" | "warning" | "danger" | "success" | "neutral"} [props.variant="info"] - Styling variant
 * @param {string} [props.icon] - Optional emoji/icon prefix
 * @param {string} [props.title] - Optional title
 * @param {string} [props.style=""] - Custom CSS overrides
 * @returns {string} HTML markup
 */
export const InfoBox = ({
  children = "",
  variant = "info",
  icon = "",
  title = "",
  style = "",
} = {}) => {
  const variantStyles = {
    info: {
      bg: colors.infoBg,
      border: colors.infoBorder,
      text: colors.body,
      titleColor: colors.infoText,
    },
    warning: {
      bg: colors.warningBg,
      border: colors.warningBorder,
      text: colors.warningText,
      titleColor: colors.warningText,
    },
    danger: {
      bg: colors.dangerBg,
      border: colors.dangerBorder,
      text: colors.dangerText,
      titleColor: colors.dangerText,
    },
    success: {
      bg: colors.successBg,
      border: colors.successBorder,
      text: colors.body,
      titleColor: colors.successText,
    },
    neutral: {
      bg: colors.bgApp,
      border: colors.border,
      text: colors.body,
      titleColor: colors.heading,
    },
  };

  const current = variantStyles[variant] || variantStyles.info;
  const headerHtml = title
    ? `<div style="font-weight: ${typography.weights.semibold}; font-size: ${typography.sizes.sm}; color: ${current.titleColor}; margin-bottom: ${spacing.xs};">${icon ? `${icon} ` : ""}${escapeHtml(title)}</div>`
    : "";

  return `
    <div class="info-box" style="background-color: ${current.bg}; border: 1px solid ${current.border}; border-radius: ${radii.lg}; padding: ${spacing.md} ${spacing.base}; margin: ${spacing.lg} 0; font-family: ${typography.fontFamily}; font-size: ${typography.sizes.sm}; line-height: ${typography.lineHeights.normal}; color: ${current.text}; text-align: left; ${style}">
      ${headerHtml}
      <div>${children}</div>
    </div>
  `.trim();
};

export default InfoBox;
