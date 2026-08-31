/**
 * pushSubscription.js — Web Push Subscription Manager for CampusNode
 *
 * Handles:
 * 1. SW registration ready check
 * 2. Fetching VAPID public key from backend
 * 3. Creating/updating PushSubscription in browser
 * 4. Syncing subscription payload to backend /api/push/subscribe
 * 5. Cleaning up subscription on logout / unsubscribe
 */

import api from '../services/api';
import { getNotificationPermissionState } from './pushNotifications';

/**
 * Utility to convert base64url VAPID key string to Uint8Array for PushManager
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register or sync Web Push subscription for the logged-in user.
 * @returns {Promise<PushSubscription|null>}
 */
export async function registerPushSubscription() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[CampusNode PushSub] Web Push not supported in this browser environment.');
    return null;
  }

  if (getNotificationPermissionState() !== 'granted') {
    console.log('[CampusNode PushSub] Notification permission is not granted.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[CampusNode PushSub] Service Worker registration not ready.');
      return null;
    }

    // 1. Get VAPID Public Key from server
    const { data: keyData } = await api.get('/api/push/vapid-public-key');
    if (!keyData?.publicKey) {
      console.warn('[CampusNode PushSub] Failed to retrieve VAPID public key.');
      return null;
    }

    const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('[CampusNode PushSub] Creating new PushSubscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const subscriptionJSON = subscription.toJSON();
    await api.post('/api/push/subscribe', {
      endpoint: subscriptionJSON.endpoint,
      keys: subscriptionJSON.keys,
      userAgent: navigator.userAgent,
    });

    console.log('[CampusNode PushSub] Push subscription synced with backend successfully.');
    return subscription;
  } catch (error) {
    console.error('[CampusNode PushSub] Error registering push subscription:', error);
    return null;
  }
}

/**
 * Unsubscribe user from Web Push notifications (e.g. on logout or preference change).
 */
export async function unsubscribePushSubscription() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await api.post('/api/push/unsubscribe', { endpoint }).catch(() => {});
      console.log('[CampusNode PushSub] Unsubscribed from Web Push successfully.');
    }
  } catch (error) {
    console.error('[CampusNode PushSub] Error unsubscribing:', error);
  }
}

/**
 * Checks if an active PushSubscription exists for the browser Service Worker.
 * @returns {Promise<boolean>}
 */
export async function isPushSubscribed() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    return false;
  }
}
