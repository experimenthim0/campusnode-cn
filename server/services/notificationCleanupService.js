import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

const DEFAULT_CUTOFF_DAYS = 30;
const DEFAULT_BATCH_SIZE = 500;
const CLEANUP_LOCK_KEY = "lock:job:notification-cleanup";
// Lock for 23 hours to ensure cleanup runs at most once per day across all instances
const LOCK_TTL_SECONDS = 23 * 60 * 60;
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cleanupInterval = null;
let initialTimeout = null;

/**
 * Deletes notifications older than the cutoff retention period in manageable batches.
 * Uses a Redis distributed lock to ensure only one instance executes cleanup in multi-instance deployments.
 * Performs database-side batch deletion without loading expired records into Node memory.
 *
 * @param {object} [options]
 * @param {number} [options.cutoffDays=30] Retention window in days
 * @param {number} [options.batchSize=500] Batch deletion chunk size
 * @param {boolean} [options.force=false] Bypass distributed lock (useful for tests or manual triggers)
 * @returns {Promise<{ deletedCount: number, cutoffDate: Date, skipped?: boolean, reason?: string }>}
 */
export async function cleanupExpiredNotifications({
  cutoffDays = DEFAULT_CUTOFF_DAYS,
  batchSize = DEFAULT_BATCH_SIZE,
  force = false,
} = {}) {
  const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);

  // Distributed lock to prevent concurrent or duplicate runs across instances
  if (!force) {
    try {
      const lockAcquired = await redis.set(
        CLEANUP_LOCK_KEY,
        String(process.pid || "cleanup-worker"),
        "EX",
        LOCK_TTL_SECONDS,
        "NX"
      );
      if (!lockAcquired) {
        console.log("[NotificationCleanup] Daily cleanup already ran or lock held by another instance. Skipping.");
        return { deletedCount: 0, cutoffDate, skipped: true, reason: "Lock already held" };
      }
    } catch (lockErr) {
      console.warn("[NotificationCleanup] Warning: Redis lock check failed, proceeding with safety guards:", lockErr.message);
    }
  }

  console.log(`[NotificationCleanup] Starting cleanup for notifications created before ${cutoffDate.toISOString()}...`);

  let totalDeleted = 0;
  let batchIndex = 0;

  try {
    while (true) {
      batchIndex++;
      // Batch deletion directly in PostgreSQL without loading rows into Node memory
      const rowsAffected = await prisma.$executeRaw`
        DELETE FROM "Notification"
        WHERE "id" IN (
          SELECT "id" FROM "Notification"
          WHERE "createdAt" < ${cutoffDate}
          LIMIT ${batchSize}
        )
      `;

      const currentBatchCount = Number(rowsAffected) || 0;
      totalDeleted += currentBatchCount;

      if (currentBatchCount < batchSize) {
        break; // Finished deleting all expired records
      }

      console.log(`[NotificationCleanup] Batch #${batchIndex}: Purged ${currentBatchCount} notifications (${totalDeleted} total).`);
    }

    console.log(`[NotificationCleanup] Completed successfully. Total expired notifications purged: ${totalDeleted}.`);
    return { deletedCount: totalDeleted, cutoffDate };
  } catch (err) {
    console.error("[NotificationCleanup] Error during notification cleanup:", err.message, err.stack);
    throw err;
  }
}

/**
 * Starts the automatic daily background cleanup job.
 * Non-blocking: schedules initial run shortly after server boot, then recurs every 24 hours.
 */
export function startNotificationCleanupScheduler() {
  if (cleanupInterval) {
    return; // Already initialized
  }

  // Delay initial check by 15 seconds so server startup is not blocked
  initialTimeout = setTimeout(() => {
    cleanupExpiredNotifications().catch((err) => {
      console.error("[NotificationCleanup] Background cleanup initial run error:", err.message);
    });
  }, 15000);

  if (initialTimeout.unref) {
    initialTimeout.unref();
  }

  cleanupInterval = setInterval(() => {
    cleanupExpiredNotifications().catch((err) => {
      console.error("[NotificationCleanup] Background cleanup scheduled run error:", err.message);
    });
  }, INTERVAL_MS);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  console.log("[NotificationCleanup] Automatic 30-day cleanup scheduler registered (runs daily).");
}

/**
 * Graceful shutdown for cleanup scheduler.
 */
export function stopNotificationCleanupScheduler() {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
