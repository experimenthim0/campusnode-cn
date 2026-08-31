/**
 * Audit Log Utility
 *
 * Creates audit log entries for security-sensitive operations.
 * actorId is the authoritative identity (from server auth context).
 * actorEmail is a human-readable snapshot — NOT used for authorization.
 */

import prisma from "../lib/prisma.js";
import { createObjectId } from "./objectId.js";

export const AUDIT_ACTIONS = {
  CENTRAL_ORGANIZER_ASSIGNED: "CENTRAL_ORGANIZER_ASSIGNED",
  CENTRAL_ORGANIZER_REVOKED: "CENTRAL_ORGANIZER_REVOKED",

  CENTRAL_EVENT_CREATED: "CENTRAL_EVENT_CREATED",
  CENTRAL_EVENT_UPDATED: "CENTRAL_EVENT_UPDATED",
  CENTRAL_EVENT_DELETED: "CENTRAL_EVENT_DELETED",
  CENTRAL_EVENT_PUBLISHED: "CENTRAL_EVENT_PUBLISHED",

  EVENT_STAFF_INVITED: "EVENT_STAFF_INVITED",
  EVENT_STAFF_ACCEPTED: "EVENT_STAFF_ACCEPTED",
  EVENT_STAFF_REJECTED: "EVENT_STAFF_REJECTED",
  EVENT_STAFF_REVOKED: "EVENT_STAFF_REVOKED",
  EVENT_STAFF_EXPIRED: "EVENT_STAFF_EXPIRED",
  EVENT_STAFF_PERMISSIONS_UPDATED: "EVENT_STAFF_PERMISSIONS_UPDATED",

  ATTENDANCE_MARKED: "ATTENDANCE_MARKED",
  ATTENDANCE_UPDATED: "ATTENDANCE_UPDATED",
  ATTENDANCE_SYNC: "ATTENDANCE_SYNC",

  REGISTRATION_UPDATED: "REGISTRATION_UPDATED",

  CERTIFICATE_GENERATED: "CERTIFICATE_GENERATED",

  ANNOUNCEMENT_SENT: "ANNOUNCEMENT_SENT",
};

/**
 * Create an audit log entry.
 *
 * @param {object} params
 * @param {string} params.action - One of AUDIT_ACTIONS
 * @param {string} params.actorId - Authoritative user ID (from server auth context)
 * @param {string} params.actorEmail - Human-readable email snapshot
 * @param {string} [params.targetId] - Target user/entity ID
 * @param {string} [params.eventId] - Associated event ID
 * @param {object} [params.metadata] - Additional context
 * @param {string} [params.source] - "ONLINE" | "OFFLINE" etc.
 */
export async function createAuditLog({
  action,
  actorId,
  actorEmail,
  targetId = null,
  eventId = null,
  metadata = null,
  source = null,
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        id: createObjectId(),
        action,
        actorId,
        actorEmail,
        targetId,
        eventId,
        metadata,
        source,
      },
    });
  } catch (err) {
    console.error("Audit log creation failed:", err.message);
    return null;
  }
}
