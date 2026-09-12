import express from "express";
import { getAllTemplates, getTemplate } from "../templateRegistry.js";
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
 * Renders an index catalog of all available email templates with quick mode actions.
 */
router.get("/", (req, res) => {
  const templates = getAllTemplates();
  const listItems = templates
    .map((t) => {
      const sample = samplePreviewData[t.id];
      const status = sample ? "🟢 Fixture Ready" : "🟡 No Sample";
      const subject = t.getSubject ? t.getSubject(sample || {}) : "CampusNode Notification";

      return `
        <li style="margin-bottom: 16px; padding: 18px 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <a href="/api/emails/preview/${t.id}" style="font-weight: 700; font-size: 17px; color: #0078d4; text-decoration: none; font-family: monospace;">${t.id}</a>
              <span style="font-size: 12px; margin-left: 8px; color: #64748b;">${status}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <a href="/api/emails/preview/${t.id}?mode=light" style="padding: 5px 12px; font-size: 12px; font-weight: 600; color: #0f172a; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; text-decoration: none;">☀️ Light</a>
              <a href="/api/emails/preview/${t.id}?mode=dark" style="padding: 5px 12px; font-size: 12px; font-weight: 600; color: #f8fafc; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; text-decoration: none;">🌙 Dark</a>
              <a href="/api/emails/preview/${t.id}" style="padding: 5px 14px; font-size: 12px; font-weight: 600; color: #ffffff; background: #0078d4; border-radius: 6px; text-decoration: none;">Preview Studio →</a>
            </div>
          </div>
          <div style="font-size: 13px; color: #64748b; margin-top: 8px;">
            Subject: <strong style="color: #334155;">${subject}</strong>
          </div>
        </li>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CampusNode — Email Preview Studio</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; padding: 40px 20px; color: #0f172a; margin: 0; }
          .container { max-width: 780px; margin: 0 auto; }
          h1 { color: #0f172a; margin-bottom: 6px; font-size: 26px; }
          p { color: #64748b; margin-top: 0; font-size: 14px; }
          ul { list-style: none; padding: 0; margin: 24px 0 0 0; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #eff8ff; color: #0078d4; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
            <div>
              <span class="badge">Development Studio</span>
              <h1 style="margin: 6px 0 2px 0;">CampusNode Email Preview</h1>
              <p>Visual testing and dark/light mode switcher for registered transactional emails.</p>
            </div>
          </div>
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
 * If ?raw=true: Returns raw email HTML for rendering inside an iframe.
 * Otherwise: Returns an interactive Email Preview Studio with Light/Dark and Viewport toggles.
 */
router.get("/:templateId", (req, res) => {
  const { templateId } = req.params;
  const { raw, mode } = req.query; // mode can be "light", "dark", or undefined
  const sample = samplePreviewData[templateId] || {};

  try {
    const rendered = renderPreview({
      template: templateId,
      data: sample,
      theme: mode === "light" || mode === "dark" ? mode : null,
    });

    // If raw parameter requested, send the pure rendered HTML
    if (raw === "true") {
      res.setHeader("Content-Type", "text/html");
      return res.send(rendered.html);
    }

    // Otherwise render the full Interactive Preview Studio
    const templates = getAllTemplates();
    const templateOptions = templates
      .map(
        (t) =>
          `<option value="${t.id}" ${t.id === templateId ? "selected" : ""}>${t.id}</option>`
      )
      .join("");

    const initialMode = mode === "light" || mode === "dark" ? mode : "system";

    const studioHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${templateId} — CampusNode Email Preview Studio</title>
          <style>
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0f172a;
              color: #f8fafc;
              overflow: hidden;
            }
            .studio-header {
              height: 56px;
              background: #1e293b;
              border-bottom: 1px solid #334155;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 16px;
              z-index: 10;
              position: relative;
            }
            .studio-brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .studio-brand a {
              color: #94a3b8;
              text-decoration: none;
              font-size: 13px;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .studio-brand a:hover { color: #f8fafc; }
            .studio-title {
              font-weight: 700;
              font-size: 14px;
              color: #38bdf8;
              letter-spacing: 0.5px;
            }
            .studio-controls {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .segmented-control {
              display: flex;
              background: #0f172a;
              border: 1px solid #334155;
              border-radius: 8px;
              padding: 2px;
            }
            .control-btn {
              padding: 6px 12px;
              font-size: 12px;
              font-weight: 600;
              color: #94a3b8;
              background: transparent;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.15s ease;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .control-btn:hover {
              color: #f8fafc;
            }
            .control-btn.active {
              background: #0078d4;
              color: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            select.template-select {
              background: #0f172a;
              color: #f8fafc;
              border: 1px solid #334155;
              border-radius: 8px;
              padding: 6px 12px;
              font-size: 13px;
              font-family: monospace;
              outline: none;
              cursor: pointer;
            }
            select.template-select:focus {
              border-color: #0078d4;
            }
            .studio-subbar {
              height: 38px;
              background: #0f172a;
              border-bottom: 1px solid #1e293b;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 16px;
              font-size: 12px;
              color: #94a3b8;
            }
            .studio-viewport-area {
              height: calc(100% - 94px);
              width: 100%;
              background-color: #e2e8f0;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              overflow-y: auto;
              padding: 20px 10px;
              transition: background-color 0.2s ease;
            }
            .studio-viewport-area.dark-canvas {
              background-color: #030712;
            }
            .iframe-wrapper {
              width: 100%;
              max-width: 640px;
              height: 100%;
              min-height: 600px;
              transition: max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
              border-radius: 12px;
              overflow: hidden;
              background: transparent;
            }
            iframe#emailFrame {
              width: 100%;
              height: 100%;
              border: none;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="studio-header">
            <div class="studio-brand">
              <a href="/api/emails/preview">← Catalog</a>
              <span style="color: #475569;">|</span>
              <span class="studio-title">CAMPUSNODE EMAIL STUDIO</span>
              <select class="template-select" id="templateSelect" onchange="switchTemplate(this.value)">
                ${templateOptions}
              </select>
            </div>

            <div class="studio-controls">
              <!-- Color Mode Segmented Control -->
              <div class="segmented-control" id="modeControl">
                <button type="button" class="control-btn ${initialMode === "light" ? "active" : ""}" id="btnModeLight" onclick="setThemeMode('light')">
                  ☀️ Light
                </button>
                <button type="button" class="control-btn ${initialMode === "dark" ? "active" : ""}" id="btnModeDark" onclick="setThemeMode('dark')">
                  🌙 Dark
                </button>
                <button type="button" class="control-btn ${initialMode === "system" ? "active" : ""}" id="btnModeSystem" onclick="setThemeMode('system')">
                  💻 System
                </button>
              </div>

              <!-- Viewport Width Segmented Control -->
              <div class="segmented-control" id="viewportControl">
                <button type="button" class="control-btn active" id="btnViewDesktop" onclick="setViewport('640px', 'btnViewDesktop')">
                  💻 Desktop (640px)
                </button>
                <button type="button" class="control-btn" id="btnViewMobile" onclick="setViewport('380px', 'btnViewMobile')">
                  📱 Mobile (380px)
                </button>
                <button type="button" class="control-btn" id="btnViewFull" onclick="setViewport('100%', 'btnViewFull')">
                  ↔️ Full
                </button>
              </div>

              <!-- Raw HTML Link -->
              <a id="rawLink" href="/api/emails/preview/${templateId}?raw=true" target="_blank" style="color: #38bdf8; font-size: 12px; font-weight: 600; text-decoration: none; padding: 6px 10px; border: 1px solid #334155; border-radius: 6px;">
                ↗ Raw HTML
              </a>
            </div>
          </div>

          <div class="studio-subbar">
            <div>
              Subject: <strong style="color: #f1f5f9;">${rendered.subject}</strong>
            </div>
            <div>
              Template ID: <span style="font-family: monospace; color: #38bdf8;">${templateId}</span>
            </div>
          </div>

          <div class="studio-viewport-area ${initialMode === "dark" ? "dark-canvas" : ""}" id="canvasArea">
            <div class="iframe-wrapper" id="frameWrapper">
              <iframe
                id="emailFrame"
                src="/api/emails/preview/${templateId}?raw=true${initialMode !== "system" ? "&mode=" + initialMode : ""}"
                title="Email Preview"
              ></iframe>
            </div>
          </div>

          <script>
            let currentTemplate = "${templateId}";
            let currentMode = "${initialMode}";

            function setThemeMode(mode) {
              currentMode = mode;
              
              // Update button states
              document.getElementById("btnModeLight").classList.toggle("active", mode === "light");
              document.getElementById("btnModeDark").classList.toggle("active", mode === "dark");
              document.getElementById("btnModeSystem").classList.toggle("active", mode === "system");

              // Update canvas background
              const canvas = document.getElementById("canvasArea");
              if (mode === "dark") {
                canvas.classList.add("dark-canvas");
              } else {
                canvas.classList.remove("dark-canvas");
              }

              // Update iframe source or live inject theme attribute
              const frame = document.getElementById("emailFrame");
              const targetSrc = "/api/emails/preview/" + currentTemplate + "?raw=true" + (mode !== "system" ? "&mode=" + mode : "");
              frame.src = targetSrc;

              // Update raw link
              document.getElementById("rawLink").href = targetSrc;

              // Update browser URL without reloading
              const newUrl = "/api/emails/preview/" + currentTemplate + (mode !== "system" ? "?mode=" + mode : "");
              window.history.replaceState({}, "", newUrl);
            }

            function setViewport(width, activeBtnId) {
              const wrapper = document.getElementById("frameWrapper");
              wrapper.style.maxWidth = width;

              document.getElementById("btnViewDesktop").classList.toggle("active", activeBtnId === "btnViewDesktop");
              document.getElementById("btnViewMobile").classList.toggle("active", activeBtnId === "btnViewMobile");
              document.getElementById("btnViewFull").classList.toggle("active", activeBtnId === "btnViewFull");
            }

            function switchTemplate(tplId) {
              const url = "/api/emails/preview/" + tplId + (currentMode !== "system" ? "?mode=" + currentMode : "");
              window.location.href = url;
            }
          </script>
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(studioHtml);
  } catch (error) {
    res.status(400).send(`
      <div style="font-family: monospace; padding: 24px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 40px auto; max-width: 600px;">
        <h3 style="margin-top: 0;">Error Rendering Template "${templateId}"</h3>
        <p>${error.message}</p>
        <a href="/api/emails/preview" style="color: #0078d4; text-decoration: underline;">← Back to Catalog</a>
      </div>
    `);
  }
});

export const previewRouter = router;
export default previewRouter;
