/**
 * Safely escapes untrusted text for HTML insertion to prevent HTML injection / XSS.
 *
 * @param {unknown} value - Value to escape
 * @returns {string} - Escaped string
 */
export const escapeHtml = (value) => {
  if (value == null) return "";
  const str = String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export default escapeHtml;
