/**
 * server/temporary-rollout/config.js
 * Centralized configuration for the temporary CampusNode launch rollout.
 * 
 * TIMEZONE: All rollout dates are evaluated in Indian Standard Time (IST, UTC+05:30).
 *
 * HARD OFF SWITCH:
 * When CAMPUSNODE_ROLLOUT_ENABLED is false (or not set), the entire rollout module
 * behaves as if it does not exist. Development and testing run with zero restrictions.
 */

export const ROLLOUT_CONFIG = {
  // Hard master toggle: enabled only when explicit environment variable is "true"
  enabled: process.env.CAMPUSNODE_ROLLOUT_ENABLED === "true",

  // Centralized stage schedule (ISO 8601 strings with timezone +05:30)
  // Stage 0 is fixed for launch start (27 September 2026).
  // Stages 1-4 are configurable; dates not yet finalized default to null.
  schedule: {
    // Stage 0 — Launch Day: 27 September 2026
    // Available: Administration, Faculty, and Early-Access Student Club Leads
    stage0FacultyAndAdmin: process.env.ROLLOUT_DATE_STAGE_0 || "2026-09-27T00:00:00+05:30",

    // Stage 1 — B.Tech 3rd & 4th Year
    // Configure when finalized by college administration (e.g. "2026-09-28T09:00:00+05:30")
    stage1BTech34: process.env.ROLLOUT_DATE_STAGE_1 || null,

    // Stage 2 — B.Tech 1st & 2nd Year
    // Configure when finalized by college administration
    stage2BTech12: process.env.ROLLOUT_DATE_STAGE_2 || null,

    // Stage 3 — M.Tech (All Years)
    // Configure when finalized by college administration
    stage3MTech: process.env.ROLLOUT_DATE_STAGE_3 || null,

    // Stage 4 — All Remaining Eligible Programs & External Users
    // Configure when finalized by college administration
    stage4Remaining: process.env.ROLLOUT_DATE_STAGE_4 || null,
  },
};

/**
 * Returns true if the temporary rollout module is actively enabled.
 * Defaults to false if CAMPUSNODE_ROLLOUT_ENABLED is not explicitly "true".
 *
 * @returns {boolean}
 */
export function isRolloutEnabled() {
  return process.env.CAMPUSNODE_ROLLOUT_ENABLED === "true";
}
