/**
 * High-performance process-local TTL cache for public catalog responses.
 *
 * Keeps frequently requested public data (event feeds, club directories, leaderboards)
 * in fast process memory (< 1ms latency) with deterministic invalidation on mutation.
 * Completely eliminates remote Redis round-trips, network latency, and KEYS * scans
 * for read-heavy public catalog endpoints.
 */

const memoryCache = new Map();

// Default TTL: 60 seconds
const DEFAULT_TTL_MS = 60_000;

// Periodic sweep every 60s to prune expired keys
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}, 60_000);

if (sweepTimer.unref) {
  sweepTimer.unref();
}

/**
 * Retrieve cached public response by key from fast in-memory store.
 *
 * @param {string} key
 * @returns {Promise<any>}
 */
export const getPublicResponse = async (key) => {
  if (!key) return undefined;

  const entry = memoryCache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }

  return entry.value;
};

/**
 * Cache a public JSON response with TTL in memory.
 *
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs
 */
export const setPublicResponse = async (key, value, ttlMs = DEFAULT_TTL_MS) => {
  if (!key || value === undefined) return;
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

/**
 * Invalidate cached responses by key, prefix, or wildcard pattern.
 * Performs fast, deterministic in-memory key matching without Redis scanning.
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

    for (const key of memoryCache.keys()) {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        if (key.startsWith(prefix)) {
          memoryCache.delete(key);
        }
      } else if (key === pattern || key.startsWith(`${pattern}:`) || key.startsWith(`${pattern}/`)) {
        memoryCache.delete(key);
      }
    }
  }
};

/**
 * Clear all cached public responses (useful for test resets).
 */
export const clearPublicResponseCache = () => {
  memoryCache.clear();
};

/**
 * Diagnostic stats for monitoring.
 */
export const getPublicCacheStats = () => ({
  size: memoryCache.size,
  keys: Array.from(memoryCache.keys()),
});

