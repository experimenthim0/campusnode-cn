import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";

export const MAX_CLUB_STUDENT_LEADS = 1;
export const MAX_CLUB_COORDINATORS = 5;
export const MAX_CLUB_OFFICIAL_ACCOUNTS = 1;

const VALID_ROLES = ["CLUB_HEAD", "COORDINATOR", "MEMBER"];

/**
 * Derives permission flags from a ClubMemberRole enum value.
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

async function canManageClubMembers(req, clubId) {
  if (!req.user) return false;
  if (req.user.role === "admin" || req.user.role === "SUPER_ADMIN") return true;
  if (req.user.role === "club") {
    return !req.user.clubId || String(req.user.clubId) === String(clubId);
  }
  if (req.user.role === "facultyCoordinator") {
    return String(req.user.clubId) === String(clubId);
  }
  if (req.user.userType === "student" || req.user.role === "member" || req.user.role === "student") {
    const membership = await prisma.clubMembership.findUnique({
      where: { clubId_studentId: { clubId, studentId: req.user.userId } },
    });
    return membership?.role === "CLUB_HEAD" || membership?.role === "COORDINATOR";
  }
  return hasPermission(req.user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId, id: clubId });
}

/**
 * Add a new member to a club by college email.
 * Only @nitj.ac.in emails are allowed as per latest requirement.
 */
export const addClubMember = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { email, role = "MEMBER" } = req.body;

    // Validate role is one of the accepted enum values
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
        where: { clubId, role: "CLUB_HEAD" },
      });
      if (activeHeads >= MAX_CLUB_STUDENT_LEADS) {
        return res.status(409).json({
          message: "This club already has an active Student Lead.",
        });
      }
    } else if (role === "COORDINATOR") {
      const activeCoordinators = await prisma.clubMembership.count({
        where: { clubId, role: "COORDINATOR" },
      });
      if (activeCoordinators >= MAX_CLUB_COORDINATORS) {
        return res.status(409).json({
          message: `Maximum of ${MAX_CLUB_COORDINATORS} active coordinators is allowed for this club.`,
        });
      }
    }

    // Find the student by email
    const student = await prisma.studentUser.findUnique({ where: { email } });
    if (!student) {
      return res.status(404).json({
        message: "Student not found. They must register as a student on the platform first.",
      });
    }

    // Check if membership already exists using @@unique([clubId, studentId])
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
        canTakeAttendance,
        canEditEvents,
      },
      include: {
        student: { select: { id: true, name: true, email: true, rollNo: true } },
      },
    });

    invalidatePublicResponses(["clubs:*", "clubs:public"]);

    res.status(201).json({
      message: "Member added successfully.",
      membership: { ...membership, _id: membership.id },
    });
  } catch (err) {
    console.error("DEBUG: addClubMember error:", err);
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
      select: { id: true, clubName: true, clubEmail: true, slug: true }
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
    });

    const normalizedMembers = members.map(m => {
      const isClubAccount = Boolean(
        (club?.clubEmail && m.student?.email && club.clubEmail.trim().toLowerCase() === m.student.email.trim().toLowerCase()) ||
        (m.student?.email && club?.slug && m.student.email.toLowerCase().startsWith(club.slug.toLowerCase()))
      );
      return {
        ...m,
        _id: m.id,
        isClubAccount,
        clubName: club?.clubName
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
    const { role, permissions } = req.body;

    // Check if membership exists first
    const existing = await prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: {
        club: { select: { clubEmail: true, slug: true } },
        student: { select: { email: true } }
      }
    });
    if (!existing) return res.status(404).json({ message: "Membership record not found. Try refreshing the member list." });

    if (!(await canManageClubMembers(req, existing.clubId))) {
      return res.status(403).json({ message: "Unauthorized to update members in this club." });
    }

    // Protect official club account from modification
    const isOfficialClubAccount = Boolean(
      (existing.club?.clubEmail && existing.student?.email && existing.club.clubEmail.trim().toLowerCase() === existing.student.email.trim().toLowerCase()) ||
      (existing.student?.email && existing.club?.slug && existing.student.email.toLowerCase().startsWith(existing.club.slug.toLowerCase()))
    );
    if (isOfficialClubAccount) {
      return res.status(400).json({ message: "Cannot modify the permissions or role of the primary official club account." });
    }

    // Disallow self-modification of role or permissions (e.g. Student Lead cannot change own permissions)
    const requesterId = req.user?.userId || req.user?.id || req.user?._id;
    const isSelfModification = Boolean(
      requesterId &&
      (String(existing.studentId) === String(requesterId) || (existing.student?.email && req.user?.email && existing.student.email.trim().toLowerCase() === req.user.email.trim().toLowerCase()))
    );
    if (isSelfModification && req.user?.role !== "admin" && req.user?.role !== "SUPER_ADMIN") {
      return res.status(400).json({ message: "You cannot modify your own role or permissions." });
    }

    const updateData = {};
    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}.`,
        });
      }

      // Enforce role limits
      if (role === "CLUB_HEAD" && existing.role !== "CLUB_HEAD") {
        const activeHeads = await prisma.clubMembership.count({
          where: { clubId: existing.clubId, role: "CLUB_HEAD", id: { not: membershipId } },
        });
        if (activeHeads >= MAX_CLUB_STUDENT_LEADS) {
          return res.status(409).json({
            message: "This club already has an active Student Lead. Use 'Transfer Leadership' to transfer the role.",
          });
        }
      } else if (role === "COORDINATOR" && existing.role !== "COORDINATOR") {
        const activeCoordinators = await prisma.clubMembership.count({
          where: { clubId: existing.clubId, role: "COORDINATOR", id: { not: membershipId } },
        });
        if (activeCoordinators >= MAX_CLUB_COORDINATORS) {
          return res.status(409).json({
            message: `Maximum of ${MAX_CLUB_COORDINATORS} active coordinators is allowed for this club.`,
          });
        }
      }

      updateData.role = role;
      // When role changes, we derive new default permissions unless explicitly overridden
      Object.assign(updateData, derivePermissions(role));
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
        student: { select: { name: true } }
      }
    });

    invalidatePublicResponses(["clubs:*", "clubs:public"]);

    res.json({ message: "Updated successfully.", membership: { ...membership, _id: membership.id } });
  } catch (err) {
    console.error("DEBUG: updateMemberPermissions error:", err);
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

    // Locate the target membership
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

    // Protect official club account from becoming student lead target
    const isOfficialClubAccount = Boolean(
      (club.clubEmail && targetMembership.student?.email && club.clubEmail.trim().toLowerCase() === targetMembership.student.email.trim().toLowerCase()) ||
      (targetMembership.student?.email && club.slug && targetMembership.student.email.toLowerCase().startsWith(club.slug.toLowerCase()))
    );
    if (isOfficialClubAccount) {
      return res.status(400).json({ message: "The official club account cannot be designated as a student lead." });
    }

    // Atomic transaction: demote previous CLUB_HEAD(s) to COORDINATOR and promote target to CLUB_HEAD
    const newStudentLead = await prisma.$transaction(async (tx) => {
      // 1. Demote any current CLUB_HEAD to COORDINATOR
      await tx.clubMembership.updateMany({
        where: { clubId, role: "CLUB_HEAD" },
        data: {
          role: "COORDINATOR",
          canTakeAttendance: true,
          canEditEvents: true,
        },
      });

      // 2. Promote target membership to CLUB_HEAD
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

    // Check if membership exists
    const membership = await prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: {
        club: { select: { clubEmail: true, slug: true } },
        student: { select: { email: true } }
      }
    });
    if (!membership) return res.status(404).json({ message: "Membership not found." });
    if (!(await canManageClubMembers(req, membership.clubId))) {
      return res.status(403).json({ message: "Unauthorized to remove members from this club." });
    }

    // Protect official club account from deletion
    const isOfficialClubAccount = Boolean(
      (membership.club?.clubEmail && membership.student?.email && membership.club.clubEmail.trim().toLowerCase() === membership.student.email.trim().toLowerCase()) ||
      (membership.student?.email && membership.club?.slug && membership.student.email.toLowerCase().startsWith(membership.club.slug.toLowerCase()))
    );
    if (isOfficialClubAccount) {
      return res.status(400).json({ message: "Cannot remove the official club account from the club." });
    }

    // Disallow self-removal for student members
    const requesterId = req.user?.userId || req.user?.id || req.user?._id;
    const isSelfRemoval = Boolean(
      requesterId &&
      (String(membership.studentId) === String(requesterId) || (membership.student?.email && req.user?.email && membership.student.email.trim().toLowerCase() === req.user.email.trim().toLowerCase()))
    );
    if (isSelfRemoval && req.user?.role !== "admin" && req.user?.role !== "SUPER_ADMIN") {
      return res.status(400).json({ message: "You cannot remove yourself from the club." });
    }

    await prisma.clubMembership.delete({ where: { id: membershipId } });
    invalidatePublicResponses(["clubs:*", "clubs:public"]);
    res.json({ message: "Member removed successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
