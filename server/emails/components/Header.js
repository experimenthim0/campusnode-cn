import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * Header component for CampusNode emails using official image logo.
 *
 * @param {object} props
 * @param {string} [props.badgeText] - Optional contextual badge (e.g. "Admin Portal")
 * @param {string} [props.subtitle] - Optional subtitle text below the logo
 * @returns {string} HTML markup
 */
export const Header = ({ badgeText, subtitle } = {}) => {
  return `
    <div style="margin-bottom: 24px; text-align: center;">
      <div style="display: inline-block; vertical-align: middle;">
        <a href="https://clubsetu.vercel.app" target="_blank" style="text-decoration: none; display: inline-block; vertical-align: middle;">
          <img src="https://clubsetu.nikhim.me/cn_logo.png" alt="CampusNode" height="40" style="height: 40px; max-height: 48px; width: auto; border: 0; display: inline-block; vertical-align: middle;" />
        </a>
        ${
          badgeText
            ? `<span style="display: inline-block; margin-left: 10px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 9999px; vertical-align: middle;">${escapeHtml(badgeText)}</span>`
            : ""
        }
      </div>
      ${
        subtitle
          ? `<p style="margin: 8px 0 0 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 400; color: #64748b;">${escapeHtml(subtitle)}</p>`
          : ""
      }
    </div>
  `.trim();
};

export default Header;

