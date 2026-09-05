import { Header } from "./Header.js";
import { Footer } from "./Footer.js";
import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * Base responsive document shell for all CampusNode transactional emails.
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
} = {}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap');
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; background-color: #f8fafc; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    * { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; box-sizing: border-box; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: separate; }
    @media screen and (max-width: 600px) {
      .email-wrapper-cell { padding: 16px 8px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; min-width: 100% !important; border-radius: 8px !important; }
      .content-card { padding: 24px 16px !important; }
      .metadata-cell-label { padding: 10px 8px !important; font-size: 10px !important; }
      .metadata-cell-value { padding: 10px 8px !important; font-size: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 400; width: 100% !important; min-width: 100%;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; min-height: 100vh; width: 100% !important; margin: 0; padding: 0;">
    <tr>
      <td align="center" class="email-wrapper-cell" style="padding: 36px 12px; background-color: #f8fafc;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width: 600px;">
        <tr>
        <td align="center" valign="top" width="600" style="width: 600px;">
        <![endif]-->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; table-layout: fixed;">
          <tr>
            <td class="content-card" style="padding: 36px 32px; background-color: #ffffff; border-radius: 12px; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${Header({ badgeText: headerBadge, subtitle: headerSubtitle })}
              <div style="font-size: 15px; line-height: 1.6; color: #334155; width: 100%;">
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
