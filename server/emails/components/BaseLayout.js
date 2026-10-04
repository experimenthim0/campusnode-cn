import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { escapeHtml } from "../renderer/escapeHtml.js";
import { colors, typography, spacing, radii, shadows } from "../config/designTokens.js";

/**
 * Base responsive document shell for all Campusnode transactional emails.
 * Supports light & dark modes with the modern Blue/Teal theme.
 * Enforces a 600px max-width container, table-based layout, and cross-client compatibility.
 *
 * @param {object} props
 * @param {string} [props.title] - Document title
 * @param {string} [props.preheader] - Optional invisible inbox preview text
 * @param {string} [props.headerBadge] - Optional header badge text
 * @param {string} [props.headerSubtitle] - Optional header subtitle
 * @param {string} [props.footerDisclaimer] - Custom footer disclaimer text
 * @param {string} props.content - Body HTML content
 * @param {string} [props.theme] - Explicit theme override ("light" | "dark")
 * @returns {string} Complete HTML document
 */
export const BaseLayout = ({
  title = "Campusnode Notification",
  preheader = "",
  headerBadge,
  headerSubtitle,
  footerDisclaimer,
  content = "",
  theme = null,
} = {}) => {
  const htmlAttrs = theme ? `lang="en" data-theme="${theme}" class="${theme}-theme"` : `lang="en"`;
  const metaScheme = theme ? theme : "light dark";

  const preheaderHtml = preheader
    ? `
      <!--[if !mso]><!-->
      <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0; color: transparent;">
        ${escapeHtml(preheader)}
        &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
      </div>
      <!--<![endif]-->
    `.trim()
    : "";

  return `
<!DOCTYPE html>
<html ${htmlAttrs}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="${metaScheme}">
  <meta name="supported-color-schemes" content="${metaScheme}">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Inter:wght@400;500;600;700&display=swap');
    
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: ${colors.bgCard};
      font-family: ${typography.fontFamily};
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    * {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      box-sizing: border-box;
    }

    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    table {
      border-collapse: separate;
    }

    /* ── Responsive Mobile Rules ── */
    @media screen and (max-width: 600px) {
      .email-wrapper-cell { padding: 12px 6px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; min-width: 100% !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
      .content-card { padding: 20px 14px !important; border: none !important; border-radius: 0 !important; }
      .metadata-cell-label, .info-cell-label { padding: 10px 8px !important; font-size: 11px !important; }
      .metadata-cell-value, .info-cell-value { padding: 10px 8px !important; font-size: 12px !important; }
    }

    /* ── Dark Mode Aesthetics (System prefers-color-scheme: dark) ── */
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]) body,
      html:not([data-theme="light"]) .email-body,
      html:not([data-theme="light"]) .email-body-table,
      html:not([data-theme="light"]) .email-wrapper-cell,
      html:not([data-theme="light"]) .email-container,
      html:not([data-theme="light"]) .content-card {
        background-color: ${colors.darkApp} !important;
        border: none !important;
        box-shadow: none !important;
      }

      html:not([data-theme="light"]) .email-heading,
      html:not([data-theme="light"]) h1,
      html:not([data-theme="light"]) h2,
      html:not([data-theme="light"]) h3 {
        color: ${colors.darkHeading} !important;
      }
      html:not([data-theme="light"]) .email-brand-heading {
        color: ${colors.darkAccent} !important;
      }
      html:not([data-theme="light"]) .email-body-text,
      html:not([data-theme="light"]) p,
      html:not([data-theme="light"]) li {
        color: ${colors.darkBody} !important;
      }
      html:not([data-theme="light"]) .email-muted-text {
        color: ${colors.darkMuted} !important;
      }

      /* Metadata & Info Tables/Boxes */
      html:not([data-theme="light"]) .metadata-table,
      html:not([data-theme="light"]) .info-table,
      html:not([data-theme="light"]) .info-box {
        background-color: #0d1527 !important;
        border-color: ${colors.darkBorder} !important;
      }
      html:not([data-theme="light"]) .metadata-row-border,
      html:not([data-theme="light"]) .info-row {
        border-bottom-color: ${colors.darkBorder} !important;
      }
      html:not([data-theme="light"]) .metadata-cell-label,
      html:not([data-theme="light"]) .info-cell-label,
      html:not([data-theme="light"]) .info-label,
      html:not([data-theme="light"]) .info-box strong {
        color: #f1f5f9 !important;
      }
      html:not([data-theme="light"]) .metadata-cell-value,
      html:not([data-theme="light"]) .info-cell-value,
      html:not([data-theme="light"]) .info-value,
      html:not([data-theme="light"]) .info-box p {
        color: ${colors.darkBody} !important;
      }
      html:not([data-theme="light"]) .info-code,
      html:not([data-theme="light"]) .info-box code {
        background-color: #1e293b !important;
        color: ${colors.darkAccent} !important;
        border: 1px solid #334155 !important;
      }
      html:not([data-theme="light"]) .info-highlight {
        color: ${colors.darkAccent} !important;
      }
      html:not([data-theme="light"]) .status-badge-active {
        background: rgba(0, 201, 119, 0.15) !important;
        color: #34d399 !important;
        border-color: rgba(52, 211, 153, 0.3) !important;
      }

      /* OTP Box */
      html:not([data-theme="light"]) .otp-box-inner {
        background-color: #0d1527 !important;
        border-color: #0284c7 !important;
      }
      html:not([data-theme="light"]) .otp-code-text {
        color: ${colors.darkAccent} !important;
      }

      /* Footer */
      html:not([data-theme="light"]) .footer-divider {
        border-top-color: ${colors.darkBorder} !important;
      }
      html:not([data-theme="light"]) .footer-text {
        color: ${colors.muted} !important;
      }
    }

    /* ── Forced Dark Mode ── */
    html[data-theme="dark"] body,
    html[data-theme="dark"] .email-body,
    html[data-theme="dark"] .email-body-table,
    html[data-theme="dark"] .email-wrapper-cell,
    html[data-theme="dark"] .email-container,
    html[data-theme="dark"] .content-card,
    .dark-theme body,
    .dark-theme .email-body,
    .dark-theme .email-body-table,
    .dark-theme .email-wrapper-cell,
    .dark-theme .email-container,
    .dark-theme .content-card {
      background-color: ${colors.darkApp} !important;
      border: none !important;
      box-shadow: none !important;
    }

    html[data-theme="dark"] .email-heading,
    html[data-theme="dark"] h1,
    html[data-theme="dark"] h2,
    html[data-theme="dark"] h3,
    .dark-theme .email-heading,
    .dark-theme h1,
    .dark-theme h2,
    .dark-theme h3 {
      color: ${colors.darkHeading} !important;
    }
    html[data-theme="dark"] .email-brand-heading,
    .dark-theme .email-brand-heading {
      color: ${colors.darkAccent} !important;
    }
    html[data-theme="dark"] .email-body-text,
    html[data-theme="dark"] p,
    html[data-theme="dark"] li,
    .dark-theme .email-body-text,
    .dark-theme p,
    .dark-theme li {
      color: ${colors.darkBody} !important;
    }
    html[data-theme="dark"] .email-muted-text,
    .dark-theme .email-muted-text {
      color: ${colors.darkMuted} !important;
    }

    html[data-theme="dark"] .metadata-table,
    html[data-theme="dark"] .info-table,
    html[data-theme="dark"] .info-box,
    .dark-theme .metadata-table,
    .dark-theme .info-table,
    .dark-theme .info-box {
      background-color: #0d1527 !important;
      border-color: ${colors.darkBorder} !important;
    }
    html[data-theme="dark"] .metadata-row-border,
    html[data-theme="dark"] .info-row,
    .dark-theme .metadata-row-border,
    .dark-theme .info-row {
      border-bottom-color: ${colors.darkBorder} !important;
    }
    html[data-theme="dark"] .metadata-cell-label,
    html[data-theme="dark"] .info-cell-label,
    html[data-theme="dark"] .info-label,
    html[data-theme="dark"] .info-box strong,
    .dark-theme .metadata-cell-label,
    .dark-theme .info-cell-label,
    .dark-theme .info-label,
    .dark-theme .info-box strong {
      color: #f1f5f9 !important;
    }
    html[data-theme="dark"] .metadata-cell-value,
    html[data-theme="dark"] .info-cell-value,
    html[data-theme="dark"] .info-value,
    html[data-theme="dark"] .info-box p,
    .dark-theme .metadata-cell-value,
    .dark-theme .info-cell-value,
    .dark-theme .info-value,
    .dark-theme .info-box p {
      color: ${colors.darkBody} !important;
    }
    html[data-theme="dark"] .info-code,
    html[data-theme="dark"] .info-box code,
    .dark-theme .info-code,
    .dark-theme .info-box code {
      background-color: #1e293b !important;
      color: ${colors.darkAccent} !important;
      border: 1px solid #334155 !important;
    }
    html[data-theme="dark"] .info-highlight,
    .dark-theme .info-highlight {
      color: ${colors.darkAccent} !important;
    }
    html[data-theme="dark"] .status-badge-active,
    .dark-theme .status-badge-active {
      background: rgba(0, 201, 119, 0.15) !important;
      color: #34d399 !important;
      border-color: rgba(52, 211, 153, 0.3) !important;
    }

    html[data-theme="dark"] .otp-box-inner,
    .dark-theme .otp-box-inner {
      background-color: #0d1527 !important;
      border-color: #0284c7 !important;
    }
    html[data-theme="dark"] .otp-code-text,
    .dark-theme .otp-code-text {
      color: ${colors.darkAccent} !important;
    }

    html[data-theme="dark"] .footer-divider,
    .dark-theme .footer-divider {
      border-top-color: ${colors.darkBorder} !important;
    }
    html[data-theme="dark"] .footer-text,
    .dark-theme .footer-text {
      color: ${colors.muted} !important;
    }

    /* ── Forced Light Mode ── */
    html[data-theme="light"],
    .light-theme {
      color-scheme: light !important;
    }
    html[data-theme="light"] body,
    html[data-theme="light"] .email-body,
    html[data-theme="light"] .email-body-table,
    html[data-theme="light"] .email-wrapper-cell,
    html[data-theme="light"] .email-container,
    html[data-theme="light"] .content-card,
    .light-theme body,
    .light-theme .email-body,
    .light-theme .email-body-table,
    .light-theme .email-wrapper-cell,
    .light-theme .email-container,
    .light-theme .content-card {
      background-color: ${colors.bgCard} !important;
      border: none !important;
      box-shadow: none !important;
    }
    html[data-theme="light"] .email-heading,
    .light-theme .email-heading {
      color: ${colors.heading} !important;
    }
    html[data-theme="light"] .email-brand-heading,
    .light-theme .email-brand-heading {
      color: ${colors.primary} !important;
    }
    html[data-theme="light"] .email-body-text,
    html[data-theme="light"] p,
    .light-theme .email-body-text,
    .light-theme p {
      color: ${colors.body} !important;
    }
    html[data-theme="light"] .info-table,
    html[data-theme="light"] .info-box,
    .light-theme .info-table,
    .light-theme .info-box {
      background-color: ${colors.infoBg} !important;
      border-color: ${colors.infoBorder} !important;
    }
    html[data-theme="light"] .info-cell-label,
    html[data-theme="light"] .info-label,
    html[data-theme="light"] .info-box strong,
    .light-theme .info-cell-label,
    .light-theme .info-label,
    .light-theme .info-box strong {
      color: ${colors.heading} !important;
    }
    html[data-theme="light"] .info-cell-value,
    html[data-theme="light"] .info-value,
    html[data-theme="light"] .info-box p,
    .light-theme .info-cell-value,
    .light-theme .info-value,
    .light-theme .info-box p {
      color: ${colors.body} !important;
    }
    html[data-theme="light"] .info-code,
    html[data-theme="light"] .info-box code,
    .light-theme .info-code,
    .light-theme .info-box code {
      background-color: ${colors.border} !important;
      color: ${colors.heading} !important;
      border: none !important;
    }
    html[data-theme="light"] .info-highlight,
    .light-theme .info-highlight {
      color: ${colors.primary} !important;
    }
    html[data-theme="light"] .status-badge-active,
    .light-theme .status-badge-active {
      background: ${colors.successBg} !important;
      color: ${colors.successText} !important;
      border-color: ${colors.successBorder} !important;
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: ${colors.bgCard}; font-family: ${typography.fontFamily}; font-weight: ${typography.weights.regular}; width: 100% !important; min-width: 100%;">
  ${preheaderHtml}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-body-table" style="background-color: ${colors.bgCard}; min-height: 100vh; width: 100% !important; margin: 0; padding: 0;">
    <tr>
      <td align="center" class="email-wrapper-cell" style="padding: 20px 8px; background-color: ${colors.bgCard};">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="640" style="width: 640px;">
        <tr>
        <td align="center" valign="top" width="640" style="width: 640px;">
        <![endif]-->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; width: 100%; margin: 0 auto; background-color: ${colors.bgCard}; border: none; border-radius: 0; box-shadow: none; table-layout: fixed;">
          <tr>
            <td class="content-card" style="padding: 24px 20px; background-color: ${colors.bgCard}; border: none; border-radius: 0; font-family: ${typography.fontFamily};">
              ${Header({ badgeText: headerBadge, subtitle: headerSubtitle })}
              <div class="email-body-text" style="font-size: ${typography.sizes.base}; line-height: ${typography.lineHeights.relaxed}; color: ${colors.body}; width: 100%;">
                ${content}
              </div>
              ${Footer({ disclaimerText: footerDisclaimer })}
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export default BaseLayout;
