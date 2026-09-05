import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * SecurityMetadataCard component for Login OTP & Password Reset emails.
 * Renders a clean, high-legibility 2-column card showing:
 * - DEVICE (e.g. Chrome macOS)
 * - LOCATION (e.g. San Francisco, US)
 * - IP ADDRESS (e.g. 192.168.1.42)
 * - TIME (e.g. Feb 9, 10:34 AM)
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
      const borderBottom = isLast ? "" : "border-bottom: 1px solid #f1f5f9;";
      return `
        <tr>
          <td style="padding: 12px 18px; ${borderBottom} font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; vertical-align: middle;">
            ${escapeHtml(row.label)}
          </td>
          <td align="right" style="padding: 12px 18px; ${borderBottom} font-family: 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, Monaco, monospace; font-size: 13px; font-weight: 500; color: #0f172a; text-align: right; vertical-align: middle;">
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `.trim();
    })
    .join("");

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff; border-collapse: separate; overflow: hidden;">
      ${rowsHtml}
    </table>
  `.trim();
};

export default SecurityMetadataCard;
