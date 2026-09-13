import prisma from "../lib/prisma.js";
import { createObjectId } from "./objectId.js";

export const PERMISSIONS = {
  EVENT_CREATE: "event.create",
  EVENT_UPDATE: "event.update",
  EVENT_DELETE_REQUEST: "event.delete.request",
  EVENT_DELETE_APPROVE: "event.delete.approve",
  EVENT_APPROVE: "event.approve",
  EVENT_PUBLISH: "event.publish",

  ATTENDANCE_TAKE: "attendance.take",
  CERTIFICATE_MANAGE: "certificate.manage",

  CLUB_UPDATE: "club.update",
  CLUB_MANAGE_MEMBERS: "club.manage_members",
  CLUB_INVITE_MEMBERS: "club.invite_members",
  CLUB_REMOVE_MEMBERS: "club.remove_members",
  CLUB_ASSIGN_ROLES: "club.assign_roles",
  CLUB_TRANSFER_LEADERSHIP: "club.transfer_leadership",

  PAYMENT_REVIEW: "payment.review",
  PAYMENT_VERIFY: "payment.verify",

  NOTIFICATION_SEND_REGISTRANTS: "notification.send.registrants",
  NOTIFICATION_SEND_CAMPUS: "notification.send.campus",

  REGISTRATION_CREATE: "registration.create",
  REGISTRATION_CANCEL: "registration.cancel",

  EVENT_VIEW: "event.view",
  EVENT_DELETE: "event.delete",
  EVENT_ATTENDANCE: "event.manage_attendance",
  EVENT_CERTIFICATE: "event.design_certificate",
  CLUB_VIEW: "club.view",
  CLUB_CREATE: "club.create",
  CLUB_DELETE: "club.delete",
  CLUB_ANNOUNCEMENTS_MANAGE: "club.manage_announcements",
  CLUB_ACHIEVEMENTS_MANAGE: "club.manage_achievements",
  REGISTRATION_VIEW: "registration.view",
  PAYMENT_VIEW: "payment.view",
  PAYMENT_REFUND: "payment.refund",
  USER_VIEW: "user.view",
  USER_UPDATE: "user.update",
  USER_ASSIGN_ROLE: "user.assign_role",
  NOTIFICATION_VIEW: "notification.view",
  NOTIFICATION_CREATE: "notification.create",
  TEAM_CREATE: "team.create",
  TEAM_MANAGE: "team.manage",
  AUDIT_VIEW: "audit.view",
  AUDIT_EXPORT: "audit.export",
  FEATURED_EVENTS_MANAGE: "featured_events.manage",
  LOST_FOUND_VIEW: "lost_found.view",
  LOST_FOUND_CREATE: "lost_found.create",
  LOST_FOUND_UPDATE: "lost_found.update",
  LOST_FOUND_RESOLVE: "lost_found.resolve",
  LOST_FOUND_MODERATE: "lost_found.moderate",
  LOSTFOUND_VIEW: "lost_found.view",
  LOSTFOUND_CREATE: "lost_found.create",
  LOSTFOUND_MODERATE: "lost_found.moderate",
};

export function normalizePermission(permission) {
  switch (permission) {
    case PERMISSIONS.EVENT_ATTENDANCE:
      return PERMISSIONS.ATTENDANCE_TAKE;
    case PERMISSIONS.EVENT_CERTIFICATE:
      return PERMISSIONS.CERTIFICATE_MANAGE;
    case "lostfound.create":
      return PERMISSIONS.LOST_FOUND_CREATE;
    case "lostfound.view":
      return PERMISSIONS.LOST_FOUND_VIEW;
    case "lostfound.moderate":
      return PERMISSIONS.LOST_FOUND_MODERATE;
    default:
      return permission;
  }
}

export const FACULTY_COORDINATOR_PERMISSIONS = [
  PERMISSIONS.EVENT_CREATE,
  PERMISSIONS.EVENT_UPDATE,
  PERMISSIONS.EVENT_DELETE,
  PERMISSIONS.EVENT_DELETE_REQUEST,
  PERMISSIONS.EVENT_DELETE_APPROVE,
  PERMISSIONS.EVENT_APPROVE,
  PERMISSIONS.EVENT_PUBLISH,
  PERMISSIONS.ATTENDANCE_TAKE,
  PERMISSIONS.CERTIFICATE_MANAGE,
  PERMISSIONS.CLUB_UPDATE,
  PERMISSIONS.CLUB_MANAGE_MEMBERS,
  PERMISSIONS.CLUB_INVITE_MEMBERS,
  PERMISSIONS.CLUB_REMOVE_MEMBERS,
  PERMISSIONS.CLUB_ASSIGN_ROLES,
  PERMISSIONS.CLUB_TRANSFER_LEADERSHIP,
  PERMISSIONS.PAYMENT_REVIEW,
  PERMISSIONS.PAYMENT_VERIFY,
  PERMISSIONS.NOTIFICATION_SEND_REGISTRANTS,
  PERMISSIONS.NOTIFICATION_SEND_CAMPUS,
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.EVENT_ATTENDANCE,
  PERMISSIONS.EVENT_CERTIFICATE,
  PERMISSIONS.CLUB_VIEW,
  PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
  PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.NOTIFICATION_CREATE,
  PERMISSIONS.USER_VIEW,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.AUDIT_EXPORT,
];

export const STUDENT_CLUB_HEAD_PERMISSIONS = [
  PERMISSIONS.EVENT_CREATE,
  PERMISSIONS.EVENT_UPDATE,
  PERMISSIONS.EVENT_DELETE_REQUEST,
  PERMISSIONS.EVENT_PUBLISH,
  PERMISSIONS.ATTENDANCE_TAKE,
  PERMISSIONS.CERTIFICATE_MANAGE,
  PERMISSIONS.CLUB_UPDATE,
  PERMISSIONS.CLUB_MANAGE_MEMBERS,
  PERMISSIONS.CLUB_INVITE_MEMBERS,
  PERMISSIONS.CLUB_REMOVE_MEMBERS,
  PERMISSIONS.CLUB_ASSIGN_ROLES,
  PERMISSIONS.CLUB_TRANSFER_LEADERSHIP,
  PERMISSIONS.PAYMENT_REVIEW,
  PERMISSIONS.PAYMENT_VERIFY,
  PERMISSIONS.NOTIFICATION_SEND_REGISTRANTS,
  PERMISSIONS.NOTIFICATION_SEND_CAMPUS,
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.EVENT_ATTENDANCE,
  PERMISSIONS.EVENT_CERTIFICATE,
  PERMISSIONS.CLUB_VIEW,
  PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
  PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.NOTIFICATION_CREATE,
  PERMISSIONS.TEAM_CREATE,
  PERMISSIONS.TEAM_MANAGE,
];

export const STUDENT_COORDINATOR_PERMISSIONS = [
  PERMISSIONS.EVENT_CREATE,
  PERMISSIONS.EVENT_UPDATE,
  PERMISSIONS.CLUB_UPDATE,
  PERMISSIONS.ATTENDANCE_TAKE,
  PERMISSIONS.CERTIFICATE_MANAGE,
  PERMISSIONS.PAYMENT_REVIEW,
  PERMISSIONS.PAYMENT_VERIFY,
  PERMISSIONS.NOTIFICATION_SEND_REGISTRANTS,
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.EVENT_ATTENDANCE,
  PERMISSIONS.EVENT_CERTIFICATE,
  PERMISSIONS.CLUB_VIEW,
  PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
  PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.NOTIFICATION_CREATE,
  PERMISSIONS.TEAM_CREATE,
  PERMISSIONS.TEAM_MANAGE,
];

export const BASE_STUDENT_PERMISSIONS = [
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.TEAM_CREATE,
  PERMISSIONS.TEAM_MANAGE,
  PERMISSIONS.USER_VIEW,
  PERMISSIONS.USER_UPDATE,
  PERMISSIONS.LOST_FOUND_CREATE,
  PERMISSIONS.LOST_FOUND_VIEW,
  PERMISSIONS.LOST_FOUND_UPDATE,
  PERMISSIONS.LOST_FOUND_RESOLVE,
];

export const EXTERNAL_USER_PERMISSIONS = [
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.USER_VIEW,
  PERMISSIONS.USER_UPDATE,
];

export const ROLE_PERMISSIONS_MAP = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS),
  FACULTY: FACULTY_COORDINATOR_PERMISSIONS,
  faculty: FACULTY_COORDINATOR_PERMISSIONS,
  facultyCoordinator: FACULTY_COORDINATOR_PERMISSIONS,
  central_organizer: FACULTY_COORDINATOR_PERMISSIONS,
  club: STUDENT_CLUB_HEAD_PERMISSIONS,
  STUDENT: BASE_STUDENT_PERMISSIONS,
  student: BASE_STUDENT_PERMISSIONS,
  member: BASE_STUDENT_PERMISSIONS,
  external: EXTERNAL_USER_PERMISSIONS,
  lostFoundAdmin: [
    PERMISSIONS.LOST_FOUND_MODERATE,
    PERMISSIONS.LOST_FOUND_RESOLVE,
    PERMISSIONS.LOST_FOUND_VIEW,
  ],
};

export function roleHasPermission(role, permission) {
  if (!role || !permission) return false;
  if (role === "admin" || role === "SUPER_ADMIN") return true;

  const normalized = normalizePermission(permission);
  if (role === "facultyCoordinator" || role === "faculty" || role === "FACULTY" || role === "central_organizer") {
    return FACULTY_COORDINATOR_PERMISSIONS.includes(permission) || FACULTY_COORDINATOR_PERMISSIONS.includes(normalized);
  }
  if (role === "club") {
    return STUDENT_CLUB_HEAD_PERMISSIONS.includes(permission) || STUDENT_CLUB_HEAD_PERMISSIONS.includes(normalized) || BASE_STUDENT_PERMISSIONS.includes(permission) || BASE_STUDENT_PERMISSIONS.includes(normalized);
  }
  if (role === "external") {
    return EXTERNAL_USER_PERMISSIONS.includes(permission) || EXTERNAL_USER_PERMISSIONS.includes(normalized);
  }
  if (role === "lostFoundAdmin") {
    return [PERMISSIONS.LOST_FOUND_MODERATE, PERMISSIONS.LOST_FOUND_RESOLVE, PERMISSIONS.LOST_FOUND_VIEW].includes(permission) || [PERMISSIONS.LOST_FOUND_MODERATE, PERMISSIONS.LOST_FOUND_RESOLVE, PERMISSIONS.LOST_FOUND_VIEW].includes(normalized);
  }
  if (role === "student" || role === "member" || role === "STUDENT") {
    return BASE_STUDENT_PERMISSIONS.includes(permission) || BASE_STUDENT_PERMISSIONS.includes(normalized);
  }
  return false;
}

/**
 * Central Scoped Permission Evaluator
 * Resolves permissions according to principal type: FACULTY, STUDENT, ADMIN, EXTERNAL.
 *
 * @param {object} user - Authenticated user context from req.user
 * @param {string} permission - Canonical or legacy permission string
 * @param {object|null} resource - Target resource object or context ({ clubId, createdById, userId, ... })
 * @returns {boolean}
 */
export function hasPermission(user, permission, resource = null) {
  if (!user) return false;

  const perm = normalizePermission(permission);

  if (user.role === "admin" || user.role === "SUPER_ADMIN" || user.principalType === "ADMIN") {
    return true;
  }

  const principalType = user.principalType || (
    user.role === "facultyCoordinator" || user.role === "faculty" || user.userType === "faculty" ? "FACULTY" :
    user.userType === "external" || user.role === "external" ? "EXTERNAL" :
    user.userType === "student" ? "STUDENT" : "STUDENT"
  );

  const targetClubId = resource?.clubId ?? null;
  const targetUserId = resource?.userId ?? resource?.createdById ?? resource?.id ?? null;

  if (principalType === "EXTERNAL" || user.role === "external" || user.userType === "external") {
    if (targetUserId && String(targetUserId) === String(user.userId || user.id)) {
      if (perm === PERMISSIONS.USER_UPDATE || perm === PERMISSIONS.USER_VIEW) return true;
    }
    return EXTERNAL_USER_PERMISSIONS.includes(perm) || EXTERNAL_USER_PERMISSIONS.includes(permission);
  }

  if (principalType === "FACULTY") {
    const hasBase = FACULTY_COORDINATOR_PERMISSIONS.includes(perm) || FACULTY_COORDINATOR_PERMISSIONS.includes(permission);
    if (!hasBase) return false;

    // Personal user participation actions are never restricted to the coordinated club
    if ([
      PERMISSIONS.REGISTRATION_CREATE,
      PERMISSIONS.REGISTRATION_CANCEL,
      PERMISSIONS.REGISTRATION_VIEW,
      PERMISSIONS.EVENT_VIEW,
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_UPDATE,
    ].includes(perm)) {
      return true;
    }

    // Club governance permissions require coordinator status on the target club
    const clubGovernancePerms = [
      PERMISSIONS.EVENT_APPROVE,
      PERMISSIONS.EVENT_DELETE_APPROVE,
      PERMISSIONS.CLUB_UPDATE,
      PERMISSIONS.CLUB_MANAGE_MEMBERS,
      PERMISSIONS.CLUB_INVITE_MEMBERS,
      PERMISSIONS.CLUB_REMOVE_MEMBERS,
      PERMISSIONS.CLUB_ASSIGN_ROLES,
      PERMISSIONS.CLUB_TRANSFER_LEADERSHIP,
      PERMISSIONS.PAYMENT_REVIEW,
      PERMISSIONS.PAYMENT_VERIFY,
    ];
    if (clubGovernancePerms.includes(perm)) {
      if (!user.clubId) return false;
      if (targetClubId && String(user.clubId) !== String(targetClubId)) return false;
    }

    if (targetClubId && user.clubId) {
      return String(user.clubId) === String(targetClubId);
    }
    return true;
  }

  if (user.role === "lostFoundAdmin") {
    const lfPerms = [
      PERMISSIONS.LOST_FOUND_MODERATE,
      PERMISSIONS.LOST_FOUND_RESOLVE,
      PERMISSIONS.LOST_FOUND_VIEW,
      ...BASE_STUDENT_PERMISSIONS,
    ];
    return lfPerms.includes(perm) || lfPerms.includes(permission);
  }

  // Legacy club user context ({ role: "club", clubId: "..." }) without explicit memberships array
  if (user.role === "club" && (!user.memberships || user.memberships.length === 0)) {
    if (resource && (resource.organizerType === "CENTRAL" || resource.institutionalAccountId)) {
      return false;
    }
    const hasBase = STUDENT_CLUB_HEAD_PERMISSIONS.includes(perm) || STUDENT_CLUB_HEAD_PERMISSIONS.includes(permission) || BASE_STUDENT_PERMISSIONS.includes(perm) || BASE_STUDENT_PERMISSIONS.includes(permission);
    if (targetClubId && user.clubId) {
      return hasBase && String(user.clubId) === String(targetClubId);
    }
    return hasBase;
  }

  // Student with club memberships
  const targetClubIds = resource?.clubIds && Array.isArray(resource.clubIds) && resource.clubIds.length > 0
    ? resource.clubIds.map(String)
    : (targetClubId ? [String(targetClubId)] : []);

  if (targetClubIds.length > 0 && user.memberships && user.memberships.length > 0) {
    const membership = user.memberships.find((m) => targetClubIds.includes(String(m.clubId)));
    if (membership) {
      const roleUpper = (membership.role || "").toUpperCase();
      if (
        roleUpper === "CLUB_HEAD" ||
        roleUpper === "STUDENT_LEAD" ||
        roleUpper === "CLUBHEAD" ||
        roleUpper === "HEAD" ||
        roleUpper === "LEAD"
      ) {
        if (
          STUDENT_CLUB_HEAD_PERMISSIONS.includes(perm) ||
          STUDENT_CLUB_HEAD_PERMISSIONS.includes(permission) ||
          perm === PERMISSIONS.EVENT_DELETE_REQUEST
        ) {
          return true;
        }
      }

      if (roleUpper === "COORDINATOR" || roleUpper === "COORD") {
        if (
          perm === PERMISSIONS.CLUB_MANAGE_MEMBERS ||
          perm === PERMISSIONS.CLUB_INVITE_MEMBERS ||
          perm === PERMISSIONS.CLUB_REMOVE_MEMBERS ||
          perm === PERMISSIONS.CLUB_ASSIGN_ROLES ||
          perm === PERMISSIONS.CLUB_TRANSFER_LEADERSHIP ||
          perm === PERMISSIONS.EVENT_APPROVE ||
          perm === PERMISSIONS.EVENT_DELETE_APPROVE
        ) {
          return false;
        }

        if (STUDENT_COORDINATOR_PERMISSIONS.includes(perm) || STUDENT_COORDINATOR_PERMISSIONS.includes(permission)) {
          return true;
        }
      }

      const customPerms = membership.customPermissions || [];
      if (customPerms.includes(perm) || customPerms.includes(permission)) {
        return true;
      }
      if ((perm === PERMISSIONS.ATTENDANCE_TAKE || permission === PERMISSIONS.EVENT_ATTENDANCE) && (membership.canTakeAttendance || membership.permissions?.canTakeAttendance)) {
        return true;
      }
      if ((perm === PERMISSIONS.EVENT_UPDATE || permission === PERMISSIONS.EVENT_UPDATE) && (membership.canEditEvents || membership.permissions?.canEditEvents)) {
        return true;
      }
    }
  }

  // Unscoped evaluation for student management roles
  if (targetClubIds.length === 0 && user.memberships && user.memberships.length > 0) {
    const hasUnscopedRolePerm = user.memberships.some((m) => {
      if (m.role === "CLUB_HEAD") {
        return STUDENT_CLUB_HEAD_PERMISSIONS.includes(perm) || STUDENT_CLUB_HEAD_PERMISSIONS.includes(permission);
      }
      if (m.role === "COORDINATOR") {
        if (
          perm === PERMISSIONS.CLUB_MANAGE_MEMBERS ||
          perm === PERMISSIONS.CLUB_INVITE_MEMBERS ||
          perm === PERMISSIONS.CLUB_REMOVE_MEMBERS ||
          perm === PERMISSIONS.CLUB_ASSIGN_ROLES ||
          perm === PERMISSIONS.CLUB_TRANSFER_LEADERSHIP ||
          perm === PERMISSIONS.EVENT_APPROVE ||
          perm === PERMISSIONS.EVENT_DELETE_APPROVE
        ) {
          return false;
        }
        return STUDENT_COORDINATOR_PERMISSIONS.includes(perm) || STUDENT_COORDINATOR_PERMISSIONS.includes(permission);
      }
      const customPerms = m.customPermissions || [];
      if (customPerms.includes(perm) || customPerms.includes(permission)) return true;
      if ((perm === PERMISSIONS.ATTENDANCE_TAKE || permission === PERMISSIONS.EVENT_ATTENDANCE) && (m.canTakeAttendance || m.permissions?.canTakeAttendance)) return true;
      if ((perm === PERMISSIONS.EVENT_UPDATE || permission === PERMISSIONS.EVENT_UPDATE) && (m.canEditEvents || m.permissions?.canEditEvents)) return true;
      return false;
    });
    if (hasUnscopedRolePerm) {
      return true;
    }
  }

  if (targetUserId && String(targetUserId) === String(user.userId || user.studentId)) {
    if (perm === PERMISSIONS.USER_UPDATE) {
      return true;
    }
  }

  if (resource?.createdById && String(resource.createdById) === String(user.userId || user.studentId)) {
    if (
      perm === PERMISSIONS.EVENT_UPDATE ||
      perm === PERMISSIONS.EVENT_DELETE_REQUEST
    ) {
      return true;
    }
  }

  if (BASE_STUDENT_PERMISSIONS.includes(perm) || BASE_STUDENT_PERMISSIONS.includes(permission)) {
    return true;
  }

  return false;
}

/**
 * Returns all effective permissions for a user within an optional resource scope.
 * @param {object} user - Authenticated user context
 * @param {object|string|null} resource - Optional target resource or club ID
 * @returns {string[]} List of effective permission strings
 */
export function getEffectivePermissions(user, resource = null) {
  if (!user) return [];

  const resContext = typeof resource === "string" ? { clubId: resource } : resource;
  const effective = new Set();
  for (const perm of Object.values(PERMISSIONS)) {
    if (hasPermission(user, perm, resContext)) {
      effective.add(perm);
    }
  }
  return Array.from(effective);
}

export async function seedPermissions() {
  try {
    if (!prisma.permission) return;

    const existingCount = await prisma.permission.count();
    if (existingCount > 0) return;

    console.log("Seeding initial RBAC permissions...");
    const entries = Object.entries(PERMISSIONS);
    const data = entries.map(([key, permName]) => {
      const [resource, action] = permName.split(".");
      return {
        id: createObjectId(),
        name: permName,
        resource: resource || "global",
        action: action || "access",
        description: `Permission for ${permName}`,
      };
    });

    await prisma.permission.createMany({ data, skipDuplicates: true });
    console.log("RBAC permissions seeded successfully.");
  } catch (err) {
    console.error("Non-fatal notice: Permission database seeding skipped:", err.message);
  }
}
