import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MAX_CLUB_STUDENT_LEADS,
  MAX_CLUB_COORDINATORS,
  MAX_CLUB_OFFICIAL_ACCOUNTS,
  derivePermissions,
  transferStudentLead,
  addClubMember,
} from "../clubMemberController.js";
import prisma from "../../lib/prisma.js";

vi.mock("../../lib/prisma.js", () => {
  const mockPrisma = {
    club: { findUnique: vi.fn() },
    clubAccount: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    adminRole: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    institutionalAccount: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    studentUser: {
      findUnique: vi.fn().mockResolvedValue({ id: "new_stud_1", email: "newstudent@nitj.ac.in", name: "New Student" }),
      findFirst: vi.fn().mockResolvedValue({ id: "new_stud_1", email: "newstudent@nitj.ac.in", name: "New Student" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    clubMembership: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };
  return { default: mockPrisma };
});

vi.mock("../../utils/publicResponseCache.js", () => ({
  invalidatePublicResponses: vi.fn(),
}));

describe("Club Member Management & Role Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role & Quota Constants", () => {
    it("Enforces standard club role limits", () => {
      expect(MAX_CLUB_STUDENT_LEADS).toBe(1);
      expect(MAX_CLUB_COORDINATORS).toBe(5);
      expect(MAX_CLUB_OFFICIAL_ACCOUNTS).toBe(1);
    });

    it("Correctly derives permission flags from roles", () => {
      expect(derivePermissions("CLUB_HEAD")).toEqual({
        canTakeAttendance: true,
        canEditEvents: true,
      });
      expect(derivePermissions("COORDINATOR")).toEqual({
        canTakeAttendance: true,
        canEditEvents: true,
      });
      expect(derivePermissions("MEMBER")).toEqual({
        canTakeAttendance: true,
        canEditEvents: false,
      });
    });
  });

  describe("addClubMember Role Constraints", () => {
    it("Rejects adding a second Student Lead with 409 Conflict", async () => {
      prisma.club.findUnique.mockResolvedValue({ id: "club_1" });
      prisma.clubMembership.count.mockResolvedValue(1); // 1 head already exists

      const req = {
        params: { clubId: "club_1" },
        body: { email: "newlead@nitj.ac.in", role: "CLUB_HEAD" },
        user: { role: "admin", userId: "admin1" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await addClubMember(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "This club already has an active Student Lead.",
        })
      );
    });

    it("Rejects adding a 6th Coordinator with 409 Conflict", async () => {
      prisma.club.findUnique.mockResolvedValue({ id: "club_1" });
      prisma.clubMembership.count.mockResolvedValue(5); // 5 coordinators already exist

      const req = {
        params: { clubId: "club_1" },
        body: { email: "coord6@nitj.ac.in", role: "COORDINATOR" },
        user: { role: "admin", userId: "admin1" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await addClubMember(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Maximum of 5 active coordinators is allowed for this club.",
        })
      );
    });

    it("Rejects member management when requester is a COORDINATOR (403 Forbidden)", async () => {
      prisma.club.findUnique.mockResolvedValue({ id: "club_1" });

      const req = {
        params: { clubId: "club_1" },
        body: { email: "newmember@nitj.ac.in", role: "MEMBER" },
        user: {
          role: "club",
          userType: "student",
          principalType: "STUDENT",
          userId: "student_coord",
          memberships: [{ clubId: "club_1", role: "COORDINATOR" }],
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await addClubMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unauthorized to add members to this club.",
        })
      );
    });

    it("Allows member management when requester is a CLUB_HEAD", async () => {
      prisma.club.findUnique.mockResolvedValue({ id: "club_1" });
      prisma.studentUser.findUnique.mockResolvedValue({ id: "new_stud_1", email: "newstudent@nitj.ac.in" });
      prisma.clubMembership.findUnique.mockResolvedValue(null); // no duplicate

      prisma.clubMembership.create.mockResolvedValue({
        id: "mem_new",
        studentId: "new_stud_1",
        clubId: "club_1",
        role: "MEMBER",
        canTakeAttendance: true,
        canEditEvents: false,
      });

      const req = {
        params: { clubId: "club_1" },
        body: { email: "newstudent@nitj.ac.in", role: "MEMBER" },
        user: {
          role: "club",
          userType: "student",
          principalType: "STUDENT",
          userId: "student_head",
          memberships: [{ clubId: "club_1", role: "CLUB_HEAD" }],
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await addClubMember(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Member added successfully.",
        })
      );
    });

    it("Allows member management when requester is a dedicated ClubAccount", async () => {
      prisma.club.findUnique.mockResolvedValue({ id: "club_1" });
      prisma.studentUser.findUnique.mockResolvedValue({ id: "new_stud_1", email: "newstudent@nitj.ac.in" });
      prisma.clubMembership.findUnique.mockResolvedValue(null);

      prisma.clubMembership.create.mockResolvedValue({
        id: "mem_new",
        studentId: "new_stud_1",
        clubId: "club_1",
        role: "MEMBER",
        canTakeAttendance: true,
        canEditEvents: false,
      });

      const req = {
        params: { clubId: "club_1" },
        body: { email: "newstudent@nitj.ac.in", role: "MEMBER" },
        user: {
          role: "club",
          userType: "club",
          principalType: "CLUB",
          clubAccountId: "club_acc_1",
          clubId: "club_1",
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await addClubMember(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("transferStudentLead Transaction", () => {
    it("Atomically swaps Student Lead inside a database transaction", async () => {
      prisma.club.findUnique.mockResolvedValue({
        id: "club_1",
        clubEmail: "robotics@nitj.ac.in",
        slug: "robotics",
      });

      const targetMembership = {
        id: "mem_coordinator_2",
        clubId: "club_1",
        role: "COORDINATOR",
        student: { id: "stud_2", name: "Aarav Sharma", email: "aarav@nitj.ac.in", rollNo: "21103001" },
      };

      prisma.clubMembership.findUnique.mockResolvedValue(targetMembership);
      prisma.clubMembership.updateMany.mockResolvedValue({ count: 1 });
      prisma.clubMembership.update.mockResolvedValue({
        ...targetMembership,
        role: "CLUB_HEAD",
        canTakeAttendance: true,
        canEditEvents: true,
      });

      const req = {
        params: { clubId: "club_1" },
        body: { targetMembershipId: "mem_coordinator_2" },
        user: { role: "admin", userId: "admin1" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await transferStudentLead(req, res);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.clubMembership.updateMany).toHaveBeenCalledWith({
        where: { clubId: "club_1", role: "CLUB_HEAD" },
        data: { role: "COORDINATOR", canTakeAttendance: true, canEditEvents: true },
      });
      expect(prisma.clubMembership.update).toHaveBeenCalledWith({
        where: { id: "mem_coordinator_2" },
        data: { role: "CLUB_HEAD", canTakeAttendance: true, canEditEvents: true },
        include: { student: { select: { id: true, name: true, email: true, rollNo: true } } },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Leadership successfully transferred to Aarav Sharma.",
          studentLead: expect.objectContaining({ role: "CLUB_HEAD" }),
        })
      );
    });

    it("Rejects transfer if target member is already the active Student Lead", async () => {
      prisma.club.findUnique.mockResolvedValue({ id: "club_1" });
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: "mem_lead_1",
        clubId: "club_1",
        role: "CLUB_HEAD",
        student: { email: "lead@nitj.ac.in" },
      });

      const req = {
        params: { clubId: "club_1" },
        body: { targetMembershipId: "mem_lead_1" },
        user: { role: "admin", userId: "admin1" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await transferStudentLead(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Target member is already the active Student Lead.",
        })
      );
    });
  });

  describe("Non-Student Account Gating in Club Membership", () => {
    it("Rejects adding a ClubAccount email as a member with 400 Bad Request", async () => {
      prisma.club.findUnique.mockResolvedValue({ id: "club_1" });
      prisma.clubAccount.findFirst.mockResolvedValue({ id: "acc_1", email: "robotics@nitj.ac.in" });

      const req = {
        params: { clubId: "club_1" },
        body: { email: "robotics@nitj.ac.in", role: "MEMBER" },
        user: { role: "admin", userId: "admin1" },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await addClubMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Club organizational accounts cannot be added as club members. Only individual students are allowed.",
        })
      );
    });
  });
});
