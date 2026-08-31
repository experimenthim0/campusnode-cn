
/**
 * Strip HTML tags from a string and trim whitespace.
 * @param {string} input - Raw user input
 * @returns {string} Sanitized plain-text string
 */
export function stripHtml(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(/<[^>]*>/g, "")   // remove all HTML tags
    .replace(/&lt;/gi, "<")     // decode common HTML entities that could hide tags
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]*>/g, "")   // second pass after entity decode
    .trim();
}

/**
 * Sanitize an object's string fields in-place.
 * Only processes keys listed in `fields`; skips non-string values.
 *
 * @param {object} obj   - The object to sanitize (e.g. req.body)
 * @param {string[]} fields - Keys to sanitize
 * @returns {object} The same object, mutated
 */
export function sanitizeFields(obj, fields) {
  for (const key of fields) {
    if (typeof obj[key] === "string") {
      obj[key] = stripHtml(obj[key]);
    }
  }
  return obj;
}
