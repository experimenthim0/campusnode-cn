/**
 * swRegistration.js — Service Worker Registration Helper for CampusNode
 *
 * Handles:
 * - SW registration with proper scope
 * - Update detection (new SW available after deployment)
 * - controllerchange listener for new SW activation
 * - postMessage API to trigger skipWaiting from the app
 */

/**
 * Register the service worker and set up update detection.
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  // In development mode, service workers caching Vite HMR modules causes ERR_CACHE_READ_FAILURE
  if (import.meta.env.DEV) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    } catch {
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service Worker registered with scope:', registration.scope);

    // Check for updates on registration
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW installed but waiting — a new version is available
          console.log('[SW] New Service Worker available. Will activate on next navigation.');

          // Auto-activate: tell the waiting SW to skip waiting
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Listen for controller change (new SW has taken over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] New Service Worker activated. Page will use updated caches.');
      // Note: We do NOT reload the page automatically to avoid disrupting the user.
      // The new SW will serve updated assets on the next navigation.
    });

    return registration;
  } catch (error) {
    console.warn('[SW] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker (for debugging/testing).
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  console.log('[SW] All Service Workers unregistered.');
}
