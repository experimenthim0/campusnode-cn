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
    return `Campusnode - Assigned as Faculty Coordinator for ${data?.clubName || "Club"}`;
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
        style: "margin: 0 0 16px 0; font-size: 20px;",
      })}

      ${BodyText({
        children: `Dear <strong>${safeName}</strong>,`,
        align: "left",
        style: "margin-bottom: 8px;",
      })}
      ${BodyText({
        children: `You have been appointed as the Faculty Coordinator for <strong>${safeClub}</strong> on Campusnode.`,
        align: "left",
      })}

      <table role="presentation" class="info-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; table-layout: fixed; margin: 18px 0; border: 1px solid ${colors.infoBorder}; border-radius: ${radii.lg}; background-color: ${colors.infoBg}; border-collapse: separate; overflow: hidden; font-family: ${typography.fontFamily};">
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; vertical-align: middle;">Assigned Club</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.primary}; text-align: right; vertical-align: middle;">${safeClub}</td>
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
        <tr class="info-row">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; vertical-align: middle;">Designation / Dept</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: ${colors.heading}; text-align: right; vertical-align: middle;">
            ${[safeDesignation, safeDept].filter(Boolean).join(" &bull; ")}
          </td>
        </tr>`
            : ""
        }
      </table>

      ${BodyText({
        children: "<strong>No Separate Password Needed:</strong> Log in with your college credentials to access your club dashboard.",
        align: "left",
        style: "margin: 0 0 20px 0; font-size: 13px;",
      })}

      ${Button({ label: "Access Faculty Portal", url: targetUrl, variant: "primary" })}

      ${MutedText({
        children: "For assistance, please contact the Campus Administrator.",
        align: "center",
        style: "border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; font-size: 12px;",
      })}
    `.trim();
  },
};

export default facultyAssignedTemplate;
