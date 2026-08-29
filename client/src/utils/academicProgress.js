/**
 * academicProgress.js (Client)
 * Helper utilities for calculating and formatting student academic progress
 * (Academic Year, Semester, and Graduation Year options) for UI components.
 */

import { getMaxDurationForProgram } from "../constants/academicConstants";

/**
 * Normalizes any year representation into an integer (1..6) or null.
 * @param {string|number} yearVal
 * @returns {number|null}
 */
export function normalizeYearToNumber(yearVal) {
  if (yearVal === null || yearVal === undefined || yearVal === "") return null;
  if (typeof yearVal === "number") {
    return Number.isInteger(yearVal) && yearVal > 0 ? yearVal : null;
  }

  const str = String(yearVal).trim().toLowerCase();
  const directNum = parseInt(str, 10);
  if (!isNaN(directNum) && directNum > 0 && directNum <= 10) return directNum;

  if (str.includes("1st") || str.includes("first")) return 1;
  if (str.includes("2nd") || str.includes("second")) return 2;
  if (str.includes("3rd") || str.includes("third")) return 3;
  if (str.includes("4th") || str.includes("fourth")) return 4;
  if (str.includes("5th") || str.includes("fifth")) return 5;
  if (str.includes("6th") || str.includes("sixth")) return 6;

  return null;
}

/**
 * Formats a numeric academic year into display text.
 * @param {number} yearNum
 * @returns {string}
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
 * Formats a numeric semester into display text.
 * @param {number} semNum
 * @returns {string}
 */
export function formatSemester(semNum) {
  const num = parseInt(semNum, 10);
  if (isNaN(num) || num <= 0) return "N/A";
  return `Semester ${num}`;
}

/**
 * Calculates student academic progress relative to current date and program duration.
 * @param {Object} params
 * @param {string} params.program - e.g. "BTECH", "MTECH", "OTHER"
 * @param {number|string} params.expectedGraduationYear - e.g. 2028
 * @param {string} [params.year] - fallback legacy string
 * @param {Date} [params.currentDate=new Date()]
 * @returns {{
 *   academicYear: number,
 *   academicYearLabel: string,
 *   semester: number,
 *   semesterLabel: string,
 *   academicStatus: string,
 *   isGraduated: boolean
 * }}
 */
export function calculateAcademicProgress({
  program = "BTECH",
  expectedGraduationYear,
  year: yearFallback,
  currentDate = new Date(),
} = {}) {
  const maxDuration = getMaxDurationForProgram(program);
  const now = currentDate instanceof Date && !isNaN(currentDate) ? currentDate : new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const sessionStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  const isOddSemester = currentMonth >= 7;

  const gradYear = expectedGraduationYear ? parseInt(expectedGraduationYear, 10) : null;

  if (gradYear && !isNaN(gradYear)) {
    const yearsRemaining = gradYear - (sessionStartYear + 1);
    let calculatedYear = maxDuration - yearsRemaining;

    if (yearsRemaining < 0 || calculatedYear > maxDuration) {
      return {
        academicYear: maxDuration,
        academicYearLabel: "Graduated",
        semester: maxDuration * 2,
        semesterLabel: "Graduated",
        academicStatus: "GRADUATED",
        isGraduated: true,
      };
    }

    if (calculatedYear <= 0) {
      calculatedYear = 1;
    }

    const academicYear = Math.min(Math.max(calculatedYear, 1), maxDuration);
    const semester = isOddSemester ? (academicYear * 2) - 1 : academicYear * 2;

    return {
      academicYear,
      academicYearLabel: formatAcademicYear(academicYear),
      semester,
      semesterLabel: formatSemester(semester),
      academicStatus: "ACTIVE",
      isGraduated: false,
    };
  }

  if (yearFallback) {
    const parsed = normalizeYearToNumber(yearFallback);
    if (parsed) {
      const academicYear = Math.min(Math.max(parsed, 1), maxDuration);
      const semester = isOddSemester ? (academicYear * 2) - 1 : academicYear * 2;
      return {
        academicYear,
        academicYearLabel: formatAcademicYear(academicYear),
        semester,
        semesterLabel: formatSemester(semester),
        academicStatus: "ACTIVE",
        isGraduated: false,
      };
    }
  }

  return {
    academicYear: 1,
    academicYearLabel: "1st Year",
    semester: 1,
    semesterLabel: "Semester 1",
    academicStatus: "ACTIVE",
    isGraduated: false,
  };
}

/**
 * Generates options for expected graduation year dropdowns with dynamic previews.
 * @param {string} [program="BTECH"]
 * @returns {Array<{ gradYear: string, label: string, academicYear: string, semester: string }>}
 */
export function getGraduationYearOptions(program = "BTECH") {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const sessionStart = currentMonth >= 7 ? currentYear : currentYear - 1;

  const maxDuration = getMaxDurationForProgram(program);
  const options = [];

  for (let y = sessionStart + maxDuration; y >= sessionStart; y--) {
    const progress = calculateAcademicProgress({
      program,
      expectedGraduationYear: y,
    });
    options.push({
      gradYear: y.toString(),
      label: y.toString(),
      academicYear: progress.academicYearLabel,
      semester: progress.semesterLabel,
    });
  }

  return options;
}
