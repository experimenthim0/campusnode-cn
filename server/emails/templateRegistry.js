import { verifyAccountTemplate } from "./templates/auth/verifyAccount.js";
import { loginOtpTemplate } from "./templates/auth/loginOtp.js";
import { resetPasswordTemplate } from "./templates/auth/resetPassword.js";
import { studentHeadAssignedTemplate } from "./templates/clubs/studentHeadAssigned.js";
import { facultyAssignedTemplate } from "./templates/clubs/facultyAssigned.js";

const registry = new Map([
  ["auth:verify-account", verifyAccountTemplate],
  ["auth:login-otp", loginOtpTemplate],
  ["auth:reset-password", resetPasswordTemplate],
  ["clubs:student-head-assigned", studentHeadAssignedTemplate],
  ["clubs:faculty-assigned", facultyAssignedTemplate],
]);

// Aliases for developer convenience & backwards-compatibility
registry.set("clubs:student-lead-assigned", studentHeadAssignedTemplate);
registry.set("clubs:credentials", studentHeadAssignedTemplate);

/**
 * Retrieve a registered email template by its unique ID.
 *
 * @param {string} id - Unique template ID
 * @returns {object} Template definition
 */
export const getTemplate = (id) => {
  const template = registry.get(id);
  if (!template) {
    const available = Array.from(registry.keys()).join(", ");
    throw new Error(
      `[TemplateRegistry] Unknown email template ID: "${id}". Available templates: ${available}`
    );
  }
  return template;
};

/**
 * List all currently registered templates.
 *
 * @returns {Array<object>}
 */
export const getAllTemplates = () => Array.from(new Set(registry.values()));

export const templateRegistry = {
  get: getTemplate,
  list: getAllTemplates,
};

export default templateRegistry;
