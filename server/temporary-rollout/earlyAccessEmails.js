/**
 * server/temporary-rollout/earlyAccessEmails.js
 * 
 * Temporary Early Access Allowlist for Student Club Leads/Heads.
 * 
 * This file contains official institutional email addresses (@nitj.ac.in)
 * supplied by the college administration for current Student Club Leads/Heads.
 * 
 * CRITICAL RULES:
 * 1. An email listed here ONLY bypasses the rollout schedule.
 * 2. It does NOT automatically grant Student Lead or Club Head permissions.
 * 3. It does NOT grant administrative roles or bypass standard institutional
 *    email verification, password validation, or existing RBAC.
 * 4. Club leadership is assigned strictly after account creation through the
 *    existing admin club workflow.
 * 5. Do NOT invent or add fake emails here. The list is populated directly
 *    from the college administration's official list.
 */

export const EARLY_ACCESS_EMAILS = [
  // Official club-lead institutional emails supplied by college administration.
  "nikhily.ce.24@nitj.ac.in",
  "ajeety.ce.24@nij.ac.in",
  "yashs.cs.24@nitj.ac.in",
];
