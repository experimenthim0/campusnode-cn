import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";
import { invalidatePublicResponses } from "../utils/publicResponseCache.js";
import { calculateAcademicProgress } from "../utils/academicProgress.js";
import { sendEmail } from "../emails/emailService.js";

export const MAX_CLUB_STUDENT_LEADS = 1;
export const MAX_CLUB_COORDINATORS = 5;

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
  return { canTakeAttendance: true, canEditEvents: false };
}

export async function canManageClubMembers(req, clubId) {
  if (!req.user) return false;
  return hasPermission(req.user, PERMISSIONS.CLUB_MANAGE_MEMBERS, { clubId, id: clubId });
}

async function logAudit(req, action, targetId, clubId, metadata = {}) {
  try {
    const actorId = req.user?.userId || req.user?.id || "unknown";
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

export const addClubMember = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { email, role = "MEMBER", customPermissions = [] } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}.`,
      });
    }

    if (!email || !email.endsWith("@nitj.ac.in")) {
      return res.status(400).json({
        message: "Only students with @nitj.ac.in emails can be added as club members.",
      });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

    if (!(await canManageClubMembers(req, clubId))) {
      return res.status(403).json({ message: "Unauthorized to add members to this club." });
    }

    const isAdmin = req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN" || req.user?.principalType === "ADMIN";

    if (role === "CLUB_HEAD") {
      if (!isAdmin) {
        return res.status(403).json({
          message: "Only administrators can assign the Club Head role.",
        });
      }
      const activeHeads = await prisma.clubMembership.count({
        where: { clubId, role: "CLUB_HEAD" },
      });
      if (activeHeads >= MAX_CLUB_STUDENT_LEADS) {
        return res.status(409).json({
          message: "This club already has an active Club Head.",
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

    // Ensure this email does not belong to an AdminRole
    const adminAccount = await prisma.adminRole.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (adminAccount) {
      return res.status(400).json({
        message: "This email belongs to an administrative staff account and cannot be added as a student club member.",
      });
    }

    const student = await prisma.studentUser.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (!student) {
      return res.status(404).json({
        message: "No registered student account found with this email. The student must register first.",
      });
    }

    if (role === "CLUB_HEAD") {
      const studentOtherHeadship = await prisma.clubMembership.findFirst({
        where: {
          studentId: student.id,
          role: "CLUB_HEAD",
          clubId: { not: clubId },
        },
        include: { club: { select: { clubName: true } } },
      });
      if (studentOtherHeadship) {
        return res.status(409).json({
          message: `This student is already the Club Head of "${studentOtherHeadship.club.clubName}". A student can be the Head of only one club at a time. They can still be added as a Coordinator.`,
        });
      }
    }

    const existing = await prisma.clubMembership.findUnique({
      where: {
        clubId_studentId: {
          clubId,
          studentId: student.id,
        },
      },
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

    if (role === "CLUB_HEAD" && student?.email) {
      const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
      try {
        await sendEmail({
          to: student.email,
          template: "clubs:student-head-assigned",
          data: {
            studentName: student.name,
            studentEmail: student.email,
            rollNo: student.rollNo,
            clubName: club.clubName,
            dashboardUrl: `${clientUrl}/clubs/${club.slug || club.id}`,
          },
        });
      } catch (emailErr) {
        console.error("Failed to send student head appointment email:", emailErr?.message || emailErr);
      }
    }

    res.status(201).json({
      message: "Member added successfully.",
      membership: { ...membership, _id: membership.id },
    });
  } catch (err) {
    console.error("addClubMember error:", err);
    res.status(500).json({ message: err.message });
  }
};

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
            expectedGraduationYear: true,
            program: true,
            profileImage: true,
            socialLinks: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const normalizedMembers = members.map((m) => {
      let student = null;
      if (m.student) {
        const progress = calculateAcademicProgress(m.student);
        const socialMap = {};
        (m.student.socialLinks || []).forEach((l) => {
          const plat = (l.platform || "").toUpperCase();
          if (plat === "GITHUB") socialMap.githubProfile = l.url;
          if (plat === "LINKEDIN") socialMap.linkedinProfile = l.url;
          if (plat === "X") socialMap.xProfile = l.url;
          if (plat === "INSTAGRAM") socialMap.instagramProfile = l.url;
          if (plat === "WHATSAPP") socialMap.whatsappNumber = l.url;
          if (plat === "PORTFOLIO") socialMap.portfolioUrl = l.url;
        });

        student = {
          ...m.student,
          ...socialMap,
          year: progress.academicYearLabel,
          academicYear: progress.academicYear,
          semester: progress.semester,
          academicStatus: progress.academicStatus,
        };
      }

      return {
        ...m,
        _id: m.id,
        student,
        isClubAccount: false,
        clubName: club?.clubName,
      };
    });

    res.json(normalizedMembers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMemberPermissions = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { role, permissions, customPermissions, status } = req.body;

    const existing = await prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: {
        club: { select: { id: true, clubName: true, clubEmail: true, slug: true } },
        student: { select: { id: true, name: true, email: true, rollNo: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ message: "Membership record not found. Try refreshing the member list." });
    }

    if (!(await canManageClubMembers(req, existing.clubId))) {
      return res.status(403).json({ message: "Unauthorized to update members in this club." });
    }

    const isAdmin = req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN" || req.user?.principalType === "ADMIN";
    const requesterId = req.user?.studentId || req.user?.userId || req.user?.id;
    const isSelfModification = Boolean(
      requesterId &&
      (String(existing.studentId) === String(requesterId) || (existing.student?.email && req.user?.email && existing.student.email.trim().toLowerCase() === req.user.email.trim().toLowerCase()))
    );
    if (isSelfModification && !isAdmin) {
      return res.status(400).json({ message: "You cannot modify your own role or permissions." });
    }

    const updateData = {};

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}.`,
        });
      }

      if (role === "CLUB_HEAD" && existing.role !== "CLUB_HEAD") {
        if (!isAdmin) {
          return res.status(403).json({
            message: "Only administrators can assign the Club Head role.",
          });
        }
        const activeHeads = await prisma.clubMembership.count({
          where: { clubId: existing.clubId, role: "CLUB_HEAD", id: { not: membershipId } },
        });
        if (activeHeads >= MAX_CLUB_STUDENT_LEADS) {
          return res.status(409).json({
            message: "This club already has an active Club Head.",
          });
        }

        const studentOtherHeadship = await prisma.clubMembership.findFirst({
          where: {
            studentId: existing.studentId,
            role: "CLUB_HEAD",
            clubId: { not: existing.clubId },
          },
          include: { club: { select: { clubName: true } } },
        });
        if (studentOtherHeadship) {
          return res.status(409).json({
            message: `This student is already the Club Head of "${studentOtherHeadship.club.clubName}". A student can be the Head of only one club at a time. They may still be appointed as Coordinator.`,
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

    if (updateData.role === "CLUB_HEAD" && existing.role !== "CLUB_HEAD" && membership.student?.email) {
      const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
      try {
        await sendEmail({
          to: membership.student.email,
          template: "clubs:student-head-assigned",
          data: {
            studentName: membership.student.name,
            studentEmail: membership.student.email,
            rollNo: membership.student.rollNo,
            clubName: existing.club?.clubName || "Club",
            dashboardUrl: `${clientUrl}/club/${existing.club?.slug || existing.club?.id}`,
          },
        });
      } catch (emailErr) {
        console.error("Failed to send student head appointment email:", emailErr?.message || emailErr);
      }
    }

    res.json({ message: "Updated successfully.", membership: { ...membership, _id: membership.id } });
  } catch (err) {
    console.error("updateMemberPermissions error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const transferStudentLead = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { targetMembershipId, targetStudentId, targetEmail } = req.body;

    const isAdmin = req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN" || req.user?.principalType === "ADMIN";
    if (!isAdmin) {
      return res.status(403).json({ message: "Only administrators can transfer the Club Head role." });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ message: "Club not found." });

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
      return res.status(400).json({ message: "Target member is already the active Club Head." });
    }

    const studentOtherHeadship = await prisma.clubMembership.findFirst({
      where: {
        studentId: targetMembership.studentId,
        role: "CLUB_HEAD",
        clubId: { not: clubId },
      },
      include: { club: { select: { clubName: true } } },
    });
    if (studentOtherHeadship) {
      return res.status(409).json({
        message: `${targetMembership.student?.name || "This student"} is already the Club Head of "${studentOtherHeadship.club.clubName}". A student can lead only one club at a time.`,
      });
    }

    const newStudentLead = await prisma.$transaction(async (tx) => {
      await tx.clubMembership.updateMany({
        where: { clubId, role: "CLUB_HEAD" },
        data: {
          role: "COORDINATOR",
          canTakeAttendance: true,
          canEditEvents: true,
        },
      });

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

    if (newStudentLead.student?.email) {
      const clientUrl = process.env.CLIENT_URL || "https://campusnode.vercel.app";
      try {
        await sendEmail({
          to: newStudentLead.student.email,
          template: "clubs:student-head-assigned",
          data: {
            studentName: newStudentLead.student.name,
            studentEmail: newStudentLead.student.email,
            rollNo: newStudentLead.student.rollNo,
            clubName: club.clubName,
            dashboardUrl: `${clientUrl}/clubs/${club.slug || club.id}`,
          },
        });
      } catch (emailErr) {
        console.error("Failed to send student lead transfer email:", emailErr?.message || emailErr);
      }
    }

    res.json({
      message: `Leadership successfully transferred to ${newStudentLead.student?.name || "new Club Head"}.`,
      studentLead: { ...newStudentLead, _id: newStudentLead.id },
    });
  } catch (err) {
    console.error("transferStudentLead error:", err);
    res.status(500).json({ message: err.message });
  }
};

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

    const isAdmin = req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN" || req.user?.principalType === "ADMIN";
    const requesterId = req.user?.studentId || req.user?.userId || req.user?.id;
    const isSelfRemoval = Boolean(
      requesterId &&
      (String(membership.studentId) === String(requesterId) || (membership.student?.email && req.user?.email && membership.student.email.trim().toLowerCase() === req.user.email.trim().toLowerCase()))
    );
    if (isSelfRemoval && !isAdmin) {
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

export const searchStudentsForClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const raw = req.query.q || req.query.query;

    if (!raw || String(raw).trim().length < 1) {
      return res.json({ students: [] });
    }

    const query = String(raw).trim();

    // Fetch all admin emails to exclude them
    const admins = await prisma.adminRole.findMany({ select: { email: true } });
    const excludedEmails = admins.map((a) => (a.email ? a.email.toLowerCase() : "")).filter(Boolean);

    const existingMembers = await prisma.clubMembership.findMany({
      where: { clubId },
      select: { studentId: true },
    });
    const existingMemberIds = new Set(existingMembers.map((m) => m.studentId));

    const students = await prisma.studentUser.findMany({
      where: {
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
        expectedGraduationYear: true,
        program: true,
      },
      take: 10,
    });

    const enriched = await Promise.all(
      students.map(async (s) => {
        const progress = calculateAcademicProgress(s);
        const headship = await prisma.clubMembership.findFirst({
          where: { studentId: s.id, role: "CLUB_HEAD" },
          include: { club: { select: { id: true, clubName: true } } },
        });
        return {
          ...s,
          year: progress.academicYearLabel,
          academicYear: progress.academicYear,
          academicYearLabel: progress.academicYearLabel,
          semester: progress.semester,
          semesterLabel: progress.semesterLabel,
          academicStatus: progress.academicStatus,
          isAlreadyMember: existingMemberIds.has(s.id),
          currentHeadClub: headship ? headship.club : null,
        };
      })
    );

    res.json({ students: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
