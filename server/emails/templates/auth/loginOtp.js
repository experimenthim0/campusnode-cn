import { OtpBadge } from "../../components/OtpBadge.js";
import { SecurityMetadataCard } from "../../components/SecurityMetadataCard.js";
import { Heading, BodyText, MutedText } from "../../components/Typography.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";
import { formatRequestTime } from "../../utils/requestMetadata.js";

export const loginOtpTemplate = {
  id: "auth:login-otp",
  headerBadge: "Security",

  validate(data) {
    if (!data?.otp) {
      throw new Error('[loginOtpTemplate] Missing required field: "otp"');
    }
    if (!data?.email) {
      throw new Error('[loginOtpTemplate] Missing required field: "email"');
    }
  },

  getSubject(data) {
    if (data?.subject) return data.subject;
    return data?.contextLabel === "Admin"
      ? "Admin Login Verification Code"
      : "CampusNode Login Verification Code";
  },

  getPreheader() {
    return "Use this one-time verification code to sign in to your CampusNode account.";
  },

  render(data) {
    const { otp, email, contextLabel, expiryMinutes = 5, device, location, ipAddress, time } = data;
    const safeEmail = escapeHtml(email);
    const safeContext = contextLabel ? escapeHtml(contextLabel) : "";
    const resolvedTime = time || (device || location || ipAddress ? formatRequestTime(new Date()) : null);

    let recipientPrompt;
    if (contextLabel && contextLabel !== "Student" && contextLabel !== "External") {
      recipientPrompt = `A login was requested for the <strong>${safeContext}</strong> account (<strong>${safeEmail}</strong>).`;
    } else if (contextLabel === "Student") {
      recipientPrompt = `A login was requested for your student account (<strong>${safeEmail}</strong>).`;
    } else {
      recipientPrompt = `A login was requested for your account (<strong>${safeEmail}</strong>).`;
    }

    return `
      ${Heading({ children: "Verify Your Login", level: 2, align: "center", style: "margin: 0 0 12px 0;" })}

      ${OtpBadge({ code: otp })}

      ${BodyText({
        children: recipientPrompt,
        align: "center",
        style: "margin: 0 0 12px 0;",
      })}

      ${MutedText({
        children: `Expires in <strong>${expiryMinutes} minutes</strong>. Do not share this code.`,
        align: "center",
        style: "margin: 0 0 20px 0;",
      })}

      ${SecurityMetadataCard({ device, location, ipAddress, time: resolvedTime })}
    `.trim();
  },
};

export default loginOtpTemplate;
