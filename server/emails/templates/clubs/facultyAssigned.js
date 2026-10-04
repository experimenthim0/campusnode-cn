import { Button } from "../../components/Button.js";
import { Heading, BodyText, MutedText } from "../../components/Typography.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";
import { colors, typography, radii } from "../../config/designTokens.js";

export const facultyAssignedTemplate = {
  id: "clubs:faculty-assigned",
  headerBadge: "Club Governance",

  validate(data) {
    if (!data?.facultyEmail) {
      throw new Error('[facultyAssignedTemplate] Missing required field: "facultyEmail"');
    }
    if (!data?.clubName) {
      throw new Error('[facultyAssignedTemplate] Missing required field: "clubName"');
    }
  },

  getSubject(data) {
    if (data?.subject) return data.subject;
    return `CampusNode - Assigned as Faculty Coordinator for ${data?.clubName || "Club"}`;
  },

  getPreheader(data) {
    return `You have been officially appointed as Faculty Coordinator for ${data?.clubName || "your club"}.`;
  },

  render(data) {
    const {
      facultyName,
      clubName,
      facultyEmail,
      department,
      designation,
      loginUrl,
      dashboardUrl,
    } = data;

    const safeName = escapeHtml(facultyName || "Faculty Coordinator");
    const safeClub = escapeHtml(clubName);
    const safeEmail = escapeHtml(facultyEmail);
    const safeDept = department ? escapeHtml(department) : null;
    const safeDesignation = designation ? escapeHtml(designation) : null;
    const targetUrl = dashboardUrl || loginUrl || (process.env.CLIENT_URL || "https://campusnode.vercel.app") + "/login";

    return `
      ${Heading({
        children: "Faculty Coordinator Appointment",
        level: 2,
        align: "left",
        color: colors.primary,
        style: "margin: 0 0 4px 0; font-size: 22px;",
      })}
      ${MutedText({
        children: "Official Club Oversight & Governance",
        align: "left",
        style: "margin: 0 0 20px 0; font-size: 14px;",
      })}

      ${BodyText({
        children: `Dear <strong>${safeName}</strong>,`,
        align: "left",
        style: "margin-bottom: 8px;",
      })}
      ${BodyText({
        children: `You have been officially appointed as the <strong>Faculty Coordinator</strong> for <strong>${safeClub}</strong> on CampusNode.`,
        align: "left",
      })}

      <table role="presentation" class="info-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; table-layout: fixed; margin: 20px 0; border: 1px solid ${colors.infoBorder}; border-radius: ${radii.lg}; background-color: ${colors.infoBg}; border-collapse: separate; overflow: hidden; font-family: ${typography.fontFamily};">
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; vertical-align: middle;">Assigned Role</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.primary}; text-align: right; vertical-align: middle;">Faculty Coordinator</td>
        </tr>
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; vertical-align: middle;">Appointed Club</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; text-align: right; vertical-align: middle;">${safeClub}</td>
        </tr>
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; vertical-align: middle;">Faculty Account</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.primary}; text-align: right; vertical-align: middle; word-break: break-all;">
            <span class="info-highlight" style="color: ${colors.primary}; font-weight: 600;">${safeEmail}</span>
          </td>
        </tr>
        ${
          safeDesignation || safeDept
            ? `
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; vertical-align: middle;">Designation / Dept</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; text-align: right; vertical-align: middle;">
            ${[safeDesignation, safeDept].filter(Boolean).join(" &bull; ")}
          </td>
        </tr>`
            : ""
        }
       
      </table>

      <p class="email-body-text" style="font-family: ${typography.fontFamily}; font-size: 14px; font-weight: 600; color: ${colors.heading}; margin: 24px 0 8px 0;">
        Your Faculty Coordinator Capabilities:
      </p>
      <ul style="margin: 0 0 20px 0; padding-left: 20px; font-family: ${typography.fontFamily}; font-size: 14px; line-height: 1.6; color: ${colors.body};">
        <li style="margin-bottom: 6px;"><strong>Event Review & Approval:</strong> Review and officially approve club event proposals, venue scheduling, and budget requests.</li>
        <li style="margin-bottom: 6px;"><strong>Club Oversight & Compliance:</strong> Guide student heads and coordinators to ensure university policy alignment and safety standards.</li>
        <li style="margin-bottom: 6px;"><strong>Leadership Supervision:</strong> Oversee club membership rosters, check-in attendance, and student participation.</li>
      </ul>

      <p class="email-body-text" style="font-family: ${typography.fontFamily}; font-size: 14px; font-weight: 400; color: #475569; line-height: 1.6; background: ${colors.bgApp}; border-left: 3px solid ${colors.primary}; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        💡 <strong>No Separate Password Needed:</strong> Your coordinator governance privileges are linked directly to your existing faculty account. Simply log in with your college credentials to access your club dashboard.
      </p>

      ${Button({ label: "Access Faculty Portal", url: targetUrl, variant: "primary" })}

      ${MutedText({
        children: "If you have questions about your coordinator appointment, reach out to the Campus Administrator.",
        align: "center",
        style: "border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; font-size: 12px;",
      })}
    `.trim();
  },
};

export default facultyAssignedTemplate;
