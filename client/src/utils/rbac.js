/**
 * Granular Permission Definitions (resource.action)
 */
export const PERMISSIONS = {
  // Event Lifecycle (Club & Base)
  EVENT_CREATE: "event.create",
  EVENT_UPDATE: "event.update",
  EVENT_DELETE_REQUEST: "event.delete.request",
  EVENT_DELETE_APPROVE: "event.delete.approve",
  EVENT_APPROVE: "event.approve",
  EVENT_PUBLISH: "event.publish",

  // Operations
  ATTENDANCE_TAKE: "attendance.take",
  CERTIFICATE_MANAGE: "certificate.manage",

  // Club & Team Governance
  CLUB_UPDATE: "club.update",
  CLUB_MANAGE_MEMBERS: "club.manage_members",
  CLUB_INVITE_MEMBERS: "club.invite_members",
  CLUB_REMOVE_MEMBERS: "club.remove_members",
  CLUB_ASSIGN_ROLES: "club.assign_roles",
  CLUB_TRANSFER_LEADERSHIP: "club.transfer_leadership",

  // Finance
  PAYMENT_REVIEW: "payment.review",
  PAYMENT_VERIFY: "payment.verify",

  // Broadcasts
  NOTIFICATION_SEND_REGISTRANTS: "notification.send.registrants",
  NOTIFICATION_SEND_CAMPUS: "notification.send.campus",

  // Registrations & Participation
  REGISTRATION_CREATE: "registration.create",
  REGISTRATION_CANCEL: "registration.cancel",

  // Lost & Found
  LOSTFOUND_CREATE: "lostfound.create",
  LOSTFOUND_VIEW: "lostfound.view",
  LOSTFOUND_MODERATE: "lostfound.moderate",

  // Institutional Permissions (DSW / Institute-wide)
  EVENT_CREATE_INSTITUTION: "event.create.institution",
  EVENT_UPDATE_INSTITUTION: "event.update.institution",
  EVENT_DELETE_REQUEST_INSTITUTION: "event.delete.request.institution",
  EVENT_PUBLISH_INSTITUTION: "event.publish.institution",
  EVENT_DELETE_INSTITUTION: "event.delete.institution",
  ATTENDANCE_TAKE_INSTITUTION: "attendance.take.institution",
  CERTIFICATE_MANAGE_INSTITUTION: "certificate.manage.institution",
  REGISTRATION_MANAGE_INSTITUTION: "registration.manage.institution",
  PAYMENT_REVIEW_INSTITUTION: "payment.review.institution",
  PAYMENT_VERIFY_INSTITUTION: "payment.verify.institution",
  VENUE_MANAGE_INSTITUTION: "venue.manage.institution",
  EVENT_STAFF_MANAGE_INSTITUTION: "event_staff.manage.institution",
  AUDIT_VIEW_INSTITUTION: "audit.view.institution",

  // --- Backward Compatibility Aliases ---
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
 * Normalizes legacy permission strings to canonical ones.
 */
export function normalizePermission(permission) {
  switch (permission) {
    case PERMISSIONS.EVENT_ATTENDANCE:
      return PERMISSIONS.ATTENDANCE_TAKE;
    case PERMISSIONS.EVENT_CERTIFICATE:
      return PERMISSIONS.CERTIFICATE_MANAGE;
    case PERMISSIONS.LOST_FOUND_CREATE:
      return PERMISSIONS.LOSTFOUND_CREATE;
    case PERMISSIONS.LOST_FOUND_VIEW:
      return PERMISSIONS.LOSTFOUND_VIEW;
    case PERMISSIONS.LOST_FOUND_MODERATE:
      return PERMISSIONS.LOSTFOUND_MODERATE;
    default:
      return permission;
  }
}

export const INSTITUTIONAL_LEAD_PERMISSIONS = [
  PERMISSIONS.EVENT_CREATE,
  PERMISSIONS.EVENT_UPDATE,
  PERMISSIONS.EVENT_DELETE,
  PERMISSIONS.EVENT_DELETE_REQUEST,
  PERMISSIONS.EVENT_PUBLISH,
  PERMISSIONS.ATTENDANCE_TAKE,
  PERMISSIONS.CERTIFICATE_MANAGE,
  PERMISSIONS.PAYMENT_REVIEW,
  PERMISSIONS.PAYMENT_VERIFY,
  PERMISSIONS.NOTIFICATION_SEND_CAMPUS,
  PERMISSIONS.NOTIFICATION_SEND_REGISTRANTS,
  PERMISSIONS.EVENT_STAFF_MANAGE,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.EVENT_CREATE_INSTITUTION,
  PERMISSIONS.EVENT_UPDATE_INSTITUTION,
  PERMISSIONS.EVENT_DELETE_REQUEST_INSTITUTION,
  PERMISSIONS.EVENT_PUBLISH_INSTITUTION,
  PERMISSIONS.EVENT_DELETE_INSTITUTION,
  PERMISSIONS.ATTENDANCE_TAKE_INSTITUTION,
  PERMISSIONS.CERTIFICATE_MANAGE_INSTITUTION,
  PERMISSIONS.REGISTRATION_MANAGE_INSTITUTION,
  PERMISSIONS.PAYMENT_REVIEW_INSTITUTION,
  PERMISSIONS.PAYMENT_VERIFY_INSTITUTION,
  PERMISSIONS.VENUE_MANAGE_INSTITUTION,
  PERMISSIONS.EVENT_STAFF_MANAGE_INSTITUTION,
  PERMISSIONS.AUDIT_VIEW_INSTITUTION,
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.EVENT_ATTENDANCE,
  PERMISSIONS.EVENT_CERTIFICATE,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.NOTIFICATION_CREATE,
  PERMISSIONS.CLUB_VIEW,
];

export const CLUB_ACCOUNT_PERMISSIONS = [
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
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.EVENT_ATTENDANCE,
  PERMISSIONS.EVENT_CERTIFICATE,
  PERMISSIONS.CLUB_VIEW,
  PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE,
  PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.NOTIFICATION_CREATE,
  PERMISSIONS.EVENT_STAFF_MANAGE,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.TEAM_CREATE,
  PERMISSIONS.TEAM_MANAGE,
];

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
  PERMISSIONS.LOSTFOUND_VIEW,
  PERMISSIONS.LOSTFOUND_CREATE,
  PERMISSIONS.LOST_FOUND_VIEW,
  PERMISSIONS.LOST_FOUND_CREATE,
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
  PERMISSIONS.EVENT_STAFF_MANAGE,
  PERMISSIONS.AUDIT_VIEW,
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
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.PAYMENT_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.NOTIFICATION_CREATE,
  PERMISSIONS.EVENT_STAFF_MANAGE,
  PERMISSIONS.TEAM_CREATE,
  PERMISSIONS.TEAM_MANAGE,
];

export const BASE_STUDENT_PERMISSIONS = [
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.LOSTFOUND_CREATE,
  PERMISSIONS.LOSTFOUND_VIEW,
  PERMISSIONS.LOST_FOUND_CREATE,
  PERMISSIONS.LOST_FOUND_VIEW,
  PERMISSIONS.LOST_FOUND_REPORT,
  PERMISSIONS.NOTIFICATION_VIEW,
  PERMISSIONS.TEAM_CREATE,
  PERMISSIONS.TEAM_MANAGE,
  PERMISSIONS.USER_VIEW,
  PERMISSIONS.USER_UPDATE,
];

export const EXTERNAL_USER_PERMISSIONS = [
  PERMISSIONS.EVENT_VIEW,
  PERMISSIONS.REGISTRATION_CREATE,
  PERMISSIONS.REGISTRATION_CANCEL,
  PERMISSIONS.REGISTRATION_VIEW,
  PERMISSIONS.NOTIFICATION_VIEW,
];

export const CENTRAL_ORGANIZER_PERMISSIONS = INSTITUTIONAL_LEAD_PERMISSIONS;

export const ROLE_PERMISSIONS_MAP = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS),
  FACULTY: FACULTY_COORDINATOR_PERMISSIONS,
  facultyCoordinator: FACULTY_COORDINATOR_PERMISSIONS,
  CLUB: CLUB_ACCOUNT_PERMISSIONS,
  club: CLUB_ACCOUNT_PERMISSIONS,
  STUDENT: BASE_STUDENT_PERMISSIONS,
  student: BASE_STUDENT_PERMISSIONS,
  member: BASE_STUDENT_PERMISSIONS,
  external: EXTERNAL_USER_PERMISSIONS,
  central_organizer: CENTRAL_ORGANIZER_PERMISSIONS,
  CENTRAL_ORGANIZER: CENTRAL_ORGANIZER_PERMISSIONS,
  INSTITUTIONAL: INSTITUTIONAL_LEAD_PERMISSIONS,
};

/**
 * Check if a role string has a given permission (for backward compatibility).
 */
export function roleHasPermission(role, permission) {
  if (!role || !permission) return false;
  if (role === "admin" || role === "SUPER_ADMIN") return true;

  const normalized = normalizePermission(permission);
  if (role === "facultyCoordinator" || role === "FACULTY") {
    return FACULTY_COORDINATOR_PERMISSIONS.includes(permission) || FACULTY_COORDINATOR_PERMISSIONS.includes(normalized);
  }
  if (role === "club" || role === "CLUB") {
    return CLUB_ACCOUNT_PERMISSIONS.includes(permission) || CLUB_ACCOUNT_PERMISSIONS.includes(normalized);
  }
  if (role === "central_organizer" || role === "CENTRAL_ORGANIZER" || role === "INSTITUTIONAL") {
    return INSTITUTIONAL_LEAD_PERMISSIONS.includes(permission) || INSTITUTIONAL_LEAD_PERMISSIONS.includes(normalized);
  }
  if (role === "external") {
    return EXTERNAL_USER_PERMISSIONS.includes(permission) || EXTERNAL_USER_PERMISSIONS.includes(normalized);
  }
  if (role === "paymentAdmin") {
    return [
      PERMISSIONS.PAYMENT_VIEW,
      PERMISSIONS.PAYMENT_VERIFY,
      PERMISSIONS.PAYMENT_REVIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.AUDIT_EXPORT,
    ].includes(permission);
  }
  if (role === "lostFoundAdmin") {
    return [
      PERMISSIONS.LOSTFOUND_VIEW,
      PERMISSIONS.LOSTFOUND_CREATE,
      PERMISSIONS.LOSTFOUND_MODERATE,
      PERMISSIONS.LOST_FOUND_VIEW,
      PERMISSIONS.LOST_FOUND_CREATE,
      PERMISSIONS.LOST_FOUND_MODERATE,
      PERMISSIONS.LOST_FOUND_RESOLVE,
      PERMISSIONS.LOST_FOUND_REPORT,
    ].includes(permission);
  }
  if (role === "student" || role === "member" || role === "STUDENT") {
    return BASE_STUDENT_PERMISSIONS.includes(permission) || BASE_STUDENT_PERMISSIONS.includes(normalized);
  }
  return false;
}

/**
 * Client-Side Scoped Permission Evaluator
 * Checks whether user has permission AND satisfies resource-level constraints.
 *
 * @param {object|null} user - Authenticated user object
 * @param {string} permission - Canonical or legacy permission string
 * @param {object|null} resource - Target resource object or context ({ clubId, organizerType, institutionalAccountId, createdById, userId, ... })
 * @returns {boolean}
 */
export function hasPermission(user, permission, resource = null) {
  if (!user) return false;

  const role = user.role || localStorage.getItem("role");
  const perm = normalizePermission(permission);

  if (role === "admin" || role === "SUPER_ADMIN" || user.principalType === "ADMIN") {
    return true;
  }

  // Principal determination
  const principalType = user.principalType || (
    role === "facultyCoordinator" ? "FACULTY" :
    role === "lostFoundAdmin" ? "ADMIN" :
    role === "paymentAdmin" ? "ADMIN" :
    role === "central_organizer" ? "INSTITUTIONAL" :
    user.userType === "student" ? "STUDENT" :
    role === "club" ? "CLUB" : "STUDENT"
  );

  const isInstitutionalResource =
    resource?.organizerType === "CENTRAL" ||
    Boolean(resource?.institutionalAccountId) ||
    Boolean(resource?.isInstitutional) ||
    (resource && !resource.clubId && !resource.club && resource.type === "INSTITUTION");

  const targetClubId = resource?.clubId ?? (!isInstitutionalResource ? resource?.id : null);
  const userClubId = user?.clubId || localStorage.getItem("clubId");
  const targetUserId = resource?.userId ?? resource?.createdById ?? resource?.id ?? null;
  const currentUserId = user?.id || user?.userId;

  if (principalType === "INSTITUTIONAL") {
    if (targetClubId && !isInstitutionalResource) {
      return false;
    }
    return INSTITUTIONAL_LEAD_PERMISSIONS.includes(perm) || INSTITUTIONAL_LEAD_PERMISSIONS.includes(permission);
  }

  if (principalType === "CLUB") {
    if (isInstitutionalResource) {
      return false;
    }
    if (perm === PERMISSIONS.EVENT_APPROVE || perm === PERMISSIONS.EVENT_DELETE_APPROVE) {
      return false;
    }

    const hasBase = CLUB_ACCOUNT_PERMISSIONS.includes(perm) || CLUB_ACCOUNT_PERMISSIONS.includes(permission);
    if (!hasBase) return false;

    if (targetClubId && userClubId) {
      return String(userClubId) === String(targetClubId);
    }
    return true;
  }

  if (principalType === "FACULTY") {
    if (isInstitutionalResource) {
      return false;
    }
    const hasBase = FACULTY_COORDINATOR_PERMISSIONS.includes(perm) || FACULTY_COORDINATOR_PERMISSIONS.includes(permission);
    if (!hasBase) return false;

    if (targetClubId && userClubId) {
      return String(userClubId) === String(targetClubId);
    }
    return true;
  }

  if (role === "lostFoundAdmin") {
    return [
      PERMISSIONS.LOSTFOUND_VIEW,
      PERMISSIONS.LOSTFOUND_CREATE,
      PERMISSIONS.LOSTFOUND_MODERATE,
      PERMISSIONS.LOST_FOUND_VIEW,
      PERMISSIONS.LOST_FOUND_CREATE,
      PERMISSIONS.LOST_FOUND_MODERATE,
      PERMISSIONS.LOST_FOUND_RESOLVE,
      PERMISSIONS.LOST_FOUND_REPORT,
    ].includes(perm) || [
      PERMISSIONS.LOSTFOUND_VIEW,
      PERMISSIONS.LOSTFOUND_CREATE,
      PERMISSIONS.LOSTFOUND_MODERATE,
      PERMISSIONS.LOST_FOUND_VIEW,
      PERMISSIONS.LOST_FOUND_CREATE,
      PERMISSIONS.LOST_FOUND_MODERATE,
      PERMISSIONS.LOST_FOUND_RESOLVE,
      PERMISSIONS.LOST_FOUND_REPORT,
    ].includes(permission);
  }

  if (role === "paymentAdmin") {
    return [
      PERMISSIONS.PAYMENT_VIEW,
      PERMISSIONS.PAYMENT_VERIFY,
      PERMISSIONS.PAYMENT_REVIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.AUDIT_EXPORT,
    ].includes(perm) || [
      PERMISSIONS.PAYMENT_VIEW,
      PERMISSIONS.PAYMENT_VERIFY,
      PERMISSIONS.PAYMENT_REVIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.AUDIT_EXPORT,
    ].includes(permission);
  }


  const activeInstAssignment = (user.institutionalAssignments || []).find((a) => a.status === "ACTIVE" || a.status === undefined);
  const isLegacyCentralOrganizer = user.accessLevel === "central_organizer" || role === "central_organizer";

  if (activeInstAssignment || isLegacyCentralOrganizer) {
    const isLeadCO = isLegacyCentralOrganizer || activeInstAssignment?.role === "CENTRAL_EVENT_ORGANISER";

    // Campus-wide broadcasts
    if (perm === PERMISSIONS.NOTIFICATION_SEND_CAMPUS || permission === PERMISSIONS.NOTIFICATION_SEND_CAMPUS) {
      if (isLeadCO || activeInstAssignment?.canManageEvents) return true;
    }

    // Checking institutional-scoped event permissions
    if (isInstitutionalResource || perm.endsWith(".institution") || permission.endsWith(".institution") || !targetClubId) {
      if (isLeadCO) {
        if (INSTITUTIONAL_LEAD_PERMISSIONS.includes(perm) || INSTITUTIONAL_LEAD_PERMISSIONS.includes(permission)) {
          return true;
        }
      }

      if (activeInstAssignment?.canManageEvents || activeInstAssignment?.role === "EVENT_COORDINATOR") {
        const eventPerms = [
          PERMISSIONS.EVENT_CREATE,
          PERMISSIONS.EVENT_UPDATE,
          PERMISSIONS.EVENT_PUBLISH,
          PERMISSIONS.EVENT_DELETE_REQUEST,
          PERMISSIONS.EVENT_CREATE_INSTITUTION,
          PERMISSIONS.EVENT_UPDATE_INSTITUTION,
          PERMISSIONS.EVENT_PUBLISH_INSTITUTION,
          PERMISSIONS.EVENT_VIEW,
          PERMISSIONS.NOTIFICATION_SEND_REGISTRANTS,
        ];
        if (eventPerms.includes(perm) || eventPerms.includes(permission)) return true;
      }

      if (activeInstAssignment?.canTakeAttendance || activeInstAssignment?.role === "ATTENDANCE_COORDINATOR") {
        const attPerms = [
          PERMISSIONS.ATTENDANCE_TAKE,
          PERMISSIONS.ATTENDANCE_TAKE_INSTITUTION,
          PERMISSIONS.EVENT_ATTENDANCE,
        ];
        if (attPerms.includes(perm) || attPerms.includes(permission)) return true;
      }

      if (activeInstAssignment?.canVerifyPayments || activeInstAssignment?.role === "PAYMENT_COORDINATOR") {
        const payPerms = [
          PERMISSIONS.PAYMENT_REVIEW,
          PERMISSIONS.PAYMENT_VERIFY,
          PERMISSIONS.PAYMENT_REVIEW_INSTITUTION,
          PERMISSIONS.PAYMENT_VERIFY_INSTITUTION,
          PERMISSIONS.PAYMENT_VIEW,
        ];
        if (payPerms.includes(perm) || payPerms.includes(permission)) return true;
      }

      if (activeInstAssignment?.canDelegateStaff) {
        const staffPerms = [
          PERMISSIONS.EVENT_STAFF_MANAGE,
          PERMISSIONS.EVENT_STAFF_MANAGE_INSTITUTION,
        ];
        if (staffPerms.includes(perm) || staffPerms.includes(permission)) return true;
      }

      const customInstPerms = activeInstAssignment?.customPermissions || [];
      if (customInstPerms.includes(perm) || customInstPerms.includes(permission)) {
        return true;
      }
    }
  }

  if (targetClubId && user.memberships && user.memberships.length > 0) {
    const membership = user.memberships.find((m) => String(m.clubId) === String(targetClubId));
    if (membership && membership.status !== "INACTIVE") {
      // Student CLUB_HEAD
      if (membership.role === "CLUB_HEAD") {
        if (STUDENT_CLUB_HEAD_PERMISSIONS.includes(perm) || STUDENT_CLUB_HEAD_PERMISSIONS.includes(permission)) {
          return true;
        }
      }

      // Student COORDINATOR
      if (membership.role === "COORDINATOR") {
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

      // Custom Permissions
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

  // Self-ownership checks
  if (targetUserId && currentUserId && String(targetUserId) === String(currentUserId)) {
    if (perm === PERMISSIONS.USER_UPDATE || perm === PERMISSIONS.LOST_FOUND_UPDATE || perm === PERMISSIONS.LOST_FOUND_RESOLVE) {
      return true;
    }
    if (resource?.createdById && String(resource.createdById) === String(currentUserId)) {
      if (perm === PERMISSIONS.EVENT_UPDATE || perm === PERMISSIONS.EVENT_DELETE_REQUEST) {
        return true;
      }
    }
  }

  // Base student permissions
  if (BASE_STUDENT_PERMISSIONS.includes(perm) || BASE_STUDENT_PERMISSIONS.includes(permission)) {
    return true;
  }

  return false;
}
