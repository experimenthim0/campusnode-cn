/**
 * cacheManager.js — Central Intelligent Cache Manager for CampusNode
 *
 * This is the SINGLE layer for all API data caching. The Service Worker
 * does NOT cache API responses — only static assets, images, and app shell.
 *
 * Features:
 * - IndexedDB-backed persistence (survives refreshes/restarts)
 * - Per-resource TTL with event-status-aware durations
 * - Stale-while-revalidate (SWR): instant cached data + background refresh
 * - ETag / Last-Modified conditional requests (304 = zero bandwidth)
 * - CRUD-triggered invalidation with multi-tab BroadcastChannel sync
 * - LRU eviction at 100 MB limit
 * - Manual refresh bypass & page-specific invalidation
 * - Never-cache list for auth, registration, QR verification
 */
import api from '../services/api';
import axios from 'axios'; // for isCancel or other utilities if needed
import {
  getEntry,
  setEntry,
  deleteEntry,
  deleteByPattern,
  cleanupExpired as storeCleanupExpired,
  getCacheStats as storeGetCacheStats,
  evictLRU,
  getAllEntries,
} from './cacheStore.js';
import {
  initSyncChannel,
  onSyncMessage,
  broadcastInvalidate,
  broadcastUpdate,
} from './cacheSyncChannel.js';


/** Default TTL values by resource type */
const TTL = {
  EVENTS_LIST: 15 * 1000,             // Event counts/status are mutable
  EVENT_DETAIL_UPCOMING: 15 * 1000,  // Event counts/status are mutable
  EVENT_DETAIL_LIVE: 30 * 1000,       // 30 seconds
  EVENT_DETAIL_ENDED: 24 * 60 * 60 * 1000, // 24 hours
  CLUBS_LIST: 6 * 60 * 60 * 1000,    // 6 hours
  CLUB_DETAIL: 6 * 60 * 60 * 1000,   // 6 hours
  USER_PROFILE: 30 * 60 * 1000,      // 30 minutes
  NOTIFICATIONS: 1 * 60 * 1000,      // 1 minute
  ADMIN_DASHBOARD: 2 * 60 * 1000,    // 2 minutes
  REGISTRATION_STATUS: 0,             // Always fetch current membership state
  DEFAULT: 5 * 60 * 1000,            // 5 minutes fallback
};

// These URL patterns are ALWAYS fetched fresh — never stored in cache.

const NEVER_CACHE_PATTERNS = [
  '/api/auth/',
  '/api/events/upload',
  '/check-in',
  '/register',
  '/api/payment/',
  '/api/events/user/',
  '/verify-2fa',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];


/**
 * Determine the TTL for a given URL.
 * @param {string} url — API URL
 * @param {object} [options] — { eventStatus }
 * @returns {number} TTL in milliseconds
 */
function getTTLForUrl(url, options = {}) {
  const path = extractPath(url);

  if (/\/api\/events\/?$/.test(path)) return TTL.EVENTS_LIST;

  // Event detail — status-aware
  if (/\/api\/events\/[^/]+\/?$/.test(path)) {
    return getEventTTL(options.eventStatus);
  }

  if (/\/api\/clubs\/?$/.test(path)) return TTL.CLUBS_LIST;

  // Club detail
  if (/\/api\/clubs\/[^/]+\/?$/.test(path)) return TTL.CLUB_DETAIL;

  // Notifications
  if (path.includes('/api/notifications')) return TTL.NOTIFICATIONS;

  // Admin dashboard
  if (path.includes('/api/admin/')) return TTL.ADMIN_DASHBOARD;

  // User profile / user data
  if (path.includes('/api/users/') || path.includes('/api/auth/me')) return TTL.USER_PROFILE;

  // Registration status — very short
  if (path.includes('/api/events/user/')) return TTL.REGISTRATION_STATUS;

  return TTL.DEFAULT;
}

/**
 * Get TTL based on event status.
 * @param {string} [status] — 'UPCOMING', 'LIVE', 'ENDED'
 * @returns {number}
 */
export function getEventTTL(status) {
  switch (status?.toUpperCase()) {
    case 'LIVE': return TTL.EVENT_DETAIL_LIVE;
    case 'ENDED':
    case 'COMPLETED':
    case 'PAST':
      return TTL.EVENT_DETAIL_ENDED;
    case 'UPCOMING':
    default:
      return TTL.EVENT_DETAIL_UPCOMING;
  }
}


/** @type {Map<string, Set<(data: any) => void>>} */
const updateCallbacks = new Map();

/**
 * Register a callback that fires when background SWR fetch gets new data.
 * @param {string} url — The URL to watch
 * @param {(data: any) => void} callback
 */
export function registerUpdateCallback(url, callback) {
  const key = extractPath(url);
  if (!updateCallbacks.has(key)) {
    updateCallbacks.set(key, new Set());
  }
  updateCallbacks.get(key).add(callback);
}

/**
 * Unregister an update callback.
 * @param {string} url
 * @param {(data: any) => void} callback
 */
export function unregisterUpdateCallback(url, callback) {
  const key = extractPath(url);
  const cbs = updateCallbacks.get(key);
  if (cbs) {
    cbs.delete(callback);
    if (cbs.size === 0) updateCallbacks.delete(key);
  }
}

/**
 * Notify all subscribers that a URL has new data.
 * @param {string} key
 * @param {any} data
 */
function notifyUpdateCallbacks(key, data) {
  const cbs = updateCallbacks.get(key);
  if (cbs) {
    for (const cb of cbs) {
      try { cb(data); } catch (err) {
        console.warn('[CacheManager] Update callback error:', err);
      }
    }
  }
}


let isInitialized = false;

function ensureInitialized() {
  if (isInitialized) return;
  isInitialized = true;

  // Initialize multi-tab sync
  initSyncChannel();

  // Listen for sync messages from other tabs
  onSyncMessage(handleSyncMessage);

  // Periodic cleanup of expired entries (every 5 minutes)
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      storeCleanupExpired().catch(() => {});
    }, 5 * 60 * 1000);
  }
}

/**
 * Handle incoming sync messages from other tabs.
 */
function handleSyncMessage(msg) {
  switch (msg.type) {
    case 'INVALIDATE':
      // Another tab invalidated cache entries — delete locally too
      if (msg.patterns) {
        for (const pattern of msg.patterns) {
          deleteByPattern(pattern).then(() => {
            // Notify local subscribers to refetch
            notifyUpdateCallbacks(pattern, null);
          }).catch(() => {});
        }
      }
      break;

    case 'UPDATE':
      // Another tab got fresh data — adopt it locally without re-fetching
      if (msg.key && msg.data !== undefined) {
        const ttlMs = msg.metadata?.ttlMs || TTL.DEFAULT;
        setEntry(msg.key, msg.data, {
          ttlMs,
          etag: msg.metadata?.etag,
          lastModified: msg.metadata?.lastModified,
        }).then(() => {
          notifyUpdateCallbacks(msg.key, msg.data);
        }).catch(() => {});
      }
      break;

    case 'FORCE_REFRESH':
      // Another tab triggered a page refresh — invalidate locally
      if (msg.page) {
        const patterns = getPagePatterns(msg.page);
        for (const p of patterns) {
          deleteByPattern(p).catch(() => {});
        }
      }
      break;
  }
}


/**
 * Intelligent cached fetch with SWR, ETag, and IndexedDB persistence.
 *
 * 1. Check IndexedDB for cached data
 * 2. If cached AND not expired → return immediately
 * 3. If cached BUT expired (stale) → return stale + revalidate in background
 * 4. If not cached → fetch from server, cache, return
 *
 * @param {string} url — Full API URL
 * @param {object} [options]
 * @param {number} [options.ttlMs] — Override TTL
 * @param {string} [options.eventStatus] — For event-status-aware TTL
 * @param {boolean} [options.forceRefresh] — Bypass cache entirely
 * @param {boolean} [options.prefetch] — Lower priority, don't notify UI
 * @param {object} [options.axiosConfig] — Extra axios config
 * @returns {Promise<any>} — Parsed response data
 */
export async function cachedFetch(url, options = {}) {
  ensureInitialized();

  const path = extractPath(url);

  // Never cache certain routes
  if (shouldNeverCache(path)) {
    const res = await api.get(url, options.axiosConfig);
    return res.data;
  }

  // Force refresh — bypass cache entirely
  if (options.forceRefresh) {
    return fetchAndCache(url, path, options);
  }

  // Check IndexedDB for cached entry
  const cached = await getEntry(path);
  const now = Date.now();

  if (cached) {
    const isExpired = cached.expiresAt && cached.expiresAt < now;

    if (!isExpired) {
      // Fresh cache — return immediately, but still revalidate in background for SWR
      revalidateInBackground(url, path, cached, options);
      return cached.data;
    }

    // Stale cache — return stale data immediately, revalidate in background
    revalidateInBackground(url, path, cached, options);
    return cached.data;
  }

  // No cache — fetch fresh
  return fetchAndCache(url, path, options);
}

/**
 * Fetch from server, cache the response, and return data.
 * Sends ETag/Last-Modified conditional headers if we have them.
 */
async function fetchAndCache(url, path, options = {}) {
  const ttlMs = options.ttlMs || getTTLForUrl(url, options);
  const cached = await getEntry(path);

  // Build conditional request headers
  const headers = {};
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag;
  }
  if (cached?.lastModified) {
    headers['If-Modified-Since'] = cached.lastModified;
  }

  try {
    const res = await api.get(url, {
      ...options.axiosConfig,
      headers: { ...options.axiosConfig?.headers, ...headers },
      validateStatus: (status) => status < 400 || status === 304,
    });

    // 304 Not Modified — server confirms cache is still valid
    if (res.status === 304 && cached) {
      // Extend TTL without re-downloading data
      await setEntry(path, cached.data, {
        ttlMs,
        etag: cached.etag,
        lastModified: cached.lastModified,
      });
      return cached.data;
    }

    // Fresh data — cache it
    const etag = res.headers?.etag || res.headers?.['etag'] || null;
    const lastModified = res.headers?.['last-modified'] || null;

    await setEntry(path, res.data, { ttlMs, etag, lastModified });

    // Broadcast update to other tabs (if not prefetch)
    if (!options.prefetch) {
      broadcastUpdate(path, res.data, { ttlMs, etag, lastModified });
    }

    return res.data;
  } catch (err) {
    // If network fails but we have stale data, return it
    if (cached?.data) {
      console.warn('[CacheManager] Network error, returning stale data for:', path);
      return cached.data;
    }
    throw err;
  }
}

/**
 * Revalidate in background (SWR pattern).
 * Doesn't block the caller — fetches fresh data and updates cache + UI.
 */
function revalidateInBackground(url, path, cached, options) {
  const ttlMs = options.ttlMs || getTTLForUrl(url, options);

  // Fire-and-forget background revalidation
  fetchAndCacheBackground(url, path, ttlMs, cached, options).catch(() => {});
}

async function fetchAndCacheBackground(url, path, ttlMs, cached, options) {
  const headers = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

  try {
    const res = await api.get(url, {
      ...options.axiosConfig,
      headers: { ...options.axiosConfig?.headers, ...headers },
      validateStatus: (status) => status < 400 || status === 304,
    });

    if (res.status === 304) {
      // Content unchanged — just extend TTL
      await setEntry(path, cached.data, {
        ttlMs,
        etag: cached.etag,
        lastModified: cached.lastModified,
      });
      return;
    }

    const etag = res.headers?.etag || res.headers?.['etag'] || null;
    const lastModified = res.headers?.['last-modified'] || null;
    const dataChanged = !shallowEqual(cached?.data, res.data);

    await setEntry(path, res.data, { ttlMs, etag, lastModified });

    if (dataChanged && !options.prefetch) {
      // Notify local UI subscribers
      notifyUpdateCallbacks(path, res.data);
      broadcastUpdate(path, res.data, { ttlMs, etag, lastModified });
    }
  } catch {
    // Background revalidation failure is non-critical — stale data continues to be served
  }
}


/**
 * Invalidate cache entries matching patterns. Call after CRUD operations.
 * Automatically broadcasts to other tabs.
 *
 * @param {string[]} patterns — URL patterns to invalidate
 *   Examples: ['/api/events', '/api/events/*', '/api/admin/*']
 */
export async function invalidateCache(patterns) {
  ensureInitialized();

  for (const pattern of patterns) {
    await deleteByPattern(pattern);
  }

  broadcastInvalidate(patterns);
}

/**
 * Invalidate a specific URL's cache entry.
 * @param {string} url — Full or path URL
 */
export async function invalidateExact(url) {
  ensureInitialized();
  const path = extractPath(url);
  await deleteEntry(path);
  broadcastInvalidate([path]);
}

/**
 * Invalidate only caches relevant to a specific page.
 * More precise than clearing everything — used for manual refresh.
 *
 * @param {string} pageName — e.g., 'events', 'clubs', 'profile', 'admin', 'notifications'
 */
export async function invalidateForPage(pageName) {
  ensureInitialized();
  const patterns = getPagePatterns(pageName);
  for (const pattern of patterns) {
    await deleteByPattern(pattern);
  }
}

/**
 * Bypass cache and fetch fresh data. For pull-to-refresh / Ctrl+Shift+R.
 * @param {string} url
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function forceRefresh(url, options = {}) {
  return cachedFetch(url, { ...options, forceRefresh: true });
}


/**
 * Refresh all expired cache entries in background.
 * Called when the user comes back online.
 */
export async function refreshExpired() {
  ensureInitialized();
  const entries = await getAllEntries();
  const now = Date.now();
  const expired = entries.filter((e) => e.expiresAt && e.expiresAt < now);

  // Revalidate expired entries in parallel (max 5 concurrent)
  const chunks = chunkArray(expired, 5);
  for (const chunk of chunks) {
    await Promise.allSettled(
      chunk.map((entry) => {
        const fullUrl = buildFullUrl(entry.key);
        return fetchAndCache(fullUrl, entry.key, {}).catch(() => {});
      })
    );
  }
}


/**
 * Remove all expired entries from IndexedDB.
 * @returns {Promise<number>} — Count removed
 */
export async function cleanupExpired() {
  return storeCleanupExpired();
}

/**
 * Get cache statistics.
 * @returns {Promise<{totalSize: number, entryCount: number, oldestEntry: number|null}>}
 */
export async function getCacheStats() {
  return storeGetCacheStats();
}


/**
 * Extract the pathname from a full URL or return as-is if already a path.
 * @param {string} url
 * @returns {string}
 */
function extractPath(url) {
  try {
    if (url.startsWith('http')) {
      return new URL(url).pathname;
    }
  } catch {}
  return url;
}

/**
 * Rebuild a full URL from a cached path using the configured API base.
 * @param {string} path
 * @returns {string}
 */
function buildFullUrl(path) {
  const apiUrl = typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_API_URL || ''
    : '';
  return apiUrl + path;
}

/**
 * Check if a path should never be cached.
 * @param {string} path
 * @returns {boolean}
 */
function shouldNeverCache(path) {
  return NEVER_CACHE_PATTERNS.some((pattern) => path.includes(pattern));
}

/**
 * Get URL patterns associated with a page name.
 * Used for page-specific cache invalidation.
 * @param {string} pageName
 * @returns {string[]}
 */
function getPagePatterns(pageName) {
  const patterns = {
    events: ['/api/events', '/api/events/*'],
    clubs: ['/api/clubs', '/api/clubs/*'],
    profile: ['/api/users/*', '/api/auth/me'],
    admin: ['/api/admin/*', '/api/events', '/api/clubs'],
    notifications: ['/api/notifications'],
    home: ['/api/events', '/api/clubs'],
  };
  return patterns[pageName] || [];
}

/**
 * Shallow compare two values for equality.
 * Used to detect if background-fetched data actually changed.
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Split an array into chunks of a given size.
 * @param {any[]} arr
 * @param {number} size
 * @returns {any[][]}
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export { TTL };
