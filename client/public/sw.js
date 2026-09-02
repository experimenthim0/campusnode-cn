/**
 * sw.js — CampusNode Service Worker v2
 *
 * ARCHITECTURE: The SW handles ONLY static assets, images, fonts, and the app shell.
 * All API caching is handled by cacheManager.js in the app layer via IndexedDB.
 *
 * Versioned Caches:
 *   campusnode-static-v2   — Hashed JS/CSS from Vite build (cache-first, immutable)
 *   campusnode-images-v1   — Images with type-aware expiry (cache-first)
 *   campusnode-shell-v1    — App shell: index.html, manifest, PWA icons, fonts (network-first)
 *
 * Strategies:
 *   /assets/*              — Cache-first (Vite hash = immutable)
 *   Images (.png,.jpg,etc) — Cache-first with type-aware TTL
 *   Fonts (.otf,.woff,etc) — Cache-first, 1 year
 *   Navigation             — Network-first, fallback to cached /index.html
 *   /api/*                 — Pass through entirely (app-layer handles caching)
 *
 * Web Push Notifications and App Icon Badging are preserved from v1.
 */

// ─── Cache Names (increment version to bust old caches on deploy) ───────────

const CACHE_STATIC = 'campusnode-static-v2';
const CACHE_IMAGES = 'campusnode-images-v1';
const CACHE_SHELL  = 'campusnode-shell-v2';

/** All current cache names — anything not in this set gets deleted on activate */
const CURRENT_CACHES = new Set([CACHE_STATIC, CACHE_IMAGES, CACHE_SHELL]);

/** Known cache prefixes for version-based cleanup */
const CACHE_PREFIXES = [
  'campusnode-static-',
  'campusnode-images-',
  'campusnode-shell-',
];

// ─── Precache: App Shell Assets ─────────────────────────────────────────────

const PRECACHE_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/cs_pwa_notification.png',
  '/darkthemelogo.png',
  '/lightthemelogo2.png',
  '/clubsetu-favicon.jpg',
];

// ─── Image Type Detection & TTL ─────────────────────────────────────────────

const ONE_YEAR_MS  = 365 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS   = 24 * 60 * 60 * 1000;

/**
 * Determine the cache TTL for an image based on its URL pattern.
 *
 * | Image Type     | Detection Pattern                        | TTL    |
 * |----------------|------------------------------------------|--------|
 * | Club logos     | URL contains 'clubLogo' or '/clubs/'     | 1 year |
 * | Static PWA     | /pwa-*.png, /darkthemelogo, etc.          | 1 year |
 * | Event posters  | URL contains 'events/' or generic images | 30 days|
 * | User avatars   | URL contains 'avatar' or 'profile'       | 1 day  |
 * | Other images   | Everything else                          | 30 days|
 */
function getImageTTL(url) {
  const path = url.pathname || url;
  const href = url.href || url;

  // Club logos — very stable, 1 year
  if (href.includes('clubLogo') || href.includes('/clubs/')) return ONE_YEAR_MS;

  // Static PWA/brand images — 1 year
  if (/^\/(pwa-|darkthemelogo|lightthemelogo|clubsetu-favicon|nitjlogo)/.test(path)) return ONE_YEAR_MS;

  // User avatars — change frequently, 1 day
  if (href.includes('avatar') || href.includes('profile')) return ONE_DAY_MS;

  // Everything else (event posters, general images) — 30 days
  return THIRTY_DAYS_MS;
}

/**
 * Check if a cached image response has expired based on type-aware TTL.
 * Uses a custom X-CampusNode-Cached-At header stored when caching.
 */
function isImageExpired(response, url) {
  const cachedAt = response.headers.get('X-CampusNode-Cached-At');
  if (!cachedAt) return false; // No timestamp = treat as fresh

  const age = Date.now() - parseInt(cachedAt, 10);
  const ttl = getImageTTL(url);
  return age > ttl;
}

// ─── Install Event ──────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(async (cache) => {
      console.log('[SW v2] Precaching app shell assets');
      await cache.addAll(PRECACHE_SHELL).catch((err) => {
        console.warn('[SW v2] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate Event — Version-Based Cache Cleanup ───────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Keep current caches
          if (CURRENT_CACHES.has(cacheName)) return;

          // Check if it's an old version of one of our cache prefixes
          const isOurCache = CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix));

          if (isOurCache) {
            console.log('[SW v2] Deleting old cache version:', cacheName);
            return caches.delete(cacheName);
          }

          // Also delete the legacy v1 single-bucket cache
          if (cacheName === 'campusnode-offline-v1') {
            console.log('[SW v2] Deleting legacy cache:', cacheName);
            return caches.delete(cacheName);
          }

          // Leave unknown caches alone (could be from other origins)
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch Event ────────────────────────────────────────────────────────────

/**
 * Check if a URL should bypass SW interception entirely.
 */
function shouldBypass(url) {
  // Only handle http(s)
  if (!url.protocol.startsWith('http')) return true;

  // Skip cross-origin requests (Cloudinary images are handled separately)
  // Actually, we DO want to cache cross-origin images from Cloudinary
  // so only skip non-GET and special internal requests

  const path = url.pathname;
  const search = url.search;

  // Skip Vite Dev Server HMR internal requests
  if (
    path.startsWith('/@') ||
    path.startsWith('/node_modules/') ||
    path.includes('/src/') ||
    search.includes('t=') ||
    path.endsWith('.jsx') ||
    path.endsWith('.tsx') ||
    path.endsWith('.ts')
  ) {
    return true;
  }

  // Skip ALL API routes — cacheManager.js handles API caching in IndexedDB
  if (path.startsWith('/api') || path.startsWith('/socket.io')) {
    return true;
  }

  return false;
}

/**
 * Check if a request is for an image file.
 */
function isImageRequest(url) {
  const path = url.pathname.toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|avif)$/.test(path);
}

/**
 * Check if a request is for a font file.
 */
function isFontRequest(url) {
  const path = url.pathname.toLowerCase();
  return /\.(otf|woff|woff2|ttf|eot)$/.test(path);
}

/**
 * Check if a request is for a hashed static asset (Vite build output).
 * Vite outputs to /assets/ with content hashes in filenames.
 */
function isHashedAsset(url) {
  return url.pathname.startsWith('/assets/');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass dev tools, HMR, API routes
  if (shouldBypass(url)) return;

  const isNavigation =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') &&
      event.request.headers.get('accept').includes('text/html'));

  // ── Strategy 1: Navigation — Network-first, fallback to cached shell ──
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy1 = response.clone();
            const copy2 = response.clone();

            caches.open(CACHE_SHELL).then((cache) => {
              cache.put(event.request, copy1).catch(() => {});
              cache.put('/index.html', copy2).catch(() => {});
            }).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          console.log('[SW v2] Offline navigation. Serving cached shell.');
          const cache = await caches.open(CACHE_SHELL);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;
          const fallback = await cache.match('/index.html');
          if (fallback) return fallback;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // ── Strategy 2: Hashed Static Assets — Cache-first (immutable) ────────
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        // Not cached — fetch and cache forever (hash = immutable)
        const response = await fetch(event.request);
        if (response && response.status === 200) {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      })
    );
    return;
  }

  // ── Strategy 3: Fonts — Cache-first, 1 year ───────────────────────────
  if (isFontRequest(url)) {
    event.respondWith(
      caches.open(CACHE_SHELL).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response && response.status === 200) {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      })
    );
    return;
  }

  // ── Strategy 4: Images — Cache-first with type-aware TTL ──────────────
  if (isImageRequest(url)) {
    event.respondWith(
      caches.open(CACHE_IMAGES).then(async (cache) => {
        const cached = await cache.match(event.request);

        if (cached && !isImageExpired(cached, url)) {
          return cached;
        }

        // Fetch fresh image
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            // Clone and add timestamp header for TTL tracking
            const headers = new Headers(response.headers);
            headers.set('X-CampusNode-Cached-At', Date.now().toString());

            const timedResponse = new Response(await response.clone().blob(), {
              status: response.status,
              statusText: response.statusText,
              headers,
            });

            cache.put(event.request, timedResponse).catch(() => {});
          }
          return response;
        } catch {
          // Offline — return expired cache if available, otherwise nothing
          if (cached) return cached;
          return new Response('', { status: 504, statusText: 'Image unavailable offline' });
        }
      })
    );
    return;
  }

  // ── Strategy 5: Other same-origin assets — Stale-while-revalidate ─────
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        const cached = await cache.match(event.request);

        if (cached) {
          // Serve stale from cache, revalidate in background
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                cache.put(event.request, response.clone()).catch(() => {});
              }
            })
            .catch(() => {});
          return cached;
        }

        try {
          const response = await fetch(event.request);
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(event.request, response.clone()).catch(() => {});
          }
          return response;
        } catch (err) {
          const fallback = await cache.match('/index.html');
          if (fallback) return fallback;
          return new Response('Network error or offline', { status: 503, statusText: 'Service Unavailable' });
        }
      })()
    );
    return;
  }
});

// ─── Message Handler (for skipWaiting from app) ─────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Web Push Notifications & App Icon Badging (preserved from v1) ──────────

self.addEventListener('push', (event) => {
  console.log('[CampusNode SW Push] Push event received.');

  let data = {
    title: 'CampusNode',
    body: 'New update available on CampusNode!',
    url: '/events',
    unreadCount: 1,
    tag: 'campusnode-notification',
  };

  if (event.data) {
    try {
      data = event.data.json();
      console.log(`[CampusNode SW Push] Parsed push notification payload ID: ${data.id || data.tag || 'unknown'}`);
    } catch (e) {
      data.body = event.data.text();
      console.log('[CampusNode SW Push] Received text payload:', data.body);
    }
  }

  const title = data.title || 'CampusNode';
  const options = {
    body: data.body || 'You have a new campus update.',
    icon: '/cs_pwa_notification.png',
    badge: '/cs_pwa_notification.png',
    tag: data.id || data.tag || 'campusnode-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      id: data.id,
    },
    actions: data.actions || [
      { action: 'open', title: 'View Details' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options)
        .then(() => {
          console.log(`[CampusNode SW Push] OS Notification displayed successfully (${options.tag})`);
        })
        .catch((err) => {
          console.error('[CampusNode Push] Failed to display notification:', err);
        }),
      'setAppBadge' in navigator
        ? navigator.setAppBadge(data.unreadCount || 1).catch(() => {})
        : Promise.resolve(),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';
  console.log('[CampusNode SW Push] Notification click handler triggered:', targetUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
