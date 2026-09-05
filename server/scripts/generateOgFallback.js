import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFallback() {
  const width = 1200;
  const height = 630;

  // Read cn_logo.png if available to embed as base64
  let logoBase64 = "";
  const logoPath = path.resolve(__dirname, "../../client/public/cn_logo.png");
  if (fs.existsSync(logoPath)) {
    const logoBuf = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuf.toString("base64")}`;
  }

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Deep dark mesh gradients -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="50%" stop-color="#0c1222" />
        <stop offset="100%" stop-color="#050811" />
      </linearGradient>

      <!-- Vibrant brand glow -->
      <radialGradient id="orangeGlow" cx="20%" cy="25%" r="60%">
        <stop offset="0%" stop-color="#ea580c" stop-opacity="0.32" />
        <stop offset="60%" stop-color="#ea580c" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="indigoGlow" cx="85%" cy="75%" r="60%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22" />
        <stop offset="60%" stop-color="#3b82f6" stop-opacity="0" />
      </radialGradient>

      <!-- Badge gradient -->
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ea580c" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#f97316" stop-opacity="0.08" />
      </linearGradient>

      <!-- Card border gradient -->
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.25)" />
        <stop offset="50%" stop-color="rgba(234, 88, 12, 0.4)" />
        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.08)" />
      </linearGradient>

      <!-- Subtle background grid pattern -->
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.028)" stroke-width="1" />
      </pattern>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <rect width="${width}" height="${height}" fill="url(#grid)" />
    <rect width="${width}" height="${height}" fill="url(#orangeGlow)" />
    <rect width="${width}" height="${height}" fill="url(#indigoGlow)" />

    <!-- Outer card frame with glassmorphism stroke -->
    <rect x="40" y="40" width="1120" height="550" rx="28" fill="rgba(15, 23, 42, 0.4)" stroke="url(#borderGrad)" stroke-width="1.5" />

    <!-- Top Badge -->
    <g transform="translate(90, 95)">
      <rect width="320" height="38" rx="19" fill="url(#badgeGrad)" stroke="rgba(234, 88, 12, 0.5)" stroke-width="1" />
      <circle cx="20" cy="19" r="5" fill="#f97316" />
      <text x="36" y="24" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" fill="#fdba74">CAMPUSNODE • NIT JALANDHAR</text>
    </g>

    <!-- Main Title -->
    <g transform="translate(90, 220)">
      <text font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="56" font-weight="800" fill="#ffffff" letter-spacing="-0.02em">
        Campus Events &amp; Activities
      </text>
    </g>

    <!-- Subtitle / Tagline -->
    <g transform="translate(90, 285)">
      <text font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="400" fill="#94a3b8" width="800">
        Discover, participate, and lead technical fests, workshops, cultural events
      </text>
      <text y="36" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="400" fill="#94a3b8" width="800">
        and competitions across college clubs on the unified student platform.
      </text>
    </g>

    <!-- Stat/Feature Badges -->
    <g transform="translate(90, 420)">
      <!-- Badge 1: Clubs & Fests -->
      <g>
        <rect width="210" height="52" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
        <text x="24" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="#f1f5f9">
          🏛️ 40+ Campus Clubs
        </text>
      </g>

      <!-- Badge 2: Verified Entry -->
      <g transform="translate(230, 0)">
        <rect width="210" height="52" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
        <text x="24" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="#f1f5f9">
          🎟️ Instant QR Passes
        </text>
      </g>

      <!-- Badge 3: Certificates -->
      <g transform="translate(460, 0)">
        <rect width="230" height="52" rx="14" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
        <text x="24" y="32" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="#f1f5f9">
          📜 Verified Certificates
        </text>
      </g>
    </g>

    <!-- Bottom Footer Row -->
    <g transform="translate(90, 535)">
      ${
        logoBase64
          ? `<image href="${logoBase64}" width="160" height="38" preserveAspectRatio="xMidYMid meet" />`
          : `<text font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="800" fill="#ffffff">Campus<tspan fill="#ea580c">Node</tspan></text>`
      }
      <text x="960" y="24" text-anchor="end" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#ea580c">
        campusnode.in
      </text>
    </g>
  </svg>
  `;

  const clientPublicDir = path.resolve(__dirname, "../../client/public");
  const serverPublicDir = path.resolve(__dirname, "../public");

  if (!fs.existsSync(serverPublicDir)) {
    fs.mkdirSync(serverPublicDir, { recursive: true });
  }

  const clientOutputPath = path.join(clientPublicDir, "campusnode-og-fallback.png");
  const serverOutputPath = path.join(serverPublicDir, "campusnode-og-fallback.png");

  await sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(clientOutputPath);

  await sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(serverOutputPath);

  console.log("✅ Generated 1200x630 fallback social images at:");
  console.log("  ->", clientOutputPath);
  console.log("  ->", serverOutputPath);
}

generateFallback().catch(console.error);
