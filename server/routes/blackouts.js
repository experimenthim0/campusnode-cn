import express from "express";
import { verifyToken, allowRoles } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { validateBooking } from "../services/conflictService.js";

const router = express.Router();

export async function ensureBlackoutTable() {
  // Schema and indexes are managed exclusively by Prisma migrations.
  return;
}

router.get("/", async (req, res) => {
  try {
    await ensureBlackoutTable();
    const { start, end, venue } = req.query;

    const where = {};
    if (venue && venue !== "all") {
      const venueList = venue.split(",").map(v => v.trim()).filter(Boolean);
      if (venueList.length === 1) {
        where.venue = venueList[0];
      } else if (venueList.length > 1) {
        where.venue = { in: venueList };
      }
    }

    if (start && end) {
      const sDate = new Date(start);
      const eDate = new Date(end);
      where.startTime = { lt: eDate };
      where.endTime = { gt: sDate };
    }

    let blackouts = [];
    if (prisma.venueBlackout) {
      blackouts = await prisma.venueBlackout.findMany({
        where,
        orderBy: { startTime: "asc" },
      });
    } else {
      blackouts = await prisma.$queryRaw`
        SELECT id, venue, title, reason, "startTime", "endTime", "createdById", "createdAt", "updatedAt"
        FROM "VenueBlackout"
        ORDER BY "startTime" ASC
      `;
    }

    res.json(blackouts);
  } catch (err) {
    console.error("Failed to fetch blackouts:", err);
    res.status(500).json({ message: "Failed to fetch venue blackout periods", error: err.message });
  }
});

router.post("/", verifyToken, allowRoles("admin", "facultyCoordinator"), async (req, res) => {
  try {
    await ensureBlackoutTable();
    const { venue, title, reason, startTime, endTime } = req.body;

    if (!venue || !title || !startTime || !endTime) {
      return res.status(400).json({ message: "Venue, title, start time, and end time are required." });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid start or end date format." });
    }

    if (start >= end) {
      return res.status(400).json({ message: "Start time must be before end time." });
    }

    const blackoutId = createObjectId();
    const createdById = req.user.userId;

    if (prisma.venueBlackout) {
      const created = await prisma.venueBlackout.create({
        data: {
          id: blackoutId,
          venue,
          title,
          reason: reason || null,
          startTime: start,
          endTime: end,
          createdById,
        },
      });
      return res.status(201).json(created);
    } else {
      await prisma.$executeRaw`
        INSERT INTO "VenueBlackout" ("id", "venue", "title", "reason", "startTime", "endTime", "createdById", "createdAt", "updatedAt")
        VALUES (${blackoutId}, ${venue}, ${title}, ${reason || null}, ${start}, ${end}, ${createdById}, NOW(), NOW())
      `;
      return res.status(201).json({
        id: blackoutId,
        venue,
        title,
        reason: reason || null,
        startTime: start,
        endTime: end,
        createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    console.error("Failed to create blackout:", err);
    res.status(500).json({ message: "Failed to create venue blackout", error: err.message });
  }
});

router.put("/:id", verifyToken, allowRoles("admin", "facultyCoordinator"), async (req, res) => {
  try {
    await ensureBlackoutTable();
    const { id } = req.params;
    const { venue, title, reason, startTime, endTime } = req.body;

    const updates = {};
    if (venue) updates.venue = venue;
    if (title) updates.title = title;
    if (reason !== undefined) updates.reason = reason;
    if (startTime) updates.startTime = new Date(startTime);
    if (endTime) updates.endTime = new Date(endTime);
    updates.updatedAt = new Date();

    if (updates.startTime && updates.endTime && updates.startTime >= updates.endTime) {
      return res.status(400).json({ message: "Start time must be before end time." });
    }

    if (prisma.venueBlackout) {
      const updated = await prisma.venueBlackout.update({
        where: { id },
        data: updates,
      });
      return res.json(updated);
    } else {
      await prisma.$executeRaw`
        UPDATE "VenueBlackout"
        SET "venue" = ${updates.venue}, "title" = ${updates.title}, "reason" = ${updates.reason},
            "startTime" = ${updates.startTime}, "endTime" = ${updates.endTime}, "updatedAt" = NOW()
        WHERE id = ${id}
      `;
      return res.json({ id, ...updates });
    }
  } catch (err) {
    console.error("Failed to update blackout:", err);
    res.status(500).json({ message: "Failed to update venue blackout", error: err.message });
  }
});

router.delete("/:id", verifyToken, allowRoles("admin", "facultyCoordinator"), async (req, res) => {
  try {
    await ensureBlackoutTable();
    const { id } = req.params;

    if (prisma.venueBlackout) {
      await prisma.venueBlackout.delete({ where: { id } });
    } else {
      await prisma.$executeRaw`DELETE FROM "VenueBlackout" WHERE id = ${id}`;
    }

    res.json({ message: "Blackout period deleted successfully." });
  } catch (err) {
    console.error("Failed to delete blackout:", err);
    res.status(500).json({ message: "Failed to delete venue blackout", error: err.message });
  }
});

export default router;
