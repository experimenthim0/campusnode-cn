/**
 * cacheSyncChannel.js — Multi-Tab Cache Synchronization for CampusNode
 * 
 * Ensures that when one tab invalidates or updates a cache entry,
 * all other open tabs receive the update automatically.
 * 
 * Primary: BroadcastChannel API (modern browsers)
 * Fallback: localStorage 'storage' event (older browsers)
 * 
 * Message types:
 *   INVALIDATE   — Another tab invalidated cache key(s) → local tab evicts and refetches
 *   UPDATE       — Another tab received fresh data → local tab updates without re-fetching
 *   FORCE_REFRESH — User triggered manual refresh → all tabs refresh that page's data
 */

const CHANNEL_NAME = 'campusnode-cache-sync';
const STORAGE_KEY = '__cn_cache_sync__';

/** @type {BroadcastChannel|null} */
let channel = null;

/** @type {Set<(msg: CacheSyncMessage) => void>} */
const listeners = new Set();

/** @type {boolean} */
let initialized = false;

/**
 * @typedef {Object} CacheSyncMessage
 * @property {'INVALIDATE'|'UPDATE'|'FORCE_REFRESH'} type
 * @property {string[]} [patterns]  — URL patterns to invalidate
 * @property {string}   [key]       — Specific cache key for UPDATE
 * @property {any}      [data]      — Fresh data for UPDATE
 * @property {object}   [metadata]  — Cache metadata for UPDATE
 * @property {string}   [page]      — Page name for FORCE_REFRESH
 * @property {number}   timestamp   — When the message was sent
 * @property {string}   tabId       — Sender tab identifier
 */

/** Unique ID for this tab to avoid processing own messages */
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Initialize the sync channel. Safe to call multiple times.
 */
export function initSyncChannel() {
  if (initialized) return;
  initialized = true;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
        handleIncomingMessage(event.data);
      };
      return;
    } catch {
      // Fall through to localStorage fallback
    }
  }

  // Fallback: localStorage storage events
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const msg = JSON.parse(event.newValue);
        handleIncomingMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    });
  }
}

/**
 * Process an incoming sync message from another tab.
 * Ignores messages from the same tab.
 * @param {CacheSyncMessage} msg
 */
function handleIncomingMessage(msg) {
  if (!msg || msg.tabId === TAB_ID) return;

  // Notify all registered listeners
  for (const listener of listeners) {
    try {
      listener(msg);
    } catch (err) {
      console.warn('[CacheSync] Listener error:', err);
    }
  }
}

/**
 * Broadcast a sync message to all other tabs.
 * @param {Omit<CacheSyncMessage, 'timestamp'|'tabId'>} msg
 */
export function broadcastMessage(msg) {
  const fullMsg = {
    ...msg,
    timestamp: Date.now(),
    tabId: TAB_ID,
  };

  if (channel) {
    try {
      channel.postMessage(fullMsg);
      return;
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback: write to localStorage (triggers 'storage' event in other tabs)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullMsg));
      // Clear immediately — we only need the event, not persistent storage
      setTimeout(() => {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      }, 100);
    } catch {
      // Storage full or unavailable
    }
  }
}

/**
 * Register a listener for sync messages from other tabs.
 * @param {(msg: CacheSyncMessage) => void} callback
 */
export function onSyncMessage(callback) {
  listeners.add(callback);
}

/**
 * Unregister a sync listener.
 * @param {(msg: CacheSyncMessage) => void} callback
 */
export function offSyncMessage(callback) {
  listeners.delete(callback);
}


/**
 * Broadcast cache invalidation to other tabs.
 * @param {string[]} patterns — URL patterns that were invalidated
 */
export function broadcastInvalidate(patterns) {
  broadcastMessage({ type: 'INVALIDATE', patterns });
}

/**
 * Broadcast a cache update (fresh data) to other tabs.
 * Other tabs can adopt this data without re-fetching.
 * @param {string} key — Cache URL key
 * @param {any} data — Fresh response data
 * @param {object} metadata — { etag, lastModified, ttlMs }
 */
export function broadcastUpdate(key, data, metadata) {
  broadcastMessage({ type: 'UPDATE', key, data, metadata });
}

/**
 * Broadcast a force-refresh for a specific page to all tabs.
 * @param {string} page — Page identifier (e.g., 'events', 'clubs', 'profile')
 */
export function broadcastForceRefresh(page) {
  broadcastMessage({ type: 'FORCE_REFRESH', page });
}

/**
 * Destroy the sync channel. Call on app teardown if needed.
 */
export function destroySyncChannel() {
  if (channel) {
    channel.close();
    channel = null;
  }
  listeners.clear();
  initialized = false;
}

export { TAB_ID };
