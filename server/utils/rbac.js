import prisma from "../lib/prisma.js";
import { createObjectId } from "./objectId.js";

/**
 * Granular Permission Definitions (resource.action)
 */
export const PERMISSIONS = {
  EVENT_VIEW: "event.view",
  EVENT_CREATE: "event.create",
  EVENT_UPDATE: "event.update",
  EVENT_DELETE: "event.delete",
  EVENT_APPROVE: "event.approve",
  EVENT_ATTENDANCE: "event.manage_attendance",
  EVENT_CERTIFICATE: "event.design_certificate",

  CLUB_VIEW: "club.view",
  CLUB_CREATE: "club.create",
  CLUB_UPDATE: "club.update",
  CLUB_MANAGE_MEMBERS: "club.manage_members",
  CLUB_ANNOUNCEMENTS_MANAGE: "club.manage_announcements",
  CLUB_ACHIEVEMENTS_MANAGE: "club.manage_achievements",

  REGISTRATION_VIEW: "registration.view",
  REGISTRATION_CREATE: "registration.create",
  REGISTRATION_CANCEL: "registration.cancel",

  PAYMENT_VIEW: "payment.view",
  PAYMENT_VERIFY: "payment.verify",
  PAYMENT_REFUND: "payment.refund",

  PAYOUT_VIEW: "payout.view",
  PAYOUT_REQUEST: "payout.request",
  PAYOUT_APPROVE: "payout.approve",

  USER_VIEW: "user.view",
  USER_UPDATE: "user.update",
  USER_ASSIGN_ROLE: "user.assign_role",
  USER_BLOCK: "user.block",

  LOST_FOUND_VIEW: "lost_found.view",
  LOST_FOUND_CREATE: "lost_found.create",
  LOST_FOUND_UPDATE: "lost_found.update",
  LOST_FOUND_RESOLVE: "lost_found.resolve",
  LOST_FOUND_REPORT: "lost_found.report",
  LOST_FOUND_MODERATE: "lost_found.moderate",

  NOTIFICATION_VIEW: "notification.view",
  NOTIFICATION_CREATE: "notification.create",

  TEAM_CREATE: "team.create",
  TEAM_MANAGE: "team.manage",

  AUDIT_VIEW: "audit.view",
  AUDIT_EXPORT: "audit.export",

  EVENT_STAFF_MANAGE: "event_staff.manage",
};

/**
 * Role Permission Mapping Matrix
 * Maps core and legacy roles to explicit permission sets.
 */
export const ROLE_PERMISSIONS_MAP = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS),

  FACULTY: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_APPROVE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.EVENT_CERTIFICATE,
    PERMISSIONS.CLUB_VIEW,
    PERMISSIONS.CLUB_UPDATE,
    PERMISSIONS.CLUB_MANAGE_MEMBERS,
    PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
    PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_VERIFY,
    PERMISSIONS.PAYOUT_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
  ],
  facultyCoordinator: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_APPROVE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.EVENT_CERTIFICATE,
    PERMISSIONS.CLUB_VIEW,
    PERMISSIONS.CLUB_UPDATE,
    PERMISSIONS.CLUB_MANAGE_MEMBERS,
    PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
    PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_VERIFY,
    PERMISSIONS.PAYOUT_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
  ],

  CLUB: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.EVENT_CERTIFICATE,
    PERMISSIONS.CLUB_VIEW,
    PERMISSIONS.CLUB_UPDATE,
    PERMISSIONS.CLUB_MANAGE_MEMBERS,
    PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
    PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_VERIFY,
    PERMISSIONS.PAYOUT_VIEW,
    PERMISSIONS.PAYOUT_REQUEST,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
  ],
  club: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.EVENT_CERTIFICATE,
    PERMISSIONS.CLUB_VIEW,
    PERMISSIONS.CLUB_UPDATE,
    PERMISSIONS.CLUB_MANAGE_MEMBERS,
    PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
    PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_VERIFY,
    PERMISSIONS.PAYOUT_VIEW,
    PERMISSIONS.PAYOUT_REQUEST,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_CREATE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
  ],

  CLUB_MEMBER: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.TEAM_CREATE,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_REPORT,
  ],

  STUDENT: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.TEAM_CREATE,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_REPORT,
  ],
  member: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.TEAM_CREATE,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_REPORT,
  ],
  student: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.TEAM_CREATE,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_REPORT,
  ],
  external: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.NOTIFICATION_VIEW,
  ],

  LOST_FOUND_ADMIN: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_UPDATE,
    PERMISSIONS.LOST_FOUND_RESOLVE,
    PERMISSIONS.LOST_FOUND_REPORT,
    PERMISSIONS.LOST_FOUND_MODERATE,
  ],
  lostFoundAdmin: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_UPDATE,
    PERMISSIONS.LOST_FOUND_RESOLVE,
    PERMISSIONS.LOST_FOUND_REPORT,
    PERMISSIONS.LOST_FOUND_MODERATE,
  ],

  paymentAdmin: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_VERIFY,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYOUT_VIEW,
    PERMISSIONS.PAYOUT_APPROVE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_EXPORT,
  ],

  CENTRAL_ORGANIZER: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.EVENT_CERTIFICATE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_CREATE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.EVENT_STAFF_MANAGE,
    PERMISSIONS.CLUB_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
  central_organizer: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.EVENT_CERTIFICATE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
    PERMISSIONS.REGISTRATION_CANCEL,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.NOTIFICATION_CREATE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.EVENT_STAFF_MANAGE,
    PERMISSIONS.CLUB_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
};

/**
 * Check if a role has a given permission string.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function roleHasPermission(role, permission) {
  if (!role || !permission) return false;
  if (role === "admin" || role === "SUPER_ADMIN") return true;
  const permissions =
    ROLE_PERMISSIONS_MAP[role] ??
    ROLE_PERMISSIONS_MAP[role.toLowerCase()] ??
    ROLE_PERMISSIONS_MAP[role.toUpperCase()] ??
    [];
  return permissions.includes(permission);
}

/**
 * Core Scoped Permission Evaluator
 * Checks whether user has permission AND satisfies resource-level constraints.
 * @param {object} user - Authenticated user context from req.user ({ userId, role, clubId, userType })
 * @param {string} permission - Canonical permission string (resource.action)
 * @param {object|null} resource - Target resource object or context ({ clubId, createdById, userId, ... })
 * @returns {boolean}
 */
export function hasPermission(user, permission, resource = null) {
  if (!user || !user.role) return false;

  // 1. Super Admin wildcard check
  if (user.role === "admin" || user.role === "SUPER_ADMIN") {
    return true;
  }

  // 2. Base role permission check
  let baseAllowed = roleHasPermission(user.role, permission);

  // 3. Fallback: Any student user always retains standard student permissions
  if (!baseAllowed && user.userType === "student") {
    baseAllowed = roleHasPermission("member", permission);
  }

  if (!baseAllowed) {
    return false;
  }

  // If no specific resource context is provided, base permission is sufficient
  if (!resource) {
    return true;
  }

  const targetClubId = resource.clubId ?? resource.id;
  const targetUserId = resource.userId ?? resource.createdById ?? resource.id;

  // 3. Resource-level Scope Constraints
  switch (permission) {
    case PERMISSIONS.EVENT_UPDATE:
    case PERMISSIONS.EVENT_DELETE:
    case PERMISSIONS.EVENT_CERTIFICATE:
    case PERMISSIONS.EVENT_ATTENDANCE:
    case PERMISSIONS.REGISTRATION_VIEW:
    case PERMISSIONS.PAYMENT_VERIFY:
    case PERMISSIONS.PAYOUT_REQUEST:
    case PERMISSIONS.EVENT_STAFF_MANAGE:
      if (user.role === "central_organizer" || user.role === "CENTRAL_ORGANIZER") {
        if (!resource) return false; 
        if (resource.organizerType === "CENTRAL") return true;
        const eventCentralOrganizerId = resource.centralOrganizerId;
        if (!eventCentralOrganizerId) return false;
        return String(eventCentralOrganizerId) === String(user.userId);
      }
      if (user.role === "facultyCoordinator" || user.role === "club") {
        if (!user.clubId || !targetClubId) return false;
        return String(user.clubId) === String(targetClubId);
      }
      if (user.role === "member" || user.role === "student") {
        if (resource && resource.membership) {
          if (permission === PERMISSIONS.EVENT_ATTENDANCE && resource.membership.canTakeAttendance) return true;
          if (permission === PERMISSIONS.EVENT_UPDATE && resource.membership.canEditEvents) return true;
          return false;
        }
        return true;
      }
      return true;

    case PERMISSIONS.EVENT_APPROVE:
      if (user.role === "facultyCoordinator") {
        if (!user.clubId || !targetClubId) return false;
        return String(user.clubId) === String(targetClubId);
      }
      return false;

    case PERMISSIONS.CLUB_UPDATE:
    case PERMISSIONS.CLUB_MANAGE_MEMBERS:
      if (user.role === "facultyCoordinator" || user.role === "club") {
        if (!user.clubId || !targetClubId) return false;
        return String(user.clubId) === String(targetClubId);
      }
      return true;

    case PERMISSIONS.LOST_FOUND_UPDATE:
    case PERMISSIONS.LOST_FOUND_RESOLVE:
      if (user.role === "lostFoundAdmin") return true;
      if (targetUserId) return String(user.userId) === String(targetUserId);
      return true;

    case PERMISSIONS.USER_UPDATE:
      if (targetUserId) return String(user.userId) === String(targetUserId);
      return true;

    default:
      return true;
  }
}

/**
 * Seed permissions into database if model exists and is empty
 */
export async function seedPermissions() {
  try {
    if (!prisma.permission || !prisma.rolePermission) return;

    const existingCount = await prisma.permission.count();
    if (existingCount > 0) return;

    console.log("Seeding initial RBAC permissions...");
    for (const [key, permName] of Object.entries(PERMISSIONS)) {
      const [resource, action] = permName.split(".");
      
      const perm = await prisma.permission.upsert({
        where: { name: permName },
        update: {},
        create: {
          id: createObjectId(),
          name: permName,
          resource,
          action,
          description: `Permission for ${resource} ${action}`,
        },
      });

      for (const [role, permList] of Object.entries(ROLE_PERMISSIONS_MAP)) {
        if (permList.includes(permName)) {
          await prisma.rolePermission.upsert({
            where: { role_permissionId: { role, permissionId: perm.id } },
            update: {},
            create: {
              id: createObjectId(),
              role,
              permissionId: perm.id,
            },
          });
        }
      }
    }
    console.log("RBAC permissions seeded successfully.");
  } catch (err) {
    console.error("Non-fatal notice: Permission database seeding skipped:", err.message);
  }
}
