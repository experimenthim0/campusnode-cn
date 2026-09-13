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
  const clubNames = (event.organizers || []).map((o) => o.club?.clubName).filter(Boolean);
  if (clubNames.length > 0) return clubNames.join(", ");
  if (event.club?.clubName) return event.club.clubName;
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

  const primaryClub = event?.organizers?.[0]?.club || event?.club || null;

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
    organizerType: "CLUB",
    hostName: resolveHostName(event),
    club: primaryClub,
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
// 1. PUBLIC: GET /api/featured-events & /all (Homepage & Event Feed - top 3 or all)
// ─────────────────────────────────────────────────────────────
router.get(["/", "/all"], async (req, res) => {
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
        reviewStatus: true,
        organizers: {
          include: {
            club: {
              select: {
                id: true,
                clubName: true,
                clubLogo: true,
                slug: true,
              },
            },
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

    // Filter to only events that actually qualify (published & upcoming)
    let validFeatured = featuredRows
      .filter((fe) => eventMap.has(fe.eventId))
      .map((fe) => formatFeaturedEvent(fe, eventMap.get(fe.eventId)));

    if (orderingMode === "RANDOM" || orderingMode === "AUTOMATIC") {
      validFeatured = shuffleArray(validFeatured);
    }

    // Return max 3 for top banners, or all if requested with ?all=true or /all
    const returnAll = req.query.all === "true" || req.path === "/all";
    const result = returnAll ? validFeatured : validFeatured.slice(0, 3);

    res.json({
      events: result,
      orderingMode,
      totalActive: validFeatured.length,
    });
  } catch (err) {
    console.error("Error fetching public featured events:", err);
    res.status(500).json({ message: "Failed to load featured events." });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. PUBLIC: GET /api/featured-events/active (Direct list of active for homepage)
// ─────────────────────────────────────────────────────────────
router.get("/active", async (req, res) => {
  try {
    const setting = await getFeaturedEventSetting();
    const orderingMode = setting.orderingMode || "CUSTOM";
    const now = new Date();

    const featuredRows = await prisma.featuredEvent.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    if (featuredRows.length === 0) {
      return res.json({ events: [], orderingMode, count: 0 });
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
        reviewStatus: true,
        organizers: {
          include: {
            club: {
              select: {
                id: true,
                clubName: true,
                clubLogo: true,
                slug: true,
              },
            },
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

    let valid = featuredRows
      .filter((fe) => eventMap.has(fe.eventId))
      .map((fe) => formatFeaturedEvent(fe, eventMap.get(fe.eventId)));

    if (orderingMode === "RANDOM") {
      valid = shuffleArray(valid);
    }

    res.json({
      events: valid,
      orderingMode,
      count: valid.length,
    });
  } catch (err) {
    console.error("Error fetching active featured events:", err);
    res.status(500).json({ message: "Failed to load active featured events." });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. PROTECTED: GET /api/featured-events/manage (Admin console view)
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
        reviewStatus: true,
        organizers: {
          include: {
            club: {
              select: {
                id: true,
                clubName: true,
                clubLogo: true,
                slug: true,
              },
            },
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
            { organizers: { some: { club: { clubName: { contains: q, mode: "insensitive" } } } } },
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
          reviewStatus: true,
          organizers: {
            include: {
              club: {
                select: {
                  id: true,
                  clubName: true,
                  clubLogo: true,
                },
              },
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
        organizers: {
          include: {
            club: { select: { id: true, clubName: true, clubLogo: true } },
          },
        },
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
      return res.status(409).json({ message: "This event is already added to the featured list." });
    }

    // 4. Calculate next displayOrder (last)
    const maxOrderAgg = await prisma.featuredEvent.aggregate({
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrderAgg._max.displayOrder || 0) + 1;

    // 5. Create new featuredEvent
    const newFeatured = await prisma.featuredEvent.create({
      data: {
        id: createObjectId(),
        eventId,
        sponsorName: sponsorName || null,
        sponsorLogo: sponsorLogo || null,
        displayOrder: nextOrder,
        isActive: true,
      },
    });

    // 6. Update Event.isFeatured to true
    await prisma.event.update({
      where: { id: eventId },
      data: { isFeatured: true },
    });

    res.status(201).json({
      message: "Event added to featured list successfully.",
      featuredEvent: formatFeaturedEvent(newFeatured, event),
    });
  } catch (err) {
    console.error("Error adding featured event:", err);
    res.status(500).json({ message: "Failed to add event to featured list." });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. PROTECTED: PATCH /api/featured-events/reorder
// ─────────────────────────────────────────────────────────────
const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1, "At least one ID must be provided."),
});

router.patch("/reorder", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
    }

    const { orderedIds } = parsed.data;

    // Run order updates sequentially or in a transaction
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
  orderingMode: z.enum(["CUSTOM", "AUTOMATIC", "RANDOM"]).transform((v) => (v === "RANDOM" ? "AUTOMATIC" : v)),
});

router.patch("/settings", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid ordering mode. Must be 'CUSTOM' or 'AUTOMATIC'." });
    }

    const updatedSetting = await prisma.featuredEventSetting.upsert({
      where: { id: "default" },
      update: { orderingMode: parsed.data.orderingMode },
      create: { id: "default", orderingMode: parsed.data.orderingMode },
    });

    res.json({
      message: `Featured events ordering mode set to ${updatedSetting.orderingMode}.`,
      setting: updatedSetting,
    });
  } catch (err) {
    console.error("Error updating featured events settings:", err);
    res.status(500).json({ message: "Failed to update settings." });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. PROTECTED: PATCH /api/featured-events/:id
// ─────────────────────────────────────────────────────────────
const updateFeaturedSchema = z.object({
  isActive: z.boolean().optional(),
  sponsorName: z.string().trim().max(100).optional().nullable(),
  sponsorLogo: z.string().optional().nullable(),
  displayOrder: z.number().int().min(1).optional(),
});

router.patch("/:id", verifyToken, requirePermission(PERMISSIONS.FEATURED_EVENTS_MANAGE), async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateFeaturedSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
    }

    const existing = await prisma.featuredEvent.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Featured event not found." });
    }

    const updated = await prisma.featuredEvent.update({
      where: { id },
      data: parsed.data,
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
        organizers: {
          include: {
            club: { select: { id: true, clubName: true, clubLogo: true } },
          },
        },
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
