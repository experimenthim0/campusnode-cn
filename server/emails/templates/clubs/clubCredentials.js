import { Button } from "../../components/Button.js";
import { escapeHtml } from "../../renderer/escapeHtml.js";

export const clubCredentialsTemplate = {
  id: "clubs:credentials",
  headerBadge: "Club Management",

  validate(data) {
    if (!data?.clubName) throw new Error('[clubCredentialsTemplate] Missing required field: "clubName"');
    if (!data?.clubEmail) throw new Error('[clubCredentialsTemplate] Missing required field: "clubEmail"');
    if (!data?.defaultPassword) throw new Error('[clubCredentialsTemplate] Missing required field: "defaultPassword"');
    if (!data?.loginUrl) throw new Error('[clubCredentialsTemplate] Missing required field: "loginUrl"');
  },

  getSubject(data) {
    return `Welcome to CampusNode - ${data.clubName} Account Credentials`;
  },

  render(data) {
    const { clubName, clubEmail, defaultPassword, loginUrl } = data;
    const safeClubName = escapeHtml(clubName);
    const safeClubEmail = escapeHtml(clubEmail);
    const safePassword = escapeHtml(defaultPassword);

    return `
      <h2 style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ea580c; margin: 0 0 4px 0; font-size: 22px; font-weight: 600;">
        Welcome to CampusNode
      </h2>
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #6b7280; font-size: 14px; font-weight: 400; margin: 0 0 20px 0;">
        Official Club Management Account
      </p>
      
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">
        Hello <strong>${safeClubName} Team</strong>,
      </p>
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #334155; line-height: 1.6;">
        Your official club organizer account for <strong>${safeClubName}</strong> has been created and verified by the administrator.
      </p>
      
      <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb; font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Assigned Role:</strong> Club Head / Organizer</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Login Email:</strong> <span style="color: #ea580c; font-weight: 600;">${safeClubEmail}</span></p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Default Password:</strong> <code style="background: #e5e7eb; padding: 3px 8px; border-radius: 6px; font-family: 'SFMono-Regular', 'Roboto Mono', Menlo, Consolas, monospace; font-weight: 600; font-size: 13px;">${safePassword}</code></p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong style="font-weight: 600; color: #0f172a;">Account Status:</strong> <span style="color: #16a34a; font-weight: 600;">Verified & Active</span></p>
      </div>

      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 400; color: #334155; line-height: 1.6;">
        With this account you can create and manage events, oversee registrations, scan attendee QR passes, and manage club members.
      </p>
      
      ${Button({ label: "Log In to Club Account", url: loginUrl, variant: "primary" })}
      
      <p style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 400; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; margin-top: 25px;">
        For security, please change your default password after logging in from your Profile settings.
      </p>
    `.trim();
  },
};

export default clubCredentialsTemplate;
