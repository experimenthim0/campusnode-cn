/**
 * server/temporary-rollout/index.js
 * 
 * Entry point for the CampusNode temporary launch rollout module.
 * Grouped in one isolated folder for easy post-launch removal.
 */

export { ROLLOUT_CONFIG, isRolloutEnabled } from "./config.js";
export { EARLY_ACCESS_EMAILS } from "./earlyAccessEmails.js";
export { evaluateRolloutAccess, formatRolloutDate, isEarlyAccessEmail } from "./rolloutService.js";
export { rolloutMiddleware } from "./rolloutMiddleware.js";
