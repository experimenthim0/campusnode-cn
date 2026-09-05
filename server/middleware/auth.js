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
 * Generate JWT token supporting 3 principal types: STUDENT, FACULTY/ADMIN, CLUB.
 *
 * @param {object} user - User/Account object
 * @param {string} role  - Role string (admin | facultyCoordinator | club | member | external)
 * @param {string} userType - "student" | "admin" | "club" | "external"
 * @param {string|null} clubId - Club ID
 * @param {string|null} principalType - "STUDENT" | "FACULTY" | "CLUB" | "ADMIN"
 */
export const generateToken = (user, role, userType = "student", clubId = null, principalType = null) => {
  const resolvedPrincipal = principalType || (
    userType === "club" || role === "club_account" ? "CLUB" :
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

  if (resolvedPrincipal === "CLUB") {
    payload.clubAccountId = user.id;
  }

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
      decoded.userType === "club" ? "CLUB" :
      decoded.userType === "admin" ? (decoded.role === "facultyCoordinator" ? "FACULTY" : "ADMIN") :
      decoded.userType === "external" ? "EXTERNAL" : "STUDENT"
    );

    if (principalType === "CLUB" || decoded.userType === "club") {
      const accountId = decoded.clubAccountId || decoded.userId;
      const clubAccount = await prisma.clubAccount.findUnique({
        where: { id: accountId },
        include: { club: { select: { id: true, clubName: true, slug: true, clubLogo: true } } },
      });

      if (!clubAccount || !clubAccount.isActive) {
        return res.status(401).json({ message: "Club account not found or deactivated." });
      }

      req.user = {
        principalType: "CLUB",
        clubAccountId: clubAccount.id,
        userId: clubAccount.id, // for backwards-compatibility
        id: clubAccount.id,
        clubId: clubAccount.clubId,
        clubName: clubAccount.club?.clubName,
        slug: clubAccount.club?.slug,
        email: clubAccount.email,
        role: "club",
        userType: "club",
      };
      return next();
    }

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

    if (principalType === "INSTITUTIONAL" || decoded.userType === "institutional") {
      const inst = await prisma.institutionalAccount.findUnique({
        where: { id: decoded.institutionalAccountId || decoded.userId },
      });
      if (inst && inst.isActive) {
        req.user = {
          principalType: "INSTITUTIONAL",
          institutionalAccountId: inst.id,
          userId: inst.id,
          id: inst.id,
          name: inst.name,
          email: inst.email,
          role: "central_organizer",
          userType: "institutional",
        };
        return next();
      }
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
          isVerified: true,
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

    const student = await prisma.studentUser.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        rollNo: true,
        isBlocked: true,
        accessLevel: true,
      },
    });

    if (!student || student.isBlocked) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const [memberships, instAssignments] = await Promise.all([
      prisma.clubMembership.findMany({
        where: { studentId: student.id, status: { not: "INACTIVE" } },
        include: { club: { select: { id: true, clubName: true, slug: true, clubLogo: true } } },
      }),
      prisma.institutionalAccountAssignment.findMany({
        where: { studentId: student.id, status: { not: "INACTIVE" } },
        include: { institutionalAccount: { select: { id: true, name: true, type: true, email: true } } },
      }),
    ]);

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
      status: m.status,
      academicSessionId: m.academicSessionId,
      customPermissions: m.customPermissions || [],
      canTakeAttendance: m.canTakeAttendance,
      canEditEvents: m.canEditEvents,
      permissions: {
        canTakeAttendance: m.canTakeAttendance,
        canEditEvents: m.canEditEvents,
      },
    }));

    const mappedInstAssignments = instAssignments.map((a) => ({
      id: a.id,
      institutionalAccountId: a.institutionalAccountId,
      accountName: a.institutionalAccount?.name,
      accountType: a.institutionalAccount?.type,
      role: a.role,
      status: a.status,
      canManageEvents: a.canManageEvents,
      canTakeAttendance: a.canTakeAttendance,
      canVerifyPayments: a.canVerifyPayments,
      canDelegateStaff: a.canDelegateStaff,
      customPermissions: a.customPermissions || [],
    }));

    const activeInstAssignment = mappedInstAssignments.find((a) => a.status === "ACTIVE");
    const isCentralOrganizer = Boolean(activeInstAssignment) || student.accessLevel === "central_organizer" || decoded.role === "central_organizer";

    req.user = {
      principalType: "STUDENT",
      studentId: student.id,
      userId: student.id,
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      email: student.email,
      role: isCentralOrganizer ? "central_organizer" : managementMembership ? "club" : "member",
      userType: "student",
      accessLevel: student.accessLevel,
      clubId: primary?.clubId ?? null,
      memberships: mappedMemberships,
      institutionalAssignments: mappedInstAssignments,
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
            select: { id: true, clubId: true, organizerType: true, institutionalAccountId: true, createdById: true },
          });
          if (ev) resource = ev;
        } catch {
          // Fallback to null
        }
      }
    }

    const allowed = hasPermission(req.user, permission, resource);
    if (!allowed) {
      return res.status(403).json({ message: `Access denied. Insufficient permissions for ${permission}.` });
    }
    next();
  };
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
