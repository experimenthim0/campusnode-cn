import { escapeHtml } from "../renderer/escapeHtml.js";
import { colors, typography, spacing, radii, shadows } from "../config/designTokens.js";

/**
 * High-visibility OTP code badge component.
 * Uses Blue accents from the CampusNode theme with monospace typography and accessible contrast.
 *
 * @param {object} props
 * @param {string} props.code - OTP code string
 * @returns {string} HTML markup
 */
export const OtpBadge = ({ code }) => {
  const safeCode = escapeHtml(code);

  return `
    <div style="margin: ${spacing.xxl} 0; text-align: center;">
      <div class="otp-box-inner" style="display: inline-block; background: ${colors.infoBg}; border: 1.5px solid ${colors.infoBorder}; padding: 14px 34px; border-radius: ${radii.xl}; box-shadow: ${shadows.otp};">
        <span class="otp-code-text" style="font-family: ${typography.fontMono}; font-size: ${typography.sizes.otp}; letter-spacing: 7px; font-weight: ${typography.weights.bold}; color: ${colors.infoText}; margin-right: -7px; display: inline-block;">${safeCode}</span>
      </div>
    </div>
  `.trim();
};

export default OtpBadge;
