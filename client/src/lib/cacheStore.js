/**
 * cacheStore.js — IndexedDB Wrapper for CampusNode API Cache
 * 
 * Provides persistent, structured storage for API cache entries.
 * Falls back to an in-memory Map if IndexedDB is unavailable.
 * 
 * Features:
 * - Persistent cache that survives page refreshes and browser restarts
 * - LRU (Least Recently Used) eviction when total size exceeds limit
 * - Approximate size tracking per entry
 * - Pattern-based deletion for CRUD invalidation
 * 
 * Schema per entry:
 * {
 *   key:          string    — URL path (primary key)
 *   data:         any       — Parsed JSON response
 *   etag:         string    — ETag from server (for conditional requests)
 *   lastModified: string    — Last-Modified header from server
 *   storedAt:     number    — Timestamp when cached
 *   expiresAt:    number    — TTL expiry timestamp
 *   lastAccessed: number    — For LRU eviction
 *   sizeBytes:    number    — Approximate size for quota management
 * }
 */

const DB_NAME = 'campusnode-api-cache';
const DB_VERSION = 1;
const STORE_NAME = 'api-responses';

/** Maximum total cache size in bytes (100 MB) */
const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024;

/** Approximate the byte size of a JSON-serializable value */
function approximateSize(value) {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    // ~2 bytes per char for UTF-16 internal representation
    return str ? str.length * 2 : 0;
  } catch {
    return 0;
  }
}


let dbInstance = null;
let dbFailed = false;

/**
 * Open (or create) the IndexedDB database.
 * Returns the IDBDatabase instance, or null if unavailable.
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbFailed) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;

        // Reset instance if the DB is unexpectedly closed
        dbInstance.onclose = () => { dbInstance = null; };
        dbInstance.onversionchange = () => {
          dbInstance.close();
          dbInstance = null;
        };

        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('[CacheStore] IndexedDB open failed, using in-memory fallback');
        dbFailed = true;
        resolve(null);
      };
    } catch {
      dbFailed = true;
      resolve(null);
    }
  });
}

/**
 * Run a single read/write transaction against the object store.
 * @param {'readonly'|'readwrite'} mode
 * @param {(store: IDBObjectStore) => IDBRequest | void} callback
 * @returns {Promise<any>}
 */
function withStore(mode, callback) {
  return openDB().then((db) => {
    if (!db) return undefined;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = callback(store);

        if (result && typeof result.onsuccess !== 'undefined') {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        } else {
          tx.oncomplete = () => resolve(undefined);
          tx.onerror = () => reject(tx.error);
        }
      } catch (err) {
        reject(err);
      }
    });
  }).catch((err) => {
    console.warn('[CacheStore] Transaction failed:', err);
    return undefined;
  });
}

// ─── In-memory fallback ─────────────────────────────────────────────────────

const memoryStore = new Map();


/**
 * Get a cache entry by URL key.
 * Updates lastAccessed timestamp for LRU tracking.
 * @param {string} key — URL path
 * @returns {Promise<object|null>} — The cache entry or null
 */
export async function getEntry(key) {
  const entry = await withStore('readonly', (store) => store.get(key));
  if (entry) {
    // Update lastAccessed in background (fire-and-forget)
    withStore('readwrite', (store) => {
      entry.lastAccessed = Date.now();
      store.put(entry);
    }).catch(() => {});
    return entry;
  }

  // Fallback to memory
  const mem = memoryStore.get(key);
  if (mem) {
    mem.lastAccessed = Date.now();
    return mem;
  }

  return null;
}

/**
 * Store a cache entry.
 * @param {string} key — URL path
 * @param {any} data — Parsed JSON response
 * @param {object} metadata — { ttlMs, etag, lastModified }
 */
export async function setEntry(key, data, metadata = {}) {
  const now = Date.now();
  const sizeBytes = approximateSize(data);
  const entry = {
    key,
    data,
    etag: metadata.etag || null,
    lastModified: metadata.lastModified || null,
    storedAt: now,
    expiresAt: now + (metadata.ttlMs || 60000),
    lastAccessed: now,
    sizeBytes,
  };

  const stored = await withStore('readwrite', (store) => store.put(entry));
  if (stored !== undefined) {
    // Check if we need to evict (fire-and-forget)
    enforceSizeLimit().catch(() => {});
    return;
  }

  // Fallback to memory
  memoryStore.set(key, entry);
}

/**
 * Delete a single cache entry by exact key.
 * @param {string} key
 */
export async function deleteEntry(key) {
  await withStore('readwrite', (store) => store.delete(key));
  memoryStore.delete(key);
}

/**
 * Delete all entries whose keys match a glob-like pattern.
 * Supports:
 *   - Exact match: "/api/events"
 *   - Prefix wildcard: "/api/events/*"  (matches /api/events/anything)
 *   - Contains: "*events*"
 * @param {string} pattern
 */
export async function deleteByPattern(pattern) {
  const keys = await getAllKeys();
  const toDelete = keys.filter((key) => matchPattern(key, pattern));
  for (const key of toDelete) {
    await deleteEntry(key);
  }
}

/**
 * Get all cached URL keys.
 * @returns {Promise<string[]>}
 */
export async function getAllKeys() {
  const idbKeys = await withStore('readonly', (store) => store.getAllKeys());
  const memKeys = Array.from(memoryStore.keys());

  if (Array.isArray(idbKeys) && idbKeys.length > 0) {
    return idbKeys;
  }
  return memKeys;
}

/**
 * Get all cache entries (for bulk operations like size calculation).
 * @returns {Promise<object[]>}
 */
export async function getAllEntries() {
  const entries = await withStore('readonly', (store) => store.getAll());
  if (Array.isArray(entries) && entries.length > 0) {
    return entries;
  }
  return Array.from(memoryStore.values());
}

/**
 * Calculate total approximate cache size.
 * @returns {Promise<number>} — Total bytes
 */
export async function getTotalSize() {
  const entries = await getAllEntries();
  return entries.reduce((sum, entry) => sum + (entry.sizeBytes || 0), 0);
}

/**
 * Get cache statistics.
 * @returns {Promise<{totalSize: number, entryCount: number, oldestEntry: number|null}>}
 */
export async function getCacheStats() {
  const entries = await getAllEntries();
  const totalSize = entries.reduce((sum, e) => sum + (e.sizeBytes || 0), 0);
  const oldestEntry = entries.length > 0
    ? Math.min(...entries.map((e) => e.lastAccessed || e.storedAt))
    : null;
  return { totalSize, entryCount: entries.length, oldestEntry };
}

/**
 * Remove all expired entries.
 * @returns {Promise<number>} — Count of removed entries
 */
export async function cleanupExpired() {
  const now = Date.now();
  const entries = await getAllEntries();
  let removed = 0;
  for (const entry of entries) {
    if (entry.expiresAt && entry.expiresAt < now) {
      await deleteEntry(entry.key);
      removed++;
    }
  }
  return removed;
}

/**
 * Evict LRU entries until total cache size is under the limit.
 * @param {number} [maxBytes=MAX_CACHE_SIZE_BYTES]
 * @returns {Promise<number>} — Count of evicted entries
 */
export async function evictLRU(maxBytes = MAX_CACHE_SIZE_BYTES) {
  let entries = await getAllEntries();
  let totalSize = entries.reduce((sum, e) => sum + (e.sizeBytes || 0), 0);
  let evicted = 0;

  if (totalSize <= maxBytes) return 0;

  // Sort by lastAccessed ascending (oldest first)
  entries.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

  for (const entry of entries) {
    if (totalSize <= maxBytes) break;
    await deleteEntry(entry.key);
    totalSize -= (entry.sizeBytes || 0);
    evicted++;
  }

  if (evicted > 0) {
    console.log(`[CacheStore] LRU evicted ${evicted} entries, freed to ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  }

  return evicted;
}

/**
 * Clear ALL cache entries (nuclear option — only for hard reset).
 */
export async function clearAll() {
  await withStore('readwrite', (store) => store.clear());
  memoryStore.clear();
}


/**
 * Check if total cache size exceeds limit and evict if necessary.
 */
async function enforceSizeLimit() {
  const totalSize = await getTotalSize();
  if (totalSize > MAX_CACHE_SIZE_BYTES) {
    await evictLRU(MAX_CACHE_SIZE_BYTES);
  }
}

/**
 * Match a URL key against a glob-like pattern.
 * @param {string} key
 * @param {string} pattern
 * @returns {boolean}
 */
function matchPattern(key, pattern) {
  // Exact match
  if (pattern === key) return true;

  // Prefix wildcard: "/api/events/*" matches "/api/events/anything"
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return key === prefix || key.startsWith(prefix + '/');
  }

  // Contains wildcard: "*events*"
  if (pattern.startsWith('*') && pattern.endsWith('*')) {
    const inner = pattern.slice(1, -1);
    return key.includes(inner);
  }

  // Prefix only wildcard: "pattern*"
  if (pattern.endsWith('*')) {
    return key.startsWith(pattern.slice(0, -1));
  }

  return false;
}

export { MAX_CACHE_SIZE_BYTES, approximateSize, matchPattern };
