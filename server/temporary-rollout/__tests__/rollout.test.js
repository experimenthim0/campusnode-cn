import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import { evaluateRolloutAccess, formatRolloutDate, isEarlyAccessEmail } from "../rolloutService.js";
import { rolloutMiddleware } from "../rolloutMiddleware.js";
import { ROLLOUT_CONFIG } from "../config.js";

const JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-12345678901234567890";
process.env.JWT_SECRET = JWT_SECRET;

describe("CampusNode Temporary Isolated Rollout", () => {
  const originalEnv = process.env.CAMPUSNODE_ROLLOUT_ENABLED;

  afterEach(() => {
    process.env.CAMPUSNODE_ROLLOUT_ENABLED = originalEnv;
    ROLLOUT_CONFIG.enabled = process.env.CAMPUSNODE_ROLLOUT_ENABLED === "true";
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. HARD OFF SWITCH SAFETY TESTS (CAMPUSNODE_ROLLOUT_ENABLED = false)
  // =========================================================================
  describe("Safety Property: Rollout Disabled (CAMPUSNODE_ROLLOUT_ENABLED=false)", () => {
    beforeEach(() => {
      process.env.CAMPUSNODE_ROLLOUT_ENABLED = "false";
      ROLLOUT_CONFIG.enabled = false;
    });

    it("should allow every user category with zero restrictions when disabled", async () => {
      const testCases = [
        { role: "admin", userType: "admin", principalType: "ADMIN" },
        { role: "faculty", userType: "faculty", principalType: "FACULTY" },
        { role: "member", userType: "student", program: "BTECH", expectedGraduationYear: 2027 }, // 4th yr
        { role: "member", userType: "student", program: "BTECH", expectedGraduationYear: 2028 }, // 3rd yr
        { role: "member", userType: "student", program: "BTECH", expectedGraduationYear: 2029 }, // 2nd yr
        { role: "member", userType: "student", program: "BTECH", expectedGraduationYear: 2030 }, // 1st yr
        { role: "member", userType: "student", program: "MTECH", expectedGraduationYear: 2028 }, // M.Tech
        { role: "member", userType: "student", program: "MSC", expectedGraduationYear: 2028 },
        { role: "external", userType: "external", principalType: "EXTERNAL" },
        { role: "member", userType: "student", email: "earlyaccess@nitj.ac.in" },
      ];

      for (const u of testCases) {
        const res = await evaluateRolloutAccess(u);
        expect(res.enabled).toBe(false);
        expect(res.allowed).toBe(true);
        expect(res.reason).toBe("ROLLOUT_DISABLED");
      }
    });

    it("rolloutMiddleware should call next() immediately with no token or block", async () => {
      const req = {
        path: "/api/events",
        headers: {},
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await rolloutMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. ROLLOUT ENABLED: STAGE & TIMING EVALUATION
  // =========================================================================
  describe("Rollout Enabled: Stage Cohorts & Schedule Evaluation", () => {
    const launchStart = new Date("2026-09-27T00:00:00+05:30");
    const beforeLaunch = new Date("2026-09-26T23:59:59+05:30");

    const customSchedule = {
      stage0FacultyAndAdmin: "2026-09-27T00:00:00+05:30",
      stage1BTech34: "2026-09-28T00:00:00+05:30",
      stage2BTech12: "2026-09-29T00:00:00+05:30",
      stage3MTech: "2026-09-30T00:00:00+05:30",
      stage4Remaining: "2026-10-01T00:00:00+05:30",
    };

    beforeEach(() => {
      process.env.CAMPUSNODE_ROLLOUT_ENABLED = "true";
      ROLLOUT_CONFIG.enabled = true;
    });

    // Stage 0: Administration
    it("Admin user: blocked before launch, allowed at Stage 0 launch", async () => {
      const admin = { principalType: "ADMIN", email: "admin@nitj.ac.in" };

      const resBefore = await evaluateRolloutAccess(admin, {
        referenceDate: beforeLaunch,
        schedule: customSchedule,
      });
      expect(resBefore.stage).toBe(0);
      expect(resBefore.allowed).toBe(false);

      const resLaunch = await evaluateRolloutAccess(admin, {
        referenceDate: launchStart,
        schedule: customSchedule,
      });
      expect(resLaunch.stage).toBe(0);
      expect(resLaunch.allowed).toBe(true);
      expect(resLaunch.group).toBe("Administration");
    });

    // Stage 0: Faculty
    it("Faculty user: blocked before launch, allowed at Stage 0 launch", async () => {
      const faculty = { principalType: "FACULTY", email: "fac@nitj.ac.in" };

      const resBefore = await evaluateRolloutAccess(faculty, {
        referenceDate: beforeLaunch,
        schedule: customSchedule,
      });
      expect(resBefore.stage).toBe(0);
      expect(resBefore.allowed).toBe(false);

      const resLaunch = await evaluateRolloutAccess(faculty, {
        referenceDate: launchStart,
        schedule: customSchedule,
      });
      expect(resLaunch.stage).toBe(0);
      expect(resLaunch.allowed).toBe(true);
      expect(resLaunch.group).toBe("Faculty");
    });

    // Stage 0: Early-Access Student Club Leads
    it("Early-access student email: allowed at Stage 0 regardless of student academic year", async () => {
      const earlyAccessEmail = "clubhead.lead@nitj.ac.in";
      const earlyList = [earlyAccessEmail];

      // Test with 1st, 2nd, and 3rd year student records
      const student1st = {
        principalType: "STUDENT",
        email: "CLUBHEAD.LEAD@nitj.ac.in", // case-insensitivity
        program: "BTECH",
        expectedGraduationYear: 2030, // 1st year in 2026-27
      };
      const student2nd = {
        principalType: "STUDENT",
        email: " clubhead.lead@nitj.ac.in ", // whitespace trim
        program: "BTECH",
        expectedGraduationYear: 2029, // 2nd year
      };
      const student3rd = {
        principalType: "STUDENT",
        email: "clubhead.lead@nitj.ac.in",
        program: "BTECH",
        expectedGraduationYear: 2028, // 3rd year
      };

      for (const st of [student1st, student2nd, student3rd]) {
        const res = await evaluateRolloutAccess(st, {
          referenceDate: launchStart,
          earlyAccessList: earlyList,
          schedule: customSchedule,
        });
        expect(res.isEarlyAccess).toBe(true);
        expect(res.stage).toBe(0);
        expect(res.allowed).toBe(true);
      }
    });

    // Stage 1: B.Tech 3rd & 4th year
    it("B.Tech 3rd & 4th year: evaluated according to Stage 1", async () => {
      const btech4th = {
        principalType: "STUDENT",
        email: "btech4@nitj.ac.in",
        program: "BTECH",
        expectedGraduationYear: 2027, // 4th yr in Sept 2026
      };
      const btech3rd = {
        principalType: "STUDENT",
        email: "btech3@nitj.ac.in",
        program: "BTECH",
        expectedGraduationYear: 2028, // 3rd yr in Sept 2026
      };

      const stage1Date = new Date(customSchedule.stage1BTech34);
      const beforeStage1 = new Date("2026-09-27T12:00:00+05:30");

      for (const st of [btech4th, btech3rd]) {
        const resBefore = await evaluateRolloutAccess(st, {
          referenceDate: beforeStage1,
          schedule: customSchedule,
        });
        expect(resBefore.stage).toBe(1);
        expect(resBefore.allowed).toBe(false);
        expect(resBefore.group).toBe("B.Tech 3rd & 4th Year");

        const resAfter = await evaluateRolloutAccess(st, {
          referenceDate: stage1Date,
          schedule: customSchedule,
        });
        expect(resAfter.stage).toBe(1);
        expect(resAfter.allowed).toBe(true);
      }
    });

    // Stage 2: B.Tech 1st & 2nd year
    it("B.Tech 1st & 2nd year: evaluated according to Stage 2", async () => {
      const btech2nd = {
        principalType: "STUDENT",
        email: "btech2@nitj.ac.in",
        program: "BTECH",
        expectedGraduationYear: 2029, // 2nd yr in Sept 2026
      };
      const btech1st = {
        principalType: "STUDENT",
        email: "btech1@nitj.ac.in",
        program: "BTECH",
        expectedGraduationYear: 2030, // 1st yr in Sept 2026
      };

      const stage2Date = new Date(customSchedule.stage2BTech12);
      const beforeStage2 = new Date("2026-09-28T12:00:00+05:30");

      for (const st of [btech2nd, btech1st]) {
        const resBefore = await evaluateRolloutAccess(st, {
          referenceDate: beforeStage2,
          schedule: customSchedule,
        });
        expect(resBefore.stage).toBe(2);
        expect(resBefore.allowed).toBe(false);
        expect(resBefore.group).toBe("B.Tech 1st & 2nd Year");

        const resAfter = await evaluateRolloutAccess(st, {
          referenceDate: stage2Date,
          schedule: customSchedule,
        });
        expect(resAfter.stage).toBe(2);
        expect(resAfter.allowed).toBe(true);
      }
    });

    // Stage 3: M.Tech
    it("M.Tech: evaluated according to Stage 3", async () => {
      const mtech = {
        principalType: "STUDENT",
        email: "mtech@nitj.ac.in",
        program: "MTECH",
        expectedGraduationYear: 2028,
      };

      const stage3Date = new Date(customSchedule.stage3MTech);
      const beforeStage3 = new Date("2026-09-29T12:00:00+05:30");

      const resBefore = await evaluateRolloutAccess(mtech, {
        referenceDate: beforeStage3,
        schedule: customSchedule,
      });
      expect(resBefore.stage).toBe(3);
      expect(resBefore.allowed).toBe(false);
      expect(resBefore.group).toBe("M.Tech");

      const resAfter = await evaluateRolloutAccess(mtech, {
        referenceDate: stage3Date,
        schedule: customSchedule,
      });
      expect(resAfter.stage).toBe(3);
      expect(resAfter.allowed).toBe(true);
    });

    // Stage 4: Remaining Programs and External Users
    it("Remaining programs & External users: evaluated according to Stage 4", async () => {
      const mscStudent = {
        principalType: "STUDENT",
        email: "msc@nitj.ac.in",
        program: "MSC",
        expectedGraduationYear: 2028,
      };
      const externalUser = {
        principalType: "EXTERNAL",
        email: "external@otheruni.ac.in",
      };

      const stage4Date = new Date(customSchedule.stage4Remaining);
      const beforeStage4 = new Date("2026-09-30T12:00:00+05:30");

      for (const u of [mscStudent, externalUser]) {
        const resBefore = await evaluateRolloutAccess(u, {
          referenceDate: beforeStage4,
          schedule: customSchedule,
        });
        expect(resBefore.stage).toBe(4);
        expect(resBefore.allowed).toBe(false);

        const resAfter = await evaluateRolloutAccess(u, {
          referenceDate: stage4Date,
          schedule: customSchedule,
        });
        expect(resAfter.stage).toBe(4);
        expect(resAfter.allowed).toBe(true);
      }
    });

    it("Pending unconfigured stage date should safely remain blocked", async () => {
      const unconfiguredSchedule = {
        stage0FacultyAndAdmin: "2026-09-27T00:00:00+05:30",
        stage1BTech34: null,
        stage2BTech12: null,
        stage3MTech: null,
        stage4Remaining: null,
      };

      const btechStudent = {
        principalType: "STUDENT",
        email: "student@nitj.ac.in",
        program: "BTECH",
        expectedGraduationYear: 2030,
      };

      const res = await evaluateRolloutAccess(btechStudent, {
        referenceDate: new Date("2026-10-15T00:00:00+05:30"),
        schedule: unconfiguredSchedule,
      });
      expect(res.allowed).toBe(false);
      expect(res.availableDate).toBeNull();
      expect(res.availableDateFormatted).toBe("Date to be announced");
    });
  });

  // =========================================================================
  // 3. SERVER-SIDE MIDDLEWARE & ROUTE EXEMPTION TESTS
  // =========================================================================
  describe("Server-side rolloutMiddleware Enforcement", () => {
    beforeEach(() => {
      process.env.CAMPUSNODE_ROLLOUT_ENABLED = "true";
      ROLLOUT_CONFIG.enabled = true;
    });

    it("Auth and identity routes MUST remain exempt from rollout gating", async () => {
      const exemptPaths = [
        "/",
        "/health",
        "/api/keys",
        "/api/keys/public",
        "/api/auth/register/student",
        "/api/auth/register/faculty",
        "/api/auth/register/external",
        "/api/auth/login",
        "/api/auth/verify-2fa",
        "/api/auth/verify-email/testtoken",
        "/api/auth/forgot-password",
        "/api/auth/reset-password/testtoken",
        "/api/users/me",
      ];

      for (const path of exemptPaths) {
        const req = { path, headers: {} };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();

        await rolloutMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      }
    });

    it("Rejects unauthenticated requests to protected application APIs", async () => {
      const req = {
        path: "/api/events",
        headers: {},
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await rolloutMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "ROLLOUT_AUTH_REQUIRED" })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("Blocks non-released students with HTTP 403 and rollout cohort details", async () => {
      // Create a JWT for B.Tech 1st year student
      const unreleasedStudent = {
        userId: "test-user-id-123",
        email: "firstyear@nitj.ac.in",
        role: "member",
        userType: "student",
        principalType: "STUDENT",
        program: "BTECH",
        expectedGraduationYear: 2030, // 1st year
      };

      const token = jwt.sign(unreleasedStudent, JWT_SECRET);

      const req = {
        path: "/api/events",
        headers: { authorization: `Bearer ${token}` },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await rolloutMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "ROLLOUT_ACCESS_DENIED",
          rolloutBlocked: true,
          rollout: expect.objectContaining({
            stage: 2,
            group: "B.Tech 1st & 2nd Year",
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("Permits Admin requests through rolloutMiddleware on/after Stage 0", async () => {
      const adminUser = {
        userId: "admin-id-123",
        email: "admin@nitj.ac.in",
        role: "admin",
        userType: "admin",
        principalType: "ADMIN",
      };

      const token = jwt.sign(adminUser, JWT_SECRET);

      // Mock date to 28 September 2026
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-28T10:00:00+05:30"));

      const req = {
        path: "/api/events",
        headers: { authorization: `Bearer ${token}` },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await rolloutMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.rollout).toBeDefined();
      expect(req.rollout.allowed).toBe(true);
      expect(res.status).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 4. FORMATTING & HELPER TESTS
  // =========================================================================
  describe("Utility & Helper Functions", () => {
    it("formatRolloutDate should format IST date strings cleanly", () => {
      const formatted = formatRolloutDate("2026-09-27T00:00:00+05:30");
      expect(formatted).toBe("27 September 2026");

      expect(formatRolloutDate(null)).toBe("Date to be announced");
      expect(formatRolloutDate("invalid-date")).toBe("Date to be announced");
    });

    it("isEarlyAccessEmail should accurately test allowlist inclusion", () => {
      const list = ["lead1@nitj.ac.in", "lead2@nitj.ac.in"];
      expect(isEarlyAccessEmail("lead1@nitj.ac.in", list)).toBe(true);
      expect(isEarlyAccessEmail("  LEAD1@NITJ.AC.IN  ", list)).toBe(true);
      expect(isEarlyAccessEmail("other@nitj.ac.in", list)).toBe(false);
      expect(isEarlyAccessEmail("", list)).toBe(false);
      expect(isEarlyAccessEmail(null, list)).toBe(false);
    });
  });
});
