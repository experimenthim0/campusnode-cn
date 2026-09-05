import express from "express";
import multer from "multer";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import { createObjectId } from "../utils/objectId.js";
import { uploadImage } from "../utils/cloudinary.js";
import { getEventStatus } from "../utils/eventStatus.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, png, webp, gif, svg) are allowed."), false);
    }
  },
});

function resolveHostName(event) {
  if (!event) return "College Event";
  if (event.club?.clubName) return event.club.clubName;
  if (event.organizerType === "CENTRAL" || event.centralOrganizerId || event.institutionalAccountId) {
    return "Office of DSW (Central Event)";
  }
  return "College Community";
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatFeaturedEvent(fe, event) {
  // Take sponsor name directly from the event itself if present, else fallback to fe.sponsorName
  let sponsorName = null;
  let sponsorLogo = null;
  let primarySponsor = null;

  if (event?.sponsors && Array.isArray(event.sponsors) && event.sponsors.length > 0) {
    sponsorName = event.sponsors
      .map((s) => s.name?.trim())
      .filter(Boolean)
      .join(", ");
    primarySponsor = event.sponsors[0];
    sponsorLogo = primarySponsor.logoUrl || null;
  }

  if (!sponsorName && fe?.sponsorName) {
    sponsorName = fe.sponsorName.trim();
  }

  if (!sponsorLogo && fe?.sponsorLogo) {
    sponsorLogo = fe.sponsorLogo.trim();
  }

  const sponsorObj = primarySponsor
    ? {
        id: primarySponsor.id,
        name: primarySponsor.name,
        logoUrl: primarySponsor.logoUrl,
      }
    : (sponsorName || sponsorLogo)
    ? {
        name: sponsorName,
        logoUrl: sponsorLogo,
      }
    : null;

  let sponsorsList = [];
  if (event?.sponsors && Array.isArray(event.sponsors) && event.sponsors.length > 0) {
    sponsorsList = event.sponsors.map((s) => ({
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl || null,
    }));
  } else if (sponsorObj) {
    sponsorsList = [sponsorObj];
  }

  return {
    id: fe.id,
    eventId: fe.eventId,
    sponsorName: sponsorName || null,
    sponsorLogo: sponsorLogo || null,
    sponsor: sponsorObj,
    sponsors: sponsorsList,
    displayOrder: fe.displayOrder,
    isActive: fe.isActive,
    title: event?.title || "",
    slug: event?.slug || event?.id || "",
    startTime: event?.startTime,
    endTime: event?.endTime,
    venue: event?.venue,
    organizerType: event?.organizerType,
    hostName: resolveHostName(event),
    club: event?.club || null,
    eventStatus: event ? getEventStatus(event.startTime, event.endTime) : "UNKNOWN",
  };
}

async function getFeaturedEventSetting() {
  try {
    let setting = await prisma.featuredEventSetting.findUnique({
      where: { id: "default" },
    });
    if (!setting) {
      setting = await prisma.featuredEventSetting.upsert({
        where: { id: "default" },
        create: { id: "default", orderingMode: "CUSTOM" },
        update: {},
      });
    }
    return setting;
  } catch (e) {
    return { id: "default", orderingMode: "CUSTOM" };
  }
}

// ─────────────────────────────────────────────────────────────
// 1. PUBLIC: GET /api/featured-events (Homepage & Event Feed - top 3 or all)
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const setting = await getFeaturedEventSetting();
    const orderingMode = setting.orderingMode || "CUSTOM";
    const now = new Date();

    const featuredRows = await prisma.featuredEvent.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    if (featuredRows.length === 0) {
      return res.json({ events: [], orderingMode, totalActive: 0 });
    }

    const eventIds = featuredRows.map((fe) => fe.eventId);
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        reviewStatus: "PUBLISHED",
        endTime: { gte: now },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        startTime: true,
        endTime: true,
        venue: true,
        organizerType: true,
        centralOrganizerId: true,
        institutionalAccountId: true,
        reviewStatus: true,
        club: {
          select: {
            id: true,
            clubName: true,
            clubLogo: true,
            slug: true,
          },
        },
        sponsors: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    // Match each active featured row with its published event
    const validFeatured = featuredRows
      .map((fe) => ({ fe, event: eventMap.get(fe.eventId) }))
      .filter(({ event }) => Boolean(event));

    let selectedList = validFeatured;
    if (orderingMode === "AUTOMATIC") {
      selectedList = shuffleArray(validFeatured);
    }

    const isAll = req.query.all === "true" || req.query.limit === "all";
    const returnedItems = isAll ? selectedList : selectedList.slice(0, 3);
    const formattedEvents = returnedItems.map(({ fe, event }) => formatFeaturedEvent(fe, event));

    res.json({
      events: formattedEvents,
      orderingMode,
      totalActive: validFeatured.length,
    });
  } catch (err) {
    console.error("Error fetching public featured events:", err);
    res.status(500).json({ message: "Failed to fetch featured events." });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. PUBLIC: GET /api/featured-events/all (All Active Featured Events)
// ─────────────────────────────────────────────────────────────
router.get("/all", async (req, res) => {
  try {
    const setting = await getFeaturedEventSetting();
    const orderingMode = setting.orderingMode || "CUSTOM";
    const now = new Date();

    const featuredRows = await prisma.featuredEvent.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    if (featuredRows.length === 0) {
      return res.json({ events: [], orderingMode, totalActive: 0 });
    }

    const eventIds = featuredRows.map((fe) => fe.eventId);
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        reviewStatus: "PUBLISHED",
        endTime: { gte: now },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        startTime: true,
        endTime: true,
        venue: true,
        organizerType: true,
        centralOrganizerId: true,
        institutionalAccountId: true,
        reviewStatus: true,
        club: {
          select: {
            id: true,
            clubName: true,
            clubLogo: true,
            slug: true,
          },
        },
        sponsors: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    const validFeatured = featuredRows
      .map((fe) => ({ fe, event: eventMap.get(fe.eventId) }))
      .filter(({ event }) => Boolean(event));

    let selectedList = validFeatured;
    if (orderingMode === "AUTOMATIC") {
      selectedList = shuffleArray(validFeatured);
    }

    const allEvents = selectedList.map(({ fe, event }) => formatFeaturedEvent(fe, event));

    res.json({
      events: allEvents,
      orderingMode,
      totalActive: allEvents.length,
    });
  } catch (err) {
    console.error("Error fetching all featured events:", err);
    res.status(500).json({ message: "Failed to fetch all featured events." });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. PROTECTED: GET /api/featured-events/manage
// ─────────────────────────────────────────────────────────────
router.get("/manage", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const setting = await getFeaturedEventSetting();

    const allFeatured = await prisma.featuredEvent.findMany({
      orderBy: { displayOrder: "asc" },
    });

    const eventIds = allFeatured.map((fe) => fe.eventId);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        startTime: true,
        endTime: true,
        venue: true,
        organizerType: true,
        centralOrganizerId: true,
        institutionalAccountId: true,
        reviewStatus: true,
        club: {
          select: {
            id: true,
            clubName: true,
            clubLogo: true,
            slug: true,
          },
        },
        sponsors: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    // Auto-clean any orphan featured records where event no longer exists
    const orphanIds = allFeatured.filter((fe) => !eventMap.has(fe.eventId)).map((fe) => fe.id);
    if (orphanIds.length > 0) {
      await prisma.featuredEvent.deleteMany({ where: { id: { in: orphanIds } } });
    }

    const formatted = allFeatured
      .filter((fe) => eventMap.has(fe.eventId))
      .map((fe) => {
        const event = eventMap.get(fe.eventId);
        return {
          ...formatFeaturedEvent(fe, event),
          eventReviewStatus: event?.reviewStatus || "UNKNOWN",
          createdAt: fe.createdAt,
          updatedAt: fe.updatedAt,
        };
      });

    res.json({
      featuredEvents: formatted,
      orderingMode: setting.orderingMode || "CUSTOM",
    });
  } catch (err) {
    console.error("Error fetching manage featured events:", err);
    res.status(500).json({ message: "Failed to load featured events for management." });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. PROTECTED: GET /api/featured-events/candidates
// ─────────────────────────────────────────────────────────────
router.get("/candidates", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const { query } = req.query;
    const now = new Date();

    const where = {
      reviewStatus: "PUBLISHED",
      endTime: { gte: now },
    };

    if (query && typeof query === "string" && query.trim().length > 0) {
      const q = query.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { club: { clubName: { contains: q, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const [events, existingFeatured] = await Promise.all([
      prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          startTime: true,
          endTime: true,
          venue: true,
          organizerType: true,
          centralOrganizerId: true,
          institutionalAccountId: true,
          reviewStatus: true,
          club: {
            select: {
              id: true,
              clubName: true,
              clubLogo: true,
            },
          },
          sponsors: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: 50,
      }),
      prisma.featuredEvent.findMany({
        select: { id: true, eventId: true, isActive: true, displayOrder: true },
      }),
    ]);

    const featuredMap = new Map(existingFeatured.map((fe) => [fe.eventId, fe]));

    const candidates = events.map((e) => {
      const fe = featuredMap.get(e.id);
      const sponsorName = e.sponsors?.map((s) => s.name?.trim()).filter(Boolean).join(", ") || null;
      const primarySponsor = e.sponsors?.[0] || null;
      return {
        id: e.id,
        title: e.title,
        slug: e.slug || e.id,
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue,
        hostName: resolveHostName(e),
        reviewStatus: e.reviewStatus,
        status: getEventStatus(e.startTime, e.endTime),
        sponsorName,
        sponsor: primarySponsor
          ? {
              id: primarySponsor.id,
              name: primarySponsor.name,
              logoUrl: primarySponsor.logoUrl,
            }
          : null,
        sponsors: e.sponsors || [],
        isFeatured: Boolean(fe),
        featuredId: fe?.id || null,
        featuredActive: fe?.isActive ?? false,
      };
    });

    res.json({ candidates });
  } catch (err) {
    console.error("Error searching event candidates:", err);
    res.status(500).json({ message: "Failed to search candidate events." });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. PROTECTED: POST /api/featured-events
// ─────────────────────────────────────────────────────────────
const addFeaturedEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  sponsorName: z.string().trim().max(100).optional().nullable(),
  sponsorLogo: z.string().optional().nullable(),
});

router.post("/", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const parsed = addFeaturedEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
    }

    const { eventId, sponsorName, sponsorLogo } = parsed.data;

    // 1. Verify that event exists in Event table
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        startTime: true,
        endTime: true,
        venue: true,
        organizerType: true,
        centralOrganizerId: true,
        institutionalAccountId: true,
        club: { select: { id: true, clubName: true, clubLogo: true } },
        sponsors: { select: { id: true, name: true, logoUrl: true } },
      },
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // 2. Reject ended events
    if (new Date(event.endTime) < new Date()) {
      return res.status(400).json({ message: "Ended events cannot be featured. Only upcoming or live events can be featured." });
    }

    // 3. Prevent duplicate entries
    const existing = await prisma.featuredEvent.findUnique({
      where: { eventId },
    });
    if (existing) {
      return res.status(409).json({ message: "This event is already added as a featured event." });
    }

    // 4. Compute next displayOrder
    const maxOrder = await prisma.featuredEvent.aggregate({
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    // Auto-detect sponsor name from event if not explicitly provided
    let finalSponsorName = sponsorName ? sponsorName.trim() : null;
    if (!finalSponsorName && event.sponsors && event.sponsors.length > 0) {
      finalSponsorName = event.sponsors.map((s) => s.name?.trim()).filter(Boolean).join(", ") || null;
    }

    // 5. Create record in separate FeaturedEvent table
    const created = await prisma.featuredEvent.create({
      data: {
        id: createObjectId(),
        eventId,
        sponsorName: finalSponsorName,
        sponsorLogo: sponsorLogo ? sponsorLogo.trim() : null,
        isActive: true,
        displayOrder: nextOrder,
      },
    });

    res.status(201).json({
      message: "Event added to Featured Events successfully.",
      featuredEvent: formatFeaturedEvent(created, event),
    });
  } catch (err) {
    console.error("Error creating featured event:", err);
    res.status(500).json({ message: "Failed to add featured event." });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. PROTECTED: PATCH /api/featured-events/reorder
// ─────────────────────────────────────────────────────────────
const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, "At least one ID required"),
});

router.patch("/reorder", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
    }

    const { orderedIds } = parsed.data;

    // Update display orders in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.featuredEvent.update({
          where: { id },
          data: { displayOrder: index + 1 },
        })
      )
    );

    res.json({ message: "Featured events reordered successfully." });
  } catch (err) {
    console.error("Error reordering featured events:", err);
    res.status(500).json({ message: "Failed to reorder featured events." });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. PROTECTED: PATCH /api/featured-events/settings
// ─────────────────────────────────────────────────────────────
const settingsSchema = z.object({
  orderingMode: z.enum(["CUSTOM", "AUTOMATIC"]),
});

router.patch("/settings", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid ordering mode", errors: parsed.error.issues });
    }

    const { orderingMode } = parsed.data;

    const setting = await prisma.featuredEventSetting.upsert({
      where: { id: "default" },
      create: { id: "default", orderingMode },
      update: { orderingMode },
    });

    res.json({
      message: "Featured event settings updated successfully.",
      setting,
    });
  } catch (err) {
    console.error("Error updating featured settings:", err);
    res.status(500).json({ message: "Failed to update settings." });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. PROTECTED: PATCH /api/featured-events/:id
// ─────────────────────────────────────────────────────────────
const updateFeaturedEventSchema = z.object({
  isActive: z.boolean().optional(),
  sponsorName: z.string().trim().max(100).optional().nullable(),
  sponsorLogo: z.string().optional().nullable(),
});

router.patch("/:id", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateFeaturedEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid update payload", errors: parsed.error.issues });
    }

    const existing = await prisma.featuredEvent.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Featured event not found." });
    }

    const data = {};
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
    if (parsed.data.sponsorName !== undefined) {
      data.sponsorName = parsed.data.sponsorName ? parsed.data.sponsorName.trim() : null;
    }
    if (parsed.data.sponsorLogo !== undefined) {
      data.sponsorLogo = parsed.data.sponsorLogo ? parsed.data.sponsorLogo.trim() : null;
    }

    const updated = await prisma.featuredEvent.update({
      where: { id },
      data,
    });

    const event = await prisma.event.findUnique({
      where: { id: updated.eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        startTime: true,
        endTime: true,
        venue: true,
        organizerType: true,
        centralOrganizerId: true,
        institutionalAccountId: true,
        club: { select: { id: true, clubName: true, clubLogo: true } },
        sponsors: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    res.json({
      message: "Featured event updated successfully.",
      featuredEvent: formatFeaturedEvent(updated, event),
    });
  } catch (err) {
    console.error("Error updating featured event:", err);
    res.status(500).json({ message: "Failed to update featured event." });
  }
});

// ─────────────────────────────────────────────────────────────
// 9. PROTECTED: DELETE /api/featured-events/:id
// ─────────────────────────────────────────────────────────────
router.delete("/:id", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.featuredEvent.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Featured event not found." });
    }

    await prisma.featuredEvent.delete({
      where: { id },
    });

    // Re-compact remaining display orders to be consecutive 1..N
    const remaining = await prisma.featuredEvent.findMany({
      orderBy: { displayOrder: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].displayOrder !== i + 1) {
        await prisma.featuredEvent.update({
          where: { id: remaining[i].id },
          data: { displayOrder: i + 1 },
        });
      }
    }

    res.json({ message: "Featured event removed successfully." });
  } catch (err) {
    console.error("Error removing featured event:", err);
    res.status(500).json({ message: "Failed to remove featured event." });
  }
});

// ─────────────────────────────────────────────────────────────
// 10. PROTECTED: POST /api/featured-events/upload-sponsor
// ─────────────────────────────────────────────────────────────
router.post(
  "/upload-sponsor",
  verifyToken,
  requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No logo file uploaded." });
      }

      const result = await uploadImage(req.file.buffer, "sponsor-logos");
      res.json({
        secure_url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (err) {
      console.error("Sponsor logo upload error:", err);
      res.status(500).json({ message: "Failed to upload sponsor logo.", error: err.message });
    }
  }
);

export default router;
