import { BaseLayout } from "../components/BaseLayout.js";

/**
 * Merges template output into the BaseLayout to produce the final HTML document.
 *
 * @param {object} template - Template definition from templateRegistry
 * @param {object} data - Dynamic data passed for rendering
 * @returns {{ subject: string, html: string }}
 */
export const renderEmail = (template, data = {}, options = {}) => {
  if (!template || typeof template.render !== "function") {
    throw new Error("[EmailRenderer] Invalid template provided to renderer.");
  }

  // Generate subject line
  const subject =
    typeof template.getSubject === "function"
      ? template.getSubject(data)
      : "CampusNode Notification";

  // Generate inner body content
  const content = template.render(data);

  // Wrap inside BaseLayout
  const theme = options.theme || data?._theme || null;
  const html = BaseLayout({
    title: subject,
    headerBadge: template.headerBadge,
    headerSubtitle: template.headerSubtitle,
    footerDisclaimer: template.footerDisclaimer,
    content,
    theme,
  });

  return { subject, html };
};

export default renderEmail;
