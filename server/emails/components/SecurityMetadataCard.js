import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * SecurityMetadataCard component for Login OTP & Password Reset emails.
 * Renders a clean, high-legibility 2-column card with CampusNode Blue accents.
 *
 * @param {object} props
 * @param {string} [props.device]
 * @param {string} [props.location]
 * @param {string} [props.ipAddress]
 * @param {string} [props.time]
 * @returns {string} HTML markup
 */
export const SecurityMetadataCard = ({ device, location, ipAddress, time } = {}) => {
  const rows = [];

  if (device) {
    rows.push({ label: "DEVICE", value: device });
  }
  if (location) {
    rows.push({ label: "LOCATION", value: location });
  }
  if (ipAddress) {
    rows.push({ label: "IP ADDRESS", value: ipAddress });
  }
  if (time) {
    rows.push({ label: "TIME", value: time });
  }

  if (rows.length === 0) return "";

  const rowsHtml = rows
    .map((row, index) => {
      const isLast = index === rows.length - 1;
      const borderBottom = isLast ? "" : "border-bottom: 1px solid #edf2f7;";
      return `
        <tr class="metadata-row-border" style="${borderBottom}">
          <td class="metadata-cell-label" width="34%" style="width: 34%; padding: 12px 16px; font-family: 'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #0078d4; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; vertical-align: middle;">
            ${escapeHtml(row.label)}
          </td>
          <td class="metadata-cell-value" width="66%" align="right" style="width: 66%; padding: 12px 16px; font-family: 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, Monaco, monospace; font-size: 13px; font-weight: 500; color: #0f172a; text-align: right; vertical-align: middle; word-break: break-word;">
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `.trim();
    })
    .join("");

  return `
    <table role="presentation" class="metadata-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100% !important; min-width: 100%; max-width: 100%; table-layout: fixed; margin: 22px 0; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc; border-collapse: separate; overflow: hidden;">
      ${rowsHtml}
    </table>
  `.trim();
};

export default SecurityMetadataCard;
