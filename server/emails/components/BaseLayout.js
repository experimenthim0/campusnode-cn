import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * Base responsive document shell for all CampusNode transactional emails.
 * Supports light & dark modes with the modern Blue/Teal theme from index.css.
 *
 * @param {object} props
 * @param {string} [props.title] - Document title
 * @param {string} [props.headerBadge] - Optional header badge text
 * @param {string} [props.headerSubtitle] - Optional header subtitle
 * @param {string} [props.footerDisclaimer] - Custom footer disclaimer text
 * @param {string} props.content - Body HTML content
 * @returns {string} Complete HTML document
 */
export const BaseLayout = ({
  title = "CampusNode Notification",
  headerBadge,
  headerSubtitle,
  footerDisclaimer,
  content = "",
  theme = null,
} = {}) => {
  const htmlAttrs = theme ? `lang="en" data-theme="${theme}" class="${theme}-theme"` : `lang="en"`;
  const metaScheme = theme ? theme : "light dark";

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
      background-color: #f8fafc;
      font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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

    /* ── Light / Dark Mode Logo Switching ── */
    .light-logo {
      display: inline-block !important;
    }
    .dark-logo-wrapper {
      display: none !important;
      max-height: 0px !important;
      overflow: hidden !important;
      mso-hide: all !important;
    }
    .dark-logo {
      display: none !important;
    }

    /* ── Responsive Mobile Rules ── */
    @media screen and (max-width: 600px) {
      .email-wrapper-cell { padding: 16px 8px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; min-width: 100% !important; border-radius: 12px !important; }
      .content-card { padding: 28px 20px !important; }
      .metadata-cell-label, .info-cell-label { padding: 10px 8px !important; font-size: 11px !important; }
      .metadata-cell-value, .info-cell-value { padding: 10px 8px !important; font-size: 12px !important; }
    }

    /* ── Dark Mode Aesthetics (System prefers-color-scheme: dark) ── */
    @media (prefers-color-scheme: dark) {
      /* Only apply system dark mode if light mode is NOT explicitly forced */
      html:not([data-theme="light"]) .light-logo {
        display: none !important;
      }
      html:not([data-theme="light"]) .dark-logo-wrapper {
        display: inline-block !important;
        max-height: none !important;
        overflow: visible !important;
      }
      html:not([data-theme="light"]) .dark-logo {
        display: inline-block !important;
      }

      html:not([data-theme="light"]) body,
      html:not([data-theme="light"]) .email-body,
      html:not([data-theme="light"]) .email-wrapper-cell {
        background-color: #0b1120 !important;
      }
      html:not([data-theme="light"]) .email-container,
      html:not([data-theme="light"]) .content-card {
        background-color: #111b2e !important;
        border-color: #1e293b !important;
      }

      html:not([data-theme="light"]) .email-heading,
      html:not([data-theme="light"]) h1,
      html:not([data-theme="light"]) h2,
      html:not([data-theme="light"]) h3 {
        color: #f8fafc !important;
      }
      html:not([data-theme="light"]) .email-brand-heading {
        color: #38bdf8 !important;
      }
      html:not([data-theme="light"]) .email-body-text,
      html:not([data-theme="light"]) p,
      html:not([data-theme="light"]) li {
        color: #cbd5e1 !important;
      }
      html:not([data-theme="light"]) .email-muted-text {
        color: #94a3b8 !important;
      }

      /* Metadata & Info Tables/Boxes */
      html:not([data-theme="light"]) .metadata-table,
      html:not([data-theme="light"]) .info-table,
      html:not([data-theme="light"]) .info-box {
        background-color: #0d1527 !important;
        border-color: #1e293b !important;
      }
      html:not([data-theme="light"]) .metadata-row-border,
      html:not([data-theme="light"]) .info-row {
        border-bottom-color: #1e293b !important;
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
        color: #cbd5e1 !important;
      }
      html:not([data-theme="light"]) .info-code,
      html:not([data-theme="light"]) .info-box code {
        background-color: #1e293b !important;
        color: #38bdf8 !important;
        border: 1px solid #334155 !important;
      }
      html:not([data-theme="light"]) .info-highlight {
        color: #38bdf8 !important;
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
        color: #38bdf8 !important;
      }

      /* Footer */
      html:not([data-theme="light"]) .footer-divider {
        border-top-color: #1e293b !important;
      }
      html:not([data-theme="light"]) .footer-text {
        color: #64748b !important;
      }
    }

    /* ── Forced Dark Mode ([data-theme="dark"] or .dark-theme) ── */
    html[data-theme="dark"] .light-logo,
    .dark-theme .light-logo {
      display: none !important;
    }
    html[data-theme="dark"] .dark-logo-wrapper,
    .dark-theme .dark-logo-wrapper {
      display: inline-block !important;
      max-height: none !important;
      overflow: visible !important;
    }
    html[data-theme="dark"] .dark-logo,
    .dark-theme .dark-logo {
      display: inline-block !important;
    }

    html[data-theme="dark"] body,
    html[data-theme="dark"] .email-body,
    html[data-theme="dark"] .email-wrapper-cell,
    .dark-theme body,
    .dark-theme .email-body,
    .dark-theme .email-wrapper-cell {
      background-color: #0b1120 !important;
    }
    html[data-theme="dark"] .email-container,
    html[data-theme="dark"] .content-card,
    .dark-theme .email-container,
    .dark-theme .content-card {
      background-color: #111b2e !important;
      border-color: #1e293b !important;
    }

    html[data-theme="dark"] .email-heading,
    html[data-theme="dark"] h1,
    html[data-theme="dark"] h2,
    html[data-theme="dark"] h3,
    .dark-theme .email-heading,
    .dark-theme h1,
    .dark-theme h2,
    .dark-theme h3 {
      color: #f8fafc !important;
    }
    html[data-theme="dark"] .email-brand-heading,
    .dark-theme .email-brand-heading {
      color: #38bdf8 !important;
    }
    html[data-theme="dark"] .email-body-text,
    html[data-theme="dark"] p,
    html[data-theme="dark"] li,
    .dark-theme .email-body-text,
    .dark-theme p,
    .dark-theme li {
      color: #cbd5e1 !important;
    }
    html[data-theme="dark"] .email-muted-text,
    .dark-theme .email-muted-text {
      color: #94a3b8 !important;
    }

    html[data-theme="dark"] .metadata-table,
    html[data-theme="dark"] .info-table,
    html[data-theme="dark"] .info-box,
    .dark-theme .metadata-table,
    .dark-theme .info-table,
    .dark-theme .info-box {
      background-color: #0d1527 !important;
      border-color: #1e293b !important;
    }
    html[data-theme="dark"] .metadata-row-border,
    html[data-theme="dark"] .info-row,
    .dark-theme .metadata-row-border,
    .dark-theme .info-row {
      border-bottom-color: #1e293b !important;
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
      color: #cbd5e1 !important;
    }
    html[data-theme="dark"] .info-code,
    html[data-theme="dark"] .info-box code,
    .dark-theme .info-code,
    .dark-theme .info-box code {
      background-color: #1e293b !important;
      color: #38bdf8 !important;
      border: 1px solid #334155 !important;
    }
    html[data-theme="dark"] .info-highlight,
    .dark-theme .info-highlight {
      color: #38bdf8 !important;
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
      color: #38bdf8 !important;
    }

    html[data-theme="dark"] .footer-divider,
    .dark-theme .footer-divider {
      border-top-color: #1e293b !important;
    }
    html[data-theme="dark"] .footer-text,
    .dark-theme .footer-text {
      color: #64748b !important;
    }

    /* ── Forced Light Mode ([data-theme="light"] or .light-theme) ── */
    html[data-theme="light"],
    .light-theme {
      color-scheme: light !important;
    }
    html[data-theme="light"] .light-logo,
    .light-theme .light-logo {
      display: inline-block !important;
    }
    html[data-theme="light"] .dark-logo-wrapper,
    html[data-theme="light"] .dark-logo,
    .light-theme .dark-logo-wrapper,
    .light-theme .dark-logo {
      display: none !important;
    }
    html[data-theme="light"] body,
    html[data-theme="light"] .email-body,
    html[data-theme="light"] .email-wrapper-cell,
    .light-theme body,
    .light-theme .email-body,
    .light-theme .email-wrapper-cell {
      background-color: #f8fafc !important;
    }
    html[data-theme="light"] .email-container,
    html[data-theme="light"] .content-card,
    .light-theme .email-container,
    .light-theme .content-card {
      background-color: #ffffff !important;
      border-color: #e2e8f0 !important;
    }
    html[data-theme="light"] .email-heading,
    .light-theme .email-heading {
      color: #0f172a !important;
    }
    html[data-theme="light"] .email-brand-heading,
    .light-theme .email-brand-heading {
      color: #0078d4 !important;
    }
    html[data-theme="light"] .email-body-text,
    html[data-theme="light"] p,
    .light-theme .email-body-text,
    .light-theme p {
      color: #334155 !important;
    }
    html[data-theme="light"] .info-table,
    html[data-theme="light"] .info-box,
    .light-theme .info-table,
    .light-theme .info-box {
      background-color: #eff8ff !important;
      border-color: #b8e1ff !important;
    }
    html[data-theme="light"] .info-cell-label,
    html[data-theme="light"] .info-label,
    html[data-theme="light"] .info-box strong,
    .light-theme .info-cell-label,
    .light-theme .info-label,
    .light-theme .info-box strong {
      color: #0f172a !important;
    }
    html[data-theme="light"] .info-cell-value,
    html[data-theme="light"] .info-value,
    html[data-theme="light"] .info-box p,
    .light-theme .info-cell-value,
    .light-theme .info-value,
    .light-theme .info-box p {
      color: #334155 !important;
    }
    html[data-theme="light"] .info-code,
    html[data-theme="light"] .info-box code,
    .light-theme .info-code,
    .light-theme .info-box code {
      background-color: #e2e8f0 !important;
      color: #0f172a !important;
      border: none !important;
    }
    html[data-theme="light"] .info-highlight,
    .light-theme .info-highlight {
      color: #0078d4 !important;
    }
    html[data-theme="light"] .status-badge-active,
    .light-theme .status-badge-active {
      background: #ecfff8 !important;
      color: #009f61 !important;
      border-color: #a4ffe0 !important;
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 400; width: 100% !important; min-width: 100%;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-body-table" style="background-color: #f8fafc; min-height: 100vh; width: 100% !important; margin: 0; padding: 0;">
    <tr>
      <td align="center" class="email-wrapper-cell" style="padding: 36px 12px; background-color: #f8fafc;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width: 600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width: 600px;">
        <![endif]-->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 20px -2px rgba(0, 120, 212, 0.05); overflow: hidden; table-layout: fixed;">
          <tr>
            <td class="content-card" style="padding: 36px 32px; background-color: #ffffff; border-radius: 16px; font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${Header({ badgeText: headerBadge, subtitle: headerSubtitle })}
              <div class="email-body-text" style="font-size: 15px; line-height: 1.6; color: #334155; width: 100%;">
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
