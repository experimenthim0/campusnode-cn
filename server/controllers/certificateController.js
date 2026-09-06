import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { uploadImage } from "../utils/cloudinary.js";
import prisma from "../lib/prisma.js";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";
import { createObjectId } from "../utils/objectId.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CUSTOM_FONTS = {
  DancingScript: path.join(__dirname, "../assets/fonts/DancingScript.ttf"),
  GreatVibes: path.join(__dirname, "../assets/fonts/GreatVibes.ttf"),
  Pacifico: path.join(__dirname, "../assets/fonts/Pacifico.ttf"),
  Sacramento: path.join(__dirname, "../assets/fonts/Sacramento.ttf"),
  Allura: path.join(__dirname, "../assets/fonts/Allura.ttf"),
  PinyonScript: path.join(__dirname, "../assets/fonts/PinyonScript.ttf"),
};

/**
 * Determine participant award standing based strictly on event's winner configuration.
 * If winner announcements are disabled (showWinner: false), standing is strictly "Participant".
 */
export function determineAwardPosition(event, participation, studentUser) {
  if (!event.showWinner || !Array.isArray(event.winners) || event.winners.length === 0) {
    return "Participant";
  }

  const rollNo = (studentUser?.rollNo || participation?.student?.rollNo || "").trim().toLowerCase();
  const studentId = String(studentUser?.id || participation?.studentId || "");
  const email = (studentUser?.email || participation?.externalEmail || "").trim().toLowerCase();
  const name = (studentUser?.name || participation?.externalName || "").trim().toLowerCase();
  const teamId = participation?.teamId ? String(participation.teamId) : "";

  for (const w of event.winners) {
    let matched = false;

    if (rollNo && w.rollNo && String(w.rollNo).trim().toLowerCase() === rollNo) {
      matched = true;
    } else if (studentId && w.studentId && String(w.studentId) === studentId) {
      matched = true;
    } else if (email && w.email && String(w.email).trim().toLowerCase() === email) {
      matched = true;
    } else if (name && w.name && String(w.name).trim().toLowerCase() === name) {
      matched = true;
    } else if (teamId && w.teamId && String(w.teamId) === teamId) {
      matched = true;
    } else if (Array.isArray(w.members) && w.members.length > 0) {
      if (rollNo && w.members.some((m) => String(m).toLowerCase().includes(rollNo))) {
        matched = true;
      } else if (name && w.members.some((m) => String(m).toLowerCase().includes(name))) {
        matched = true;
      }
    }

    if (matched) {
      const rankNum = Number(w.rank);
      if (rankNum === 1) return "Winner";
      if (rankNum === 2) return "Runner-Up";
      return "Participant";
    }
  }

  return "Participant";
}

export function formatRollNumber(rollNo, format = "parentheses") {
  if (!rollNo) return "";
  const cleaned = String(rollNo).trim();
  switch (format) {
    case "plain":
    case "number":
      return cleaned;
    case "dash":
    case "hyphen":
      return `- ${cleaned}`;
    case "prefix":
    case "label":
      return `Roll No. ${cleaned}`;
    case "parentheses":
    case "brackets":
    default:
      return `(${cleaned})`;
  }
}

export const downloadCertificate = async (req, res) => {
  const { eventId } = req.params;
  const studentId = req.user.userId;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        club: { select: { clubName: true, clubLogo: true } },
      },
    });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const template = event.certificateTemplate;
    if (!template || !template.imageUrl) {
      return res.status(400).json({
        message: "Certificate template not configured for this event.",
      });
    }

    if (new Date() < new Date(event.endTime)) {
      return res.status(400).json({
        message: "Certificates are available only after the event ends.",
      });
    }

    const participation = await prisma.participation.findFirst({
      where: {
        eventId,
        OR: [
          { studentId },
          { externalUserId: studentId },
          { externalEmail: req.user.email },
        ],
        paymentStatus: { in: ["SUCCESS", "APPROVED"] },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            email: true,
            branch: true,
            program: true,
          },
        },
        externalUser: {
          select: {
            id: true,
            name: true,
            email: true,
            collegeName: true,
            program: true,
          },
        },
      },
    });

    if (!participation) {
      return res.status(403).json({ message: "You are not registered for this event." });
    }

    if (participation.status !== "ATTENDED") {
      return res.status(403).json({
        message:
          "Certificates are only available to participants who attended the event. Please contact the coordinator if you attended but were not marked.",
      });
    }

    const userName =
      participation.student?.name ||
      participation.externalUser?.name ||
      participation.externalName;
    if (!userName) {
      return res.status(422).json({ message: "Participant name is missing." });
    }

    // ── Find or Create Permanent Certificate Record (Immutability & Unique Slug) ──
    let certificate = await prisma.certificate.findUnique({
      where: { participationId: participation.id },
    });

    if (!certificate) {
      const awardPosition = determineAwardPosition(
        event,
        participation,
        participation.student || participation.externalUser
      );
      const verificationToken = crypto.randomBytes(24).toString("base64url");
      const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
      const year = new Date().getFullYear();
      const certificateNumber = `CN-${year}-${randomSuffix}`;

      const recipientRollNo = participation.student?.rollNo || null;
      const recipientEmail =
        participation.student?.email ||
        participation.externalUser?.email ||
        participation.externalEmail ||
        null;

      certificate = await prisma.certificate.create({
        data: {
          id: createObjectId(),
          eventId: event.id,
          participationId: participation.id,
          studentId: participation.studentId || null,
          externalUserId: participation.externalUserId || null,
          recipientName: userName,
          recipientRollNo,
          recipientEmail,
          awardPosition,
          certificateNumber,
          verificationToken,
          status: "ISSUED",
          metadata: {
            eventTitle: event.title,
            eventDate: event.startTime,
            venue: event.venue,
            clubName: event.club?.clubName || "CampusNode Organization",
            issuedAt: new Date().toISOString(),
          },
        },
      });
    }

    // If certificate is revoked, deny download with clear status
    if (certificate.status === "REVOKED") {
      return res.status(403).json({
        message: "This certificate has been revoked and is no longer valid for download.",
        status: "REVOKED",
        revokedAt: certificate.revokedAt,
        revocationReason: certificate.revocationReason,
      });
    }

    const safeFileName = userName.replace(/\s+/g, "_");
    const n = template;
    const docSize = [n.imageWidth || 841.89, n.imageHeight || 595.28];
    let backgroundBuffer;
    try {
      const parsedUrl = new URL(template.imageUrl);
      if (parsedUrl.hostname !== "res.cloudinary.com") {
        throw new Error("Untrusted image source");
      }
      const response = await fetch(template.imageUrl);
      if (!response.ok) throw new Error(`Cloudinary returned ${response.status}`);
      backgroundBuffer = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      return res.status(502).json({
        message: "Certificate background could not be loaded.",
        error: error.message,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFileName}_Certificate.pdf"`
    );

    const doc = new PDFDocument({ size: docSize, margin: 0 });
    doc.pipe(res);
    doc.image(backgroundBuffer, 0, 0, { width: docSize[0], height: docSize[1] });

    // Helper: Select font
    const applyFont = (fontName) => {
      const fontSrc = CUSTOM_FONTS[fontName];
      if (fontSrc && fs.existsSync(fontSrc)) {
        try {
          doc.registerFont(fontName, fontSrc);
          doc.font(fontName);
          return;
        } catch (e) {
          console.warn(`Could not load custom font ${fontName}, fallback to Helvetica:`, e.message);
        }
      }
      doc.font("Helvetica-Bold");
    };

    // 1. Draw Student Name (vertically centered in box, matching designer canvas)
    applyFont(n.font);
    doc.fontSize(n.fontSize || 32);
    const nameCenterY = (n.nameY || 0) + (n.nameHeight || 0) / 2;

    doc.fillColor(n.color || "#000000").text(userName, n.nameX, nameCenterY, {
      width: n.nameWidth,
      align: n.align || "center",
      baseline: "middle",
      lineBreak: false,
    });

    // 2. Draw Roll Number (vertically centered in box, matching designer canvas)
    if (n.showRollNo && n.rollNoWidth && n.rollNoHeight) {
      const rollNoValue = certificate.recipientRollNo || participation.student?.rollNo || "";
      if (rollNoValue) {
        const rollFormatted = formatRollNumber(rollNoValue, n.rollNoFormat || "parentheses");
        applyFont(n.rollNoFont || "Helvetica");
        doc.fontSize(n.rollNoFontSize || 20);
        const rollCenterY = (n.rollNoY || 0) + (n.rollNoHeight || 0) / 2;

        doc
          .fillColor(n.rollNoColor || "#000000")
          .text(rollFormatted, n.rollNoX, rollCenterY, {
            width: n.rollNoWidth,
            align: n.rollNoAlign || "center",
            baseline: "middle",
            lineBreak: false,
          });
      }
    }

    // 3. Draw Position / Award (vertically centered in box, matching designer canvas)
    if (n.showPosition && n.positionWidth && n.positionHeight) {
      const positionValue = certificate.awardPosition || "Participant";
      applyFont(n.positionFont || "Helvetica-Bold");
      doc.fontSize(n.positionFontSize || 24);
      const posCenterY = (n.positionY || 0) + (n.positionHeight || 0) / 2;

      doc
        .fillColor(n.positionColor || "#000000")
        .text(positionValue, n.positionX, posCenterY, {
          width: n.positionWidth,
          align: n.positionAlign || "center",
          baseline: "middle",
          lineBreak: false,
        });
    }

    // 4. Draw QR Code (if enabled / positioned)
    if (n.showQr && n.qrWidth && n.qrHeight) {
      const clientBase = process.env.CLIENT_URL || "https://campusnode.in";
      const verificationUrl = `${clientBase.replace(/\/$/, "")}/verify/certificate/${certificate.verificationToken}`;

      const qrWidth = Math.max(20, parseInt(n.qrWidth));
      const qrHeight = Math.max(20, parseInt(n.qrHeight));

      const qrBuffer = await QRCode.toBuffer(verificationUrl, {
        errorCorrectionLevel: n.qrErrorCorrectionLevel || "M",
        margin: 1,
        width: qrWidth * 2, // 2x for sharp printing density
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      doc.image(qrBuffer, n.qrX, n.qrY, {
        width: qrWidth,
        height: qrHeight,
      });
    }

    doc.end();
  } catch (error) {
    console.error("Certificate generation error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate certificate", error: error.message });
    }
  }
};

export const saveTemplate = async (req, res) => {
  const { eventId } = req.params;
  const config = req.body;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isAuthorized = hasPermission(req.user, PERMISSIONS.EVENT_CERTIFICATE, event);
    if (!isAuthorized) {
      return res.status(403).json({
        message: "Unauthorized to update this event's template.",
      });
    }

    const templateData = {
      imageUrl: config.imageUrl,
      imageWidth: parseInt(config.imageWidth),
      imageHeight: parseInt(config.imageHeight),

      // Student Name Element
      nameX: parseInt(config.nameX),
      nameY: parseInt(config.nameY),
      nameWidth: parseInt(config.nameWidth),
      nameHeight: parseInt(config.nameHeight),
      fontSize: parseInt(config.fontSize) || 32,
      color: config.color || "#000000",
      font: config.font || "Helvetica-Bold",
      align: config.align || "center",

      // Roll Number Element
      showRollNo: Boolean(config.showRollNo),
      rollNoX: config.rollNoX !== undefined ? parseInt(config.rollNoX) : 0,
      rollNoY: config.rollNoY !== undefined ? parseInt(config.rollNoY) : 0,
      rollNoWidth: config.rollNoWidth !== undefined ? parseInt(config.rollNoWidth) : 0,
      rollNoHeight: config.rollNoHeight !== undefined ? parseInt(config.rollNoHeight) : 0,
      rollNoFontSize: parseInt(config.rollNoFontSize) || 20,
      rollNoColor: config.rollNoColor || "#000000",
      rollNoFont: config.rollNoFont || "Helvetica",
      rollNoAlign: config.rollNoAlign || "center",
      rollNoFormat: config.rollNoFormat || "parentheses",

      // Position / Award Element
      showPosition: Boolean(config.showPosition),
      positionX: config.positionX !== undefined ? parseInt(config.positionX) : 0,
      positionY: config.positionY !== undefined ? parseInt(config.positionY) : 0,
      positionWidth: config.positionWidth !== undefined ? parseInt(config.positionWidth) : 0,
      positionHeight: config.positionHeight !== undefined ? parseInt(config.positionHeight) : 0,
      positionFontSize: parseInt(config.positionFontSize) || 24,
      positionColor: config.positionColor || "#000000",
      positionFont: config.positionFont || "Helvetica-Bold",
      positionAlign: config.positionAlign || "center",

      // QR Code Verification Element
      showQr: Boolean(config.showQr),
      qrX: config.qrX !== undefined ? parseInt(config.qrX) : 0,
      qrY: config.qrY !== undefined ? parseInt(config.qrY) : 0,
      qrWidth: config.qrWidth !== undefined ? parseInt(config.qrWidth) : 100,
      qrHeight: config.qrHeight !== undefined ? parseInt(config.qrHeight) : 100,
      qrErrorCorrectionLevel: config.qrErrorCorrectionLevel || "M",
    };

    await prisma.event.update({
      where: { id: eventId },
      data: {
        provideCertificate: true,
        certificateTemplate: templateData,
      },
    });

    res.json({ success: true, message: "Certificate template saved successfully.", template: templateData });
  } catch (error) {
    res.status(500).json({ message: "Failed to save template", error: error.message });
  }
};

export const uploadTemplateProxy = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Unsupported template image type. Only JPG, PNG, and WEBP are supported.",
      });
    }

    const result = await uploadImage(req.file.buffer, "certificates");
    res.json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Certificate template upload error:", error);
    const isPermissionError = error?.http_code === 403 || error?.message?.includes("403");
    const message = isPermissionError
      ? "Cloudinary rejected the upload: The configured API Key is missing upload/create permissions. Please check Cloudinary Settings -> Access Keys and enable 'Create' permissions or use the Master Key."
      : error?.message || "Failed to upload to Cloudinary via server";

    res.status(500).json({
      message,
      error: error?.message || "Cloudinary upload failed",
    });
  }
};

/**
 * Public certificate verification endpoint.
 * Accessible without login. Strictly returns safe public verification metadata.
 */
export const verifyCertificateByToken = async (req, res) => {
  const { token } = req.params;
  const cleanToken = (token || "").trim();

  if (!cleanToken || cleanToken.length < 8) {
    return res.status(400).json({
      valid: false,
      status: "INVALID_TOKEN",
      message: "Invalid verification code format.",
    });
  }

  try {
    // Lookup by cryptographic verificationToken OR human-readable certificateNumber (case-insensitive)
    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [
          { verificationToken: cleanToken },
          { certificateNumber: { equals: cleanToken, mode: "insensitive" } },
        ],
      },
      include: {
        event: {
          select: {
            title: true,
            startTime: true,
            endTime: true,
            venue: true,
            club: { select: { clubName: true, clubLogo: true } },
          },
        },
      },
    });

    if (!cert) {
      return res.status(404).json({
        valid: false,
        status: "NOT_FOUND",
        message: "Certificate not found. The certificate may not exist or the link is invalid.",
      });
    }

    const isRevoked = cert.status === "REVOKED";

    return res.json({
      valid: !isRevoked,
      status: cert.status, // "ISSUED" or "REVOKED"
      certificate: {
        certificateNumber: cert.certificateNumber,
        studentName: cert.recipientName,
        rollNo: cert.recipientRollNo || "N/A",
        eventTitle: cert.event?.title || cert.metadata?.eventTitle || "CampusNode Event",
        eventDate: cert.event?.startTime || cert.metadata?.eventDate,
        awardPosition: cert.awardPosition,
        issuingClub: cert.event?.club?.clubName || cert.metadata?.clubName || "CampusNode Organization",
        issuingClubLogo: cert.event?.club?.clubLogo || null,
        issuedAt: cert.issuedAt,
        revokedAt: cert.revokedAt,
        revocationReason: cert.revocationReason,
      },
    });
  } catch (error) {
    console.error("Public certificate verification error:", error);
    return res.status(500).json({ message: "Verification check failed.", error: error.message });
  }
};

/**
 * Revoke an issued certificate.
 * Protected endpoint requiring PERMISSIONS.EVENT_CERTIFICATE.
 */
export const revokeCertificate = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!certificate) return res.status(404).json({ message: "Certificate not found" });

    const isAuthorized = hasPermission(req.user, PERMISSIONS.EVENT_CERTIFICATE, certificate.event);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to revoke certificates for this event." });
    }

    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revocationReason: reason || "Certificate revoked by event administrator.",
      },
    });

    return res.json({
      success: true,
      message: "Certificate revoked successfully.",
      certificate: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to revoke certificate", error: error.message });
  }
};

/**
 * List all issued certificates for an event.
 * Protected endpoint requiring PERMISSIONS.EVENT_CERTIFICATE.
 */
export const getIssuedCertificates = async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isAuthorized = hasPermission(req.user, PERMISSIONS.EVENT_CERTIFICATE, event);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Unauthorized to view certificates for this event." });
    }

    const certificates = await prisma.certificate.findMany({
      where: { eventId },
      orderBy: { issuedAt: "desc" },
    });

    return res.json({ certificates });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch certificates", error: error.message });
  }
};
