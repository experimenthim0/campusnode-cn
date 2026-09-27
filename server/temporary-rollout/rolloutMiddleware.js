/**
 * server/temporary-rollout/rolloutMiddleware.js
 * 
 * Express middleware enforcing server-side rollout gating on application APIs.
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Hard off switch: If ROLLOUT_CONFIG.enabled is false, calls next() immediately.
 * 2. Auth routes (/api/auth/*) and identity checks (/api/users/me) remain accessible.
 * 3. Application routes (/api/events, /api/clubs, /api/participation, etc.) are protected.
 * 4. Bypassing frontend does not bypass backend: unauthorized direct API calls receive 403.
 */

import jwt from "jsonwebtoken";
import { isRolloutEnabled } from "./config.js";
import { evaluateRolloutAccess } from "./rolloutService.js";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extracts JWT token from Authorization header or cookies.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  if (authHeader) return authHeader;
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

/**
 * Checks if a requested path is exempt from rollout access restrictions.
 * Auth-critical paths, health endpoints, and identity reads MUST remain accessible.
 *
 * @param {string} path
 * @returns {boolean}
 */
function isExemptPath(path) {
  if (!path) return false;
  const p = path.toLowerCase();

  // Root and system health
  if (p === "/" || p === "/health") return true;

  // Public QR keys
  if (p.startsWith("/api/keys")) return true;

  // All authentication, registration, email verification, and recovery endpoints
  if (p.startsWith("/api/auth")) return true;

  // Current session profile read — needed so client AuthContext can load user identity
  if (p === "/api/users/me") return true;

  // Rollout status endpoint
  if (p === "/api/rollout/status") return true;

  return false;
}

/**
 * Express middleware for temporary launch rollout gating.
 */
export async function rolloutMiddleware(req, res, next) {
  // ── HARD OFF SWITCH ──
  // When disabled, transparent pass-through with zero processing
  if (!isRolloutEnabled()) {
    return next();
  }

  // Handle dedicated status endpoint directly
  if (req.path === "/api/rollout/status") {
    const token = extractToken(req);
    let user = null;
    if (token && JWT_SECRET) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch {
        // Invalid token; proceed with null user
      }
    }
    const status = await evaluateRolloutAccess(user);
    return res.json({
      success: true,
      rollout: status,
    });
  }

  // Exempt endpoints bypass rollout gating
  if (isExemptPath(req.path)) {
    return next();
  }

  // For non-exempt application routes, identify the user
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      code: "ROLLOUT_AUTH_REQUIRED",
      message: "Authentication is required to access CampusNode during phased launch rollout.",
    });
  }

  let decodedUser;
  try {
    decodedUser = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Invalid or expired authentication session.",
    });
  }

  try {
    const rollout = await evaluateRolloutAccess(decodedUser);
    if (!rollout.allowed) {
      return res.status(403).json({
        success: false,
        code: "ROLLOUT_ACCESS_DENIED",
        rolloutBlocked: true,
        message: rollout.message,
        rollout: {
          stage: rollout.stage,
          group: rollout.group,
          availableDate: rollout.availableDate,
          availableDateFormatted: rollout.availableDateFormatted,
        },
      });
    }

    req.rollout = rollout;
    next();
  } catch (error) {
    console.error("[RolloutMiddleware] Error evaluating rollout access:", error);
    next(error);
  }
}
