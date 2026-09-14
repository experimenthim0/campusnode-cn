import { getClientUrl } from "../utils/corsConfig.js";

/**
 * browserAccessGuard
 *
 * Protects backend endpoints against direct browser navigation (opening API links in a new tab,
 * pasting backend endpoints into browser address bar, casual browser snooping).
 *
 * FULL COMPATIBILITY GUARANTEES:
 * 1. Flutter Mobile App: Flutter's HTTP engine (Dart/Dio) NEVER sends `Sec-Fetch-Dest: document`
 *    or requests `text/html`. It is allowed through with zero disruption.
 * 2. React Web App (Axios): Frontend AJAX/fetch requests send `Sec-Fetch-Dest: empty` and
 *    `Accept: application/json`, allowing full normal operation.
 * 3. Testing & Development: Bypassed when `NODE_ENV === "test"`, or when running locally on localhost/127.0.0.1,
 *    or when `?raw=true` query flag is provided.
 * 4. Postman / cURL: API testing tools do not perform browser document navigation.
 * 5. Health checks & Preview: `/health` and `/api/emails/preview` are always accessible.
 */
export const browserAccessGuard = (req, res, next) => {
  // 1. Bypass immediately for automated testing environment
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  // 2. Always allow health checks and email preview in dev
  if (req.path === "/health" || req.path.startsWith("/api/emails/preview")) {
    return next();
  }

  // 3. Developer escape hatch (e.g. ?raw=true or ?bypass=true)
  if (req.query.raw === "true" || req.query.bypass === "true" || req.headers["x-bypass-guard"] === "true") {
    return next();
  }

  // 4. In local development on localhost / loopback, allow direct browser inspection for developers
  const isLocalhost =
    req.hostname === "localhost" ||
    req.hostname === "127.0.0.1" ||
    req.ip === "127.0.0.1" ||
    req.ip === "::1";

  if (process.env.NODE_ENV !== "production" && isLocalhost) {
    return next();
  }

  const acceptHeader = (req.headers.accept || "").toLowerCase();
  const secFetchDest = (req.headers["sec-fetch-dest"] || "").toLowerCase();

  // 5. Detect top-level browser document navigation (address bar, new tab, direct anchor link)
  // W3C Fetch Metadata specification: browsers strictly set `sec-fetch-dest: document` on top-level navigations.
  // Flutter, Axios, cURL, and Postman NEVER send `sec-fetch-dest: document`.
  const isDirectBrowserNavigation =
    secFetchDest === "document" ||
    (acceptHeader.includes("text/html") && !acceptHeader.includes("application/json"));

  if (isDirectBrowserNavigation) {
    const clientUrl = getClientUrl(req.headers.origin);

    // Root domain navigation (e.g. hitting https://api.campusnode.com/ directly in a browser)
    if (req.path === "/" || req.path === "") {
      return res.redirect(302, clientUrl);
    }

    // Direct navigation to API routes -> Return branded security notice page
    return res.status(403).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Direct Access Restricted — CampusNode API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b1120;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(0, 120, 212, 0.15);
      color: #0078d4;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 20px;
      border: 1px solid rgba(0, 120, 212, 0.3);
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .btn {
      display: inline-block;
      background: #0078d4;
      color: #ffffff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 10px;
      transition: background 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 120, 212, 0.35);
    }
    .btn:hover {
      background: #106ebe;
    }
    .footer-hint {
      font-size: 12px;
      color: #64748b;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">CampusNode API</div>
    <h1>Direct API Access Restricted</h1>
    <p>
      Direct browser navigation to CampusNode API endpoints is disabled to protect platform data.
      Please access CampusNode services through the official web portal or mobile application.
    </p>
    <a href="${clientUrl}" class="btn">Open CampusNode Web</a>
    <div class="footer-hint">
      Flutter mobile app and API clients are unaffected.
    </div>
  </div>
</body>
</html>
    `.trim());
  }

  next();
};

export default browserAccessGuard;
