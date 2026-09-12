import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * Bulletproof CTA button component for HTML emails.
 * Uses the primary Blue (#0078d4) and Teal (#00c977) theme from index.css.
 *
 * @param {object} props
 * @param {string} props.label - Button text label
 * @param {string} props.url - Target URL
 * @param {"primary" | "teal" | "dark"} [props.variant="primary"] - Styling variant
 * @returns {string} HTML markup
 */
export const Button = ({ label, url, variant = "primary" }) => {
  let bg = "#0078d4"; // Default brand blue
  let shadow = "0 2px 8px rgba(0, 120, 212, 0.28)";

  if (variant === "teal") {
    bg = "#00c977";
    shadow = "0 2px 8px rgba(0, 201, 119, 0.28)";
  } else if (variant === "dark") {
    bg = "#0f172a";
    shadow = "0 2px 8px rgba(15, 23, 42, 0.25)";
  }

  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);

  return `
    <div style="text-align: center; margin: 28px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:46px;v-text-anchor:middle;width:230px;" arcsize="20%" stroke="f" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:'Google Sans',Arial,sans-serif;font-size:15px;font-weight:600;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <a href="${safeUrl}" target="_blank" style="background-color: ${bg}; color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 10px; font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 15px; display: inline-block; mso-padding-alt: 0; box-shadow: ${shadow}; text-align: center; letter-spacing: 0.2px;">
        ${safeLabel}
      </a>
    </div>
  `.trim();
};

export default Button;
