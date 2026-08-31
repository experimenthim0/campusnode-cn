/**
 * Generate Ed25519 keypair for CampusNode QR ticket signing.
 *
 * Usage:  node scripts/generate-qr-keypair.js
 *
 * Outputs:
 *  - Private key (PEM) → set as QR_SIGNING_PRIVATE_KEY env var
 *  - Public  key (PEM) → set as QR_SIGNING_PUBLIC_KEY env var
 *  - Key ID            → set as QR_SIGNING_KEY_ID env var
 */

import { generateKeyPairSync } from "crypto";

const KEY_ID = "cn-qr-2026-01";

const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
  publicKeyEncoding:  { type: "spki",  format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log("═══════════════════════════════════════════════");
console.log("  CampusNode QR Signing Keypair Generated");
console.log("═══════════════════════════════════════════════");
console.log();
console.log(`Key ID: ${KEY_ID}`);
console.log();
console.log("── PRIVATE KEY (server .env only — NEVER expose) ──");
console.log();
console.log(privateKey.trim());
console.log();
console.log("── PUBLIC KEY (safe to embed in Android app) ──");
console.log();
console.log(publicKey.trim());
console.log();
console.log("── Add to server/.env ──");
console.log();

const privateKeyOneLine = privateKey.trim().replace(/\n/g, "\\n");
const publicKeyOneLine  = publicKey.trim().replace(/\n/g, "\\n");

console.log(`QR_SIGNING_KEY_ID=${KEY_ID}`);
console.log(`QR_SIGNING_PRIVATE_KEY="${privateKeyOneLine}"`);
console.log(`QR_SIGNING_PUBLIC_KEY="${publicKeyOneLine}"`);
console.log();
console.log("═══════════════════════════════════════════════");
