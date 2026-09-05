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
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <style>
   @import url('https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 400; color: #1e293b; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; padding: 16px !important; }
      .content-card { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 500;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td>
              <div class="content-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                ${Header({ badgeText: headerBadge, subtitle: headerSubtitle })}
                <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                  ${content}
                </div>
                ${Footer({ disclaimerText: footerDisclaimer })}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export default BaseLayout;
