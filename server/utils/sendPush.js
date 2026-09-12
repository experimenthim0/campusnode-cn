import prisma from "../lib/prisma.js";
import { createVapidHeader } from "./vapid.js";

/**
 * Send Web Push notification payload to recipient user(s)
 * @param {string[]|string|null} recipientUserIds  Array of user IDs, single user ID, or null for broadcast
 * @param {object} notificationPayload
 */
export async function sendWebPushNotification(recipientUserIds, notificationPayload) {
  try {
    let whereClause = {};

    if (recipientUserIds) {
      const ids = Array.isArray(recipientUserIds) ? recipientUserIds : [recipientUserIds];
      if (ids.length > 0) {
        whereClause = { userId: { in: ids.map((id) => String(id)) } };
      }
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause,
    });

    if (subscriptions.length === 0) {
      console.log("[CampusNode Push] No active push subscriptions found for target recipients.");
      return;
    }

    console.log(`[CampusNode Push] Sending web push to ${subscriptions.length} active subscription(s)...`);

    const payloadString = JSON.stringify({
      id: notificationPayload.id || notificationPayload._id,
      title: notificationPayload.title || "CampusNode",
      body: notificationPayload.message || notificationPayload.content || "New campus update!",
      url: notificationPayload.link || (
        notificationPayload.type === "TEAM_INVITATION" ||
        notificationPayload.type === "TEAM_RESPONSE" ||
        Boolean(notificationPayload.teamId)
          ? "/notifications"
          : notificationPayload.eventId
          ? `/event/${notificationPayload.eventId}`
          : "/notifications"
      ),
      type: notificationPayload.type || "general",
      tag: notificationPayload.id || `notif-${Date.now()}`,
      timestamp: notificationPayload.createdAt || new Date().toISOString(),
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const vapidHeaders = createVapidHeader(sub.endpoint);
        if (!vapidHeaders) return;

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            TTL: "86400",
            Urgency: "high",
            ...vapidHeaders,
          },
          body: payloadString,
        });

        if (response.status === 200 || response.status === 201 || response.status === 202) {
          console.log(`[CampusNode Push] Push delivered to ${sub.endpoint.slice(0, 35)}...`);
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          }).catch(() => {});
        } else if (response.status === 404 || response.status === 410) {
          console.log(`[CampusNode Push] Removing expired subscription (${response.status}): ${sub.id}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.warn(`[CampusNode Push] Push endpoint returned status ${response.status} for ${sub.id}`);
        }
      } catch (err) {
        console.error(`[CampusNode Push] Error pushing to subscription ${sub.id}:`, err.message);
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.error("[CampusNode Push] Fatal error in sendWebPushNotification:", err);
  }
}
