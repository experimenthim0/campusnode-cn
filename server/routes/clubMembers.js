import express from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import { validate, objectIdSchema } from "../middleware/validate.js";
import prisma from "../lib/prisma.js";
import {
  addClubMember,
  getClubMembers,
  updateMemberPermissions,
  transferStudentLead,
  removeClubMember,
  searchStudentsForClub,
} from "../controllers/clubMemberController.js";

const router = express.Router();

const clubIdParamSchema = z.object({
  params: z.object({ clubId: objectIdSchema }).passthrough(),
  body: z.any().optional(),
  query: z.any().optional(),
});

const membershipIdParamSchema = z.object({
  params: z.object({ membershipId: objectIdSchema }).passthrough(),
  body: z.any().optional(),
  query: z.any().optional(),
});

const extractMembershipClubId = async (req) => {
  if (req.params.clubId) return { clubId: req.params.clubId };
  if (req.params.membershipId) {
    const mem = await prisma.clubMembership.findUnique({
      where: { id: req.params.membershipId },
      select: { clubId: true },
    });
    return mem ? { clubId: mem.clubId } : null;
  }
  return null;
};

router.get("/:clubId/members", validate(clubIdParamSchema), getClubMembers);

router.use(verifyToken);

// Fast endpoint: returns only the authenticated user's membership in this club
router.get("/:clubId/my-membership", validate(clubIdParamSchema), async (req, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const membership = await prisma.clubMembership.findFirst({
      where: { clubId, studentId: userId },
      select: { id: true, role: true, canEditEvents: true, canTakeAttendance: true },
    });

    if (!membership) return res.status(404).json({ message: "Not a member" });
    res.json(membership);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get(
  "/:clubId/search-students",
  validate(clubIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_INVITE_MEMBERS, extractMembershipClubId),
  searchStudentsForClub
);

router.post(
  "/:clubId/members",
  validate(clubIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_INVITE_MEMBERS, extractMembershipClubId),
  addClubMember
);

router.post(
  "/:clubId/transfer-student-lead",
  validate(clubIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_TRANSFER_LEADERSHIP, extractMembershipClubId),
  transferStudentLead
);

router.put(
  "/members/:membershipId",
  validate(membershipIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_ASSIGN_ROLES, extractMembershipClubId),
  updateMemberPermissions
);

router.delete(
  "/members/:membershipId",
  validate(membershipIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_REMOVE_MEMBERS, extractMembershipClubId),
  removeClubMember
);

export default router;
