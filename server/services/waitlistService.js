import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { signTicket } from "./qrSigningService.js";
import { sendWebPushNotification } from "../utils/sendPush.js";

export const MAX_WAITLIST_CAPACITY = 5;

/**
 * Checks if waitlist is allowed for an event
 * @param {Object} event - Event object
 * @returns {boolean} true if waitlist is permitted
 */
export function isWaitlistAllowed(event) {
  if (!event) return false;
  if (!event.totalSeats || event.totalSeats <= 0) return false;
  return event.allowWaitlist !== false;
}

/**
 * Checks if waitlist has reached maximum capacity (5 persons)
 * @param {Object} event - Event object with waitingListIds array
 * @returns {boolean} true if waitlist is full
 */
export function isWaitlistFull(event) {
  const count = (event?.waitingListIds || []).length;
  return count >= MAX_WAITLIST_CAPACITY;
}

/**
 * Promotes waitlisted participants in FIFO order inside a Prisma transaction.
 * @param {Object} tx - Prisma transaction client
 * @param {string} eventId - Event ID
 * @param {number} seatsToFill - Number of open seats available to fill
 * @returns {Promise<{ promotedCandidates: Array, promotedCount: number }>}
 */
export async function promoteWaitlistCandidates(tx, eventId, seatsToFill = 1) {
  if (!seatsToFill || seatsToFill <= 0) {
    return { promotedCandidates: [], promotedCount: 0 };
  }

  // 1. Fetch current locked event to ensure accurate capacity & waitlist
  const events = await tx.$queryRaw`
    SELECT * FROM "Event" WHERE id = ${eventId} FOR UPDATE
  `;
  const event = events[0];
  if (!event) return { promotedCandidates: [], promotedCount: 0 };

  // If event has no capacity limit (totalSeats <= 0), no waitlist is needed
  if (event.totalSeats <= 0) {
    return { promotedCandidates: [], promotedCount: 0 };
  }

  // Available seats cannot exceed totalSeats - registeredCount
  const actualSeatsAvailable = Math.max(0, event.totalSeats - event.registeredCount);
  const seatsAllowed = Math.min(seatsToFill, actualSeatsAvailable);
  if (seatsAllowed <= 0) {
    return { promotedCandidates: [], promotedCount: 0 };
  }

  // 2. Query earliest waitlisted participants (FIFO)
  const candidates = await tx.participation.findMany({
    where: {
      eventId,
      status: "WAITLISTED",
    },
    orderBy: { createdAt: "asc" },
    take: seatsAllowed,
    include: {
      student: { select: { id: true, name: true, email: true } },
      externalUser: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, title: true, organizers: { select: { clubId: true } } } },
    },
  });

  if (candidates.length === 0) {
    return { promotedCandidates: [], promotedCount: 0 };
  }

  const promotedCandidates = [];
  const promotedIds = [];

  // 3. Promote each candidate to REGISTERED and generate valid signed QR payload if needed
  for (const candidate of candidates) {
    const ticketId = candidate.qrCode || crypto.randomBytes(12).toString("base64url");
    const { qrPayload, qrVersion, qrKeyId } = signTicket(eventId, ticketId);

    const updated = await tx.participation.update({
      where: { id: candidate.id },
      data: {
        status: "REGISTERED",
        qrCode: ticketId,
        qrPayload,
        qrVersion,
        qrKeyId,
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        externalUser: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true, organizers: { select: { clubId: true } } } },
      },
    });

    promotedCandidates.push(updated);
    promotedIds.push(candidate.id);
  }

  // 4. Update Event: increment registeredCount, remove promoted IDs from waitingListIds
  const currentWaitingList = event.waitingListIds || [];
  const updatedWaitingList = currentWaitingList.filter((id) => !promotedIds.includes(id));

  await tx.event.update({
    where: { id: eventId },
    data: {
      registeredCount: { increment: promotedCandidates.length },
      waitingListIds: updatedWaitingList,
    },
  });

  return {
    promotedCandidates,
    promotedCount: promotedCandidates.length,
  };
}

/**
 * Sends notifications (Socket.IO + In-App DB + WebPush) to promoted participants.
 * @param {Object} io - Socket.io instance
 * @param {Array} promotedCandidates - List of promoted participation records
 * @param {Object} eventDetails - Event details (id, title, clubId)
 */
export async function notifyWaitlistCleared(io, promotedCandidates, eventDetails) {
  if (!promotedCandidates || promotedCandidates.length === 0) return;

  const eventTitle = eventDetails?.title || "your event";
  const eventId = eventDetails?.id || eventDetails?._id;
  const clubId = eventDetails?.clubId || null;

  for (const candidate of promotedCandidates) {
    const recipientId = candidate.studentId || candidate.externalUserId;
    if (!recipientId) continue;

    const title = "Waitlist Cleared! 🎉";
    const message = `A seat opened up for "${eventTitle}". Your waitlist registration has been cleared and your seat is now confirmed! Check your dashboard for your ticket.`;

    try {
      if (candidate.studentId) {
        const notification = await prisma.notification.create({
          data: {
            id: createObjectId(),
            recipientStudentId: candidate.studentId,
            type: "WAITLIST_CLEARED",
            title,
            message,
            eventId: eventId || null,
          },
        });

        const payload = {
          ...notification,
          _id: notification.id,
          sender: { name: "CampusNode" },
        };

        if (io) {
          io.to(recipientId).emit("new-notification", payload);
        }

        sendWebPushNotification(recipientId, payload).catch((err) => {
          console.error("WebPush error for waitlist cleared:", err?.message || err);
        });
      }
    } catch (err) {
      console.error("Failed to create waitlist cleared notification for user:", recipientId, err);
    }
  }
}
