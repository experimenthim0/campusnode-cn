import { describe, it, expect } from "vitest";
import { hasPermission, getEffectivePermissions, PERMISSIONS } from "../../utils/rbac.js";

describe("3-Principal RBAC Permission Matrix & Scope Isolation", () => {
  const clubAId = "660c11111111111111111111";
  const clubBId = "660c22222222222222222222";

  describe("1. Dedicated ClubAccount Principal (principalType === 'CLUB')", () => {
    const clubAAccount = {
      principalType: "CLUB",
      clubAccountId: "acc_club_a",
      clubId: clubAId,
      email: "robotics@nitj.ac.in",
      role: "club",
      userType: "club",
    };

    it("Grants full club operations and team management for its own club", () => {
      expect(hasPermission(clubAAccount, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.CLUB_INVITE_MEMBERS, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.CLUB_REMOVE_MEMBERS, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.CLUB_ASSIGN_ROLES, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.CLUB_TRANSFER_LEADERSHIP, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.EVENT_CREATE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.EVENT_UPDATE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.ATTENDANCE_TAKE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.CERTIFICATE_MANAGE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.PAYMENT_REVIEW, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.NOTIFICATION_SEND_REGISTRANTS, { clubId: clubAId })).toBe(true);
      expect(hasPermission(clubAAccount, PERMISSIONS.NOTIFICATION_SEND_CAMPUS, { clubId: clubAId })).toBe(true);
    });

    it("Denies approving events or deletion (reserved for Faculty/Admin)", () => {
      expect(hasPermission(clubAAccount, PERMISSIONS.EVENT_APPROVE, { clubId: clubAId })).toBe(false);
      expect(hasPermission(clubAAccount, PERMISSIONS.EVENT_DELETE_APPROVE, { clubId: clubAId })).toBe(false);
    });

    it("Enforces strict cross-club isolation (cannot manage Club B)", () => {
      expect(hasPermission(clubAAccount, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubBId })).toBe(false);
      expect(hasPermission(clubAAccount, PERMISSIONS.EVENT_UPDATE, { clubId: clubBId })).toBe(false);
      expect(hasPermission(clubAAccount, PERMISSIONS.PAYMENT_REVIEW, { clubId: clubBId })).toBe(false);
    });
  });

  describe("2. Faculty Coordinator Principal (principalType === 'FACULTY')", () => {
    const facultyA = {
      principalType: "FACULTY",
      facultyId: "fac_1",
      userId: "fac_1",
      clubId: clubAId,
      email: "fac_robotics@nitj.ac.in",
      role: "facultyCoordinator",
      userType: "admin",
    };

    it("Grants event approval, deletion approval, and member management on its assigned club", () => {
      expect(hasPermission(facultyA, PERMISSIONS.EVENT_APPROVE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(facultyA, PERMISSIONS.EVENT_DELETE_APPROVE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(facultyA, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubAId })).toBe(true);
      expect(hasPermission(facultyA, PERMISSIONS.EVENT_UPDATE, { clubId: clubAId })).toBe(true);
    });

    it("Denies operations on other clubs", () => {
      expect(hasPermission(facultyA, PERMISSIONS.EVENT_APPROVE, { clubId: clubBId })).toBe(false);
      expect(hasPermission(facultyA, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubBId })).toBe(false);
    });
  });

  describe("3. Student User with CLUB_HEAD Membership", () => {
    const studentLead = {
      principalType: "STUDENT",
      studentId: "stud_lead_1",
      userId: "stud_lead_1",
      email: "lead@nitj.ac.in",
      role: "club",
      userType: "student",
      memberships: [
        {
          clubId: clubAId,
          role: "CLUB_HEAD",
          status: "ACTIVE",
          canTakeAttendance: true,
          canEditEvents: true,
          customPermissions: [],
        },
      ],
    };

    it("Grants Team Management on Club A", () => {
      expect(hasPermission(studentLead, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentLead, PERMISSIONS.CLUB_INVITE_MEMBERS, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentLead, PERMISSIONS.EVENT_CREATE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentLead, PERMISSIONS.EVENT_UPDATE, { clubId: clubAId })).toBe(true);
    });

    it("Denies Team Management and event modifications on Club B", () => {
      expect(hasPermission(studentLead, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubBId })).toBe(false);
      expect(hasPermission(studentLead, PERMISSIONS.EVENT_UPDATE, { clubId: clubBId })).toBe(false);
    });

    it("Denies event approval even on own club", () => {
      expect(hasPermission(studentLead, PERMISSIONS.EVENT_APPROVE, { clubId: clubAId })).toBe(false);
    });
  });

  describe("4. Student User with COORDINATOR Membership", () => {
    const studentCoord = {
      principalType: "STUDENT",
      studentId: "stud_coord_1",
      userId: "stud_coord_1",
      email: "coord@nitj.ac.in",
      role: "club",
      userType: "student",
      memberships: [
        {
          clubId: clubAId,
          role: "COORDINATOR",
          status: "ACTIVE",
          canTakeAttendance: true,
          canEditEvents: true,
          customPermissions: [],
        },
      ],
    };

    it("Grants event creation, editing, attendance, and payment review on Club A", () => {
      expect(hasPermission(studentCoord, PERMISSIONS.EVENT_CREATE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.EVENT_UPDATE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.ATTENDANCE_TAKE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.PAYMENT_REVIEW, { clubId: clubAId })).toBe(true);
    });

    it("Grants certificate design, announcements, achievements, and club updates on Club A", () => {
      expect(hasPermission(studentCoord, PERMISSIONS.EVENT_CERTIFICATE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.CERTIFICATE_MANAGE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_UPDATE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE, { clubId: clubAId })).toBe(true);
    });

    it("Grants unscoped certificate management capability (e.g. uploading template image)", () => {
      expect(hasPermission(studentCoord, PERMISSIONS.EVENT_CERTIFICATE)).toBe(true);
      expect(hasPermission(studentCoord, PERMISSIONS.CERTIFICATE_MANAGE)).toBe(true);
    });

    it("Denies certificate design and club page management on other clubs (Club B)", () => {
      expect(hasPermission(studentCoord, PERMISSIONS.EVENT_CERTIFICATE, { clubId: clubBId })).toBe(false);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_UPDATE, { clubId: clubBId })).toBe(false);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_ANNOUNCEMENTS_MANAGE, { clubId: clubBId })).toBe(false);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_ACHIEVEMENTS_MANAGE, { clubId: clubBId })).toBe(false);
    });

    it("STRICTLY DENIES Team Management (manage_members, invite, remove, assign_roles, transfer)", () => {
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubAId })).toBe(false);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_INVITE_MEMBERS, { clubId: clubAId })).toBe(false);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_REMOVE_MEMBERS, { clubId: clubAId })).toBe(false);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_ASSIGN_ROLES, { clubId: clubAId })).toBe(false);
      expect(hasPermission(studentCoord, PERMISSIONS.CLUB_TRANSFER_LEADERSHIP, { clubId: clubAId })).toBe(false);
    });
  });

  describe("5. Student User with Custom Permissions on Membership", () => {
    const studentMemberWithCustom = {
      principalType: "STUDENT",
      studentId: "stud_mem_1",
      userId: "stud_mem_1",
      email: "member@nitj.ac.in",
      role: "member",
      userType: "student",
      memberships: [
        {
          clubId: clubAId,
          role: "MEMBER",
          status: "ACTIVE",
          canTakeAttendance: true,
          canEditEvents: false,
          customPermissions: ["attendance.take"],
        },
      ],
    };

    it("Grants custom permission (attendance.take) on Club A", () => {
      expect(hasPermission(studentMemberWithCustom, PERMISSIONS.ATTENDANCE_TAKE, { clubId: clubAId })).toBe(true);
    });

    it("Denies unassigned permissions (event.update, club.manage_members)", () => {
      expect(hasPermission(studentMemberWithCustom, PERMISSIONS.EVENT_UPDATE, { clubId: clubAId })).toBe(false);
      expect(hasPermission(studentMemberWithCustom, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubAId })).toBe(false);
    });

    it("Always retains global student permissions", () => {
      expect(hasPermission(studentMemberWithCustom, PERMISSIONS.REGISTRATION_CREATE)).toBe(true);
      expect(hasPermission(studentMemberWithCustom, PERMISSIONS.LOSTFOUND_CREATE)).toBe(true);
      expect(hasPermission(studentMemberWithCustom, PERMISSIONS.EVENT_VIEW)).toBe(true);
    });
  });

  describe("6. Platform Administrator (Wildcard)", () => {
    const admin = {
      principalType: "ADMIN",
      userId: "admin_super",
      role: "admin",
      userType: "admin",
    };

    it("Grants all permissions unconditionally across any club scope", () => {
      expect(hasPermission(admin, PERMISSIONS.EVENT_APPROVE, { clubId: clubAId })).toBe(true);
      expect(hasPermission(admin, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubBId })).toBe(true);
      expect(hasPermission(admin, "any.future.permission")).toBe(true);
    });
  });

  describe("7. Institutional Account & DSW Central Event Organisers", () => {
    const dswLeadStudent = {
      principalType: "STUDENT",
      studentId: "stud_dsw_1",
      userId: "stud_dsw_1",
      role: "central_organizer",
      accessLevel: "central_organizer",
      institutionalAssignments: [
        {
          id: "inst_assign_1",
          institutionalAccountId: "inst_dsw_1",
          role: "CENTRAL_EVENT_ORGANISER",
          status: "ACTIVE",
          canManageEvents: true,
          canTakeAttendance: true,
          canVerifyPayments: true,
          canDelegateStaff: true,
        },
      ],
    };

    const dswAttendanceCoordinator = {
      principalType: "STUDENT",
      studentId: "stud_dsw_2",
      userId: "stud_dsw_2",
      role: "member",
      institutionalAssignments: [
        {
          id: "inst_assign_2",
          institutionalAccountId: "inst_dsw_1",
          role: "ATTENDANCE_COORDINATOR",
          status: "ACTIVE",
          canManageEvents: false,
          canTakeAttendance: true,
          canVerifyPayments: false,
          canDelegateStaff: false,
        },
      ],
    };

    const dswPaymentCoordinator = {
      principalType: "STUDENT",
      studentId: "stud_dsw_3",
      userId: "stud_dsw_3",
      role: "member",
      institutionalAssignments: [
        {
          id: "inst_assign_3",
          institutionalAccountId: "inst_dsw_1",
          role: "PAYMENT_COORDINATOR",
          status: "ACTIVE",
          canManageEvents: false,
          canTakeAttendance: false,
          canVerifyPayments: true,
          canDelegateStaff: false,
        },
      ],
    };

    const centralEvent = {
      id: "ev_fresher_party",
      organizerType: "CENTRAL",
      institutionalAccountId: "inst_dsw_1",
      clubId: null,
    };

    it("Grants full institutional capabilities to Central Event Organiser Lead", () => {
      expect(hasPermission(dswLeadStudent, PERMISSIONS.EVENT_CREATE_INSTITUTION, centralEvent)).toBe(true);
      expect(hasPermission(dswLeadStudent, PERMISSIONS.EVENT_UPDATE, centralEvent)).toBe(true);
      expect(hasPermission(dswLeadStudent, PERMISSIONS.ATTENDANCE_TAKE, centralEvent)).toBe(true);
      expect(hasPermission(dswLeadStudent, PERMISSIONS.PAYMENT_VERIFY, centralEvent)).toBe(true);
      expect(hasPermission(dswLeadStudent, PERMISSIONS.EVENT_STAFF_MANAGE, centralEvent)).toBe(true);
      expect(hasPermission(dswLeadStudent, PERMISSIONS.NOTIFICATION_SEND_CAMPUS)).toBe(true);
    });

    it("Enforces capability gating for Attendance Coordinator (no event creation or payments)", () => {
      expect(hasPermission(dswAttendanceCoordinator, PERMISSIONS.ATTENDANCE_TAKE, centralEvent)).toBe(true);
      expect(hasPermission(dswAttendanceCoordinator, PERMISSIONS.EVENT_CREATE, centralEvent)).toBe(false);
      expect(hasPermission(dswAttendanceCoordinator, PERMISSIONS.PAYMENT_VERIFY, centralEvent)).toBe(false);
      expect(hasPermission(dswAttendanceCoordinator, PERMISSIONS.EVENT_STAFF_MANAGE, centralEvent)).toBe(false);
    });

    it("Enforces capability gating for Payment Coordinator (no attendance taking or event creation)", () => {
      expect(hasPermission(dswPaymentCoordinator, PERMISSIONS.PAYMENT_VERIFY, centralEvent)).toBe(true);
      expect(hasPermission(dswPaymentCoordinator, PERMISSIONS.ATTENDANCE_TAKE, centralEvent)).toBe(false);
      expect(hasPermission(dswPaymentCoordinator, PERMISSIONS.EVENT_CREATE, centralEvent)).toBe(false);
    });

    it("Enforces strict scope isolation: Central Organizers CANNOT manage Club memberships", () => {
      expect(hasPermission(dswLeadStudent, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId: clubAId })).toBe(false);
      expect(hasPermission(dswLeadStudent, PERMISSIONS.CLUB_UPDATE, { clubId: clubAId })).toBe(false);
    });

    it("Enforces strict scope isolation: Club Accounts CANNOT manage Central/Institutional events", () => {
      const clubAccount = {
        principalType: "CLUB",
        clubAccountId: "acc_1",
        clubId: clubAId,
        role: "club",
      };
      expect(hasPermission(clubAccount, PERMISSIONS.EVENT_UPDATE, centralEvent)).toBe(false);
      expect(hasPermission(clubAccount, PERMISSIONS.ATTENDANCE_TAKE, centralEvent)).toBe(false);
    });
  });

  describe("8. Effective Permissions Computation", () => {
    it("Computes array of effective permissions for ClubAccount", () => {
      const clubAccount = {
        principalType: "CLUB",
        clubAccountId: "acc_1",
        clubId: clubAId,
        role: "club",
      };
      const perms = getEffectivePermissions(clubAccount, clubAId);
      expect(perms).toContain(PERMISSIONS.CLUB_MANAGE_MEMBERS);
      expect(perms).toContain(PERMISSIONS.EVENT_CREATE);
      expect(perms).not.toContain(PERMISSIONS.EVENT_APPROVE);
    });
  });
});
