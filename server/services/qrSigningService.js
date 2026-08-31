/**
 * CampusNode QR Ticket Signing Service
 *
 * Uses Ed25519 asymmetric signatures to create cryptographically verifiable
 * QR payloads. The private key signs on the server; the public key verifies
 * on the Android scanner (offline-capable).
 *
 * QR Payload Binary Format (v1):
 *   [1 byte version][1 byte keyIdLen][keyId bytes][24 bytes eventId][24 bytes ticketId][64 bytes signature]
 *
 * Canonical signing message:
 *   "CN1|{keyId}|{eventId}|{ticketId}"
 */

import { createPrivateKey, createPublicKey, sign, verify } from "crypto";

const QR_VERSION = 1;

const KEY_ID = process.env.QR_SIGNING_KEY_ID || "cn-qr-2026-01";

function loadPrivateKey() {
  const raw = process.env.QR_SIGNING_PRIVATE_KEY;
  if (!raw) throw new Error("QR_SIGNING_PRIVATE_KEY is not set");
  const pem = raw.replace(/\\n/g, "\n");
  return createPrivateKey(pem);
}

function loadPublicKey() {
  const raw = process.env.QR_SIGNING_PUBLIC_KEY;
  if (!raw) throw new Error("QR_SIGNING_PUBLIC_KEY is not set");
  const pem = raw.replace(/\\n/g, "\n");
  return createPublicKey(pem);
}

let _privateKey = null;
let _publicKey = null;

function getPrivateKey() {
  if (!_privateKey) _privateKey = loadPrivateKey();
  return _privateKey;
}

function getPublicKey() {
  if (!_publicKey) _publicKey = loadPublicKey();
  return _publicKey;
}

function buildCanonicalMessage(eventId, ticketId, keyId = KEY_ID) {
  return `CN${QR_VERSION}|${keyId}|${eventId}|${ticketId}`;
}

/**
 * Sign a ticket and produce a compact base64url QR payload.
 *
 * @param {string} eventId   – CampusNode event ID (24-char hex)
 * @param {string} ticketId  – Secure ticket identifier
 * @param {string} [keyId]   – Key ID for rotation support
 * @returns {{ qrPayload: string, qrVersion: number, qrKeyId: string }}
 */
export function signTicket(eventId, ticketId, keyId = KEY_ID) {
  const message = buildCanonicalMessage(eventId, ticketId, keyId);
  const signature = sign(null, Buffer.from(message), getPrivateKey());

  const keyIdBuf = Buffer.from(keyId, "utf8");
  const eventIdBuf = Buffer.from(eventId, "utf8");
  const ticketIdBuf = Buffer.from(ticketId, "utf8");

  // Format: [version:1][keyIdLen:1][keyId:N][eventIdLen:1][eventId:N][ticketIdLen:1][ticketId:N][sig:64]
  const payload = Buffer.alloc(
    1 + 1 + keyIdBuf.length + 1 + eventIdBuf.length + 1 + ticketIdBuf.length + signature.length,
  );

  let offset = 0;
  payload.writeUInt8(QR_VERSION, offset);
  offset += 1;

  payload.writeUInt8(keyIdBuf.length, offset);
  offset += 1;
  keyIdBuf.copy(payload, offset);
  offset += keyIdBuf.length;

  payload.writeUInt8(eventIdBuf.length, offset);
  offset += 1;
  eventIdBuf.copy(payload, offset);
  offset += eventIdBuf.length;

  payload.writeUInt8(ticketIdBuf.length, offset);
  offset += 1;
  ticketIdBuf.copy(payload, offset);
  offset += ticketIdBuf.length;

  signature.copy(payload, offset);

  const qrPayload = payload.toString("base64url");

  return { qrPayload, qrVersion: QR_VERSION, qrKeyId: keyId };
}

/**
 * Parse and verify a QR payload.
 *
 * @param {string} qrPayloadBase64 – base64url-encoded payload from QR scan
 * @returns {{ valid: boolean, version: number, keyId: string, eventId: string, ticketId: string }}
 */
export function verifyTicket(qrPayloadBase64) {
  try {
    const buf = Buffer.from(qrPayloadBase64, "base64url");

    let offset = 0;

    const version = buf.readUInt8(offset);
    offset += 1;
    if (version !== QR_VERSION) {
      return { valid: false, error: "UNSUPPORTED_VERSION", version };
    }

    const keyIdLen = buf.readUInt8(offset);
    offset += 1;
    const keyId = buf.subarray(offset, offset + keyIdLen).toString("utf8");
    offset += keyIdLen;

    const eventIdLen = buf.readUInt8(offset);
    offset += 1;
    const eventId = buf.subarray(offset, offset + eventIdLen).toString("utf8");
    offset += eventIdLen;

    const ticketIdLen = buf.readUInt8(offset);
    offset += 1;
    const ticketId = buf.subarray(offset, offset + ticketIdLen).toString("utf8");
    offset += ticketIdLen;

    // Signature (remaining bytes, should be 64 for Ed25519)
    const signature = buf.subarray(offset);
    if (signature.length !== 64) {
      return { valid: false, error: "INVALID_SIGNATURE_LENGTH" };
    }

    const message = buildCanonicalMessage(eventId, ticketId, keyId);
    const isValid = verify(null, Buffer.from(message), getPublicKey(), signature);

    if (!isValid) {
      return { valid: false, error: "INVALID_SIGNATURE", version, keyId, eventId, ticketId };
    }

    return { valid: true, version, keyId, eventId, ticketId };
  } catch (err) {
    return { valid: false, error: "INVALID_FORMAT", message: err.message };
  }
}

/**
 * Get the public key info for distribution to scanners.
 * @returns {{ keyId: string, publicKey: string, algorithm: string }}
 */
export function getPublicKeyInfo() {
  const raw = process.env.QR_SIGNING_PUBLIC_KEY;
  if (!raw) throw new Error("QR_SIGNING_PUBLIC_KEY is not set");
  const pem = raw.replace(/\\n/g, "\n");

  let rawPublicKey = null;
  let rawPublicKeyHex = null;

  try {
    const keyObject = getPublicKey();
    const der = keyObject.export({ type: "spki", format: "der" });
    // Ed25519 SPKI DER: 12-byte header (30 2a 30 05 06 03 2b 65 70 03 21 00) + 32 bytes raw key = 44 bytes
    if (der.length >= 44) {
      const rawKeyBytes = der.subarray(der.length - 32);
      rawPublicKey = rawKeyBytes.toString("base64");
      rawPublicKeyHex = rawKeyBytes.toString("hex");
    }
  } catch (e) {
    console.warn("Failed to extract raw public key bytes:", e);
  }

  return {
    keyId: KEY_ID,
    publicKey: pem,
    rawPublicKey,
    rawPublicKeyHex,
    algorithm: "Ed25519",
  };
}

export function getQrVersion() {
  return QR_VERSION;
}

export default {
  signTicket,
  verifyTicket,
  getPublicKeyInfo,
  getQrVersion,
};
