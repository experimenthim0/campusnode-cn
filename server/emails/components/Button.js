import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * Bulletproof CTA button component for HTML emails.
 *
 * @param {object} props
 * @param {string} props.label - Button text label
 * @param {string} props.url - Target URL
 * @param {"primary" | "dark"} [props.variant="primary"] - Styling variant
 * @returns {string} HTML markup
 */
export const Button = ({ label, url, variant = "primary" }) => {
  const bg = variant === "dark" ? "#171717" : "#ea580c";
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);

  return `
    <div style="text-align: center; margin: 28px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:'Google Sans',Arial,sans-serif;font-size:15px;font-weight:600;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <a href="${safeUrl}" target="_blank" style="background-color: ${bg}; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 15px; display: inline-block; mso-padding-alt: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); text-align: center;">
        ${safeLabel}
      </a>
    </div>
  `.trim();
};

export default Button;
