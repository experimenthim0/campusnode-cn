import sharp from "sharp";
import crypto from "crypto";

// Formats that sharp can actually decode — anything else is rejected
const VALID_FORMATS = new Set(["jpeg", "png", "webp"]);

/**
 * Validate the actual file content via magic bytes using sharp metadata.
 * Prevents extension-spoofing attacks (e.g. an .exe renamed to .jpg).
 * @param {Buffer} buffer — raw file buffer from multer
 * @returns {Promise<{valid: boolean, detectedFormat: string|null}>}
 */
export async function validateFileSignature(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format; // e.g. "jpeg", "png", "webp", "gif", "svg"
    return {
      valid: VALID_FORMATS.has(format),
      detectedFormat: format || null,
    };
  } catch {
    return { valid: false, detectedFormat: null };
  }
}

/**
 * Process a profile photo buffer:
 * 1. Auto-orient (applies EXIF rotation then strips all metadata)
 * 2. Resize to fit within 800×800 preserving aspect ratio, never enlarging
 * 3. Convert to WEBP at quality 82
 *
 * @param {Buffer} buffer — raw image buffer
 * @returns {Promise<Buffer>} — processed WEBP buffer
 */
export async function processProfileImage(buffer) {
  return sharp(buffer)
    .rotate() // auto-orient from EXIF, then EXIF is dropped
    .resize(800, 800, {
      fit: "inside",            // preserve aspect ratio, fit within box
      withoutEnlargement: true, // never upscale small images
    })
    .webp({ quality: 82 })
    .toBuffer();
}

/**
 * Generate a secure random filename for a profile photo.
 * Format: {userId}_{timestamp}_{randomHex}.webp
 *
 * @param {string} userId
 * @returns {string}
 */
export function generateProfileFilename(userId) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  return `${userId}_${timestamp}_${random}`;
}

/**
 * Process a club banner image buffer:
 * 1. Auto-orient (applies EXIF rotation then strips all metadata)
 * 2. Resize to fit within 1920×1080 preserving aspect ratio, without enlargement
 * 3. Compress and convert to WEBP at quality 82
 *
 * @param {Buffer} buffer — raw image buffer
 * @returns {Promise<Buffer>} — processed WEBP buffer
 */
export async function processBannerImage(buffer) {
  return sharp(buffer)
    .rotate()
    .resize(1920, 1080, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}
