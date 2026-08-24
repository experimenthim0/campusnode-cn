import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
}

const normalizeClubId = (clubId) => {
  if (!clubId) return null;
  if (typeof clubId === "object") return clubId.id ?? null;
  return clubId;
};

/**
 * Generate JWT token.
 * @param {object} user - User object (must have .id and .email)
 * @param {string} role  - Role string: admin | facultyCoordinator | paymentAdmin | club | member | external
 * @param {string} userType - "student" | "admin" | "external"
 * @param {string|null} clubId - Club ID if the user is associated with a club
 */
export const generateToken = (user, role, userType = "student", clubId = null) => {
  return jwt.sign(
    {
      userId: user.id,
      role,
      email: user.email,
      clubId: normalizeClubId(clubId),
      userType,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
};

const getTokensFromRequest = (req) => {
  const tokens = [];
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) tokens.push(authHeader.slice(7));
  else if (authHeader) tokens.push(authHeader);
  if (req.cookies?.token && !tokens.includes(req.cookies.token)) tokens.push(req.cookies.token);
  return tokens;
};

const getPrimaryStudentMembership = async (studentId) => {
  const memberships = await prisma.clubMembership.findMany({ where: { studentId } });
  const managementMembership = memberships.find((m) =>
    ["CLUB_HEAD", "COORDINATOR"].includes(m.role),
  );
  return managementMembership ?? memberships[0] ?? null;
};

const getFacultyClub = async (adminId) => {
  return prisma.club.findFirst({
    where: { facultyCoordinatorId: adminId },
    select: { id: true },
  });
};

// Verify JWT token middleware
export const verifyToken = async (req, res, next) => {
  const tokens = getTokensFromRequest(req);

  if (tokens.length === 0) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    let decoded = null;
    for (const token of tokens) {
      try {
        decoded = jwt.verify(token, JWT_SECRET);
        break;
      } catch {
        // Try the next token transport for compatibility during cookie migration.
      }
    }
    if (!decoded) return res.status(401).json({ message: "Invalid or expired token." });
    const userType = decoded.userType === "admin" ? "admin" : decoded.userType === "external" ? "external" : "student";

    if (userType === "admin") {
      const admin = await prisma.adminRole.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true },
      });
      if (!admin) return res.status(401).json({ message: "Invalid or expired token." });

      const facultyClub = admin.role === "facultyCoordinator" ? await getFacultyClub(admin.id) : null;
      req.user = {
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        userType: "admin",
        clubId: facultyClub?.id ?? null,
      };
      return next();
    }

    const student = await prisma.studentUser.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, isBlocked: true, accessLevel: true },
    });
    if (!student || student.isBlocked) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    if (userType === "external") {
      req.user = {
        userId: student.id,
        email: student.email,
        role: "external",
        userType: "external",
        clubId: null,
      };
      return next();
    }

    // Central Organizer: uses existing student account with elevated accessLevel
    if (student.accessLevel === "central_organizer") {
      const memberships = await prisma.clubMembership.findMany({
        where: { studentId: student.id },
        include: { club: { select: { id: true, clubName: true, slug: true } } }
      });
      const managementMembership = memberships.find((m) =>
        ["CLUB_HEAD", "COORDINATOR"].includes(m.role),
      );
      const primary = managementMembership ?? memberships[0] ?? null;

      req.user = {
        userId: student.id,
        email: student.email,
        role: "central_organizer",
        userType: "student",
        accessLevel: "central_organizer",
        clubId: primary?.clubId ?? null,
        memberships: memberships.map((m) => ({
          clubId: m.clubId,
          clubName: m.club?.clubName,
          slug: m.club?.slug,
          role: m.role,
          canTakeAttendance: m.canTakeAttendance,
          canEditEvents: m.canEditEvents,
          permissions: {
            canTakeAttendance: m.canTakeAttendance,
            canEditEvents: m.canEditEvents,
          },
        })),
      };
      return next();
    }

    const memberships = await prisma.clubMembership.findMany({
      where: { studentId: student.id },
      include: { club: { select: { id: true, clubName: true, slug: true } } }
    });
    const managementMembership = memberships.find((m) =>
      ["CLUB_HEAD", "COORDINATOR"].includes(m.role),
    );
    const primary = managementMembership ?? memberships[0] ?? null;

    req.user = {
      userId: student.id,
      email: student.email,
      role: managementMembership ? "club" : "member",
      userType: "student",
      clubId: primary?.clubId ?? null,
      memberships: memberships.map((m) => ({
        clubId: m.clubId,
        clubName: m.club?.clubName,
        slug: m.club?.slug,
        role: m.role,
        canTakeAttendance: m.canTakeAttendance,
        canEditEvents: m.canEditEvents,
        permissions: {
          canTakeAttendance: m.canTakeAttendance,
          canEditEvents: m.canEditEvents,
        },
      })),
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

import { hasPermission } from "../utils/rbac.js";

// Granular Permission Middleware
export const requirePermission = (permission, resourceExtractor = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const resource = resourceExtractor ? await resourceExtractor(req) : null;
    const allowed = hasPermission(req.user, permission, resource);
    if (!allowed) {
      return res.status(403).json({ message: `Access denied. Insufficient permissions for ${permission}.` });
    }
    next();
  };
};

// Backward compatible role middleware delegation
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No token" });
    }
    if (req.user.role === "admin" || req.user.role === "SUPER_ADMIN") {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
