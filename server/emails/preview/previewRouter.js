import express from "express";
import { getAllTemplates } from "../templateRegistry.js";
import { renderPreview } from "../emailService.js";
import { samplePreviewData } from "./sampleData.js";

const router = express.Router();

// Development-only guard
router.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).send("Email preview is disabled in production.");
  }
  next();
});

/**
 * GET /api/emails/preview
 * Renders an index catalog of all available email templates.
 */
router.get("/", (req, res) => {
  const templates = getAllTemplates();
  const listItems = templates
    .map((t) => {
      const sample = samplePreviewData[t.id];
      const status = sample ? "🟢 Fixture Ready" : "🟡 No Sample";
      return `
        <li style="margin-bottom: 12px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="font-weight: bold; font-size: 16px; color: #0f172a;">
            <a href="/api/emails/preview/${t.id}" style="color: #ea580c; text-decoration: none;">${t.id}</a>
            <span style="font-size: 12px; margin-left: 8px; color: #64748b;">${status}</span>
          </div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
            Subject: <em>${t.getSubject(sample || {})}</em>
          </div>
        </li>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CampusNode — Email Preview Catalog</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 40px 20px; }
          .container { max-width: 640px; margin: 0 auto; }
          h1 { color: #0f172a; margin-bottom: 8px; }
          p { color: #64748b; margin-top: 0; }
          ul { list-style: none; padding: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>CampusNode Email Preview</h1>
          <p>Development-only visual preview for registered transactional email templates.</p>
          <ul>${listItems}</ul>
        </div>
      </body>
    </html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

/**
 * GET /api/emails/preview/:templateId
 * Renders the chosen template in browser.
 */
router.get("/:templateId", (req, res) => {
  const { templateId } = req.params;
  const sample = samplePreviewData[templateId] || {};

  try {
    const rendered = renderPreview({ template: templateId, data: sample });
    res.setHeader("Content-Type", "text/html");
    res.send(rendered.html);
  } catch (error) {
    res.status(400).send(`
      <div style="font-family: monospace; padding: 20px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
        <h3>Error Rendering Template "${templateId}"</h3>
        <p>${error.message}</p>
      </div>
    `);
  }
});

export const previewRouter = router;
export default previewRouter;
