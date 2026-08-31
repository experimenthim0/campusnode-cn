import express from "express";
import prisma from "../lib/prisma.js";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import cloudinary from "../utils/cloudinary.js";

const router = express.Router();

router.use(verifyToken, requirePermission(PERMISSIONS.LOST_FOUND_MODERATE));

router.get("/all", async (req, res) => {
  try {
    const items = await prisma.lostFoundItem.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, isBlocked: true } }
      }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const total = await prisma.lostFoundItem.count();
    const active = await prisma.lostFoundItem.count({ where: { status: "ACTIVE" } });
    const reunited = await prisma.lostFoundItem.count({ where: { status: "REUNITED" } });
    const fraud = await prisma.lostFoundItem.count({ where: { isFraud: true } });
    
    res.json({ total, active, reunited, fraud });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: "Item not found" });

    await prisma.lostFoundItem.delete({
      where: { id: req.params.id }
    });
    if (item.imagePublicId) {
      cloudinary.uploader.destroy(item.imagePublicId).catch((error) => {
        console.error("Cloudinary cleanup failed:", error.message);
      });
    }
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.patch("/:id/toggle-fraud", async (req, res) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const updated = await prisma.lostFoundItem.update({
      where: { id: req.params.id },
      data: { isFraud: !item.isFraud }
    });

    res.json({ message: `Item marked as ${updated.isFraud ? 'fraud' : 'not fraud'}`, item: updated });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.patch("/user/:userId/block", async (req, res) => {
  try {
    const user = await prisma.studentUser.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const updated = await prisma.studentUser.update({
      where: { id: req.params.userId },
      data: { 
        isBlocked: !user.isBlocked,
        accessLevel: !user.isBlocked ? "restricted" : "normal"
      }
    });

    res.json({ message: `User ${updated.isBlocked ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

export default router;
