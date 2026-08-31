import "dotenv/config";
import { describe, it, expect, beforeAll } from "vitest";
import { signTicket, verifyTicket, getPublicKeyInfo, getQrVersion } from "../qrSigningService.js";

describe("qrSigningService", () => {
  const eventId = "60c72b2f9b1d8b2bad000001";
  const ticketId = "tkt_abc123XYZ_99";

  it("should sign a ticket and return a valid base64url payload", () => {
    const result = signTicket(eventId, ticketId);
    expect(result).toHaveProperty("qrPayload");
    expect(result).toHaveProperty("qrVersion", 1);
    expect(result).toHaveProperty("qrKeyId", "cn-qr-2026-01");
    expect(typeof result.qrPayload).toBe("string");
    expect(result.qrPayload.length).toBeGreaterThan(50);
  });

  it("should successfully verify a freshly signed ticket", () => {
    const { qrPayload } = signTicket(eventId, ticketId);
    const verification = verifyTicket(qrPayload);

    expect(verification.valid).toBe(true);
    expect(verification.version).toBe(1);
    expect(verification.keyId).toBe("cn-qr-2026-01");
    expect(verification.eventId).toBe(eventId);
    expect(verification.ticketId).toBe(ticketId);
  });

  it("should reject tampered payload data", () => {
    const { qrPayload } = signTicket(eventId, ticketId);
    // Tamper with the base64url string
    const tampered = qrPayload.slice(0, 10) + "A" + qrPayload.slice(11);
    const verification = verifyTicket(tampered);

    expect(verification.valid).toBe(false);
  });

  it("should reject when signature bytes are corrupted", () => {
    const { qrPayload } = signTicket(eventId, ticketId);
    const buf = Buffer.from(qrPayload, "base64url");
    // Invert the last byte of the signature
    buf[buf.length - 1] ^= 0xff;
    const tamperedPayload = buf.toString("base64url");
    const verification = verifyTicket(tamperedPayload);

    expect(verification.valid).toBe(false);
    expect(verification.error).toBe("INVALID_SIGNATURE");
  });

  it("should reject when ticketId inside payload is modified without valid signature", () => {
    const { qrPayload } = signTicket(eventId, "tkt_original");
    const buf = Buffer.from(qrPayload, "base64url");
    const kLen = buf[1];
    const eLen = buf[2 + kLen];
    const tLenOffset = 3 + kLen + eLen;
    buf[tLenOffset + 1] = "X".charCodeAt(0);
    const tamperedPayload = buf.toString("base64url");
    const verification = verifyTicket(tamperedPayload);

    expect(verification.valid).toBe(false);
    expect(verification.error).toBe("INVALID_SIGNATURE");
  });

  it("should reject unsupported QR version", () => {
    const buf = Buffer.from([99, 14, 99, 110, 45, 113, 114, 45, 50, 48, 50, 54, 45, 48, 49]);
    const verification = verifyTicket(buf.toString("base64url"));

    expect(verification.valid).toBe(false);
    expect(verification.error).toBe("UNSUPPORTED_VERSION");
  });

  it("should return valid public key info", () => {
    const keyInfo = getPublicKeyInfo();
    expect(keyInfo).toHaveProperty("keyId", "cn-qr-2026-01");
    expect(keyInfo).toHaveProperty("algorithm", "Ed25519");
    expect(keyInfo.publicKey).toContain("BEGIN PUBLIC KEY");
  });
});
