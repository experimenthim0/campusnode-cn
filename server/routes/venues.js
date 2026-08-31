import express from "express";
import { verifyToken, allowRoles } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";

const router = express.Router();

const DEFAULT_VENUES = [
  "Student Activity Centre",
  "Snackers",
  "Central Lawn",
  "Mega Ground",
  "MBH Ground",
  "Science Block(SB)",
  "Community Center",
  "NITJ Temple",
  "OAT",
  "CSH",
  "VCH",
  "LT",
  "ALT",
  "Library",
  "Online",
  "Department Building",
  "Other"
];

export async function ensureVenuesTableAndSeed() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Venue" (
        "id" VARCHAR(24) NOT NULL,
        "name" TEXT NOT NULL,
        "isOpen" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
      );
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Venue_name_key" ON "Venue"("name");
    `;

    const countResult = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "Venue"`;
    const count = Number(countResult[0]?.count || 0);

    if (count === 0) {
      console.log("Seeding default campus venues into database...");
      for (const name of DEFAULT_VENUES) {
        const id = createObjectId();
        await prisma.$executeRaw`
          INSERT INTO "Venue" ("id", "name", "isOpen", "createdAt", "updatedAt")
          VALUES (${id}, ${name}, true, NOW(), NOW())
          ON CONFLICT ("name") DO NOTHING;
        `;
      }
    }
  } catch (err) {
    console.error("Error ensuring Venue table and seed:", err.message);
  }
}

router.get("/", async (req, res) => {
  try {
    await ensureVenuesTableAndSeed();
    const openOnly = req.query.openOnly === "true";

    let venues = [];
    if (prisma.venue) {
      const where = openOnly ? { isOpen: true } : {};
      venues = await prisma.venue.findMany({
        where,
        orderBy: { name: "asc" },
      });
    } else {
      if (openOnly) {
        venues = await prisma.$queryRaw`SELECT id, name, "isOpen", "createdAt", "updatedAt" FROM "Venue" WHERE "isOpen" = true ORDER BY name ASC`;
      } else {
        venues = await prisma.$queryRaw`SELECT id, name, "isOpen", "createdAt", "updatedAt" FROM "Venue" ORDER BY name ASC`;
      }
    }

    res.json(venues);
  } catch (err) {
    console.error("Failed to fetch venues:", err);
    res.status(500).json({ message: "Failed to fetch venues", error: err.message });
  }
});

router.post("/", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    await ensureVenuesTableAndSeed();
    const { name, isOpen } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Venue name is required." });
    }

    const trimmedName = name.trim();

    const existing = await prisma.$queryRaw`
      SELECT id FROM "Venue" WHERE LOWER(name) = LOWER(${trimmedName}) LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return res.status(400).json({ message: `Venue "${trimmedName}" already exists.` });
    }

    const newId = createObjectId();
    const isVenueOpen = isOpen !== undefined ? Boolean(isOpen) : true;

    await prisma.$executeRaw`
      INSERT INTO "Venue" ("id", "name", "isOpen", "createdAt", "updatedAt")
      VALUES (${newId}, ${trimmedName}, ${isVenueOpen}, NOW(), NOW())
    `;

    const created = {
      id: newId,
      name: trimmedName,
      isOpen: isVenueOpen,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.status(201).json(created);
  } catch (err) {
    console.error("Failed to create venue:", err);
    res.status(500).json({ message: "Failed to create venue", error: err.message });
  }
});

router.put("/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isOpen } = req.body;

    const existingRows = await prisma.$queryRaw`
      SELECT * FROM "Venue" WHERE id = ${id} LIMIT 1
    `;
    const venueExists = existingRows[0];

    if (!venueExists) {
      return res.status(404).json({ message: "Venue not found." });
    }

    let newName = venueExists.name;
    if (name !== undefined && name.trim()) {
      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== venueExists.name.toLowerCase()) {
        const dupes = await prisma.$queryRaw`
          SELECT id FROM "Venue" WHERE LOWER(name) = LOWER(${trimmedName}) AND id != ${id} LIMIT 1
        `;
        if (dupes && dupes.length > 0) {
          return res.status(400).json({ message: `Venue "${trimmedName}" already exists.` });
        }
      }
      newName = trimmedName;
    }

    const newIsOpen = isOpen !== undefined ? Boolean(isOpen) : venueExists.isOpen;

    await prisma.$executeRaw`
      UPDATE "Venue"
      SET name = ${newName}, "isOpen" = ${newIsOpen}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    res.json({
      ...venueExists,
      name: newName,
      isOpen: newIsOpen,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to update venue:", err);
    res.status(500).json({ message: "Failed to update venue", error: err.message });
  }
});

router.patch("/:id/toggle-status", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const existingRows = await prisma.$queryRaw`
      SELECT * FROM "Venue" WHERE id = ${id} LIMIT 1
    `;
    const venue = existingRows[0];

    if (!venue) {
      return res.status(404).json({ message: "Venue not found." });
    }

    const nextState = !venue.isOpen;
    await prisma.$executeRaw`
      UPDATE "Venue"
      SET "isOpen" = ${nextState}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    res.json({
      ...venue,
      isOpen: nextState,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to toggle venue status:", err);
    res.status(500).json({ message: "Failed to toggle venue status", error: err.message });
  }
});

router.delete("/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const existingRows = await prisma.$queryRaw`
      SELECT name FROM "Venue" WHERE id = ${id} LIMIT 1
    `;
    const venue = existingRows[0];

    if (!venue) {
      return res.status(404).json({ message: "Venue not found." });
    }

    await prisma.$executeRaw`
      DELETE FROM "Venue" WHERE id = ${id}
    `;

    res.json({ message: `Venue "${venue.name}" deleted successfully.` });
  } catch (err) {
    console.error("Failed to delete venue:", err);
    res.status(500).json({ message: "Failed to delete venue", error: err.message });
  }
});

export default router;
