import express from "express";
import { verifyToken } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { getVapidPublicKey } from "../utils/vapid.js";

const router = express.Router();

export async function ensurePushTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PushSubscription" (
        "id" VARCHAR(24) NOT NULL,
        "userId" VARCHAR(24) NOT NULL,
        "endpoint" TEXT NOT NULL,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
      );
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
    `;
  } catch (err) {
    console.error("Error ensuring PushSubscription table:", err.message);
  }
}

// ── GET /api/push/vapid-public-key ───────────────────────────────────────────
router.get("/vapid-public-key", (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    res.json({ publicKey });
  } catch (err) {
    res.status(500).json({ message: "Failed to get VAPID key: " + err.message });
  }
});

router.post("/subscribe", verifyToken, async (req, res) => {
  try {
    await ensurePushTable();
    const { endpoint, keys, userAgent } = req.body;
    const userId = String(req.user.userId);

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Invalid push subscription object." });
    }

    if (prisma.pushSubscription) {
      const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint },
      });

      let subscription;
      if (existing) {
        subscription = await prisma.pushSubscription.update({
          where: { endpoint },
          data: {
            userId,
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: userAgent || req.headers["user-agent"] || null,
            lastUsedAt: new Date(),
          },
        });
        console.log(`[Push API] Updated subscription for user ${userId}`);
      } else {
        subscription = await prisma.pushSubscription.create({
          data: {
            id: createObjectId(),
            userId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: userAgent || req.headers["user-agent"] || null,
          },
        });
        console.log(`[Push API] Created new push subscription for user ${userId}`);
      }
      return res.status(201).json({ message: "Push subscription saved successfully.", subscription });
    }

        const existingRows = await prisma.$queryRaw`
      SELECT id FROM "PushSubscription" WHERE endpoint = ${endpoint} LIMIT 1
    `;

    const ua = userAgent || req.headers["user-agent"] || null;
    if (existingRows && existingRows.length > 0) {
      await prisma.$executeRaw`
        UPDATE "PushSubscription"
        SET "userId" = ${userId}, "p256dh" = ${keys.p256dh}, "auth" = ${keys.auth}, "userAgent" = ${ua}, "lastUsedAt" = NOW(), "updatedAt" = NOW()
        WHERE endpoint = ${endpoint}
      `;
      console.log(`[Push API] Updated subscription (via SQL) for user ${userId}`);
    } else {
      const newId = createObjectId();
      await prisma.$executeRaw`
        INSERT INTO "PushSubscription" ("id", "userId", "endpoint", "p256dh", "auth", "userAgent", "createdAt", "updatedAt", "lastUsedAt")
        VALUES (${newId}, ${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth}, ${ua}, NOW(), NOW(), NOW())
      `;
      console.log(`[Push API] Created new push subscription (via SQL) for user ${userId}`);
    }

    res.status(201).json({ message: "Push subscription saved successfully." });
  } catch (err) {
    console.error("[Push API] Error saving subscription:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/unsubscribe", verifyToken, async (req, res) => {
  try {
    await ensurePushTable();
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint is required." });
    }

    if (prisma.pushSubscription) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
    } else {
      await prisma.$executeRaw`
        DELETE FROM "PushSubscription" WHERE endpoint = ${endpoint}
      `;
    }

    console.log("[Push API] Unsubscribed endpoint:", endpoint.slice(0, 35));
    res.json({ message: "Unsubscribed successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
