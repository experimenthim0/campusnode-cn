/**
 * academicProgress.js
 * Centralized, authoritative utility for calculating dynamic student academic progress
 * (Academic Year, Semester, Academic Status) and evaluating Event/Team eligibility.
 * 
 * Formula:
 *   Program Duration + Expected Graduation Year + Current Date
 *     => Academic Year (1..maxDuration) + Semester (1..maxDuration*2) + Academic Status
 */

import { getMaxDurationForProgram } from "../constants/academicConstants.js";

/**
 * Normalizes any year representation (e.g. 1, "1", "1st Year", "2nd Year", "Third Year")
 * into a standard integer (1..6), or null if unrecognized.
 * 
 * @param {string|number} yearVal
 * @returns {number|null}
 */
export function normalizeYearToNumber(yearVal) {
  if (yearVal === null || yearVal === undefined || yearVal === "") return null;
  if (typeof yearVal === "number") {
    return Number.isInteger(yearVal) && yearVal > 0 ? yearVal : null;
  }

  const str = String(yearVal).trim().toLowerCase();

  // Match direct integer strings like "1", "2"
  const directNum = parseInt(str, 10);
  if (!isNaN(directNum) && directNum > 0 && directNum <= 10) {
    return directNum;
  }

  // Match ordinal / label formats
  if (str.includes("1st") || str.includes("first") || str === "year 1" || str === "year1") return 1;
  if (str.includes("2nd") || str.includes("second") || str === "year 2" || str === "year2") return 2;
  if (str.includes("3rd") || str.includes("third") || str === "year 3" || str === "year3") return 3;
  if (str.includes("4th") || str.includes("fourth") || str === "year 4" || str === "year4") return 4;
  if (str.includes("5th") || str.includes("fifth") || str === "year 5" || str === "year5") return 5;
  if (str.includes("6th") || str.includes("sixth") || str === "year 6" || str === "year6") return 6;

  return null;
}

/**
 * Formats a numeric academic year into its standard human-readable display string.
 * @param {number} yearNum - e.g. 1, 2, 3, 4
 * @returns {string} - e.g. "1st Year", "2nd Year", "3rd Year", "4th Year"
 */
export function formatAcademicYear(yearNum) {
  const num = parseInt(yearNum, 10);
  if (isNaN(num) || num <= 0) return "N/A";
  if (num === 1) return "1st Year";
  if (num === 2) return "2nd Year";
  if (num === 3) return "3rd Year";
  return `${num}th Year`;
}

/**
 * Formats a numeric semester into its display string.
 * @param {number} semNum - e.g. 1, 2, 3, 4, 5
 * @returns {string} - e.g. "Semester 1", "Semester 5"
 */
export function formatSemester(semNum) {
  const num = parseInt(semNum, 10);
  if (isNaN(num) || num <= 0) return "N/A";
  return `Semester ${num}`;
}

/**
 * Calculates authoritative academic progress for a student.
 * 
 * @param {Object} student - Student record containing { program, expectedGraduationYear, year? }
 * @param {Date} [currentDate=new Date()] - Reference date for calculation
 * @returns {{
 *   academicYear: number,
 *   academicYearLabel: string,
 *   semester: number,
 *   semesterLabel: string,
 *   academicStatus: "ACTIVE" | "GRADUATED" | "UNKNOWN",
 *   isGraduated: boolean,
 *   expectedGraduationYear: number|null
 * }}
 */
export function calculateAcademicProgress(student = {}, currentDate = new Date()) {
  const { program, expectedGraduationYear, year: yearFallback } = student || {};

  const maxDuration = getMaxDurationForProgram(program);
  const now = currentDate instanceof Date && !isNaN(currentDate) ? currentDate : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 to 12 (Jan = 1, Dec = 12)

  // In Indian & NIT universities, academic session starts in July (Month 7).
  // E.g. Aug 2026 -> Session 2026-27 (sessionStartYear = 2026, Odd Semester)
  // E.g. Feb 2027 -> Session 2026-27 (sessionStartYear = 2026, Even Semester)
  const sessionStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  const isOddSemester = currentMonth >= 7;

  const gradYear = expectedGraduationYear ? parseInt(expectedGraduationYear, 10) : null;

  // 1. If graduation year is provided and valid:
  if (gradYear && !isNaN(gradYear)) {
    // Remaining academic years until graduation
    // For a student graduating in 2028:
    // In session 2026-27: yearsRemaining = 2028 - (2026 + 1) = 1 year remaining
    // Academic Year = 4 (duration) - 1 = 3 (3rd Year)
    const yearsRemaining = gradYear - (sessionStartYear + 1);
    let calculatedYear = maxDuration - yearsRemaining;

    // Graduated case: graduation session is in the past
    if (yearsRemaining < 0 || calculatedYear > maxDuration) {
      return {
        academicYear: maxDuration,
        academicYearLabel: "Graduated",
        semester: maxDuration * 2,
        semesterLabel: "Graduated",
        academicStatus: "GRADUATED",
        isGraduated: true,
        expectedGraduationYear: gradYear,
      };
    }

    // Pre-admission case: student entered a future graduation year beyond duration
    if (calculatedYear <= 0) {
      calculatedYear = 1;
    }

    // Clamp to valid range [1..maxDuration]
    const academicYear = Math.min(Math.max(calculatedYear, 1), maxDuration);
    const semester = isOddSemester ? (academicYear * 2) - 1 : academicYear * 2;

    return {
      academicYear,
      academicYearLabel: formatAcademicYear(academicYear),
      semester,
      semesterLabel: formatSemester(semester),
      academicStatus: "ACTIVE",
      isGraduated: false,
      expectedGraduationYear: gradYear,
    };
  }

  // 2. Fallback: Parse legacy yearFallback if expectedGraduationYear is not set
  if (yearFallback) {
    const parsedYear = normalizeYearToNumber(yearFallback);
    if (parsedYear) {
      const academicYear = Math.min(Math.max(parsedYear, 1), maxDuration);
      const semester = isOddSemester ? (academicYear * 2) - 1 : academicYear * 2;
      // Infer expected graduation year for convenience
      const inferredGradYear = sessionStartYear + 1 + (maxDuration - academicYear);

      return {
        academicYear,
        academicYearLabel: formatAcademicYear(academicYear),
        semester,
        semesterLabel: formatSemester(semester),
        academicStatus: "ACTIVE",
        isGraduated: false,
        expectedGraduationYear: inferredGradYear,
      };
    }
  }

  // 3. Fallback for uninitialized/incomplete records
  return {
    academicYear: 1,
    academicYearLabel: "1st Year",
    semester: 1,
    semesterLabel: "Semester 1",
    academicStatus: "UNKNOWN",
    isGraduated: false,
    expectedGraduationYear: null,
  };
}

/**
 * Validates whether a student is eligible for an event based on allowedYears.
 * 
 * Supports both legacy string arrays (e.g. ["1st Year", "2nd Year"])
 * and modern numeric arrays (e.g. [1, 2] or ["1", "2"]).
 * 
 * @param {Object} student - Student record
 * @param {Array<string|number>} allowedYears - Array of allowed years on Event
 * @param {Date} [currentDate=new Date()] - Reference date
 * @returns {boolean}
 */
export function isStudentEligibleForEventYears(student, allowedYears, currentDate = new Date()) {
  if (!allowedYears || !Array.isArray(allowedYears) || allowedYears.length === 0) {
    return true; // No year restriction = all years eligible
  }

  const normalizedAllowed = allowedYears
    .map(normalizeYearToNumber)
    .filter((n) => n !== null);

  if (normalizedAllowed.length === 0) {
    return true; // Unrecognized/empty restrictions = unrestricted
  }

  const progress = calculateAcademicProgress(student, currentDate);

  if (progress.isGraduated) {
    return false; // Graduated students are ineligible for active academic year restricted events
  }

  return normalizedAllowed.includes(progress.academicYear);
}
