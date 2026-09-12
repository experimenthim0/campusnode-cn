import { Button } from "../../components/Button.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";

export const studentHeadAssignedTemplate = {
  id: "clubs:student-head-assigned",
  headerBadge: "Club Leadership",

  validate(data) {
    if (!data?.studentName) {
      throw new Error('[studentHeadAssignedTemplate] Missing required field: "studentName"');
    }
    if (!data?.clubName) {
      throw new Error('[studentHeadAssignedTemplate] Missing required field: "clubName"');
    }
  },

  getSubject(data) {
    if (data?.subject) return data.subject;
    return `🎉 Congratulations ${data.studentName}! You've been appointed as Club Head of ${data.clubName}`;
  },

  render(data) {
    const { studentName, clubName, studentEmail, rollNo, dashboardUrl } = data;
    const safeName = escapeHtml(studentName || "Student");
    const safeClub = escapeHtml(clubName);
    const safeEmail = studentEmail ? escapeHtml(studentEmail) : null;
    const safeRollNo = rollNo ? escapeHtml(rollNo) : null;
    const targetUrl = dashboardUrl || (process.env.CLIENT_URL || "https://campusnode.vercel.app") + "/profile";

    return `
      <h2 class="email-brand-heading" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0078d4; margin: 0 0 4px 0; font-size: 22px; font-weight: 600;">
        Club Leadership Appointment
      </h2>
    
      
      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">
        Dear <strong>${safeName}</strong>,
      </p>
      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">
        Congratulations! You have been officially appointed as the <strong>Club Head (Student Lead)</strong> for <strong>${safeClub}</strong> on CampusNode.
      </p>
      
      <table role="presentation" class="info-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; table-layout: fixed; margin: 20px 0; border: 1px solid #b8e1ff; border-radius: 10px; background-color: #eff8ff; border-collapse: separate; overflow: hidden; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Assigned Role</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0078d4; text-align: right; vertical-align: middle;">Club Head (Student Lead)</td>
        </tr>
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Appointed Club</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; vertical-align: middle;">${safeClub}</td>
        </tr>
        ${
          safeEmail
            ? `
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Student Account</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0078d4; text-align: right; vertical-align: middle; word-break: break-all;">
            <span class="info-highlight" style="color: #0078d4; font-weight: 600;">${safeEmail}</span>
          </td>
        </tr>`
            : ""
        }
        ${
          safeRollNo
            ? `
        <tr class="info-row" style="border-bottom: 1px solid #dbeafe;">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Roll Number</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; text-align: right; vertical-align: middle;">
            <code class="info-code" style="background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px; font-family: 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: 13px;">${safeRollNo}</code>
          </td>
        </tr>`
            : ""
        }
        <tr class="info-row">
          <td class="info-cell-label" width="38%" style="width: 38%; padding: 11px 14px; font-size: 13px; font-weight: 600; color: #0f172a; vertical-align: middle;">Status</td>
          <td class="info-cell-value" width="62%" align="right" style="width: 62%; padding: 11px 14px; font-size: 13px; text-align: right; vertical-align: middle;">
            <span class="status-badge-active" style="display: inline-block; background: #ecfff8; color: #009f61; border: 1px solid #a4ffe0; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">Active Leadership</span>
          </td>
        </tr>
      </table>

      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #0f172a; margin: 24px 0 8px 0;">
        Your Leadership Capabilities:
      </p>
      <ul style="margin: 0 0 20px 0; padding-left: 20px; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #334155;">
        <li style="margin-bottom: 6px;"><strong>Event Management:</strong> Create, edit, and publish official club events and configure registration details.</li>
        <li style="margin-bottom: 6px;"><strong>Pass & Attendance:</strong> Scan attendee QR passes at events and verify check-ins in real-time.</li>
        <li style="margin-bottom: 6px;"><strong>Team Coordination:</strong> Appoint coordinators and organize your club membership roster.</li>
        <li style="margin-bottom: 6px;"><strong>Feedback & Analytics:</strong> Review event turnout statistics and student feedback reports.</li>
      </ul>

      <p class="email-body-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 400; color: #475569; line-height: 1.6; background: #f8fafc; border-left: 3px solid #0078d4; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        💡 <strong>No Separate Password Needed:</strong> Your leadership privileges are linked directly to your existing student account. Simply log in with your college email to access your club tools.
      </p>
      
      ${Button({ label: "Go to Club Dashboard", url: targetUrl, variant: "primary" })}
      
      <p class="email-muted-text" style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 400; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px;">
        If you have questions about your club head appointment, reach out to your Faculty Coordinator or Campus Administrator.
      </p>
    `.trim();
  },
};

export default studentHeadAssignedTemplate;
