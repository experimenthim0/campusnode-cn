/**
 * notificationManager.js — Central Notification & Deduplication Manager for CampusNode
 *
 * Responsibilities:
 * 1. Payload normalization across Socket.io, Web Push, and Polling
 * 2. Mandatory notification deduplication by notification ID
 * 3. Orchestration of In-App Toast + Native OS Push Notifications + App Icon Badging
 */

import { sendLocalPushNotification, setAppIconBadge } from './pushNotifications';

// Deduplication store in memory + sessionStorage persistence
const PROCESSED_IDS_KEY = 'campusnode_processed_notif_ids';

function getProcessedIds() {
  try {
    const stored = sessionStorage.getItem(PROCESSED_IDS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (_) {
    return new Set();
  }
}

function saveProcessedIds(set) {
  try {
    // Keep max 200 IDs to avoid memory bloat
    const array = Array.from(set).slice(-200);
    sessionStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(array));
  } catch (_) {}
}

const processedIds = getProcessedIds();

/**
 * Normalize any incoming raw notification object into standard structure
 * @param {object} rawNotif
 * @returns {object}
 */
export function normalizeNotification(rawNotif) {
  if (!rawNotif) return null;

  const id = String(rawNotif.id || rawNotif._id || `temp-${Date.now()}`);
  const title = rawNotif.title || rawNotif.heading || 'CampusNode';
  const message = rawNotif.message || rawNotif.content || rawNotif.body || 'New campus update!';
  
  const isTeam =
    rawNotif.type === 'TEAM_INVITATION' ||
    rawNotif.type === 'TEAM_RESPONSE' ||
    Boolean(rawNotif.teamId) ||
    title.toLowerCase().includes('team') ||
    title.toLowerCase().includes('invitation');
  const isPayment = rawNotif.type === 'PAYMENT_REVIEW' || title.toLowerCase().includes('payment');
  const url = rawNotif.link || rawNotif.url || (
    isTeam
      ? '/notifications'
      : isPayment
      ? `/my-events${rawNotif.eventId ? `?eventId=${rawNotif.eventId}` : ''}`
      : (rawNotif.eventId ? `/event/${rawNotif.eventId}` : '/notifications')
  );

  const sender = isTeam
    ? { name: 'CampusNode', clubName: 'CampusNode' }
    : (rawNotif.sender || { name: 'CampusNode', clubName: 'CampusNode' });

  return {
    id,
    _id: id,
    title,
    message,
    url,
    type: rawNotif.type || 'general',
    eventId: rawNotif.eventId || null,
    teamId: rawNotif.teamId || null,
    sender,
    createdAt: rawNotif.createdAt || new Date().toISOString(),
    readBy: rawNotif.readBy || [],
  };
}

/**
 * Process incoming notification safely with deduplication.
 * @param {object} rawNotif
 * @param {object} options
 * @param {function} options.onToast  Callback to display in-app toast
 * @param {function} options.onStateUpdate Callback to update notifications list / unread count
 * @returns {object|null} normalized notification if processed, null if duplicate
 */
export function processNotification(rawNotif, options = {}) {
  const norm = normalizeNotification(rawNotif);
  if (!norm) return null;

  // Deduplication check
  if (processedIds.has(norm.id)) {
    console.log(`[NotificationManager] Duplicate notification ignored: ${norm.id}`);
    return null;
  }

  // Mark as processed
  processedIds.add(norm.id);
  saveProcessedIds(processedIds);

  console.log(`[NotificationManager] Processing new notification: ${norm.title} (${norm.id})`);

  if (typeof options.onToast === 'function') {
    options.onToast(norm);
  }

  sendLocalPushNotification(norm.title, {
    body: norm.message,
    tag: norm.id,
    data: { url: norm.url, id: norm.id },
  });

  return norm;
}
