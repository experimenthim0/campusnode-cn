import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * High-visibility OTP code badge component.
 *
 * @param {object} props
 * @param {string} props.code - 6-digit OTP code
 * @returns {string} HTML markup
 */
export const OtpBadge = ({ code }) => {
  const safeCode = escapeHtml(code);

  return `
    <div style="margin: 28px 0; text-align: center;">
      <div style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px 32px; border-radius: 10px;">
        <span style="font-family: 'Google Sans', 'Roboto Mono', Menlo, Consolas, Monaco, monospace; font-size: 30px; letter-spacing: 6px; font-weight: 600; color: #0f172a; margin-right: -6px;">${safeCode}</span>
      </div>
    </div>
  `.trim();
};

export default OtpBadge;
