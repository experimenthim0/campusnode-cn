/**
 * pushNotifications.js — PWA & Browser Push Notification Helpers
 *
 * Core Native Push Notification utilities for CampusNode.
 */

/**
 * Get current browser notification permission state.
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getNotificationPermissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Request notification permission from the user on an explicit user gesture.
 * @returns {Promise<'granted' | 'denied' | 'default' | 'unsupported'>}
 */
export async function requestPermissionWithUserGesture() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[CampusNode Push] Notifications not supported in this browser environment.');
    return 'unsupported';
  }

  try {
    const result = await Notification.requestPermission();
    console.log(`[CampusNode Push] Notification permission requested: ${result}`);
    return result;
  } catch (error) {
    console.error('[CampusNode Push] Error requesting notification permission:', error);
    return Notification.permission || 'denied';
  }
}

/**
 * Legacy permission request wrapper (kept for backward compatibility)
 * @returns {Promise<boolean>}
 */
export async function requestNotificationPermission() {
  const state = await requestPermissionWithUserGesture();
  return state === 'granted';
}

/**
 * Update the app icon badge count (PWA Badging API).
 * @param {number} count 
 */
export async function setAppIconBadge(count) {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) {
    return;
  }

  try {
    const num = Number(count);
    if (num > 0) {
      await navigator.setAppBadge(num);
    } else {
      await navigator.clearAppBadge();
    }
  } catch (err) {
    console.warn('[CampusNode Push] Unable to set app badge:', err);
  }
}

/**
 * Clear the app icon badge.
 */
export async function clearAppIconBadge() {
  if (typeof navigator === 'undefined' || !('clearAppBadge' in navigator)) {
    return;
  }

  try {
    await navigator.clearAppBadge();
  } catch (err) {
    console.warn('[CampusNode Push] Unable to clear app badge:', err);
  }
}

/**
 * Helper to get Service Worker registration safely
 * @param {number} ms
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
async function getSwRegistration(ms = 3000) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch (_) {
    return null;
  }
}

/**
 * Display a native OS push notification banner.
 * Primary: Service Worker showNotification()
 * Fallback: new Notification() constructor
 *
 * @param {string} title
 * @param {object} options
 */
export async function sendLocalPushNotification(title, options = {}) {
  if (getNotificationPermissionState() !== 'granted') {
    return;
  }

  const notificationOptions = {
    icon: options.icon || '/cs_pwa_notification.png',
    badge: options.badge || '/cs_pwa_notification.png',
    body: options.body || '',
    tag: options.tag || options.id || `campusnode-${Date.now()}`,
    renotify: options.renotify ?? true,
    requireInteraction: options.requireInteraction ?? false,
    data: options.data || { url: options.url || '/' },
    actions: options.actions || [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  try {
    // Primary mechanism: Service Worker showNotification()
    const registration = await getSwRegistration(3000);

    if (registration && registration.showNotification) {
      await registration.showNotification(title, notificationOptions);
      console.log('[CampusNode Push] Native notification displayed via Service Worker.');
    } else {
      // Fallback: Notification constructor
      new Notification(title, notificationOptions);
      console.log('[CampusNode Push] Native notification displayed via Notification constructor fallback.');
    }
  } catch (error) {
    console.error('[CampusNode Push] Failed to display notification:', error);
    try {
      new Notification(title, { body: options.body || '' });
    } catch (_) {
    }
  }
}
