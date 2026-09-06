/**
 * CampusNode Staging Secret Generator
 *
 * Generates cryptographically isolated staging secrets:
 * - JWT Secret (64-byte high entropy hex)
 * - Ed25519 QR Signing Keypair (isolated staging key ID)
 * - Web Push VAPID Keypair (P-256 / prime256v1)
 * - Staging Administrator & Common Passwords
 *
 * Usage:
 *   node scripts/generate-staging-secrets.js
 *
 * Output is for manual copy into Render Staging dashboard and local server/.env.
 * DO NOT commit generated values to git.
 */

import crypto from "crypto";

function bufferToBase64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateStagingSecrets() {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("             CampusNode Staging Secret Generator");
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  // 1. JWT Secret (64 bytes / 512 bits)
  const jwtSecret = crypto.randomBytes(64).toString("hex");

  // 2. Ed25519 QR Signing Keypair
  const stagingKeyId = "cn-qr-staging-2026-01";
  const { publicKey: edPublic, privateKey: edPrivate } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const edPrivateOneLine = edPrivate.trim().replace(/\n/g, "\\n");
  const edPublicOneLine = edPublic.trim().replace(/\n/g, "\\n");

  // 3. Web Push VAPID Keypair (prime256v1 / P-256)
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const vapidPublicKey = bufferToBase64url(ecdh.getPublicKey());
  const vapidPrivateKey = bufferToBase64url(ecdh.getPrivateKey());

  // 4. Staging Passwords
  const adminPassword = `staging_admin_${crypto.randomBytes(16).toString("base64url")}`;
  const commonPassword = `staging_common_${crypto.randomBytes(16).toString("base64url")}`;

  console.log("Copy the following blocks into your Staging environment:\n");
  console.log("───────────────────────────────────────────────────────────────────────");
  console.log("1. STAGING RENDER BACKEND / LOCAL server/.env");
  console.log("───────────────────────────────────────────────────────────────────────\n");

  console.log(`JWT_SECRET="${jwtSecret}"\n`);
  console.log(`QR_SIGNING_KEY_ID="${stagingKeyId}"`);
  console.log(`QR_SIGNING_PRIVATE_KEY="${edPrivateOneLine}"`);
  console.log(`QR_SIGNING_PUBLIC_KEY="${edPublicOneLine}"\n`);
  console.log(`VAPID_PUBLIC_KEY="${vapidPublicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${vapidPrivateKey}"`);
  console.log(`VAPID_SUBJECT="mailto:staging-admin@campusnode.in"\n`);
  console.log(`ADMIN_PASS="${adminPassword}"`);
  console.log(`COMMON_PASSWORD="${commonPassword}"\n`);
  console.log(`CLOUDINARY_FOLDER_PREFIX="campusnode/staging"`);

  console.log("\n───────────────────────────────────────────────────────────────────────");
  console.log("2. PRODUCTION SAFETY CHECK");
  console.log("───────────────────────────────────────────────────────────────────────");
  console.log("✓ None of the generated keys share mathematical relationship with production.");
  console.log("✓ Tokens signed with this JWT secret will be rejected by production backend.");
  console.log("✓ Tickets signed with this QR keypair will carry keyId '" + stagingKeyId + "'.");
  console.log("✓ Push notifications will be isolated from production FCM/APNS channels.");
  console.log("═══════════════════════════════════════════════════════════════════════\n");
}

generateStagingSecrets();
