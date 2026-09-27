import { escapeHtml } from "../renderer/escapeHtml.js";
import { colors, typography, spacing, radii } from "../config/designTokens.js";

/**
 * SecurityMetadataCard component for Login OTP & Password Reset emails.
 * Renders a clean, high-legibility 2-column card with CampusNode Blue accents.
 * Returns empty string if no metadata fields are provided.
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
      const borderBottom = isLast ? "" : `border-bottom: 1px solid ${colors.borderLight};`;
      return `
        <tr class="metadata-row-border" style="${borderBottom}">
          <td class="metadata-cell-label" width="34%" style="width: 34%; padding: ${spacing.md} ${spacing.base}; font-family: ${typography.fontFamily}; font-size: 11px; font-weight: ${typography.weights.bold}; color: ${colors.primary}; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; vertical-align: middle;">
            ${escapeHtml(row.label)}
          </td>
          <td class="metadata-cell-value" width="66%" align="right" style="width: 66%; padding: ${spacing.md} ${spacing.base}; font-family: ${typography.fontMono}; font-size: ${typography.sizes.sm}; font-weight: ${typography.weights.medium}; color: ${colors.heading}; text-align: right; vertical-align: middle; word-break: break-word;">
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `.trim();
    })
    .join("");

  return `
    <table role="presentation" class="metadata-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100% !important; min-width: 100%; max-width: 100%; table-layout: fixed; margin: 22px 0; border: 1px solid ${colors.border}; border-radius: ${radii.xl}; background-color: ${colors.bgApp}; border-collapse: separate; overflow: hidden;">
      ${rowsHtml}
    </table>
  `.trim();
};

export default SecurityMetadataCard;