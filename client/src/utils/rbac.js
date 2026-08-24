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
};

/**
 * Role Permission Mapping Matrix
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
    PERMISSIONS.EVENT_STAFF_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.TEAM_CREATE,
    PERMISSIONS.TEAM_MANAGE,
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
    PERMISSIONS.EVENT_STAFF_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.TEAM_CREATE,
    PERMISSIONS.TEAM_MANAGE,
  ],

  CLUB_MEMBER: [
    PERMISSIONS.EVENT_VIEW,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_ATTENDANCE,
    PERMISSIONS.REGISTRATION_VIEW,
    PERMISSIONS.REGISTRATION_CREATE,
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
    PERMISSIONS.NOTIFICATION_VIEW,
  ],

  LOST_FOUND_ADMIN: [
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_UPDATE,
    PERMISSIONS.LOST_FOUND_RESOLVE,
    PERMISSIONS.LOST_FOUND_REPORT,
    PERMISSIONS.LOST_FOUND_MODERATE,
  ],
  lostFoundAdmin: [
    PERMISSIONS.LOST_FOUND_VIEW,
    PERMISSIONS.LOST_FOUND_CREATE,
    PERMISSIONS.LOST_FOUND_UPDATE,
    PERMISSIONS.LOST_FOUND_RESOLVE,
    PERMISSIONS.LOST_FOUND_REPORT,
    PERMISSIONS.LOST_FOUND_MODERATE,
  ],

  paymentAdmin: [
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_VERIFY,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYOUT_VIEW,
    PERMISSIONS.PAYOUT_APPROVE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_EXPORT,
  ],
};

/**
 * Client-Side Permission Evaluator
 * Checks whether user has permission AND satisfies resource-level constraints.
 * @param {object|null} user - User object or null
 * @param {string} permission - Canonical permission string (resource.action)
 * @param {object|null} resource - Target resource object or context ({ clubId, createdById, userId, ... })
 * @returns {boolean}
 */
export function hasPermission(user, permission, resource = null) {
  let role = localStorage.getItem("role");

  if (user && user.role) {
    role = user.role;
  }

  if (!role && user) {
    if (user.memberships && user.memberships.length > 0) {
      const exec = user.memberships.find(m => ["CLUB_HEAD", "COORDINATOR"].includes(m.role));
      role = exec ? "club" : "member";
    } else {
      role = "member";
    }
  }

  if (!role) return false;

  // 1. Super Admin wildcard check
  if (role === "admin" || role === "SUPER_ADMIN") {
    return true;
  }

  // 2. Base role permission check
  let allowedPermissions = [...(ROLE_PERMISSIONS_MAP[role] ?? [])];

  // If user has active CLUB_HEAD or COORDINATOR memberships, merge club permissions
  if (user?.memberships && user.memberships.some(m => m.role === "CLUB_HEAD" || m.role === "COORDINATOR")) {
    const clubPerms = ROLE_PERMISSIONS_MAP["club"] ?? ROLE_PERMISSIONS_MAP["CLUB"] ?? [];
    allowedPermissions = Array.from(new Set([...allowedPermissions, ...clubPerms]));
  }

  if (!allowedPermissions.includes(permission)) {
    return false;
  }

  if (!resource) {
    return true;
  }

  const userClubId = user?.clubId || localStorage.getItem("clubId");
  const targetClubId = resource.clubId ?? resource.id;
  const userId = user?.id || user?.userId;
  const targetUserId = resource.userId ?? resource.createdById ?? resource.id;

  // 3. Resource-level Scoping Checks
  switch (permission) {
    case PERMISSIONS.EVENT_UPDATE:
    case PERMISSIONS.EVENT_DELETE:
    case PERMISSIONS.EVENT_CERTIFICATE:
    case PERMISSIONS.EVENT_ATTENDANCE:
    case PERMISSIONS.REGISTRATION_VIEW:
    case PERMISSIONS.PAYMENT_VERIFY:
    case PERMISSIONS.PAYOUT_REQUEST:
      if (role === "facultyCoordinator" || role === "club") {
        if (!userClubId || !targetClubId) return true;
        return String(userClubId) === String(targetClubId);
      }
      if (role === "member" || role === "student") {
        if (resource.membership) {
          if (permission === PERMISSIONS.EVENT_ATTENDANCE && resource.membership.canTakeAttendance) return true;
          if (permission === PERMISSIONS.EVENT_UPDATE && resource.membership.canEditEvents) return true;
        }
      }
      return true;

    case PERMISSIONS.EVENT_APPROVE:
      if (role === "facultyCoordinator" || role === "FACULTY") {
        if (!userClubId || !targetClubId) return true;
        return String(userClubId) === String(targetClubId);
      }
      return false;

    case PERMISSIONS.CLUB_UPDATE:
    case PERMISSIONS.CLUB_MANAGE_MEMBERS:
      if (role === "facultyCoordinator" || role === "club") {
        if (!userClubId || !targetClubId) return true;
        return String(userClubId) === String(targetClubId);
      }
      return true;

    case PERMISSIONS.LOST_FOUND_UPDATE:
    case PERMISSIONS.LOST_FOUND_RESOLVE:
      if (role === "lostFoundAdmin") return true;
      if (userId && targetUserId) return String(userId) === String(targetUserId);
      return true;

    default:
      return true;
  }
}
