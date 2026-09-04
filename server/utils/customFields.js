/**
 * Validates submitted form responses against an event's customFields definition.
 * Enforces required fields, checks URL formats for link fields, and ensures option validity.
 *
 * @param {Array|string|null} customFields - The customFields definition on the Event model.
 * @param {Object|string|null} rawFormResponses - The form responses submitted in req.body.
 * @returns {{ valid: boolean, message?: string, sanitizedResponses: Object }}
 */
export function validateCustomFields(customFields, rawFormResponses) {
  let fields = customFields;
  if (typeof fields === "string") {
    try {
      fields = JSON.parse(fields);
    } catch {
      fields = [];
    }
  }

  // If there are no custom fields defined on the event, nothing to validate
  if (!Array.isArray(fields) || fields.length === 0) {
    return { valid: true, sanitizedResponses: {} };
  }

  let responses = rawFormResponses;
  if (typeof responses === "string") {
    try {
      responses = JSON.parse(responses);
    } catch {
      responses = {};
    }
  }

  if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
    responses = {};
  }

  const sanitizedResponses = {};

  for (const field of fields) {
    if (!field || typeof field !== "object") continue;

    const label = (field.label || "").trim();
    if (!label) continue;

    const isRequired = field.required === true || field.required === "true";
    let val = responses[label] ?? responses[field.label];

    if (typeof val === "string") {
      val = val.trim();
    }

    const isEmpty =
      val === undefined ||
      val === null ||
      val === "" ||
      (Array.isArray(val) && val.length === 0);

    if (isRequired && isEmpty) {
      return {
        valid: false,
        message: `"${label}" is required. Please provide a response.`,
        sanitizedResponses: {},
      };
    }

    if (!isEmpty) {
      // Validate link/url field type
      if ((field.type === "url" || field.type === "link") && typeof val === "string") {
        try {
          const urlToTest =
            val.startsWith("http://") || val.startsWith("https://")
              ? val
              : `https://${val}`;
          new URL(urlToTest);
        } catch {
          return {
            valid: false,
            message: `"${label}" must be a valid URL link.`,
            sanitizedResponses: {},
          };
        }
      }

      // Validate select/dropdown field type
      if (
        (field.type === "select" || field.type === "dropdown") &&
        Array.isArray(field.options) &&
        field.options.length > 0
      ) {
        if (!field.options.includes(val)) {
          return {
            valid: false,
            message: `Invalid option selected for "${label}".`,
            sanitizedResponses: {},
          };
        }
      }

      sanitizedResponses[label] = val;
    }
  }

  return { valid: true, sanitizedResponses };
}
