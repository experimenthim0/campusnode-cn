import redis from "../lib/redis.js";

const memoryCache = new Map();

// Default TTL: 60 seconds (extended from 15s since updates trigger active invalidation)
const DEFAULT_TTL_MS = 60_000;

/**
 * Retrieve cached public response by key.
 * Queries Redis first, falling back to process-local memory if unavailable.
 *
 * @param {string} key
 * @returns {Promise<any>}
 */
export const getPublicResponse = async (key) => {
  if (!key) return undefined;

  // 1. Check Redis store
  try {
    const raw = await redis.get(`cache:${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    // Silently fall back to in-memory store
  }

  // 2. In-memory fallback
  const entry = memoryCache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }

  return entry.value;
};

/**
 * Cache a public JSON response with TTL.
 * Stores in both Redis and in-memory fallback.
 *
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs
 */
export const setPublicResponse = async (key, value, ttlMs = DEFAULT_TTL_MS) => {
  if (!key || value === undefined) return;

  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

  // 1. Update in-memory fallback
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });

  // 2. Update Redis store
  try {
    await redis.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    // Non-fatal if Redis blips; in-memory cache remains active
  }
};

/**
 * Invalidate cached responses by key or wildcard pattern.
 * Cleans both Redis and the in-memory fallback.
 *
 * Examples:
 *   invalidatePublicResponses(["events:*"])
 *   invalidatePublicResponses(["clubs*"])
 *
 * @param {string|string[]} patterns
 */
export const invalidatePublicResponses = async (patterns = []) => {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of patternList) {
    if (!pattern || typeof pattern !== "string") continue;

    // 1. Invalidate in-memory fallback
    for (const key of memoryCache.keys()) {
      if (pattern.endsWith("*")) {
        if (key.startsWith(pattern.slice(0, -1))) memoryCache.delete(key);
      } else if (key === pattern || key.startsWith(`${pattern}:`)) {
        memoryCache.delete(key);
      }
    }

    // 2. Invalidate in Redis
    try {
      let redisPattern;
      if (pattern.endsWith("*")) {
        redisPattern = `cache:${pattern}`;
      } else {
        redisPattern = `cache:${pattern}*`;
      }

      const matchingKeys = await redis.keys(redisPattern);
      if (matchingKeys && matchingKeys.length > 0) {
        await redis.del(...matchingKeys);
      }
    } catch (err) {
      // Non-fatal
    }
  }
};
