import express from "express";
import { z } from "zod";
import { verifyToken, allowRoles, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import { validate, objectIdSchema } from "../middleware/validate.js";
import {
  addClubMember,
  getClubMembers,
  updateMemberPermissions,
  transferStudentLead,
  removeClubMember
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

// Public route: GET /api/club-members/:clubId/members
router.get("/:clubId/members", validate(clubIdParamSchema), getClubMembers);

// Protected routes require token
router.use(verifyToken);

// POST /api/club-members/:clubId/members
router.post("/:clubId/members", requirePermission(PERMISSIONS.CLUB_MANAGE_MEMBERS), validate(clubIdParamSchema), addClubMember);

// POST /api/club-members/:clubId/transfer-student-lead
router.post("/:clubId/transfer-student-lead", requirePermission(PERMISSIONS.CLUB_MANAGE_MEMBERS), validate(clubIdParamSchema), transferStudentLead);

// PUT /api/club-members/members/:membershipId
router.put("/members/:membershipId", requirePermission(PERMISSIONS.CLUB_MANAGE_MEMBERS), validate(membershipIdParamSchema), updateMemberPermissions);

// DELETE /api/club-members/members/:membershipId
router.delete("/members/:membershipId", requirePermission(PERMISSIONS.CLUB_MANAGE_MEMBERS), validate(membershipIdParamSchema), removeClubMember);


export default router;
