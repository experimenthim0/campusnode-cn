import { verifyAccountTemplate } from "./templates/auth/verifyAccount.js";
import { loginOtpTemplate } from "./templates/auth/loginOtp.js";
import { resetPasswordTemplate } from "./templates/auth/resetPassword.js";
import { passwordChangedTemplate } from "./templates/auth/passwordChanged.js";
import { studentHeadAssignedTemplate } from "./templates/clubs/studentHeadAssigned.js";
import { facultyAssignedTemplate } from "./templates/clubs/facultyAssigned.js";

const registry = new Map([
  ["auth:verify-account", verifyAccountTemplate],
  ["auth:login-otp", loginOtpTemplate],
  ["auth:reset-password", resetPasswordTemplate],
  ["auth:password-changed", passwordChangedTemplate],
  ["clubs:student-head-assigned", studentHeadAssignedTemplate],
  ["clubs:faculty-assigned", facultyAssignedTemplate],
]);

// Aliases for developer convenience & backwards-compatibility
registry.set("auth:change-password", passwordChangedTemplate);
registry.set("auth:password-reset-success", passwordChangedTemplate);
registry.set("verify-email", verifyAccountTemplate);
registry.set("login-otp", loginOtpTemplate);
registry.set("reset-password", resetPasswordTemplate);
registry.set("password-changed", passwordChangedTemplate);
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
    const available = Array.from(new Set(registry.keys())).join(", ");
    throw new Error(
      `[TemplateRegistry] Unknown email template ID: "${id}". Available templates: ${available}`
    );
  }
  return template;
};

/**
 * List all unique currently registered templates.
 *
 * @returns {Array<object>}
 */
export const getAllTemplates = () => Array.from(new Set(registry.values()));

export const templateRegistry = {
  get: getTemplate,
  list: getAllTemplates,
};

export default templateRegistry;
