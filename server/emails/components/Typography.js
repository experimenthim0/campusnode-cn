import { colors, typography, spacing } from "../config/designTokens.js";

/**
 * Standardized Heading component for transactional emails.
 *
 * @param {object} props
 * @param {string} props.children - Text content (HTML or plain text)
 * @param {1 | 2 | 3} [props.level=2] - Heading level (1=24px, 2=20px, 3=18px)
 * @param {"left" | "center" | "right"} [props.align="center"] - Text alignment
 * @param {string} [props.color] - Optional color override
 * @param {string} [props.style=""] - Custom CSS rules
 * @returns {string} HTML markup
 */
export const Heading = ({
  children = "",
  level = 2,
  align = "center",
  color = colors.heading,
  style = "",
} = {}) => {
  const sizeMap = {
    1: "24px",
    2: typography.sizes.xl, // 20px
    3: typography.sizes.lg, // 18px
  };
  const fontSize = sizeMap[level] || typography.sizes.xl;
  const tag = `h${level}`;
  const className = color === colors.primary ? "email-brand-heading" : "email-heading";

  return `
    <${tag} class="${className}" style="font-family: ${typography.fontFamily}; font-size: ${fontSize}; font-weight: ${typography.weights.semibold}; margin: 0 0 ${spacing.base} 0; color: ${color}; text-align: ${align}; line-height: ${typography.lineHeights.tight}; ${style}">
      ${children}
    </${tag}>
  `.trim();
};

/**
 * Standardized Body Text component for email paragraphs.
 *
 * @param {object} props
 * @param {string} props.children - Text content
 * @param {"left" | "center" | "right"} [props.align="center"] - Text alignment
 * @param {string} [props.color] - Color override
 * @param {string} [props.style=""] - Custom CSS rules
 * @returns {string} HTML markup
 */
export const BodyText = ({
  children = "",
  align = "center",
  color = colors.body,
  style = "",
} = {}) => {
  return `
    <p class="email-body-text" style="font-family: ${typography.fontFamily}; font-size: ${typography.sizes.base}; font-weight: ${typography.weights.regular}; color: ${color}; line-height: ${typography.lineHeights.relaxed}; text-align: ${align}; margin: 0 0 ${spacing.lg} 0; ${style}">
      ${children}
    </p>
  `.trim();
};

/**
 * Standardized Muted Text component for footnotes, expiry notices, and disclaimers.
 *
 * @param {object} props
 * @param {string} props.children - Text content
 * @param {"left" | "center" | "right"} [props.align="center"] - Text alignment
 * @param {string} [props.color] - Color override
 * @param {string} [props.style=""] - Custom CSS rules
 * @returns {string} HTML markup
 */
export const MutedText = ({
  children = "",
  align = "center",
  color = colors.muted,
  style = "",
} = {}) => {
  return `
    <p class="email-muted-text" style="font-family: ${typography.fontFamily}; font-size: ${typography.sizes.sm}; font-weight: ${typography.weights.regular}; color: ${color}; line-height: ${typography.lineHeights.normal}; text-align: ${align}; margin: 0 0 ${spacing.sm} 0; ${style}">
      ${children}
    </p>
  `.trim();
};

/**
 * Standardized Small Text component (12px).
 *
 * @param {object} props
 * @param {string} props.children - Text content
 * @param {"left" | "center" | "right"} [props.align="center"] - Text alignment
 * @param {string} [props.color] - Color override
 * @param {string} [props.style=""] - Custom CSS rules
 * @returns {string} HTML markup
 */
export const SmallText = ({
  children = "",
  align = "center",
  color = colors.subtle,
  style = "",
} = {}) => {
  return `
    <p class="email-muted-text" style="font-family: ${typography.fontFamily}; font-size: ${typography.sizes.xs}; font-weight: ${typography.weights.regular}; color: ${color}; line-height: ${typography.lineHeights.normal}; text-align: ${align}; margin: 0; ${style}">
      ${children}
    </p>
  `.trim();
};

/**
 * Standardized Link component for reliable display with break-all protection for long URLs.
 *
 * @param {object} props
 * @param {string} props.href - Target URL
 * @param {string} [props.label] - Optional link text (defaults to href)
 * @param {string} [props.color] - Custom link color
 * @param {string} [props.style=""] - Custom CSS rules
 * @returns {string} HTML markup
 */
export const LinkText = ({
  href,
  label,
  color = colors.link,
  style = "",
} = {}) => {
  const displayLabel = label || href;
  return `
    <a href="${href}" target="_blank" style="color: ${color}; text-decoration: underline; word-break: break-all; font-weight: 500; ${style}">
      ${displayLabel}
    </a>
  `.trim();
};

export const Typography = {
  Heading,
  BodyText,
  MutedText,
  SmallText,
  LinkText,
};

export default Typography;
