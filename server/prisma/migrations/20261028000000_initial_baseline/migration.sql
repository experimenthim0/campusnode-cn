-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRoleType" AS ENUM ('admin');

-- CreateEnum
CREATE TYPE "ClubMemberRole" AS ENUM ('CLUB_HEAD', 'COORDINATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'WAITLISTED', 'CANCELLED', 'INVITED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'DELETION_REQUESTED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'SPONSOR_LOGO');

-- CreateEnum
CREATE TYPE "AttendSimilar" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "FeaturedOrderingMode" AS ENUM ('CUSTOM', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('GITHUB', 'LINKEDIN', 'X', 'INSTAGRAM', 'WHATSAPP', 'PORTFOLIO');

-- CreateEnum
CREATE TYPE "UpdateCategory" AS ENUM ('OFFICIAL', 'TPO', 'IMPORTANT');

-- CreateEnum
CREATE TYPE "UpdateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AdminRole" (
    "id" VARCHAR(24) NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "role" "AdminRoleType" NOT NULL DEFAULT 'admin',
    "profileImage" VARCHAR,
    "isTwoStepEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentUser" (
    "id" VARCHAR(24) NOT NULL,
    "rollNo" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "branch" VARCHAR NOT NULL,
    "program" VARCHAR NOT NULL,
    "expectedGraduationYear" INTEGER NOT NULL,
    "phone" VARCHAR,
    "profileImage" VARCHAR,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isTwoStepEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSocialLink" (
    "id" VARCHAR(24) NOT NULL,
    "studentId" VARCHAR(24) NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" VARCHAR NOT NULL,

    CONSTRAINT "StudentSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalUser" (
    "id" VARCHAR(24) NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "collegeName" VARCHAR NOT NULL,
    "phone" VARCHAR,
    "program" VARCHAR,
    "graduationYear" INTEGER,
    "profileImage" VARCHAR,
    "portfolioUrl" VARCHAR,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isTwoStepEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyUser" (
    "id" VARCHAR(24) NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "department" VARCHAR NOT NULL,
    "profileImage" VARCHAR,
    "designation" VARCHAR,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isTwoStepEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" VARCHAR(24) NOT NULL,
    "clubName" VARCHAR NOT NULL,
    "slug" VARCHAR NOT NULL,
    "description" VARCHAR,
    "category" VARCHAR,
    "clubLogo" VARCHAR,
    "bannerImage" VARCHAR,
    "facultyCoordinatorId" VARCHAR(24),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clubEmail" VARCHAR,
    "facultyEmail" VARCHAR,
    "facultyName" VARCHAR,
    "studentcoordinators" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "motto" VARCHAR,
    "mission" VARCHAR,
    "establishedYear" VARCHAR,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubFacultyCoordinator" (
    "id" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,
    "facultyId" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubFacultyCoordinator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSocialLink" (
    "id" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,
    "platform" VARCHAR NOT NULL,
    "url" VARCHAR NOT NULL,

    CONSTRAINT "ClubSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "id" VARCHAR(24) NOT NULL,
    "studentId" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,
    "role" "ClubMemberRole" NOT NULL DEFAULT 'MEMBER',
    "position" VARCHAR(100),
    "customPermissions" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "canEditEvents" BOOLEAN NOT NULL DEFAULT false,
    "canTakeAttendance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubHeadHistory" (
    "id" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,
    "studentId" VARCHAR(24) NOT NULL,
    "name" VARCHAR NOT NULL,
    "position" VARCHAR(100),
    "academicYear" VARCHAR(20),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubHeadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" VARCHAR(24) NOT NULL,
    "title" VARCHAR NOT NULL,
    "slug" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,
    "venue" VARCHAR NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "totalSeats" INTEGER NOT NULL DEFAULT 0,
    "allowedPrograms" VARCHAR[] DEFAULT ARRAY['BTECH', 'MTECH', 'OTHER']::VARCHAR[],
    "allowedYears" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "allowedBranches" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "imageUrl" VARCHAR,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "waitingListIds" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "requiredFields" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "customFields" JSONB,
    "createdById" VARCHAR(24),
    "registrationDeadline" TIMESTAMP(3),
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewComment" VARCHAR,
    "reviewedById" VARCHAR(24),
    "reviewedByFacultyId" VARCHAR(24),
    "winners" JSONB,
    "showWinner" BOOLEAN NOT NULL DEFAULT false,
    "provideCertificate" BOOLEAN NOT NULL DEFAULT false,
    "certificateTemplate" JSONB,
    "registrationFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentInstructions" VARCHAR,
    "collegePaymentUrl" VARCHAR,
    "accountHolderName" VARCHAR,
    "postRegistrationMessage" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "allowExternal" BOOLEAN NOT NULL DEFAULT true,
    "allowWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "feedbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "registrationType" VARCHAR NOT NULL DEFAULT 'individual',
    "minTeamSize" INTEGER NOT NULL DEFAULT 1,
    "maxTeamSize" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOrganizer" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,

    CONSTRAINT "EventOrganizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "studentId" VARCHAR(24),
    "externalUserId" VARCHAR(24),
    "facultyId" VARCHAR(24),
    "status" "ParticipationStatus" NOT NULL DEFAULT 'REGISTERED',
    "qrCode" VARCHAR,
    "qrVersion" INTEGER,
    "qrPayload" VARCHAR,
    "qrKeyId" VARCHAR,
    "attendedAt" TIMESTAMP(3),
    "markedByMemberId" VARCHAR(24),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "paymentTimestamp" TIMESTAMP(3),
    "transactionId" VARCHAR,
    "payerName" VARCHAR,
    "paymentRemarks" VARCHAR,
    "paymentReviewedBy" VARCHAR,
    "paymentReviewedAt" TIMESTAMP(3),
    "paymentReviewMessage" VARCHAR,
    "formResponses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" VARCHAR(24),

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "participationId" VARCHAR(24) NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "verificationMode" VARCHAR NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "localAttendanceId" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "teamName" VARCHAR NOT NULL,
    "leaderId" VARCHAR(24) NOT NULL,
    "leaderStudentId" VARCHAR(24) NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'active',
    "rejectedMembers" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" VARCHAR(24) NOT NULL,
    "teamId" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "studentId" VARCHAR(24) NOT NULL,
    "role" VARCHAR NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" VARCHAR(24) NOT NULL,
    "senderStudentId" VARCHAR(24),
    "senderAdminId" VARCHAR(24),
    "senderFacultyId" VARCHAR(24),
    "recipientStudentId" VARCHAR(24),
    "clubId" VARCHAR(24),
    "eventId" VARCHAR(24),
    "teamId" VARCHAR(24),
    "type" VARCHAR,
    "title" VARCHAR NOT NULL,
    "message" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readBy" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" VARCHAR(24) NOT NULL,
    "url" VARCHAR NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "caption" VARCHAR,
    "albumTitle" VARCHAR DEFAULT 'General',
    "clubId" VARCHAR(24),
    "eventId" VARCHAR(24),

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" VARCHAR(24) NOT NULL,
    "name" VARCHAR NOT NULL,
    "logoUrl" VARCHAR NOT NULL,
    "websiteUrl" VARCHAR,
    "eventId" VARCHAR(24),

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR,
    "resource" VARCHAR NOT NULL,
    "action" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" VARCHAR NOT NULL,
    "role" VARCHAR NOT NULL,
    "permissionId" VARCHAR NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" VARCHAR(24) NOT NULL,
    "action" VARCHAR NOT NULL,
    "actorType" VARCHAR,
    "actorId" VARCHAR(24) NOT NULL,
    "actorEmail" VARCHAR NOT NULL,
    "targetId" VARCHAR(24),
    "clubId" VARCHAR(24),
    "eventId" VARCHAR(24),
    "metadata" JSONB,
    "source" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" VARCHAR(24) NOT NULL,
    "dataset" VARCHAR NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "actorId" VARCHAR(24) NOT NULL,
    "actorEmail" VARCHAR NOT NULL,
    "actorRole" VARCHAR NOT NULL,
    "filters" JSONB,
    "columns" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" VARCHAR(24) NOT NULL,
    "name" VARCHAR NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueBlackout" (
    "id" VARCHAR(24) NOT NULL,
    "venue" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "reason" VARCHAR,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdById" VARCHAR(24),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueBlackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAnnouncement" (
    "id" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,
    "title" VARCHAR NOT NULL,
    "content" VARCHAR NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "authorName" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAchievement" (
    "id" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR,
    "date" VARCHAR,
    "imageUrl" VARCHAR,
    "externalUrl" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFeedback" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "organizationRating" INTEGER NOT NULL,
    "usefulnessRating" INTEGER NOT NULL,
    "speakerRating" INTEGER NOT NULL,
    "venueRating" INTEGER NOT NULL,
    "timingRating" INTEGER NOT NULL,
    "attendSimilar" "AttendSimilar" NOT NULL,
    "liked" VARCHAR,
    "improvements" VARCHAR,
    "comments" VARCHAR,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedEvent" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "sponsorName" VARCHAR,
    "sponsorLogo" VARCHAR,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedEventSetting" (
    "id" VARCHAR(24) NOT NULL DEFAULT 'default',
    "orderingMode" "FeaturedOrderingMode" NOT NULL DEFAULT 'CUSTOM',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedEventSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "participationId" VARCHAR(24) NOT NULL,
    "userId" VARCHAR(24) NOT NULL,
    "studentId" VARCHAR(24),
    "externalUserId" VARCHAR(24),
    "facultyId" VARCHAR(24),
    "recipientName" VARCHAR NOT NULL,
    "recipientRollNo" VARCHAR,
    "recipientEmail" VARCHAR NOT NULL,
    "awardPosition" VARCHAR NOT NULL DEFAULT 'Participant',
    "certificateNumber" VARCHAR NOT NULL,
    "verificationToken" VARCHAR NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" VARCHAR,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusUpdate" (
    "id" VARCHAR(24) NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "category" "UpdateCategory" NOT NULL,
    "organizationName" VARCHAR NOT NULL,
    "organizationAvatar" VARCHAR,
    "images" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "attachments" JSONB,
    "deadline" TIMESTAMP(3),
    "actionLabel" VARCHAR,
    "actionUrl" VARCHAR,
    "sourceReference" VARCHAR,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "UpdateStatus" NOT NULL DEFAULT 'PUBLISHED',
    "pinnedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" VARCHAR(24),

    CONSTRAINT "CampusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_email_key" ON "AdminRole"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentUser_rollNo_key" ON "StudentUser"("rollNo");

-- CreateIndex
CREATE UNIQUE INDEX "StudentUser_email_key" ON "StudentUser"("email");

-- CreateIndex
CREATE INDEX "StudentSocialLink_studentId_idx" ON "StudentSocialLink"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSocialLink_studentId_platform_key" ON "StudentSocialLink"("studentId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalUser_email_key" ON "ExternalUser"("email");

-- CreateIndex
CREATE INDEX "ExternalUser_email_idx" ON "ExternalUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyUser_email_key" ON "FacultyUser"("email");

-- CreateIndex
CREATE INDEX "FacultyUser_email_idx" ON "FacultyUser"("email");

-- CreateIndex
CREATE INDEX "FacultyUser_department_idx" ON "FacultyUser"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Club_clubName_key" ON "Club"("clubName");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "ClubFacultyCoordinator_clubId_idx" ON "ClubFacultyCoordinator"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubFacultyCoordinator_facultyId_key" ON "ClubFacultyCoordinator"("facultyId");

-- CreateIndex
CREATE INDEX "ClubSocialLink_clubId_idx" ON "ClubSocialLink"("clubId");

-- CreateIndex
CREATE INDEX "ClubMembership_studentId_idx" ON "ClubMembership"("studentId");

-- CreateIndex
CREATE INDEX "ClubMembership_clubId_role_idx" ON "ClubMembership"("clubId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMembership_clubId_studentId_key" ON "ClubMembership"("clubId", "studentId");

-- CreateIndex
CREATE INDEX "ClubHeadHistory_clubId_idx" ON "ClubHeadHistory"("clubId");

-- CreateIndex
CREATE INDEX "ClubHeadHistory_studentId_idx" ON "ClubHeadHistory"("studentId");

-- CreateIndex
CREATE INDEX "ClubHeadHistory_clubId_endedAt_idx" ON "ClubHeadHistory"("clubId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_reviewStatus_startTime_idx" ON "Event"("reviewStatus", "startTime");

-- CreateIndex
CREATE INDEX "Event_createdById_startTime_idx" ON "Event"("createdById", "startTime");

-- CreateIndex
CREATE INDEX "Event_reviewedByFacultyId_idx" ON "Event"("reviewedByFacultyId");

-- CreateIndex
CREATE INDEX "EventOrganizer_eventId_idx" ON "EventOrganizer"("eventId");

-- CreateIndex
CREATE INDEX "EventOrganizer_clubId_idx" ON "EventOrganizer"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOrganizer_eventId_clubId_key" ON "EventOrganizer"("eventId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_qrCode_key" ON "Participation"("qrCode");

-- CreateIndex
CREATE INDEX "Participation_eventId_idx" ON "Participation"("eventId");

-- CreateIndex
CREATE INDEX "Participation_userId_createdAt_idx" ON "Participation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Participation_userId_eventId_idx" ON "Participation"("userId", "eventId");

-- CreateIndex
CREATE INDEX "Participation_studentId_eventId_idx" ON "Participation"("studentId", "eventId");

-- CreateIndex
CREATE INDEX "Participation_externalUserId_idx" ON "Participation"("externalUserId");

-- CreateIndex
CREATE INDEX "Participation_facultyId_idx" ON "Participation"("facultyId");

-- CreateIndex
CREATE INDEX "Participation_eventId_paymentStatus_idx" ON "Participation"("eventId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Participation_eventId_status_idx" ON "Participation"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_eventId_studentId_key" ON "Participation"("eventId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_eventId_externalUserId_key" ON "Participation"("eventId", "externalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_eventId_facultyId_key" ON "Participation"("eventId", "facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_localAttendanceId_key" ON "AttendanceRecord"("localAttendanceId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_eventId_scannedAt_idx" ON "AttendanceRecord"("eventId", "scannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_eventId_participationId_key" ON "AttendanceRecord"("eventId", "participationId");

-- CreateIndex
CREATE INDEX "Team_eventId_idx" ON "Team"("eventId");

-- CreateIndex
CREATE INDEX "Team_leaderId_idx" ON "Team"("leaderId");

-- CreateIndex
CREATE INDEX "Team_leaderStudentId_idx" ON "Team"("leaderStudentId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_studentId_idx" ON "TeamMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientStudentId_createdAt_idx" ON "Notification"("recipientStudentId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_clubId_createdAt_idx" ON "Notification"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_eventId_createdAt_idx" ON "Notification"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_teamId_createdAt_idx" ON "Notification"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_senderFacultyId_idx" ON "Notification"("senderFacultyId");

-- CreateIndex
CREATE INDEX "Media_clubId_idx" ON "Media"("clubId");

-- CreateIndex
CREATE INDEX "Media_eventId_idx" ON "Media"("eventId");

-- CreateIndex
CREATE INDEX "Sponsor_eventId_idx" ON "Sponsor"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_clubId_createdAt_idx" ON "AuditLog"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_eventId_createdAt_idx" ON "AuditLog"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ExportLog_actorId_createdAt_idx" ON "ExportLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportLog_dataset_createdAt_idx" ON "ExportLog"("dataset", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_name_key" ON "Venue"("name");

-- CreateIndex
CREATE INDEX "VenueBlackout_venue_startTime_idx" ON "VenueBlackout"("venue", "startTime");

-- CreateIndex
CREATE INDEX "VenueBlackout_startTime_endTime_idx" ON "VenueBlackout"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "ClubAnnouncement_clubId_isPublished_idx" ON "ClubAnnouncement"("clubId", "isPublished");

-- CreateIndex
CREATE INDEX "ClubAnnouncement_clubId_isPinned_idx" ON "ClubAnnouncement"("clubId", "isPinned");

-- CreateIndex
CREATE INDEX "ClubAchievement_clubId_createdAt_idx" ON "ClubAchievement"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "EventFeedback_eventId_submittedAt_idx" ON "EventFeedback"("eventId", "submittedAt");

-- CreateIndex
CREATE INDEX "EventFeedback_userId_submittedAt_idx" ON "EventFeedback"("userId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventFeedback_eventId_userId_key" ON "EventFeedback"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedEvent_eventId_key" ON "FeaturedEvent"("eventId");

-- CreateIndex
CREATE INDEX "FeaturedEvent_isActive_displayOrder_idx" ON "FeaturedEvent"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "FeaturedEvent_eventId_idx" ON "FeaturedEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_participationId_key" ON "Certificate"("participationId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationToken_key" ON "Certificate"("verificationToken");

-- CreateIndex
CREATE INDEX "Certificate_verificationToken_idx" ON "Certificate"("verificationToken");

-- CreateIndex
CREATE INDEX "Certificate_eventId_status_idx" ON "Certificate"("eventId", "status");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_studentId_idx" ON "Certificate"("studentId");

-- CreateIndex
CREATE INDEX "Certificate_externalUserId_idx" ON "Certificate"("externalUserId");

-- CreateIndex
CREATE INDEX "Certificate_facultyId_idx" ON "Certificate"("facultyId");

-- CreateIndex
CREATE INDEX "CampusUpdate_status_publishedAt_idx" ON "CampusUpdate"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "CampusUpdate_category_status_idx" ON "CampusUpdate"("category", "status");

-- CreateIndex
CREATE INDEX "CampusUpdate_isPinned_status_idx" ON "CampusUpdate"("isPinned", "status");

-- CreateIndex
CREATE INDEX "CampusUpdate_createdAt_idx" ON "CampusUpdate"("createdAt");

-- AddForeignKey
ALTER TABLE "StudentSocialLink" ADD CONSTRAINT "StudentSocialLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_facultyCoordinatorId_fkey" FOREIGN KEY ("facultyCoordinatorId") REFERENCES "FacultyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubFacultyCoordinator" ADD CONSTRAINT "ClubFacultyCoordinator_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubFacultyCoordinator" ADD CONSTRAINT "ClubFacultyCoordinator_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "FacultyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSocialLink" ADD CONSTRAINT "ClubSocialLink_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubHeadHistory" ADD CONSTRAINT "ClubHeadHistory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubHeadHistory" ADD CONSTRAINT "ClubHeadHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StudentUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "AdminRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_reviewedByFacultyId_fkey" FOREIGN KEY ("reviewedByFacultyId") REFERENCES "FacultyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrganizer" ADD CONSTRAINT "EventOrganizer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOrganizer" ADD CONSTRAINT "EventOrganizer_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_externalUserId_fkey" FOREIGN KEY ("externalUserId") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "FacultyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderStudentId_fkey" FOREIGN KEY ("leaderStudentId") REFERENCES "StudentUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderStudentId_fkey" FOREIGN KEY ("senderStudentId") REFERENCES "StudentUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderAdminId_fkey" FOREIGN KEY ("senderAdminId") REFERENCES "AdminRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderFacultyId_fkey" FOREIGN KEY ("senderFacultyId") REFERENCES "FacultyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientStudentId_fkey" FOREIGN KEY ("recipientStudentId") REFERENCES "StudentUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAnnouncement" ADD CONSTRAINT "ClubAnnouncement_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAchievement" ADD CONSTRAINT "ClubAchievement_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StudentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedEvent" ADD CONSTRAINT "FeaturedEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_externalUserId_fkey" FOREIGN KEY ("externalUserId") REFERENCES "ExternalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "FacultyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
