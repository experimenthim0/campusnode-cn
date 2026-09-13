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

let isTableInitialized = false;
let tableInitPromise = null;

export async function ensureVenuesTableAndSeed() {
  if (isTableInitialized) return;
  if (tableInitPromise) return tableInitPromise;

  tableInitPromise = (async () => {
    try {
      const count = await prisma.venue.count();

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
      isTableInitialized = true;
    } catch (err) {
      console.error("Error ensuring Venue table and seed:", err.message);
    } finally {
      tableInitPromise = null;
    }
  })();

  return tableInitPromise;
}

router.get("/", async (req, res) => {
  try {
    if (!isTableInitialized) {
      await ensureVenuesTableAndSeed();
    }
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
    if (!isTableInitialized) {
      await ensureVenuesTableAndSeed();
    }
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

    const insertedRows = await prisma.$queryRaw`
      INSERT INTO "Venue" ("id", "name", "isOpen", "createdAt", "updatedAt")
      VALUES (${newId}, ${trimmedName}, ${isVenueOpen}, NOW(), NOW())
      RETURNING id, name, "isOpen", "createdAt", "updatedAt"
    `;

    res.status(201).json(insertedRows[0] || {
      id: newId,
      name: trimmedName,
      isOpen: isVenueOpen,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to create venue:", err);
    res.status(500).json({ message: "Failed to create venue", error: err.message });
  }
});

router.put("/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isOpen } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Venue name is required." });
    }

    const trimmedName = name.trim();

    const dupes = await prisma.$queryRaw`
      SELECT id FROM "Venue" WHERE LOWER(name) = LOWER(${trimmedName}) AND id != ${id} LIMIT 1
    `;
    if (dupes && dupes.length > 0) {
      return res.status(400).json({ message: `Venue "${trimmedName}" already exists.` });
    }

    const newIsOpen = isOpen !== undefined ? Boolean(isOpen) : true;

    const updatedRows = await prisma.$queryRaw`
      UPDATE "Venue"
      SET name = ${trimmedName}, "isOpen" = ${newIsOpen}, "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, name, "isOpen", "createdAt", "updatedAt"
    `;

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(404).json({ message: "Venue not found." });
    }

    res.json(updatedRows[0]);
  } catch (err) {
    console.error("Failed to update venue:", err);
    res.status(500).json({ message: "Failed to update venue", error: err.message });
  }
});

router.patch("/:id/toggle-status", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Single atomic roundtrip with RETURNING
    const updatedRows = await prisma.$queryRaw`
      UPDATE "Venue"
      SET "isOpen" = NOT "isOpen", "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, name, "isOpen", "createdAt", "updatedAt"
    `;

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(404).json({ message: "Venue not found." });
    }

    res.json(updatedRows[0]);
  } catch (err) {
    console.error("Failed to toggle venue status:", err);
    res.status(500).json({ message: "Failed to toggle venue status", error: err.message });
  }
});

router.delete("/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRows = await prisma.$queryRaw`
      DELETE FROM "Venue" WHERE id = ${id}
      RETURNING id, name
    `;

    if (!deletedRows || deletedRows.length === 0) {
      return res.status(404).json({ message: "Venue not found." });
    }

    res.json({ message: `Venue "${deletedRows[0].name}" deleted successfully.` });
  } catch (err) {
    console.error("Failed to delete venue:", err);
    res.status(500).json({ message: "Failed to delete venue", error: err.message });
  }
});

export default router;
