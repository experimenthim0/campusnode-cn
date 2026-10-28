import express from "express";
import multer from "multer";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { verifyToken, allowRoles } from "../middleware/auth.js";
import { createObjectId } from "../utils/objectId.js";
import { uploadImage } from "../utils/cloudinary.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per image
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, png, webp, gif, svg) are allowed."), false);
    }
  },
});

const MAX_PINNED_COUNT = 3;

function isValidUrl(string) {
  if (!string || typeof string !== "string") return false;
  try {
    const parsed = new URL(string.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ==============================================================================
// PUBLIC ENDPOINTS (STUDENTS / GUESTS)
// ==============================================================================

/**
 * GET /api/campus-updates
 * Retrieves published updates with category filtering, search, and pagination.
 * Pinned updates (max 3) appear at top on the first page, followed by regular updates.
 */
router.get("/", async (req, res) => {
  try {
    const category = (req.query.category || "ALL").toUpperCase();
    const search = (req.query.search || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const targetPostId = req.query.postId ? String(req.query.postId).trim() : null;

    // Base condition: strictly published posts
    const baseWhere = {
      status: "PUBLISHED",
    };

    // Category filter
    if (["OFFICIAL", "TPO", "IMPORTANT"].includes(category)) {
      baseWhere.category = category;
    }

    // Search filter across title, description, and organizationName
    if (search) {
      baseWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { organizationName: { contains: search, mode: "insensitive" } },
      ];
    }

    // 1. Fetch pinned posts (only on page 1 to prevent repeats on pagination)
    let pinnedPosts = [];
    if (page === 1) {
      pinnedPosts = await prisma.campusUpdate.findMany({
        where: {
          ...baseWhere,
          isPinned: true,
        },
        orderBy: [
          { pinnedAt: "desc" },
          { publishedAt: "desc" },
        ],
        take: MAX_PINNED_COUNT,
      });
    }

    const pinnedIds = pinnedPosts.map((p) => p.id);

    // 2. Query condition for regular (unpinned) posts
    const regularWhere = {
      ...baseWhere,
      isPinned: false,
    };

    // If on page 1, ensure none of the returned pinned IDs can appear
    if (pinnedIds.length > 0) {
      regularWhere.id = { notIn: pinnedIds };
    }

    // If a specific target post is requested via deep link and we're on page 1,
    // verify if it's already in pinnedPosts. If not, we can ensure it's fetched.
    let targetPost = null;
    if (targetPostId && page === 1 && !pinnedIds.includes(targetPostId)) {
      try {
        const found = await prisma.campusUpdate.findFirst({
          where: {
            id: targetPostId,
            status: "PUBLISHED",
          },
        });
        if (found) {
          targetPost = found;
        }
      } catch (err) {
        console.error("Error looking up target deep link post:", err);
      }
    }

    const totalRegular = await prisma.campusUpdate.count({
      where: regularWhere,
    });

    // Calculate skip and take for regular posts
    // Adjusted limit for page 1 if pinned posts exist
    const skip = (page - 1) * limit;
    const regularPosts = await prisma.campusUpdate.findMany({
      where: regularWhere,
      orderBy: {
        publishedAt: "desc",
      },
      skip,
      take: limit,
    });

    // If target post was found and isn't in regularPosts or pinnedPosts, prepend it
    let combined = [];
    if (page === 1) {
      const existingIds = new Set([...pinnedIds, ...regularPosts.map((p) => p.id)]);
      if (targetPost && !existingIds.has(targetPost.id)) {
        combined = [...pinnedPosts, targetPost, ...regularPosts];
      } else {
        combined = [...pinnedPosts, ...regularPosts];
      }
    } else {
      combined = regularPosts;
    }

    const totalCount = totalRegular + (page === 1 ? pinnedPosts.length : 0);
    const totalPages = Math.max(1, Math.ceil(totalRegular / limit));

    return res.json({
      success: true,
      updates: combined,
      pinnedCount: pinnedPosts.length,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching campus updates:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch campus updates.",
      error: error.message,
    });
  }
});

/**
 * GET /api/campus-updates/:id
 * Direct single post lookup for deep linking and verification.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ success: false, message: "Valid post ID required." });
    }

    const update = await prisma.campusUpdate.findUnique({
      where: { id },
    });

    if (!update || update.status !== "PUBLISHED") {
      return res.status(404).json({
        success: false,
        message: "The requested update is unavailable, unpublished, or has been removed.",
      });
    }

    return res.json({
      success: true,
      update,
    });
  } catch (error) {
    console.error("Error fetching single update:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch post details.",
      error: error.message,
    });
  }
});

// ==============================================================================
// ADMINISTRATIVE ENDPOINTS (ADMIN ROLE ONLY)
// ==============================================================================

/**
 * GET /api/campus-updates/admin/all
 * Administrative overview of all updates (published, drafts, archived).
 */
router.get("/admin/all", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const status = (req.query.status || "ALL").toUpperCase();
    const category = (req.query.category || "ALL").toUpperCase();
    const search = (req.query.search || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const where = {};

    if (["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) {
      where.status = status;
    }

    if (["OFFICIAL", "TPO", "IMPORTANT"].includes(category)) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { organizationName: { contains: search, mode: "insensitive" } },
        { sourceReference: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, updates, publishedCount, draftCount, pinnedCount] = await Promise.all([
      prisma.campusUpdate.count({ where }),
      prisma.campusUpdate.findMany({
        where,
        orderBy: [
          { isPinned: "desc" },
          { updatedAt: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campusUpdate.count({ where: { status: "PUBLISHED" } }),
      prisma.campusUpdate.count({ where: { status: "DRAFT" } }),
      prisma.campusUpdate.count({ where: { isPinned: true, status: "PUBLISHED" } }),
    ]);

    return res.json({
      success: true,
      updates,
      stats: {
        total,
        publishedCount,
        draftCount,
        pinnedCount,
        maxPinned: MAX_PINNED_COUNT,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Admin fetch updates error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load admin updates.",
      error: error.message,
    });
  }
});

/**
 * POST /api/campus-updates/admin/upload-media
 * Upload multiple images to Cloudinary for post posters/galleries.
 */
router.post(
  "/admin/upload-media",
  verifyToken,
  allowRoles("admin"),
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No image files provided." });
      }

      const uploadPromises = req.files.map((file) =>
        uploadImage(file.buffer, "campus-updates", {
          folder: "campus-updates",
          quality: "auto:good",
          fetch_format: "auto",
        })
      );

      const results = await Promise.all(uploadPromises);
      const urls = results.map((r) => r.secure_url);

      return res.json({
        success: true,
        message: `Successfully uploaded ${urls.length} images.`,
        urls,
      });
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload media.",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/campus-updates/admin
 * Creates a new campus announcement.
 */
router.post("/admin", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      organizationName,
      organizationAvatar,
      images,
      attachments,
      deadline,
      actionLabel,
      actionUrl,
      sourceReference,
      isPinned,
      status,
    } = req.body;

    // Validation
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Title must be at least 3 characters." });
    }

    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return res.status(400).json({ success: false, message: "Description must be at least 5 characters." });
    }

    const validCategories = ["OFFICIAL", "TPO", "IMPORTANT"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed: ${validCategories.join(", ")}`,
      });
    }

    if (!organizationName || typeof organizationName !== "string" || organizationName.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Organization name is required." });
    }

    if (actionUrl && !isValidUrl(actionUrl)) {
      return res.status(400).json({ success: false, message: "Action URL must be a valid http or https web address." });
    }

    const resolvedStatus = status === "DRAFT" ? "DRAFT" : "PUBLISHED";
    const resolvedPinned = Boolean(isPinned);

    // If pinning a published post, enforce max 3 pinned
    if (resolvedPinned && resolvedStatus === "PUBLISHED") {
      const currentPinnedCount = await prisma.campusUpdate.count({
        where: { isPinned: true, status: "PUBLISHED" },
      });
      if (currentPinnedCount >= MAX_PINNED_COUNT) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_PINNED_COUNT} pinned updates allowed. Please unpin an announcement first.`,
        });
      }
    }

    let parsedDeadline = null;
    if (deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime())) {
        parsedDeadline = d;
      }
    }

    const newId = createObjectId();
    const created = await prisma.campusUpdate.create({
      data: {
        id: newId,
        title: title.trim(),
        description: description.trim(),
        category,
        organizationName: organizationName.trim(),
        organizationAvatar: organizationAvatar?.trim() || null,
        images: Array.isArray(images) ? images.filter((img) => typeof img === "string" && img.trim()) : [],
        attachments: Array.isArray(attachments) ? attachments : null,
        deadline: parsedDeadline,
        actionLabel: actionLabel?.trim() || null,
        actionUrl: actionUrl?.trim() || null,
        sourceReference: sourceReference?.trim() || null,
        isPinned: resolvedPinned,
        pinnedAt: resolvedPinned ? new Date() : null,
        status: resolvedStatus,
        publishedAt: resolvedStatus === "PUBLISHED" ? new Date() : new Date(),
        createdById: req.user?.id || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Post successfully ${resolvedStatus === "PUBLISHED" ? "published" : "saved as draft"}.`,
      update: created,
    });
  } catch (error) {
    console.error("Create update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create campus update.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/campus-updates/admin/:id
 * Updates an existing campus update.
 */
router.put("/admin/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.campusUpdate.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Update not found." });
    }

    const {
      title,
      description,
      category,
      organizationName,
      organizationAvatar,
      images,
      attachments,
      deadline,
      actionLabel,
      actionUrl,
      sourceReference,
      isPinned,
      status,
    } = req.body;

    if (title && (typeof title !== "string" || title.trim().length < 3)) {
      return res.status(400).json({ success: false, message: "Title must be at least 3 characters." });
    }

    if (description && (typeof description !== "string" || description.trim().length < 5)) {
      return res.status(400).json({ success: false, message: "Description must be at least 5 characters." });
    }

    if (category && !["OFFICIAL", "TPO", "IMPORTANT"].includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category." });
    }

    if (actionUrl && !isValidUrl(actionUrl)) {
      return res.status(400).json({ success: false, message: "Action URL must be a valid http or https web address." });
    }

    const targetPinned = isPinned !== undefined ? Boolean(isPinned) : existing.isPinned;
    const targetStatus = status !== undefined ? status : existing.status;

    // Check pinning limit if turning pin ON
    if (targetPinned && !existing.isPinned && targetStatus === "PUBLISHED") {
      const currentPinnedCount = await prisma.campusUpdate.count({
        where: { isPinned: true, status: "PUBLISHED" },
      });
      if (currentPinnedCount >= MAX_PINNED_COUNT) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_PINNED_COUNT} pinned updates allowed. Please unpin an announcement first.`,
        });
      }
    }

    let parsedDeadline = existing.deadline;
    if (deadline !== undefined) {
      if (deadline === null || deadline === "") {
        parsedDeadline = null;
      } else {
        const d = new Date(deadline);
        if (!isNaN(d.getTime())) parsedDeadline = d;
      }
    }

    const updateData = {
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? description.trim() : existing.description,
      category: category !== undefined ? category : existing.category,
      organizationName: organizationName !== undefined ? organizationName.trim() : existing.organizationName,
      organizationAvatar: organizationAvatar !== undefined ? (organizationAvatar?.trim() || null) : existing.organizationAvatar,
      images: images !== undefined && Array.isArray(images) ? images.filter((img) => typeof img === "string" && img.trim()) : existing.images,
      attachments: attachments !== undefined ? attachments : existing.attachments,
      deadline: parsedDeadline,
      actionLabel: actionLabel !== undefined ? (actionLabel?.trim() || null) : existing.actionLabel,
      actionUrl: actionUrl !== undefined ? (actionUrl?.trim() || null) : existing.actionUrl,
      sourceReference: sourceReference !== undefined ? (sourceReference?.trim() || null) : existing.sourceReference,
      isPinned: targetPinned,
      pinnedAt: targetPinned ? (existing.pinnedAt || new Date()) : null,
      status: targetStatus,
      updatedAt: new Date(),
    };

    // If publishing for the first time from DRAFT
    if (existing.status === "DRAFT" && targetStatus === "PUBLISHED") {
      updateData.publishedAt = new Date();
    }

    const updated = await prisma.campusUpdate.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      message: "Campus update successfully modified.",
      update: updated,
    });
  } catch (error) {
    console.error("Update campus update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update post.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/campus-updates/admin/:id/pin
 * Quick toggle pin/unpin status.
 */
router.patch("/admin/:id/pin", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.campusUpdate.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Update not found." });
    }

    const targetPinned = !existing.isPinned;

    if (targetPinned) {
      const currentPinnedCount = await prisma.campusUpdate.count({
        where: { isPinned: true, status: "PUBLISHED" },
      });
      if (currentPinnedCount >= MAX_PINNED_COUNT) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_PINNED_COUNT} pinned updates allowed. Please unpin an announcement first.`,
        });
      }
    }

    const updated = await prisma.campusUpdate.update({
      where: { id },
      data: {
        isPinned: targetPinned,
        pinnedAt: targetPinned ? new Date() : null,
      },
    });

    return res.json({
      success: true,
      message: targetPinned ? "Update pinned to top." : "Update unpinned.",
      isPinned: updated.isPinned,
      update: updated,
    });
  } catch (error) {
    console.error("Toggle pin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle pin status.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/campus-updates/admin/:id/status
 * Quick toggle publish / draft status.
 */
router.patch("/admin/:id/status", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.campusUpdate.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Update not found." });
    }

    const targetStatus = existing.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const updateData = {
      status: targetStatus,
    };

    if (targetStatus === "PUBLISHED") {
      updateData.publishedAt = new Date();
    } else {
      // If moving to draft, unpin it
      updateData.isPinned = false;
      updateData.pinnedAt = null;
    }

    const updated = await prisma.campusUpdate.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      message: targetStatus === "PUBLISHED" ? "Update published to student feed." : "Update moved to drafts.",
      status: updated.status,
      update: updated,
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change publication status.",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/campus-updates/admin/:id
 * Permanently deletes a campus update.
 */
router.delete("/admin/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.campusUpdate.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Update not found." });
    }

    await prisma.campusUpdate.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Campus update deleted successfully.",
    });
  } catch (error) {
    console.error("Delete update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete update.",
      error: error.message,
    });
  }
});

export default router;
