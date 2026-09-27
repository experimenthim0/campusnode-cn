import { escapeHtml } from "../renderer/escapeHtml.js";
import { colors, shadows, radii, typography, spacing } from "../config/designTokens.js";

/**
 * Bulletproof CTA button component for HTML emails.
 * Uses CampusNode Brand Blue (#0078d4), Accent Teal (#00c977), Dark (#0f172a), or Secondary styling.
 * Includes Microsoft Outlook VML roundrect markup for pixel-perfect cross-client rendering.
 *
 * @param {object} props
 * @param {string} props.label - Button text label
 * @param {string} props.url - Target URL
 * @param {"primary" | "secondary" | "teal" | "dark"} [props.variant="primary"] - Styling variant
 * @returns {string} HTML markup
 */
export const Button = ({ label, url, variant = "primary" }) => {
  let bg = colors.primary;
  let textColor = "#ffffff";
  let border = "none";
  let shadow = shadows.buttonPrimary;

  if (variant === "secondary") {
    bg = colors.bgApp;
    textColor = colors.heading;
    border = `1px solid ${colors.border}`;
    shadow = "none";
  } else if (variant === "teal") {
    bg = colors.teal;
    textColor = "#ffffff";
    shadow = shadows.buttonTeal;
  } else if (variant === "dark") {
    bg = colors.dark;
    textColor = "#ffffff";
    shadow = shadows.buttonDark;
  }

  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);

  return `
    <div style="text-align: center; margin: ${spacing.xxl} 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:46px;v-text-anchor:middle;width:230px;" arcsize="20%" stroke="f" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:${textColor};font-family:${typography.fontFamily};font-size:${typography.sizes.base};font-weight:${typography.weights.semibold};">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <a href="${safeUrl}" target="_blank" style="background-color: ${bg}; color: ${textColor}; padding: 13px 32px; text-decoration: none; border-radius: ${radii.lg}; font-family: ${typography.fontFamily}; font-weight: ${typography.weights.semibold}; font-size: ${typography.sizes.base}; display: inline-block; mso-padding-alt: 0; box-shadow: ${shadow}; text-align: center; letter-spacing: 0.2px; border: ${border};">
        ${safeLabel}
      </a>
    </div>
  `.trim();
};

export default Button;
