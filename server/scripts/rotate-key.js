/**
 * CampusNode Key Rotation & Management CLI
 *
 * Usage:
 *   node scripts/rotate-key.js [jwt|qr|vapid|passwords|all] [--apply]
 *
 * Options:
 *   --apply   Automatically updates the value(s) in server/.env with an automatic timestamped backup.
 *
 * Examples:
 *   node scripts/rotate-key.js jwt
 *   node scripts/rotate-key.js qr --apply
 *   node scripts/rotate-key.js all
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, "../.env");

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply");
const target = (args.find((a) => !a.startsWith("--")) || "").toLowerCase();

function bufferToBase64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function updateEnvFile(updates) {
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`\n❌ Error: Cannot apply changes. File does not exist: ${ENV_PATH}`);
    return false;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${ENV_PATH}.backup-${timestamp}`;
  fs.copyFileSync(ENV_PATH, backupPath);
  console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);

  let content = fs.readFileSync(ENV_PATH, "utf-8");

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const escapedVal = value.includes("\n") || value.includes(" ") ? `"${value}"` : value;
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${escapedVal}`);
    } else {
      content += `\n${key}=${escapedVal}`;
    }
  }

  fs.writeFileSync(ENV_PATH, content, "utf-8");
  console.log(`✅ Updated ${Object.keys(updates).length} key(s) directly in server/.env`);
  return true;
}

function rotateJwt() {
  const secret = crypto.randomBytes(64).toString("hex");
  console.log("\n" + "═".repeat(75));
  console.log("                      🔑 1. JWT_SECRET (AUTH SESSIONS)");
  console.log("═".repeat(75));
  console.log(`\nGENERATED SECRET:\nJWT_SECRET="${secret}"\n`);
  console.log("👥 EFFECT ON EXISTING USERS:");
  console.log("  • ALL active sessions across web and mobile browsers will immediately expire.");
  console.log("  • On their next API call, users receive HTTP 401 Unauthorized.");
  console.log("  • Client axios interceptor automatically purges local auth tokens and redirects to /login.");
  console.log("  • No database data, registrations, or user accounts are modified. Users only re-authenticate.");
  console.log("\n⚙️  EFFECT ON SERVICES:");
  console.log("  • Render Backend: Requires restart / redeploy to pick up the new secret.");
  console.log("  • Cron Jobs & Internal Microservices: Any JWT-authenticated internal callers must get fresh tokens.");
  console.log("\n📋 HOW TO CHANGE:");
  console.log("  1. Local Dev: Run with '--apply' or update JWT_SECRET in server/.env");
  console.log("  2. Staging / Production: Go to Render Dashboard -> Environment -> Update JWT_SECRET -> Trigger Deploy.");
  console.log("═".repeat(75) + "\n");

  if (shouldApply) {
    updateEnvFile({ JWT_SECRET: secret });
  }
  return { JWT_SECRET: secret };
}

function rotateQr() {
  const nextKeyId = `cn-qr-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const singleLinePrivate = privateKey.trim().replace(/\n/g, "\\n");
  const singleLinePublic = publicKey.trim().replace(/\n/g, "\\n");

  console.log("\n" + "═".repeat(75));
  console.log("                🎟️  2. QR SIGNING KEYPAIR (ED25519 EVENT TICKETS)");
  console.log("═".repeat(75));
  console.log(`\nGENERATED KEYPAIR:\nQR_SIGNING_KEY_ID="${nextKeyId}"`);
  console.log(`QR_SIGNING_PRIVATE_KEY="${singleLinePrivate}"`);
  console.log(`QR_SIGNING_PUBLIC_KEY="${singleLinePublic}"\n`);
  console.log("👥 EFFECT ON EXISTING USERS:");
  console.log("  • Students with existing digital tickets (QR passes):");
  console.log("    - Their tickets embed the keyId (e.g. 'cn-qr-2026-01').");
  console.log("    - IF you discard the old public key, existing tickets WILL FAIL SCANNING at event entry!");
  console.log("    - SAFE PROCEDURE: Retain the previous public key in scanner app or registry until past events finish.");
  console.log("\n⚙️  EFFECT ON SERVICES:");
  console.log("  • Offline Android Scanner App: Must have the new public key and keyId added to TRUSTED_DEFAULT_KEYS");
  console.log("    in 'QrVerifier.kt' before scanning tickets issued with this new key.");
  console.log("  • Online Scanners: Will fetch the new key automatically if connected to internet via /api/keys.");
  console.log("\n📋 HOW TO CHANGE:");
  console.log("  1. Update QR_SIGNING_KEY_ID, QR_SIGNING_PRIVATE_KEY, and QR_SIGNING_PUBLIC_KEY in Render / .env.");
  console.log("  2. In Android scanner app: Add new key to TRUSTED_DEFAULT_KEYS in QrVerifier.kt.");
  console.log("  3. Keep previous keys in trust list until events concluded.");
  console.log("═".repeat(75) + "\n");

  if (shouldApply) {
    updateEnvFile({
      QR_SIGNING_KEY_ID: nextKeyId,
      QR_SIGNING_PRIVATE_KEY: singleLinePrivate,
      QR_SIGNING_PUBLIC_KEY: singleLinePublic,
    });
  }
  return {
    QR_SIGNING_KEY_ID: nextKeyId,
    QR_SIGNING_PRIVATE_KEY: singleLinePrivate,
    QR_SIGNING_PUBLIC_KEY: singleLinePublic,
  };
}

function rotateVapid() {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const publicKey = bufferToBase64url(ecdh.getPublicKey());
  const privateKey = bufferToBase64url(ecdh.getPrivateKey());

  console.log("\n" + "═".repeat(75));
  console.log("                 🔔 3. VAPID KEYPAIR (WEB PUSH NOTIFICATIONS)");
  console.log("═".repeat(75));
  console.log(`\nGENERATED KEYS:\nVAPID_PUBLIC_KEY="${publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${privateKey}"`);
  console.log(`VAPID_SUBJECT="mailto:admin@campusnode.in"\n`);
  console.log("👥 EFFECT ON EXISTING USERS:");
  console.log("  • ALL existing browser push subscriptions become PERMANENTLY INVALID.");
  console.log("  • Browser push gateways (Google FCM, Apple APNS, Mozilla) verify signatures using the original public key.");
  console.log("  • Push notifications to existing subscribers will fail with HTTP 410 Gone or HTTP 401.");
  console.log("  • Users will automatically re-subscribe next time they open the CampusNode web app in their browser.");
  console.log("\n⚙️  EFFECT ON SERVICES:");
  console.log("  • Push Notification Worker: Replaces VAPID key in webpush config.");
  console.log("  • Database: Recommended to clean dead subscription records to prevent futile outbound push requests:");
  console.log("    TRUNCATE TABLE \"PushSubscription\";");
  console.log("\n📋 HOW TO CHANGE:");
  console.log("  1. Update VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Render / .env.");
  console.log("  2. Optional: Run 'TRUNCATE TABLE \"PushSubscription\";' on the database.");
  console.log("  3. Deploy backend.");
  console.log("═".repeat(75) + "\n");

  if (shouldApply) {
    updateEnvFile({
      VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: privateKey,
      VAPID_SUBJECT: "mailto:admin@campusnode.in",
    });
  }
  return {
    VAPID_PUBLIC_KEY: publicKey,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_SUBJECT: "mailto:admin@campusnode.in",
  };
}

function rotatePasswords() {
  const adminPass = `admin_${crypto.randomBytes(16).toString("base64url")}`;
  const commonPass = `common_${crypto.randomBytes(16).toString("base64url")}`;

  console.log("\n" + "═".repeat(75));
  console.log("              🔐 4. ADMIN & SEED PASSWORDS (HASH INITIALIZATION)");
  console.log("═".repeat(75));
  console.log(`\nGENERATED PASSWORDS:\nADMIN_PASS="${adminPass}"`);
  console.log(`COMMON_PASSWORD="${commonPass}"\n`);
  console.log("👥 EFFECT ON EXISTING USERS:");
  console.log("  • ZERO direct impact on existing users!");
  console.log("  • User passwords are stored as one-way bcrypt hashes in the PostgreSQL database.");
  console.log("  • Changing ADMIN_PASS or COMMON_PASSWORD in .env ONLY changes what 'scripts/seed.js' will use.");
  console.log("\n⚙️  EFFECT ON SERVICES:");
  console.log("  • No effect until 'node scripts/seed.js' is executed.");
  console.log("\n📋 HOW TO CHANGE:");
  console.log("  1. To change an existing admin's password: Use the Profile Settings UI or Forgot Password flow.");
  console.log("  2. To re-seed fresh test accounts (staging only): Update in .env and run 'node scripts/seed.js'.");
  console.log("═".repeat(75) + "\n");

  if (shouldApply) {
    updateEnvFile({
      ADMIN_PASS: adminPass,
      COMMON_PASSWORD: commonPass,
    });
  }
  return {
    ADMIN_PASS: adminPass,
    COMMON_PASSWORD: commonPass,
  };
}

function rotateAll() {
  console.log("\n🚀 ROTATING ALL CRYPTOGRAPHIC KEYS & SECRETS FOR CAMPUSNODE...");
  rotateJwt();
  rotateQr();
  rotateVapid();
  rotatePasswords();
  console.log("✨ All keys generated successfully!");
}

function printUsage() {
  console.log("\n" + "═".repeat(75));
  console.log("                 CampusNode Key Rotation & Management CLI");
  console.log("═".repeat(75));
  console.log("\nUsage:");
  console.log("  node scripts/rotate-key.js <type> [--apply]\n");
  console.log("Available Types:");
  console.log("  jwt        - Generate a 512-bit JWT secret (expires active web/mobile sessions)");
  console.log("  qr         - Generate an Ed25519 ticket signing keypair (impacts ticket scanning)");
  console.log("  vapid      - Generate a Web Push keypair (invalidates current push subscriptions)");
  console.log("  passwords  - Generate high-entropy admin & seed passwords");
  console.log("  all        - Generate new values for all the above\n");
  console.log("Flags:");
  console.log("  --apply    - Automatically update server/.env with an automatic timestamped backup\n");
  console.log("Documentation:");
  console.log("  See docs/development/KEY_ROTATION_GUIDE.md and KEY_ROTATION.md for complete details.\n");
  console.log("═".repeat(75) + "\n");
}

switch (target) {
  case "jwt":
    rotateJwt();
    break;
  case "qr":
    rotateQr();
    break;
  case "vapid":
    rotateVapid();
    break;
  case "passwords":
  case "password":
    rotatePasswords();
    break;
  case "all":
    rotateAll();
    break;
  default:
    printUsage();
    break;
}
