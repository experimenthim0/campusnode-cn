-- 1. Clean Legacy Columns from Event first (so dependent enums can be dropped)
ALTER TABLE IF EXISTS "Event"
    DROP COLUMN IF EXISTS "centralOrganizerId",
    DROP COLUMN IF EXISTS "clubId",
    DROP COLUMN IF EXISTS "entryFee",
    DROP COLUMN IF EXISTS "institutionalAccountId",
    DROP COLUMN IF EXISTS "organizerType",
    DROP COLUMN IF EXISTS "paymentMethod",
    DROP COLUMN IF EXISTS "upiId";

-- 2. Clean Legacy Columns from StudentUser
ALTER TABLE IF EXISTS "StudentUser" 
    DROP COLUMN IF EXISTS "academicStatus",
    DROP COLUMN IF EXISTS "accessLevel",
    DROP COLUMN IF EXISTS "githubProfile",
    DROP COLUMN IF EXISTS "instagramProfile",
    DROP COLUMN IF EXISTS "isBlocked",
    DROP COLUMN IF EXISTS "lastLostFoundPostDate",
    DROP COLUMN IF EXISTS "lastPasswordChangeDate",
    DROP COLUMN IF EXISTS "linkedinProfile",
    DROP COLUMN IF EXISTS "lostFoundPostCount",
    DROP COLUMN IF EXISTS "otp",
    DROP COLUMN IF EXISTS "otpExpire",
    DROP COLUMN IF EXISTS "passwordChangeCount",
    DROP COLUMN IF EXISTS "portfolioUrl",
    DROP COLUMN IF EXISTS "resetPasswordExpire",
    DROP COLUMN IF EXISTS "resetPasswordToken",
    DROP COLUMN IF EXISTS "shopBlockedUntil",
    DROP COLUMN IF EXISTS "verificationToken",
    DROP COLUMN IF EXISTS "verificationTokenExpire",
    DROP COLUMN IF EXISTS "whatsappNumber",
    DROP COLUMN IF EXISTS "xProfile";

ALTER TABLE IF EXISTS "StudentUser"
    ALTER COLUMN "rollNo" SET NOT NULL,
    ALTER COLUMN "branch" SET NOT NULL,
    ALTER COLUMN "program" SET NOT NULL,
    ALTER COLUMN "expectedGraduationYear" SET NOT NULL;

-- 3. Clean Legacy Columns from AdminRole
ALTER TABLE IF EXISTS "AdminRole"
    DROP COLUMN IF EXISTS "lastPasswordChangeDate",
    DROP COLUMN IF EXISTS "otp",
    DROP COLUMN IF EXISTS "otpExpire",
    DROP COLUMN IF EXISTS "passwordChangeCount",
    DROP COLUMN IF EXISTS "resetPasswordExpire",
    DROP COLUMN IF EXISTS "resetPasswordToken";

-- 4. Clean Legacy Columns from ExternalUser
ALTER TABLE IF EXISTS "ExternalUser"
    DROP COLUMN IF EXISTS "githubProfile",
    DROP COLUMN IF EXISTS "instagramProfile",
    DROP COLUMN IF EXISTS "linkedinProfile",
    DROP COLUMN IF EXISTS "otp",
    DROP COLUMN IF EXISTS "otpExpire",
    DROP COLUMN IF EXISTS "resetPasswordExpire",
    DROP COLUMN IF EXISTS "resetPasswordToken",
    DROP COLUMN IF EXISTS "whatsappNumber",
    DROP COLUMN IF EXISTS "xProfile";

-- 5. Clean Legacy Columns from ClubMembership
ALTER TABLE IF EXISTS "ClubMembership"
    DROP COLUMN IF EXISTS "academicSessionId",
    DROP COLUMN IF EXISTS "status";

-- 6. Clean Legacy Columns from Notification
ALTER TABLE IF EXISTS "Notification"
    DROP COLUMN IF EXISTS "lostFoundItemId",
    DROP COLUMN IF EXISTS "recipientUserId",
    DROP COLUMN IF EXISTS "senderClubAccountId",
    DROP COLUMN IF EXISTS "senderInstitutionalAccountId",
    DROP COLUMN IF EXISTS "targetScope";

-- 7. Clean Legacy Columns from Participation
ALTER TABLE IF EXISTS "Participation"
    DROP COLUMN IF EXISTS "amountPaid",
    DROP COLUMN IF EXISTS "orderId",
    DROP COLUMN IF EXISTS "paymentId";

-- 8. Clean Legacy Columns from Team & TeamMember
ALTER TABLE IF EXISTS "Team"
    DROP COLUMN IF EXISTS "leaderExternalId";

ALTER TABLE IF EXISTS "TeamMember"
    DROP COLUMN IF EXISTS "externalUserId";

-- 9. Drop Legacy Tables completely (CASCADE)
DROP TABLE IF EXISTS "EventStaff" CASCADE;
DROP TABLE IF EXISTS "LostFoundReport" CASCADE;
DROP TABLE IF EXISTS "LostFoundItem" CASCADE;
DROP TABLE IF EXISTS "InstitutionalAccountAssignment" CASCADE;
DROP TABLE IF EXISTS "InstitutionalAccount" CASCADE;
DROP TABLE IF EXISTS "EventAIReview" CASCADE;
DROP TABLE IF EXISTS "ScannerSession" CASCADE;
DROP TABLE IF EXISTS "PushSubscription" CASCADE;
DROP TABLE IF EXISTS "EventClub" CASCADE;
DROP TABLE IF EXISTS "ClubAccount" CASCADE;

-- 10. Drop Legacy Enums (CASCADE)
DROP TYPE IF EXISTS "EventMode" CASCADE;
DROP TYPE IF EXISTS "EventOrganizerType" CASCADE;
DROP TYPE IF EXISTS "EventStaffStatus" CASCADE;
DROP TYPE IF EXISTS "InstitutionalAccountType" CASCADE;
DROP TYPE IF EXISTS "InstitutionalRole" CASCADE;
DROP TYPE IF EXISTS "LostFoundStatus" CASCADE;
DROP TYPE IF EXISTS "LostFoundType" CASCADE;

-- 11. Add Missing Constraints & Relations
ALTER TABLE IF EXISTS "Participation" DROP CONSTRAINT IF EXISTS "Participation_teamId_fkey";
ALTER TABLE "Participation" 
    ADD CONSTRAINT "Participation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "Notification" DROP CONSTRAINT IF EXISTS "Notification_clubId_fkey";
ALTER TABLE "Notification" 
    ADD CONSTRAINT "Notification_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_permissionId_fkey";
ALTER TABLE "RolePermission" 
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE IF EXISTS "FeaturedEvent" DROP CONSTRAINT IF EXISTS "FeaturedEvent_eventId_fkey";
ALTER TABLE "FeaturedEvent" 
    ADD CONSTRAINT "FeaturedEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
