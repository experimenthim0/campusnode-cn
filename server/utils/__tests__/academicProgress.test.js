import { describe, it, expect } from "vitest";
import {
  calculateAcademicProgress,
  normalizeYearToNumber,
  formatAcademicYear,
  formatSemester,
  isStudentEligibleForEventYears,
} from "../academicProgress.js";

describe("academicProgress utility", () => {
  describe("normalizeYearToNumber", () => {
    it("normalizes numbers and string numbers", () => {
      expect(normalizeYearToNumber(1)).toBe(1);
      expect(normalizeYearToNumber("1")).toBe(1);
      expect(normalizeYearToNumber(4)).toBe(4);
      expect(normalizeYearToNumber("4")).toBe(4);
    });

    it("normalizes ordinal strings", () => {
      expect(normalizeYearToNumber("1st Year")).toBe(1);
      expect(normalizeYearToNumber("2nd Year")).toBe(2);
      expect(normalizeYearToNumber("3rd Year")).toBe(3);
      expect(normalizeYearToNumber("4th Year")).toBe(4);
      expect(normalizeYearToNumber("5th Year")).toBe(5);
    });

    it("normalizes words and variations", () => {
      expect(normalizeYearToNumber("first")).toBe(1);
      expect(normalizeYearToNumber("Second Year")).toBe(2);
      expect(normalizeYearToNumber("year 3")).toBe(3);
      expect(normalizeYearToNumber("YEAR4")).toBe(4);
    });

    it("returns null for invalid inputs", () => {
      expect(normalizeYearToNumber(null)).toBeNull();
      expect(normalizeYearToNumber("")).toBeNull();
      expect(normalizeYearToNumber("invalid")).toBeNull();
      expect(normalizeYearToNumber(0)).toBeNull();
      expect(normalizeYearToNumber(-1)).toBeNull();
    });
  });

  describe("formatAcademicYear and formatSemester", () => {
    it("formats year numbers correctly", () => {
      expect(formatAcademicYear(1)).toBe("1st Year");
      expect(formatAcademicYear(2)).toBe("2nd Year");
      expect(formatAcademicYear(3)).toBe("3rd Year");
      expect(formatAcademicYear(4)).toBe("4th Year");
      expect(formatAcademicYear(5)).toBe("5th Year");
    });

    it("formats semesters correctly", () => {
      expect(formatSemester(1)).toBe("Semester 1");
      expect(formatSemester(5)).toBe("Semester 5");
      expect(formatSemester(8)).toBe("Semester 8");
    });
  });

  describe("calculateAcademicProgress - B.Tech (4 Years)", () => {
    // Current date: Aug 15, 2026 -> Academic Session 2026-27 (Odd Semester)
    const aug2026 = new Date(2026, 7, 15); // Month 7 is August (0-indexed in JS Date: 0=Jan, 7=Aug)

    it("calculates 1st Year (Sem 1) for 2030 graduation", () => {
      const result = calculateAcademicProgress(
        { program: "BTECH", expectedGraduationYear: 2030 },
        aug2026
      );
      expect(result.academicYear).toBe(1);
      expect(result.academicYearLabel).toBe("1st Year");
      expect(result.semester).toBe(1);
      expect(result.semesterLabel).toBe("Semester 1");
      expect(result.isGraduated).toBe(false);
      expect(result.academicStatus).toBe("ACTIVE");
    });

    it("calculates 2nd Year (Sem 3) for 2029 graduation", () => {
      const result = calculateAcademicProgress(
        { program: "BTECH", expectedGraduationYear: 2029 },
        aug2026
      );
      expect(result.academicYear).toBe(2);
      expect(result.academicYearLabel).toBe("2nd Year");
      expect(result.semester).toBe(3);
      expect(result.semesterLabel).toBe("Semester 3");
      expect(result.isGraduated).toBe(false);
    });

    it("calculates 3rd Year (Sem 5) for 2028 graduation", () => {
      const result = calculateAcademicProgress(
        { program: "BTECH", expectedGraduationYear: 2028 },
        aug2026
      );
      expect(result.academicYear).toBe(3);
      expect(result.academicYearLabel).toBe("3rd Year");
      expect(result.semester).toBe(5);
      expect(result.semesterLabel).toBe("Semester 5");
      expect(result.isGraduated).toBe(false);
    });

    it("calculates 4th Year (Sem 7) for 2027 graduation", () => {
      const result = calculateAcademicProgress(
        { program: "BTECH", expectedGraduationYear: 2027 },
        aug2026
      );
      expect(result.academicYear).toBe(4);
      expect(result.academicYearLabel).toBe("4th Year");
      expect(result.semester).toBe(7);
      expect(result.semesterLabel).toBe("Semester 7");
      expect(result.isGraduated).toBe(false);
    });

    it("calculates Even Semesters in Spring (e.g. Feb 2027)", () => {
      const feb2027 = new Date(2027, 1, 15); // Month 1 is Feb -> Session 2026-27 Even Sem
      const result = calculateAcademicProgress(
        { program: "BTECH", expectedGraduationYear: 2028 },
        feb2027
      );
      expect(result.academicYear).toBe(3);
      expect(result.academicYearLabel).toBe("3rd Year");
      expect(result.semester).toBe(6);
      expect(result.semesterLabel).toBe("Semester 6");
      expect(result.isGraduated).toBe(false);
    });

    it("flags Graduated students when graduation year has passed", () => {
      const result = calculateAcademicProgress(
        { program: "BTECH", expectedGraduationYear: 2026 },
        aug2026 // In Aug 2026, 2026 batch has already graduated
      );
      expect(result.isGraduated).toBe(true);
      expect(result.academicStatus).toBe("GRADUATED");
      expect(result.academicYearLabel).toBe("Graduated");
    });
  });

  describe("calculateAcademicProgress - M.Tech (2 Years)", () => {
    const aug2026 = new Date(2026, 7, 15);

    it("calculates 1st Year (Sem 1) for 2028 graduation", () => {
      const result = calculateAcademicProgress(
        { program: "MTECH", expectedGraduationYear: 2028 },
        aug2026
      );
      expect(result.academicYear).toBe(1);
      expect(result.academicYearLabel).toBe("1st Year");
      expect(result.semester).toBe(1);
    });

    it("calculates 2nd Year (Sem 3) for 2027 graduation", () => {
      const result = calculateAcademicProgress(
        { program: "MTECH", expectedGraduationYear: 2027 },
        aug2026
      );
      expect(result.academicYear).toBe(2);
      expect(result.academicYearLabel).toBe("2nd Year");
      expect(result.semester).toBe(3);
    });
  });

  describe("calculateAcademicProgress - Legacy fallback", () => {
    it("correctly falls back to parsing year string if expectedGraduationYear is missing", () => {
      const result = calculateAcademicProgress({
        program: "BTECH",
        year: "3rd Year",
      });
      expect(result.academicYear).toBe(3);
      expect(result.academicYearLabel).toBe("3rd Year");
      expect(result.isGraduated).toBe(false);
    });
  });

  describe("isStudentEligibleForEventYears", () => {
    const aug2026 = new Date(2026, 7, 15);
    const thirdYearStudent = {
      program: "BTECH",
      expectedGraduationYear: 2028,
    };

    it("allows all students when allowedYears is empty", () => {
      expect(isStudentEligibleForEventYears(thirdYearStudent, [], aug2026)).toBe(true);
      expect(isStudentEligibleForEventYears(thirdYearStudent, null, aug2026)).toBe(true);
    });

    it("allows student when academic year is in numeric allowedYears array", () => {
      expect(isStudentEligibleForEventYears(thirdYearStudent, [2, 3], aug2026)).toBe(true);
      expect(isStudentEligibleForEventYears(thirdYearStudent, ["3"], aug2026)).toBe(true);
    });

    it("allows student when academic year is in legacy string allowedYears array", () => {
      expect(
        isStudentEligibleForEventYears(thirdYearStudent, ["2nd Year", "3rd Year"], aug2026)
      ).toBe(true);
    });

    it("rejects student when academic year is not in allowedYears", () => {
      expect(isStudentEligibleForEventYears(thirdYearStudent, [1, 2], aug2026)).toBe(false);
      expect(
        isStudentEligibleForEventYears(thirdYearStudent, ["1st Year", "2nd Year"], aug2026)
      ).toBe(false);
    });

    it("rejects graduated students for year-restricted events", () => {
      const graduatedStudent = {
        program: "BTECH",
        expectedGraduationYear: 2025,
      };
      expect(isStudentEligibleForEventYears(graduatedStudent, [1, 2, 3, 4], aug2026)).toBe(false);
    });
  });
});
