import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * Header component for CampusNode emails.
 * Uses black logo for light mode and white logo for dark mode.
 * Styled with the modern Blue/Teal design system from index.css.
 *
 * @param {object} props
 * @param {string} [props.badgeText] - Optional contextual badge (e.g. "Security", "Club Management")
 * @param {string} [props.subtitle] - Optional subtitle text below the logo
 * @returns {string} HTML markup
 */
export const Header = ({ badgeText, subtitle } = {}) => {
  // Determine badge styling based on context (Blue / Teal theme)
  let badgeBg = "#eff8ff";
  let badgeColor = "#0078d4";
  let badgeBorder = "#b8e1ff";

  if (badgeText?.toLowerCase().includes("security")) {
    badgeBg = "#ecfff8";
    badgeColor = "#009f61";
    badgeBorder = "#a4ffe0";
  } else if (badgeText?.toLowerCase().includes("club") || badgeText?.toLowerCase().includes("governance")) {
    badgeBg = "#eff8ff";
    badgeColor = "#0078d4";
    badgeBorder = "#b8e1ff";
  }

  return `
    <div style="margin-bottom: 28px; text-align: center;">
      <div style="display: inline-block; vertical-align: middle;">
        <a href="https://campusnode.vercel.app" target="_blank" style="text-decoration: none; display: inline-block; vertical-align: middle;">
          <!-- Light Mode Logo: Pure Black on Light Background -->
         
          <h2 style="font-weight:bold; color:black;">CampusNode</h2>
          <!-- Dark Mode Logo: Pure White on Dark Background -->
          
         
          <!--<![endif]-->
        </a>
      

      </div>
      ${
        subtitle
          ? `<p class="email-muted-text" style="margin: 10px 0 0 0; font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 400; color: #64748b;">${escapeHtml(subtitle)}</p>`
          : ""
      }
    </div>
  `.trim();
};

export default Header;
