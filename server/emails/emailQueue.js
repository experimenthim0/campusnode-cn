import { Queue, Worker } from "bullmq";
import { emailConfig } from "./config/emailConfig.js";
import { sendEmailDirect } from "./emailService.js";
import redis from "../lib/redis.js";

const QUEUE_NAME = "campusnode-emails";

let emailQueue = null;
let emailWorker = null;
let queueConnectionOpts = null;

/**
 * Parses and returns Redis connection options for BullMQ.
 * Requires `maxRetriesPerRequest: null` per BullMQ specification.
 */
export const getBullConnection = () => {
  const url = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const opts = {
      host: parsed.hostname || "127.0.0.1",
      port: Number(parsed.port) || 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    if (parsed.password) opts.password = decodeURIComponent(parsed.password);
    if (parsed.username) opts.username = decodeURIComponent(parsed.username);
    if (parsed.protocol === "rediss:") opts.tls = { servername: parsed.hostname };
    return opts;
  } catch {
    return { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };
  }
};

/**
 * Initializes or returns the existing BullMQ Queue instance.
 */
export const getEmailQueue = () => {
  if (emailQueue) return emailQueue;

  queueConnectionOpts = getBullConnection();
  if (!queueConnectionOpts) return null;

  try {
    emailQueue = new Queue(QUEUE_NAME, {
      connection: queueConnectionOpts,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    });

    emailQueue.on("error", (err) => {
      console.warn("[EmailQueue] Queue connection notice:", err.message);
    });

    return emailQueue;
  } catch (err) {
    console.warn("[EmailQueue] Unable to initialize BullMQ queue:", err.message);
    return null;
  }
};

/**
 * Initializes the background BullMQ worker that consumes email jobs.
 */
export const initEmailWorker = () => {
  if (emailWorker) return emailWorker;

  const conn = getBullConnection();
  if (!conn) {
    console.log("[EmailWorker] Info: Redis not configured. Operating in asynchronous in-memory delivery mode.");
    return null;
  }

  try {
    emailWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        return await sendEmailDirect(job.data);
      },
      {
        connection: conn,
        concurrency: 5,
      }
    );

    emailWorker.on("completed", (job) => {
      const recipient = job.data?.to || job.data?.email;
      console.log(`[EmailWorker] Job ${job.id} delivered email to "${recipient}" (${job.data?.template || "custom"})`);
    });

    emailWorker.on("failed", (job, err) => {
      const recipient = job?.data?.to || job?.data?.email;
      console.error(
        `[EmailWorker] Job ${job?.id} failed for "${recipient}" (Attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
        err.message
      );
    });

    emailWorker.on("error", (err) => {
      console.warn("[EmailWorker] Worker connection notice:", err.message);
    });

    console.log("[EmailWorker] Background email worker active on queue:", QUEUE_NAME);
    return emailWorker;
  } catch (err) {
    console.warn("[EmailWorker] Unable to start BullMQ worker, using fallback:", err.message);
    return null;
  }
};

/**
 * Gracefully shuts down the worker and queue connections.
 */
export const closeEmailWorker = async () => {
  try {
    if (emailWorker) {
      await emailWorker.close();
      emailWorker = null;
    }
    if (emailQueue) {
      await emailQueue.close();
      emailQueue = null;
    }
    console.log("[EmailWorker] Closed email queue and worker connections.");
  } catch (err) {
    console.warn("[EmailWorker] Error during worker shutdown:", err.message);
  }
};

/**
 * High-level enqueuer. Pushes the job to BullMQ if available,
 * or dispatches via setImmediate in environments without Redis.
 *
 * @param {object} options Email options
 * @returns {Promise<{ id: string, queued: boolean }>}
 */
export const enqueueEmail = async (options = {}) => {
  // If in automated test suite or sync explicitly requested, dispatch immediately
  if (emailConfig.isTest() || options.sync === true) {
    const result = await sendEmailDirect(options);
    return { ...result, queued: false };
  }

  // Attempt BullMQ enqueue if external Redis is reachable
  const queue = getEmailQueue();
  if (queue && redis.isExternalRedis()) {
    try {
      const job = await queue.add("sendEmail", options);
      return { id: String(job.id), queued: true };
    } catch (queueErr) {
      console.warn("[EmailQueue] Failed to enqueue to BullMQ, executing via asynchronous fallback:", queueErr.message);
    }
  }

  // Asynchronous in-process fallback: returns to client immediately, sends email in background
  const fallbackJobId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  setImmediate(async () => {
    try {
      await sendEmailDirect(options);
    } catch (err) {
      console.error(`[EmailQueue Fallback] Failed sending email to "${options.to || options.email}":`, err.message);
    }
  });

  return { id: fallbackJobId, queued: true, fallback: true };
};
