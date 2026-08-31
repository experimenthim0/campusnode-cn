/**
 * prefetchManager.js — Idle-Time Data Prefetching for CampusNode
 *
 * Prefetches API data for pages the user is likely to visit next.
 * Only runs after the main page has fully loaded using requestIdleCallback.
 *
 * Respects:
 * - navigator.connection.saveData (skip if data saver is on)
 * - navigator.connection.effectiveType (skip on slow connections)
 * - Already-cached data (skip if fresh cache exists)
 *
 * Usage:
 *   prefetchEventDetail('event-slug')   — called from EventCard on visible/mount
 *   prefetchClubDetail('club-slug')     — called from ClubCard on visible/mount
 */

import { cachedFetch } from './cacheManager.js';
import { getEntry } from './cacheStore.js';

const API_URL = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_API_URL || '')
  : '';

/** Track what we've already queued to avoid duplicate prefetches */
const prefetchedKeys = new Set();

/** Maximum number of concurrent prefetch requests */
const MAX_CONCURRENT_PREFETCHES = 3;
let activePrefetches = 0;

/**
 * Check if prefetching should be skipped (data saver, slow connection).
 * @returns {boolean} true if we should skip
 */
function shouldSkipPrefetch() {
  if (typeof navigator === 'undefined') return true;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    if (connection.saveData) return true;
    // Skip on slow connections (2G, slow-2g)
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return true;
  }

  return false;
}

/**
 * Schedule a prefetch task during idle time.
 * @param {() => Promise<void>} task
 */
function scheduleIdle(task) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => { task().catch(() => {}); }, { timeout: 5000 });
  } else {
    // Fallback: use setTimeout with a delay to let main thread breathe
    setTimeout(() => { task().catch(() => {}); }, 2000);
  }
}

/**
 * Prefetch event detail data for an event slug.
 * Called from EventCard when the card is visible in the viewport.
 *
 * @param {string} slug — Event slug
 */
export function prefetchEventDetail(slug) {
  if (!slug || shouldSkipPrefetch()) return;

  const path = `/api/events/${slug}`;
  if (prefetchedKeys.has(path)) return;
  prefetchedKeys.add(path);

  scheduleIdle(async () => {
    // Skip if already cached and fresh
    const cached = await getEntry(path);
    if (cached && cached.expiresAt > Date.now()) return;

    // Throttle concurrent prefetches
    if (activePrefetches >= MAX_CONCURRENT_PREFETCHES) return;
    activePrefetches++;

    try {
      await cachedFetch(`${API_URL}${path}`, { prefetch: true });
    } finally {
      activePrefetches--;
    }
  });
}

/**
 * Prefetch club detail data for a club slug/id.
 * Called from ClubCard when the card is visible in the viewport.
 *
 * @param {string} slugOrId — Club slug or ID
 */
export function prefetchClubDetail(slugOrId) {
  if (!slugOrId || shouldSkipPrefetch()) return;

  const path = `/api/clubs/${slugOrId}`;
  if (prefetchedKeys.has(path)) return;
  prefetchedKeys.add(path);

  scheduleIdle(async () => {
    const cached = await getEntry(path);
    if (cached && cached.expiresAt > Date.now()) return;

    if (activePrefetches >= MAX_CONCURRENT_PREFETCHES) return;
    activePrefetches++;

    try {
      await cachedFetch(`${API_URL}${path}`, { prefetch: true });
    } finally {
      activePrefetches--;
    }
  });
}

/**
 * Reset the prefetch tracker. Call when navigating to a new page
 * to allow re-prefetching for newly visible cards.
 */
export function resetPrefetchTracker() {
  prefetchedKeys.clear();
}
