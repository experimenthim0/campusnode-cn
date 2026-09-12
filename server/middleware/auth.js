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
 * Generate JWT token supporting 3 principal types: STUDENT, FACULTY/ADMIN, EXTERNAL.
 *
 * @param {object} user - User object
 * @param {string} role  - Role string (admin | facultyCoordinator | member | external)
 * @param {string} userType - "student" | "admin" | "external"
 * @param {string|null} clubId - Club ID
 * @param {string|null} principalType - "STUDENT" | "FACULTY" | "ADMIN" | "EXTERNAL"
 */
export const generateToken = (user, role, userType = "student", clubId = null, principalType = null) => {
  const resolvedPrincipal = principalType || (
    userType === "admin" && role === "facultyCoordinator" ? "FACULTY" :
    userType === "admin" ? "ADMIN" :
    userType === "external" ? "EXTERNAL" : "STUDENT"
  );

  const payload = {
    userId: user.id,
    role,
    email: user.email,
    clubId: normalizeClubId(clubId),
    userType,
    principalType: resolvedPrincipal,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

const getTokensFromRequest = (req) => {
  const tokens = [];
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) tokens.push(authHeader.slice(7));
  else if (authHeader) tokens.push(authHeader);
  if (req.cookies?.token && !tokens.includes(req.cookies.token)) tokens.push(req.cookies.token);
  return tokens;
};

const getFacultyClub = async (adminId) => {
  return prisma.club.findFirst({
    where: { facultyCoordinatorId: adminId },
    select: { id: true, clubName: true },
  });
};

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
      }
    }
    if (!decoded) return res.status(401).json({ message: "Invalid or expired token." });

    const principalType = decoded.principalType || (
      decoded.userType === "admin" ? (decoded.role === "facultyCoordinator" ? "FACULTY" : "ADMIN") :
      decoded.userType === "external" ? "EXTERNAL" : "STUDENT"
    );

    if (principalType === "ADMIN" || principalType === "FACULTY" || decoded.userType === "admin") {
      const admin = await prisma.adminRole.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!admin) return res.status(401).json({ message: "Invalid or expired token." });

      const facultyClub = admin.role === "facultyCoordinator" ? await getFacultyClub(admin.id) : null;
      const isFaculty = admin.role === "facultyCoordinator";

      req.user = {
        principalType: isFaculty ? "FACULTY" : "ADMIN",
        facultyId: isFaculty ? admin.id : undefined,
        userId: admin.id,
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        userType: "admin",
        clubId: facultyClub?.id ?? null,
        clubName: facultyClub?.clubName ?? null,
      };
      return next();
    }

    if (principalType === "EXTERNAL" || decoded.userType === "external" || decoded.role === "external") {
      const externalUser = await prisma.externalUser.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          collegeName: true,
          phone: true,
          isTwoStepEnabled: true,
        },
      });

      if (!externalUser) {
        return res.status(401).json({ message: "Invalid or expired token." });
      }

      req.user = {
        principalType: "EXTERNAL",
        userId: externalUser.id,
        id: externalUser.id,
        email: externalUser.email,
        name: externalUser.name,
        collegeName: externalUser.collegeName,
        phone: externalUser.phone,
        role: "external",
        userType: "external",
        clubId: null,
      };
      return next();
    }

    // STUDENT principal
    const student = await prisma.studentUser.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        rollNo: true,
      },
    });

    if (!student) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const memberships = await prisma.clubMembership.findMany({
      where: { studentId: student.id },
      include: { club: { select: { id: true, clubName: true, slug: true, clubLogo: true } } },
    });

    const managementMembership = memberships.find((m) =>
      ["CLUB_HEAD", "COORDINATOR"].includes(m.role),
    );
    const primary = managementMembership ?? memberships[0] ?? null;

    const mappedMemberships = memberships.map((m) => ({
      id: m.id,
      clubId: m.clubId,
      clubName: m.club?.clubName,
      slug: m.club?.slug,
      clubLogo: m.club?.clubLogo,
      role: m.role,
      customPermissions: m.customPermissions || [],
      canTakeAttendance: m.canTakeAttendance,
      canEditEvents: m.canEditEvents,
      permissions: {
        canTakeAttendance: m.canTakeAttendance,
        canEditEvents: m.canEditEvents,
      },
    }));

    req.user = {
      principalType: "STUDENT",
      studentId: student.id,
      userId: student.id,
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      email: student.email,
      role: managementMembership ? "club" : "member",
      userType: "student",
      clubId: primary?.clubId ?? null,
      memberships: mappedMemberships,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

import { hasPermission } from "../utils/rbac.js";

export const requirePermission = (permission, resourceExtractor = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }
    let resource = null;
    if (resourceExtractor) {
      resource = await resourceExtractor(req);
    } else if (req.params.clubId) {
      resource = { clubId: req.params.clubId };
    } else if (req.body && req.body.clubId) {
      resource = { clubId: req.body.clubId };
    } else if (req.baseUrl && req.baseUrl.includes("/clubs") && req.params.id) {
      resource = { clubId: req.params.id };
    } else if (req.params.eventId || (req.baseUrl && req.baseUrl.includes("/events") && req.params.id)) {
      const targetEventId = req.params.eventId || req.params.id;
      if (typeof targetEventId === "string" && targetEventId.length >= 10) {
        try {
          const ev = await prisma.event.findUnique({
            where: { id: targetEventId },
            select: { id: true, createdById: true, organizers: { select: { clubId: true } } },
          });
          if (ev) {
            const orgClubIds = (ev.organizers || []).map((o) => o.clubId);
            const matchedClubId = orgClubIds.find((cid) =>
              req.user.memberships?.some((m) => String(m.clubId) === String(cid))
            ) || orgClubIds[0] || null;

            resource = {
              ...ev,
              clubId: matchedClubId,
              clubIds: orgClubIds,
            };
          }
        } catch {
          // Fallback to null
        }
      }
    }

    const perms = Array.isArray(permission) ? permission : [permission];
    const allowed = perms.some((p) => hasPermission(req.user, p, resource));
    if (!allowed) {
      return res.status(403).json({ message: `Access denied. Insufficient permissions for ${perms.join(" or ")}.` });
    }
    next();
  };
};

export const requireAnyPermission = (...permissions) => {
  return requirePermission(permissions.flat());
};

export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No token provided." });
    }
    if (req.user.role === "admin" || req.user.role === "SUPER_ADMIN" || req.user.principalType === "ADMIN") {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied." });
    }
    next();
  };
};
