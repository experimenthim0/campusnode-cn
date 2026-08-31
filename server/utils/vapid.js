import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

function base64urlToBuffer(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64");
}

function bufferToBase64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Generate VAPID keypair using Node crypto ECDSA P-256 (prime256v1)
export function generateVapidKeys() {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();

  const publicKey = bufferToBase64url(ecdh.getPublicKey());
  const privateKey = bufferToBase64url(ecdh.getPrivateKey());

  return { publicKey, privateKey };
}

// Global VAPID keys state
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
  subject: process.env.VAPID_SUBJECT || "mailto:admin@campusnode.com",
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.log("[CampusNode VAPID] VAPID keys not found in .env — generating transient VAPID keys...");
  const generated = generateVapidKeys();
  vapidKeys.publicKey = generated.publicKey;
  vapidKeys.privateKey = generated.privateKey;
  console.log(`[CampusNode VAPID] Public Key: ${vapidKeys.publicKey}`);
}

export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

export function getVapidPrivateKey() {
  return vapidKeys.privateKey;
}

export function getVapidSubject() {
  return vapidKeys.subject;
}

/**
 * Generate VAPID Authorization header for a given endpoint URL
 */
export function createVapidHeader(endpointUrl) {
  try {
    const url = new URL(endpointUrl);
    const audience = `${url.protocol}//${url.host}`;
    const expiration = Math.floor(Date.now() / 1000) + 12 * 3600; // 12 hours

    const header = { typ: "JWT", alg: "ES256" };
    const payload = {
      aud: audience,
      exp: expiration,
      sub: vapidKeys.subject,
    };

    const encodedHeader = bufferToBase64url(Buffer.from(JSON.stringify(header)));
    const encodedPayload = bufferToBase64url(Buffer.from(JSON.stringify(payload)));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(base64urlToBuffer(vapidKeys.privateKey));
    const pubKeyBuf = ecdh.getPublicKey();

    const x = pubKeyBuf.subarray(1, 33);
    const y = pubKeyBuf.subarray(33, 65);
    const d = base64urlToBuffer(vapidKeys.privateKey);

    const jwk = {
      kty: "EC",
      crv: "P-256",
      x: bufferToBase64url(x),
      y: bufferToBase64url(y),
      d: bufferToBase64url(d),
    };

    const privateKeyObj = crypto.createPrivateKey({
      key: jwk,
      format: "jwk",
    });

    const signer = crypto.createSign("SHA256");
    signer.update(unsignedToken);
    const signature = signer.sign({
      key: privateKeyObj,
      dsaEncoding: "ieee-p1363",
    });

    const jwt = `${unsignedToken}.${bufferToBase64url(signature)}`;

    return {
      Authorization: `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
    };
  } catch (err) {
    console.error("[CampusNode VAPID] Error generating VAPID header:", err);
    return null;
  }
}
