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

// Public route: GET /api/club-members/:clubId/members
router.get("/:clubId/members", validate(clubIdParamSchema), getClubMembers);

// Protected routes require token
router.use(verifyToken);

// GET /api/club-members/:clubId/search-students
router.get(
  "/:clubId/search-students",
  validate(clubIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_INVITE_MEMBERS, extractMembershipClubId),
  searchStudentsForClub
);

// POST /api/club-members/:clubId/members
router.post(
  "/:clubId/members",
  validate(clubIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_INVITE_MEMBERS, extractMembershipClubId),
  addClubMember
);

// POST /api/club-members/:clubId/transfer-student-lead
router.post(
  "/:clubId/transfer-student-lead",
  validate(clubIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_TRANSFER_LEADERSHIP, extractMembershipClubId),
  transferStudentLead
);

// PUT /api/club-members/members/:membershipId
router.put(
  "/members/:membershipId",
  validate(membershipIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_ASSIGN_ROLES, extractMembershipClubId),
  updateMemberPermissions
);

// DELETE /api/club-members/members/:membershipId
router.delete(
  "/members/:membershipId",
  validate(membershipIdParamSchema),
  requirePermission(PERMISSIONS.CLUB_REMOVE_MEMBERS, extractMembershipClubId),
  removeClubMember
);

export default router;
