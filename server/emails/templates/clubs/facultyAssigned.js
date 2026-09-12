import { Button } from "../../components/Button.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";

export const facultyAssignedTemplate = {
  id: "clubs:faculty-assigned",
  headerBadge: "Governance",

  validate(data) {
    if (!data?.facultyEmail) throw new Error('[facultyAssignedTemplate] Missing required field: "facultyEmail"');
    if (!data?.loginUrl) throw new Error('[facultyAssignedTemplate] Missing required field: "loginUrl"');
  },

  getSubject(data) {
    if (data?.subject) return data.subject;
    return data?.clubName
      ? `CampusNode - Assigned as Faculty Coordinator for ${data.clubName}`
      : "Welcome to CampusNode - Faculty Coordinator Account Created";
  },

  render(data) {
    const { facultyName, clubName, facultyEmail, defaultPassword, loginUrl } = data;
    const safeName = escapeHtml(facultyName || "Faculty Coordinator");
    const safeEmail = escapeHtml(facultyEmail);
    const safeClub = clubName ? escapeHtml(clubName) : null;
    const safePassword = defaultPassword ? escapeHtml(defaultPassword) : null;

    return `
      <h2 class="email-brand-heading" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0078d4; margin: 0 0 4px 0; font-size: 22px; font-weight: 600;">Faculty Coordinator Portal</h2>
      <p class="email-muted-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #64748b; font-size: 14px; font-weight: 400; margin: 0 0 20px 0;">Club Oversight & Governance</p>
      
      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">Dear <strong>${safeName}</strong>,</p>
      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">${
        safeClub
          ? `You have been assigned as the <strong>Faculty Coordinator</strong> for <strong>${safeClub}</strong> on CampusNode.`
          : "Your <strong>Faculty Coordinator</strong> account has been created on CampusNode."
      }</p>
      
      <table role="presentation" class="info-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; table-layout: fixed; margin: 20px 0; border: 1px solid #b8e1ff; border-radius: 10px; background-color: #eff8ff; border-collapse: separate; overflow: hidden; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Assigned Role</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 500; color: #334155; text-align: right; vertical-align: middle;">Faculty Coordinator</td>
        </tr>
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Coordinator Email</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0078d4; text-align: right; vertical-align: middle; word-break: break-all;">
            <span class="info-highlight" style="color: #0078d4; font-weight: 600;">${safeEmail}</span>
          </td>
        </tr>
        ${
          safePassword
            ? `
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Default Password</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; text-align: right; vertical-align: middle;">
            <code class="info-code" style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: 13px;">${safePassword}</code>
          </td>
        </tr>`
            : `
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Password</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; color: #64748b; text-align: right; vertical-align: middle;">Use existing password</td>
        </tr>`
        }
        ${
          safeClub
            ? `
        <tr class="info-row">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Assigned Club</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; vertical-align: middle;">${safeClub}</td>
        </tr>`
            : ""
        }
      </table>

      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 400; color: #334155; line-height: 1.6;">As Faculty Coordinator, you can review and approve club events, verify receipts, supervise team members, and oversee compliance.</p>
      
      ${Button({ label: "Access Faculty Portal", url: loginUrl, variant: "primary" })}
      
      <p class="email-muted-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 400; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px;">
        You can access your coordinator portal anytime via the secure faculty login link above.
      </p>
    `.trim();
  },
};

export default facultyAssignedTemplate;
