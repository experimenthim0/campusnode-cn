import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";

export const MAX_CLUB_STUDENT_LEADS = 1;
export const MAX_CLUB_COORDINATORS = 5;
export const MAX_CLUB_OFFICIAL_ACCOUNTS = 1;

const VALID_ROLES = ["CLUB_HEAD", "COORDINATOR", "MEMBER"];

/**
 * Derives default permission flags from a ClubMemberRole enum value.
 * @param {string} role - One of CLUB_HEAD, COORDINATOR, MEMBER
 * @returns {{ canTakeAttendance: boolean, canEditEvents: boolean }}
 */
export function derivePermissions(role) {
  if (role === "CLUB_HEAD" || role === "COORDINATOR") {
    return { canTakeAttendance: true, canEditEvents: true };
  }
  // MEMBER
  return { canTakeAttendance: true, canEditEvents: false };
}

/**
 * Central permission-based check for managing club members.
 */
export async function canManageClubMembers(req, clubId) {
  if (!req.user) return false;
  return hasPermission(req.user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId, id: clubId });
}

/**
 * Helper to record audit logs for team management operations.
 */
async function logAudit(req, action, targetId, clubId, metadata = {}) {
  try {
    const actorId = req.user?.userId || req.user?.clubAccountId || req.user?.id || "unknown";
    const actorEmail = req.user?.email || "unknown";
    const actorType = req.user?.principalType || req.user?.userType || "UNKNOWN";

    await prisma.auditLog.create({
      data: {
        id: createObjectId(),
        action,
        actorType,
        actorId,
        actorEmail,
        targetId,
        clubId,
        metadata,
        source: "club_members_controller",
      },
    });
  } catch (err) {
    console.error("Non-fatal notice: Failed to record audit log:", err.message);
  }
}

/**
 * Add a new member to a club by college email.
 * Only @nitj.ac.in emails are allowed.
 */
export const addClubMember = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { email, role = "MEMBER", customPermissions = [] } = req.body;

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}.`,
      });
    }

    if (!email.endsWith("@nitj.ac.in")) {
      return res.status(400).json({
        message: "Only students with @nitj.ac.in emails can be added as club members.",
      });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    if (!(await canManageClubMembers(req, clubId))) {
      return res.status(403).json({ message: "Unauthorized to add members to this club." });
    }

    // Role count validation
    if (role === "CLUB_HEAD") {
      const activeHeads = await prisma.clubMembership.count({
        where: { clubId, role: "CLUB_HEAD", status: { not: "INACTIVE" } },
      });
      if (activeHeads >= MAX_CLUB_STUDENT_LEADS) {
        return res.status(409).json({
          message: "This club already has an active Student Lead.",
        });
      }
    } else if (role === "COORDINATOR") {
      const activeCoordinators = await prisma.clubMembership.count({
        where: { clubId, role: "COORDINATOR", status: { not: "INACTIVE" } },
      });
      if (activeCoordinators >= MAX_CLUB_COORDINATORS) {
        return res.status(409).json({
          message: `Maximum of ${MAX_CLUB_COORDINATORS} active coordinators is allowed for this club.`,
        });
      }
    }

    // Ensure this email does not belong to a ClubAccount, AdminRole, or InstitutionalAccount
    const [clubAccount, adminAccount, instAccount] = await Promise.all([
      prisma.clubAccount.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } }),
      prisma.adminRole.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } }),
      prisma.institutionalAccount.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } }),
    ]);

    if (clubAccount) {
      return res.status(400).json({
        message: "Club organizational accounts cannot be added as club members. Only individual students are allowed.",
      });
    }

    if (adminAccount || instAccount) {
      return res.status(400).json({
        message: "Administrative or institutional accounts cannot be added as student members. Only registered students are allowed.",
      });
    }

    // Find real student by email
    const student =
      (await prisma.studentUser.findFirst({
        where: { email: { equals: email.trim(), mode: "insensitive" } },
      })) || (await prisma.studentUser.findUnique({ where: { email: email.trim() } }));

    if (!student) {
      return res.status(404).json({
        message: "Student not found. They must register as a student on the platform first.",
      });
    }

    // Check if membership already exists
    const existing = await prisma.clubMembership.findUnique({
      where: { clubId_studentId: { clubId, studentId: student.id } },
    });

    if (existing) {
      return res.status(400).json({ message: "This student is already a member of the club." });
    }

    const { canTakeAttendance, canEditEvents } = derivePermissions(role);

    const membership = await prisma.clubMembership.create({
      data: {
        id: createObjectId(),
        studentId: student.id,
        clubId,
        role,
        status: "ACTIVE",
        customPermissions: Array.isArray(customPermissions) ? customPermissions : [],
        canTakeAttendance,
        canEditEvents,
      },
      include: {
        student: { select: { id: true, name: true, email: true, rollNo: true } },
      },
    });

    await logAudit(req, "club.invite_members", membership.id, clubId, {
      studentEmail: student.email,
      role,
      membershipId: membership.id,
    });

    invalidatePublicResponses(["clubs:*", "clubs:public"]);

    res.status(201).json({
      message: "Member added successfully.",
      membership: { ...membership, _id: membership.id },
    });
  } catch (err) {
    console.error("addClubMember error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all members of a club.
 */
export const getClubMembers = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        clubName: true,
        clubEmail: true,
        slug: true,
        account: { select: { id: true, email: true } },
      },
    });

    const members = await prisma.clubMembership.findMany({
      where: { clubId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNo: true,
            branch: true,
            year: true,
            profileImage: true,
            githubProfile: true,
            linkedinProfile: true,
            xProfile: true,
            instagramProfile: true,
            whatsappNumber: true,
            portfolioUrl: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const normalizedMembers = members.map((m) => {
      const isClubAccount = Boolean(
        club?.account?.email && m.student?.email && club.account.email.trim().toLowerCase() === m.student.email.trim().toLowerCase()
      );
      return {
        ...m,
        _id: m.id,
        isClubAccount,
        clubName: club?.clubName,
      };
    });

    res.json(normalizedMembers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update member permissions or role.
 */
export const updateMemberPermissions = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { role, permissions, customPermissions, status } = req.body;

    const existing = await prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: {
        club: { select: { id: true, clubEmail: true, slug: true, account: { select: { email: true } } } },
        student: { select: { id: true, email: true, rollNo: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ message: "Membership record not found. Try refreshing the member list." });
    }

    if (!(await canManageClubMembers(req, existing.clubId))) {
      return res.status(403).json({ message: "Unauthorized to update members in this club." });
    }

    // Disallow self-modification of role or permissions
    const requesterId = req.user?.studentId || req.user?.userId || req.user?.id;
    const isSelfModification = Boolean(
      requesterId &&
      (String(existing.studentId) === String(requesterId) || (existing.student?.email && req.user?.email && existing.student.email.trim().toLowerCase() === req.user.email.trim().toLowerCase()))
    );
    if (isSelfModification && req.user?.role !== "admin" && req.user?.role !== "SUPER_ADMIN" && req.user?.principalType !== "ADMIN") {
      return res.status(400).json({ message: "You cannot modify your own role or permissions." });
    }

    const updateData = {};

    if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
      updateData.status = status;
    }

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}.`,
        });
      }

      // Enforce role limits
      if (role === "CLUB_HEAD" && existing.role !== "CLUB_HEAD") {
        const activeHeads = await prisma.clubMembership.count({
          where: { clubId: existing.clubId, role: "CLUB_HEAD", id: { not: membershipId }, status: { not: "INACTIVE" } },
        });
        if (activeHeads >= MAX_CLUB_STUDENT_LEADS) {
          return res.status(409).json({
            message: "This club already has an active Student Lead. Use 'Transfer Leadership' to transfer the role.",
          });
        }
      } else if (role === "COORDINATOR" && existing.role !== "COORDINATOR") {
        const activeCoordinators = await prisma.clubMembership.count({
          where: { clubId: existing.clubId, role: "COORDINATOR", id: { not: membershipId }, status: { not: "INACTIVE" } },
        });
        if (activeCoordinators >= MAX_CLUB_COORDINATORS) {
          return res.status(409).json({
            message: `Maximum of ${MAX_CLUB_COORDINATORS} active coordinators is allowed for this club.`,
          });
        }
      }

      updateData.role = role;
      Object.assign(updateData, derivePermissions(role));
    }

    if (Array.isArray(customPermissions)) {
      updateData.customPermissions = customPermissions;
    }

    if (permissions) {
      if (permissions.canTakeAttendance !== undefined) {
        updateData.canTakeAttendance = !!permissions.canTakeAttendance;
      }
      if (permissions.canEditEvents !== undefined) {
        updateData.canEditEvents = !!permissions.canEditEvents;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No updates provided." });
    }

    const membership = await prisma.clubMembership.update({
      where: { id: membershipId },
      data: updateData,
      include: {
        student: { select: { id: true, name: true, email: true, rollNo: true } },
      },
    });

    await logAudit(req, "club.assign_roles", membershipId, existing.clubId, {
      updatedFields: Object.keys(updateData),
      role: updateData.role || existing.role,
      customPermissions: updateData.customPermissions || existing.customPermissions,
    });

    invalidatePublicResponses(["clubs:*", "clubs:public"]);

    res.json({ message: "Updated successfully.", membership: { ...membership, _id: membership.id } });
  } catch (err) {
    console.error("updateMemberPermissions error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Atomically transfer Student Lead (Head) to another member in the club.
 */
export const transferStudentLead = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { targetMembershipId, targetStudentId, targetEmail } = req.body;

    if (!(await canManageClubMembers(req, clubId))) {
      return res.status(403).json({ message: "Unauthorized to transfer leadership in this club." });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    // Locate target membership
    let targetMembership = null;
    if (targetMembershipId) {
      targetMembership = await prisma.clubMembership.findUnique({
        where: { id: targetMembershipId },
        include: { student: { select: { id: true, name: true, email: true, rollNo: true } } },
      });
    } else if (targetStudentId) {
      targetMembership = await prisma.clubMembership.findUnique({
        where: { clubId_studentId: { clubId, studentId: targetStudentId } },
        include: { student: { select: { id: true, name: true, email: true, rollNo: true } } },
      });
    } else if (targetEmail) {
      const student = await prisma.studentUser.findUnique({ where: { email: targetEmail } });
      if (student) {
        targetMembership = await prisma.clubMembership.findUnique({
          where: { clubId_studentId: { clubId, studentId: student.id } },
          include: { student: { select: { id: true, name: true, email: true, rollNo: true } } },
        });
      }
    }

    if (!targetMembership || targetMembership.clubId !== clubId) {
      return res.status(404).json({ message: "Target student is not a registered member of this club." });
    }

    if (targetMembership.role === "CLUB_HEAD") {
      return res.status(400).json({ message: "Target member is already the active Student Lead." });
    }

    // Atomic leadership transfer
    const newStudentLead = await prisma.$transaction(async (tx) => {
      // 1. Demote previous active CLUB_HEAD(s) to COORDINATOR
      await tx.clubMembership.updateMany({
        where: { clubId, role: "CLUB_HEAD" },
        data: {
          role: "COORDINATOR",
          canTakeAttendance: true,
          canEditEvents: true,
        },
      });

      // 2. Promote target to CLUB_HEAD
      const updated = await tx.clubMembership.update({
        where: { id: targetMembership.id },
        data: {
          role: "CLUB_HEAD",
          canTakeAttendance: true,
          canEditEvents: true,
        },
        include: {
          student: { select: { id: true, name: true, email: true, rollNo: true } },
        },
      });

      return updated;
    });

    await logAudit(req, "club.transfer_leadership", newStudentLead.id, clubId, {
      newLeadStudentId: newStudentLead.student?.id,
      newLeadEmail: newStudentLead.student?.email,
      newLeadName: newStudentLead.student?.name,
    });

    invalidatePublicResponses(["clubs:*", "clubs:public"]);

    res.json({
      message: `Leadership successfully transferred to ${newStudentLead.student?.name || "new Student Lead"}.`,
      studentLead: { ...newStudentLead, _id: newStudentLead.id },
    });
  } catch (err) {
    console.error("transferStudentLead error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Remove a member from a club.
 */
export const removeClubMember = async (req, res) => {
  try {
    const { membershipId } = req.params;

    const membership = await prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: {
        student: { select: { id: true, email: true, name: true } },
      },
    });
    if (!membership) return res.status(404).json({ message: "Membership not found." });

    if (!(await canManageClubMembers(req, membership.clubId))) {
      return res.status(403).json({ message: "Unauthorized to remove members from this club." });
    }

    // Disallow self-removal for student members
    const requesterId = req.user?.studentId || req.user?.userId || req.user?.id;
    const isSelfRemoval = Boolean(
      requesterId &&
      (String(membership.studentId) === String(requesterId) || (membership.student?.email && req.user?.email && membership.student.email.trim().toLowerCase() === req.user.email.trim().toLowerCase()))
    );
    if (isSelfRemoval && req.user?.role !== "admin" && req.user?.role !== "SUPER_ADMIN" && req.user?.principalType !== "ADMIN") {
      return res.status(400).json({ message: "You cannot remove yourself from the club." });
    }

    await prisma.clubMembership.delete({ where: { id: membershipId } });

    await logAudit(req, "club.remove_members", membershipId, membership.clubId, {
      removedStudentEmail: membership.student?.email,
      removedStudentName: membership.student?.name,
      role: membership.role,
    });

    await invalidatePublicResponses(`/api/club-members/${membership.clubId}/members`);

    res.json({ message: "Member removed from club successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Search students to add as club members.
 * Strictly searches ONLY registered students and excludes club accounts, admin, faculty, and institutional accounts.
 */
export const searchStudentsForClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ students: [] });
    }

    const query = q.trim();

    // Fetch all non-student account emails (clubs, admins, faculty, institutional) to strictly exclude them
    const [clubAccounts, admins, instAccounts] = await Promise.all([
      prisma.clubAccount.findMany({ select: { email: true } }),
      prisma.adminRole.findMany({ select: { email: true } }),
      prisma.institutionalAccount.findMany({ select: { email: true } }),
    ]);

    const excludedEmails = [
      ...clubAccounts.map((c) => (c.email ? c.email.toLowerCase() : "")),
      ...admins.map((a) => (a.email ? a.email.toLowerCase() : "")),
      ...instAccounts.map((i) => (i.email ? i.email.toLowerCase() : "")),
    ].filter(Boolean);

    // Also get existing members of this club to indicate if already added
    const existingMembers = await prisma.clubMembership.findMany({
      where: { clubId, status: { not: "INACTIVE" } },
      select: { studentId: true },
    });
    const existingMemberIds = new Set(existingMembers.map((m) => m.studentId));

    const students = await prisma.studentUser.findMany({
      where: {
        isBlocked: false,
        email: { notIn: excludedEmails },
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { rollNo: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        branch: true,
        year: true,
        program: true,
      },
      take: 10,
    });

    const enriched = students.map((s) => ({
      ...s,
      isAlreadyMember: existingMemberIds.has(s.id),
    }));

    res.json({ students: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
