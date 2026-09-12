import { escapeHtml } from "../renderer/escapeHtml.js";

/**
 * High-visibility OTP code badge component.
 * Uses Blue/Teal accents from the CampusNode theme.
 *
 * @param {object} props
 * @param {string} props.code - 6-digit OTP code
 * @returns {string} HTML markup
 */
export const OtpBadge = ({ code }) => {
  const safeCode = escapeHtml(code);

  return `
    <div style="margin: 28px 0; text-align: center;">
      <div class="otp-box-inner" style="display: inline-block; background: #eff8ff; border: 1.5px solid #b8e1ff; padding: 14px 34px; border-radius: 12px; box-shadow: 0 2px 6px rgba(0, 120, 212, 0.08);">
        <span class="otp-code-text" style="font-family: 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, Monaco, monospace; font-size: 32px; letter-spacing: 7px; font-weight: 700; color: #0061ad; margin-right: -7px; display: inline-block;">${safeCode}</span>
      </div>
    </div>
  `.trim();
};

export default OtpBadge;
