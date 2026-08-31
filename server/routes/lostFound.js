import express from "express";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { verifyToken } from "../middleware/auth.js";
import { generateSignature, uploadImage, deleteImage } from "../utils/cloudinary.js";
import { createObjectId } from "../utils/objectId.js";
import { sanitizeFields } from "../utils/sanitizeInput.js";
import { sendWebPushNotification } from "../utils/sendPush.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, png, webp, gif) are allowed."), false);
    }
  },
});

const checkBlocked = async (req, res, next) => {
  try {
    const user = await prisma.studentUser.findUnique({
      where: { id: req.user.userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is restricted from using Lost & Found." });
    }
    
    if (user.shopBlockedUntil && new Date(user.shopBlockedUntil) > new Date()) {
      return res.status(403).json({ message: `Your account is temporarily suspended until ${new Date(user.shopBlockedUntil).toLocaleDateString()}` });
    }
    
    req.fullUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error checking block status" });
  }
};

router.post("/", verifyToken, checkBlocked, async (req, res) => {
  try {
    sanitizeFields(req.body, ["title", "description", "whatsapp"]);
    const { title, description, type, image_url, image_public_id, whatsapp } = req.body;
    const student = req.fullUser;

    const today = new Date().setHours(0, 0, 0, 0);
    const lastPostDate = student.lastLostFoundPostDate ? new Date(student.lastLostFoundPostDate).setHours(0, 0, 0, 0) : null;

    let newCount = student.lostFoundPostCount;
    if (lastPostDate === today) {
      if (newCount >= 2) {
        return res.status(429).json({ message: "Post limit reached (2 per day). Please try again tomorrow." });
      }
      newCount += 1;
    } else {
      newCount = 1;
    }

    const newItem = await prisma.$transaction(async (tx) => {
      const item = await tx.lostFoundItem.create({
        data: {
          id: createObjectId(),
          title,
          description,
          type: type === "Found" ? "FOUND" : "LOST",
          imageUrl: image_url,
          imagePublicId: image_public_id,
          whatsapp,
          userId: student.id,
        }
      });

      await tx.studentUser.update({
        where: { id: student.id },
        data: {
          lostFoundPostCount: newCount,
          lastLostFoundPostDate: new Date()
        }
      });

      return item;
    });

    res.status(201).json({ message: "Post created successfully", post: newItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/upload", verifyToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const result = await uploadImage(req.file.buffer, "lost-found");
    const publicId = result.public_id;

    // Schedule checking the database in 2 minutes. If post creation failed or cancelled, delete from Cloudinary.
    setTimeout(async () => {
      try {
        const item = await prisma.lostFoundItem.findFirst({
          where: { imagePublicId: publicId }
        });
        if (!item) {
          console.log(`[Auto-Cleanup] Deleting orphaned image: ${publicId}`);
          await deleteImage(publicId);
        }
      } catch (err) {
        console.error(`[Auto-Cleanup Error] Failed to delete orphaned image ${publicId}:`, err);
      }
    }, 2 * 60 * 1000); // 2 minutes

    res.json({ 
      secure_url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error("Upload Route Error:", error);
    res.status(500).json({ message: "Upload failed.", error: error.message });
  }
});

// GET /api/lost-found/signature - Get signature for Cloudinary upload
router.get("/signature", verifyToken, (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = generateSignature({ timestamp, folder: "lost-found" });
    res.json({ 
      signature, 
      timestamp, 
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const items = await prisma.lostFoundItem.findMany({
      where: {
        OR: [
          { status: "ACTIVE" },
          {
            status: "REUNITED",
            reunitedAt: { gte: oneDayAgo }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/my-posts", verifyToken, async (req, res) => {
  try {
    const items = await prisma.lostFoundItem.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.patch("/:id/reunite", verifyToken, async (req, res) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({
      where: { id: req.params.id }
    });
    
    if (!item || item.userId !== req.user.userId) {
      return res.status(404).json({ message: "Item not found or unauthorized." });
    }

    // Delete all reports and notification alerts associated with this item upon reunification
    await prisma.$transaction([
      prisma.lostFoundReport.deleteMany({
        where: { itemId: req.params.id }
      }),
      prisma.notification.deleteMany({
        where: { lostFoundItemId: req.params.id }
      }),
      prisma.lostFoundItem.update({
        where: { id: req.params.id },
        data: { 
          status: "REUNITED",
          reunitedAt: new Date()
        }
      })
    ]);
    
    res.json({ message: "Item marked as reunited" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/:id/report", verifyToken, async (req, res) => {
  try {
    sanitizeFields(req.body, ["reason"]);
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please provide a reason for reporting." });
    }

    const { userId } = req.user;

    const result = await prisma.$transaction(async (tx) => {
      const items = await tx.$queryRaw`
        SELECT * FROM "LostFoundItem" WHERE id = ${req.params.id} FOR UPDATE
      `;
      const dbItem = items[0];

      if (!dbItem) {
        throw new Error("NOT_FOUND");
      }
      if (dbItem.userId === userId) {
        throw new Error("OWN_POST");
      }
      if (dbItem.reportedBy.includes(userId)) {
        throw new Error("ALREADY_REPORTED");
      }

      const newReportedBy = [...dbItem.reportedBy, userId];
      let isFraud = dbItem.isFraud;

      if (newReportedBy.length >= 3) {
        isFraud = true;
        await tx.studentUser.update({
          where: { id: dbItem.userId },
          data: {
            shopBlockedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        });
      }

      const updated = await tx.lostFoundItem.update({
        where: { id: req.params.id },
        data: {
          reportedBy: newReportedBy,
          isFraud
        }
      });

      return { updated, itemTitle: dbItem.title, ownerId: dbItem.userId };
    });

    const reporter = await prisma.studentUser.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    const ownerNotification = await prisma.notification.create({
      data: {
        id: createObjectId(),
        senderStudentId: req.user.userId,
        recipientStudentId: result.ownerId, // targeted only to the post owner
        lostFoundItemId: req.params.id,     // links to the item for cascade delete
        title: "⚠️ Your L&F post was reported",
        message: `${reporter?.name || 'Someone'} reported your post "${result.itemTitle}" — Reason: ${reason.trim()}`
      }
    });

    const reporterNotification = await prisma.notification.create({
      data: {
        id: createObjectId(),
        senderStudentId: req.user.userId,
        recipientStudentId: req.user.userId, // targeted only to the reporter
        lostFoundItemId: req.params.id,      // links to the item for cascade delete
        title: "Report Submitted Successfully",
        message: `You successfully reported the post "${result.itemTitle}" — Reason: ${reason.trim()}`
      }
    });

    if (req.io) {
      req.io.to(result.ownerId).emit("new-notification", {
        ...ownerNotification,
        _id: ownerNotification.id
      });
      req.io.to(req.user.userId).emit("new-notification", {
        ...reporterNotification,
        _id: reporterNotification.id
      });
    }

    sendWebPushNotification(result.ownerId, { ...ownerNotification, _id: ownerNotification.id });
    sendWebPushNotification(req.user.userId, { ...reporterNotification, _id: reporterNotification.id });

    res.json({ message: "Report submitted. Thank you for keeping the community safe." });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Item not found." });
    }
    if (error.message === "OWN_POST") {
      return res.status(400).json({ message: "You cannot report your own item." });
    }
    if (error.message === "ALREADY_REPORTED") {
      return res.status(400).json({ message: "You have already reported this item." });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/:id/claim", verifyToken, checkBlocked, async (req, res) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    if (!item) return res.status(404).json({ message: "Item not found." });
    if (item.userId === req.user.userId) return res.status(400).json({ message: "You cannot claim your own item." });

    res.json({ 
      message: "Item claim requested", 
      contact: {
        name: item.user.name,
        email: item.user.email,
        whatsapp: item.whatsapp
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/:id/report-liar", verifyToken, async (req, res) => {
  try {
    const { liarId, reason } = req.body;
    
    if (!liarId) return res.status(400).json({ message: "Liar ID is required" });

    const item = await prisma.lostFoundItem.findUnique({
      where: { id: req.params.id }
    });

    if (!item || item.userId !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized or item not found." });
    }

    if (liarId === req.user.userId || liarId === item.userId) {
      return res.status(400).json({ message: "Invalid reported user." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.lostFoundReport.create({
        data: {
          id: createObjectId(),
          itemId: item.id,
          reporterId: req.user.userId,
          liarId,
          reason: reason || "False claim"
        }
      });

      await tx.studentUser.update({
        where: { id: liarId },
        data: {
          isBlocked: true,
          accessLevel: "restricted"
        }
      });
    });

    res.json({ message: "User reported and restricted." });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

export default router;
