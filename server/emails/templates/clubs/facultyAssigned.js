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
      <h2 style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ea580c; margin: 0 0 4px 0; font-size: 22px; font-weight: 600;">Faculty Coordinator Portal</h2>
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #6b7280; font-size: 14px; font-weight: 400; margin: 0 0 20px 0;">Club Oversight & Governance</p>
      
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">Dear <strong>${safeName}</strong>,</p>
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">${
        safeClub
          ? `You have been assigned as the <strong>Faculty Coordinator</strong> for <strong>${safeClub}</strong> on CampusNode.`
          : "Your <strong>Faculty Coordinator</strong> account has been created on CampusNode."
      }</p>
      
      <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Assigned Role:</strong> Faculty Coordinator</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Coordinator Email:</strong> <span style="color: #ea580c; font-weight: 600;">${safeEmail}</span></p>
        ${
          safePassword
            ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Default Password:</strong> <code style="background: #e5e7eb; padding: 3px 8px; border-radius: 6px; font-family: 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: 13px;">${safePassword}</code></p>`
            : `<p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Password:</strong> Use your existing Faculty Coordinator password.</p>`
        }
        ${
          safeClub
            ? `<p style="margin: 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Assigned Club:</strong> ${safeClub}</p>`
            : ""
        }
      </div>

      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 400; color: #334155; line-height: 1.6;">As Faculty Coordinator, you can review and approve club events, verify receipts, supervise team members, and oversee compliance.</p>
      
      ${Button({ label: "Access Faculty Portal", url: loginUrl, variant: "dark" })}
      
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 400; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; margin-top: 25px;">
        You can access your coordinator portal anytime via the secure faculty login link above.
      </p>
    `.trim();
  },
};

export default facultyAssignedTemplate;
