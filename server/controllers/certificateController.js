import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { uploadImage } from "../utils/cloudinary.js";
import prisma from "../lib/prisma.js";

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

export const downloadCertificate = async (req, res) => {
  const { eventId } = req.params;
  const studentId = req.user.userId;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
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

    // Look up the student's or external user's participation record
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
        student: { select: { id: true, name: true } },
        externalUser: { select: { id: true, name: true } },
      },
    });

    if (!participation) {
      return res.status(403).json({ message: "You are not registered for this event." });
    }

    if (participation.status !== "ATTENDED") {
      return res.status(403).json({
        message: "Certificates are only available to participants who attended the event. Please contact the coordinator if you attended but were not marked.",
      });
    }

    const userName = participation.student?.name || participation.externalUser?.name || participation.externalName;
    if (!userName) {
      return res.status(422).json({ message: "Participant name is missing." });
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
      return res.status(502).json({ message: "Certificate background could not be loaded.", error: error.message });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}_Certificate.pdf"`);

    const doc = new PDFDocument({ size: docSize });
    doc.pipe(res);
    doc.image(backgroundBuffer, 0, 0, { width: docSize[0], height: docSize[1] });

    const fontSrc = CUSTOM_FONTS[n.font];
    if (fontSrc && fs.existsSync(fontSrc)) {
      doc.registerFont(n.font, fontSrc);
      doc.font(n.font);
    } else {
      doc.font("Helvetica-Bold");
    }

    doc.fontSize(n.fontSize);
    const textHeight = doc.currentLineHeight(true);
    const boxH = n.nameHeight || textHeight;
    const centeredY = n.nameY + (boxH - textHeight) / 2;

    doc
      .fillColor(n.color)
      .text(userName, n.nameX, centeredY, {
        width: n.nameWidth,
        align: n.align,
        lineBreak: false,
      });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: "Failed to generate certificate", error: error.message });
  }
};

export const saveTemplate = async (req, res) => {
  const { eventId } = req.params;
  const config = req.body;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isCreator = event.createdById === req.user.userId;
    const isAdmin = req.user.role === "admin";
    const isAssignedFaculty =
      req.user.role === "facultyCoordinator" && event.clubId === req.user.clubId;

    if (!isCreator && !isAdmin && !isAssignedFaculty) {
      return res.status(403).json({
        message: "Unauthorized to update this event's template.",
      });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        certificateTemplate: {
          imageUrl: config.imageUrl,
          nameX: parseInt(config.nameX),
          nameY: parseInt(config.nameY),
          nameWidth: parseInt(config.nameWidth),
          nameHeight: parseInt(config.nameHeight),
          fontSize: parseInt(config.fontSize) || 32,
          color: config.color || "#000000",
          font: config.font || "Helvetica-Bold",
          align: config.align || "center",
          imageWidth: parseInt(config.imageWidth),
          imageHeight: parseInt(config.imageHeight),
        },
      },
    });

    res.json({ success: true, message: "Certificate template saved successfully." });
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
      return res.status(400).json({ message: "Unsupported template image type." });
    }

    const result = await uploadImage(req.file.buffer, "certificates");
    res.json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to upload to Cloudinary via server",
      error: error.message,
    });
  }
};
