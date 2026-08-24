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

vi.mock("../../lib/prisma.js", () => ({
  default: {
    club: { findUnique: vi.fn() },
    studentUser: { findUnique: vi.fn() },
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
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

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
});
