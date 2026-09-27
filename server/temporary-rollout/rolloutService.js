/**
 * server/temporary-rollout/rolloutService.js
 * 
 * Core evaluation engine for CampusNode temporary launch rollout.
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Hard off switch: If ROLLOUT_CONFIG.enabled is false, returns allowed: true immediately.
 * 2. Uses trusted database identity only. Never trusts client-side headers or state.
 * 3. Early access student emails bypass stage timing only, entering at Stage 0.
 * 4. Normal student evaluation uses program and expectedGraduationYear via calculateAcademicProgress.
 * 5. Timezone: Indian Standard Time (Asia/Kolkata, UTC+05:30).
 */

import prisma from "../lib/prisma.js";
import { ROLLOUT_CONFIG, isRolloutEnabled } from "./config.js";
import { EARLY_ACCESS_EMAILS } from "./earlyAccessEmails.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";

/**
 * Formats a Date or ISO string into a human-readable Indian Standard Time date string.
 * e.g., "27 September 2026"
 *
 * @param {string|Date|null} dateVal
 * @returns {string}
 */
export function formatRolloutDate(dateVal) {
  if (!dateVal) return "Date to be announced";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "Date to be announced";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "Date to be announced";
  }
}

/**
 * Checks whether an email is in the official early-access allowlist.
 * Case-insensitive, whitespace-trimmed comparison.
 *
 * @param {string} email
 * @param {string[]} [customList] - Optional allowlist for testing
 * @returns {boolean}
 */
export function isEarlyAccessEmail(email, customList = null) {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  const list = Array.isArray(customList) ? customList : EARLY_ACCESS_EMAILS;
  return list.some((item) => typeof item === "string" && item.trim().toLowerCase() === clean);
}

/**
 * Evaluates whether a user identity is permitted application access under
 * the current rollout stage.
 *
 * @param {object} user - User record (must be trusted server identity)
 * @param {object} [options]
 * @param {Date} [options.referenceDate] - Custom evaluation timestamp (defaults to new Date())
 * @param {string[]} [options.earlyAccessList] - Custom early access email list (for testing)
 * @param {object} [options.schedule] - Custom stage schedule override (for testing)
 * @returns {Promise<{
 *   enabled: boolean,
 *   allowed: boolean,
 *   stage: number,
 *   group: string,
 *   availableDate: string|null,
 *   availableDateFormatted: string,
 *   isEarlyAccess: boolean,
 *   message: string,
 *   reason?: string
 * }>}
 */
export async function evaluateRolloutAccess(user, options = {}) {
  // ── HARD OFF SWITCH ──
  // If rollout is disabled, immediately grant access with zero checks.
  if (!isRolloutEnabled()) {
    return {
      enabled: false,
      allowed: true,
      stage: -1,
      group: "Rollout Inactive",
      availableDate: null,
      availableDateFormatted: "N/A",
      isEarlyAccess: false,
      message: "Temporary rollout is disabled.",
      reason: "ROLLOUT_DISABLED",
    };
  }

  if (!user) {
    return {
      enabled: true,
      allowed: false,
      stage: 0,
      group: "Unauthenticated",
      availableDate: null,
      availableDateFormatted: "Authentication Required",
      isEarlyAccess: false,
      message: "Please sign in to access CampusNode.",
      reason: "UNAUTHENTICATED",
    };
  }

  const now = options.referenceDate instanceof Date && !isNaN(options.referenceDate)
    ? options.referenceDate
    : new Date();

  const schedule = options.schedule || ROLLOUT_CONFIG.schedule;
  const userEmail = (user.email || "").trim().toLowerCase();

  // 1. EARLY ACCESS ALLOWLIST CHECK (Student Club Leads / Heads)
  const isEarlyAccess = isEarlyAccessEmail(userEmail, options.earlyAccessList);
  if (isEarlyAccess) {
    const stage0Date = schedule.stage0FacultyAndAdmin;
    const isAvailable = stage0Date ? now >= new Date(stage0Date) : false;
    return {
      enabled: true,
      allowed: isAvailable,
      stage: 0,
      group: "Student Club Lead (Early Access)",
      availableDate: stage0Date,
      availableDateFormatted: formatRolloutDate(stage0Date),
      isEarlyAccess: true,
      message: isAvailable
        ? "Early access granted."
        : `Your early access begins on ${formatRolloutDate(stage0Date)}.`,
    };
  }

  // 2. ADMINISTRATION
  const isAdmin =
    user.principalType === "ADMIN" ||
    user.userType === "admin" ||
    user.role === "admin" ||
    user.role === "paymentAdmin";

  if (isAdmin) {
    const stage0Date = schedule.stage0FacultyAndAdmin;
    const isAvailable = stage0Date ? now >= new Date(stage0Date) : false;
    return {
      enabled: true,
      allowed: isAvailable,
      stage: 0,
      group: "Administration",
      availableDate: stage0Date,
      availableDateFormatted: formatRolloutDate(stage0Date),
      isEarlyAccess: false,
      message: isAvailable
        ? "Administrative access granted."
        : `Administration access opens on ${formatRolloutDate(stage0Date)}.`,
    };
  }

  // 3. FACULTY & FACULTY COORDINATORS
  const isFaculty =
    user.principalType === "FACULTY" ||
    user.userType === "faculty" ||
    user.role === "faculty" ||
    user.role === "facultyCoordinator";

  if (isFaculty) {
    const stage0Date = schedule.stage0FacultyAndAdmin;
    const isAvailable = stage0Date ? now >= new Date(stage0Date) : false;
    return {
      enabled: true,
      allowed: isAvailable,
      stage: 0,
      group: "Faculty",
      availableDate: stage0Date,
      availableDateFormatted: formatRolloutDate(stage0Date),
      isEarlyAccess: false,
      message: isAvailable
        ? "Faculty access granted."
        : `Faculty access opens on ${formatRolloutDate(stage0Date)}.`,
    };
  }

  // 4. EXTERNAL USERS
  const isExternal =
    user.principalType === "EXTERNAL" ||
    user.userType === "external" ||
    user.role === "external";

  if (isExternal) {
    const stage4Date = schedule.stage4Remaining;
    const isAvailable = stage4Date ? now >= new Date(stage4Date) : false;
    return {
      enabled: true,
      allowed: isAvailable,
      stage: 4,
      group: "External Participants",
      availableDate: stage4Date,
      availableDateFormatted: formatRolloutDate(stage4Date),
      isEarlyAccess: false,
      message: isAvailable
        ? "Access granted."
        : `External participant access will be available from ${formatRolloutDate(stage4Date)}.`,
    };
  }

  // 5. STUDENT USER DOMAIN
  // Resolve program and expectedGraduationYear from database if missing on input object
  let studentData = user;
  if (!studentData.program || studentData.expectedGraduationYear === undefined) {
    const userId = user.userId || user.studentId || user.id;
    if (userId) {
      try {
        const dbStudent = await prisma.studentUser.findUnique({
          where: { id: userId },
          select: { program: true, expectedGraduationYear: true },
        });
        if (dbStudent) {
          studentData = { ...user, ...dbStudent };
        }
      } catch (err) {
        console.error("[RolloutService] Failed to look up student academic data:", err.message);
      }
    }
  }

  const rawProgram = (studentData.program || "").trim().toUpperCase();
  const progress = calculateAcademicProgress(studentData, now);
  const academicYear = progress.academicYear;

  // Stage 1 & Stage 2: B.Tech students
  if (rawProgram === "BTECH" || rawProgram === "B.TECH") {
    if (academicYear >= 3) {
      // Stage 1: B.Tech 3rd & 4th year
      const stage1Date = schedule.stage1BTech34;
      const isAvailable = stage1Date ? now >= new Date(stage1Date) : false;
      return {
        enabled: true,
        allowed: isAvailable,
        stage: 1,
        group: "B.Tech 3rd & 4th Year",
        availableDate: stage1Date,
        availableDateFormatted: formatRolloutDate(stage1Date),
        isEarlyAccess: false,
        message: isAvailable
          ? "Access granted."
          : `CampusNode access for B.Tech 3rd & 4th Year will be available from ${formatRolloutDate(stage1Date)}.`,
      };
    } else {
      // Stage 2: B.Tech 1st & 2nd year
      const stage2Date = schedule.stage2BTech12;
      const isAvailable = stage2Date ? now >= new Date(stage2Date) : false;
      return {
        enabled: true,
        allowed: isAvailable,
        stage: 2,
        group: "B.Tech 1st & 2nd Year",
        availableDate: stage2Date,
        availableDateFormatted: formatRolloutDate(stage2Date),
        isEarlyAccess: false,
        message: isAvailable
          ? "Access granted."
          : `CampusNode access for B.Tech 1st & 2nd Year will be available from ${formatRolloutDate(stage2Date)}.`,
      };
    }
  }

  // Stage 3: M.Tech students
  if (rawProgram === "MTECH" || rawProgram === "M.TECH") {
    const stage3Date = schedule.stage3MTech;
    const isAvailable = stage3Date ? now >= new Date(stage3Date) : false;
    return {
      enabled: true,
      allowed: isAvailable,
      stage: 3,
      group: "M.Tech",
      availableDate: stage3Date,
      availableDateFormatted: formatRolloutDate(stage3Date),
      isEarlyAccess: false,
      message: isAvailable
        ? "Access granted."
        : `CampusNode access for M.Tech students will be available from ${formatRolloutDate(stage3Date)}.`,
    };
  }

  // Stage 4: All remaining eligible programs (MSC, MBA, PHD, OTHER, etc.)
  const stage4Date = schedule.stage4Remaining;
  const isAvailable = stage4Date ? now >= new Date(stage4Date) : false;
  const groupLabel = rawProgram ? `${rawProgram} Program` : "Other Programs";

  return {
    enabled: true,
    allowed: isAvailable,
    stage: 4,
    group: groupLabel,
    availableDate: stage4Date,
    availableDateFormatted: formatRolloutDate(stage4Date),
    isEarlyAccess: false,
    message: isAvailable
      ? "Access granted."
      : `CampusNode access for ${groupLabel} will be available from ${formatRolloutDate(stage4Date)}.`,
  };
}
