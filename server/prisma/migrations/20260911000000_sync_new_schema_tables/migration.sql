-- CreateEnum for SocialPlatform
DO $$ BEGIN
    CREATE TYPE "SocialPlatform" AS ENUM ('GITHUB', 'LINKEDIN', 'X', 'INSTAGRAM', 'WHATSAPP', 'PORTFOLIO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 1. EventOrganizer Table
CREATE TABLE IF NOT EXISTS "EventOrganizer" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "clubId" VARCHAR(24) NOT NULL,

    CONSTRAINT "EventOrganizer_pkey" PRIMARY KEY ("id")
);

-- Backfill EventOrganizer from legacy EventClub if table exists
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'EventClub') THEN
        INSERT INTO "EventOrganizer" ("id", "eventId", "clubId")
        SELECT "id", "eventId", "clubId" FROM "EventClub"
        ON CONFLICT ("id") DO NOTHING;
    END IF;
END $$;

-- Backfill EventOrganizer from Event.clubId for any single-club events not yet in EventOrganizer
INSERT INTO "EventOrganizer" ("id", "eventId", "clubId")
SELECT 
    SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24),
    "id" AS "eventId",
    "clubId"
FROM "Event"
WHERE "clubId" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "EventOrganizer" eo 
      WHERE eo."eventId" = "Event"."id" AND eo."clubId" = "Event"."clubId"
  );

-- EventOrganizer Indexes and Constraints
CREATE INDEX IF NOT EXISTS "EventOrganizer_eventId_idx" ON "EventOrganizer"("eventId");
CREATE INDEX IF NOT EXISTS "EventOrganizer_clubId_idx" ON "EventOrganizer"("clubId");
CREATE UNIQUE INDEX IF NOT EXISTS "EventOrganizer_eventId_clubId_key" ON "EventOrganizer"("eventId", "clubId");

ALTER TABLE "EventOrganizer" 
    DROP CONSTRAINT IF EXISTS "EventOrganizer_eventId_fkey",
    ADD CONSTRAINT "EventOrganizer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventOrganizer" 
    DROP CONSTRAINT IF EXISTS "EventOrganizer_clubId_fkey",
    ADD CONSTRAINT "EventOrganizer_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. StudentSocialLink Table
CREATE TABLE IF NOT EXISTS "StudentSocialLink" (
    "id" VARCHAR(24) NOT NULL,
    "studentId" VARCHAR(24) NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" VARCHAR NOT NULL,

    CONSTRAINT "StudentSocialLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentSocialLink_studentId_idx" ON "StudentSocialLink"("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentSocialLink_studentId_platform_key" ON "StudentSocialLink"("studentId", "platform");

ALTER TABLE "StudentSocialLink" 
    DROP CONSTRAINT IF EXISTS "StudentSocialLink_studentId_fkey",
    ADD CONSTRAINT "StudentSocialLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill StudentSocialLink from inline columns on StudentUser if present
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'StudentUser' AND column_name = 'githubProfile') THEN
        INSERT INTO "StudentSocialLink" ("id", "studentId", "platform", "url")
        SELECT SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24), "id", 'GITHUB'::"SocialPlatform", "githubProfile"
        FROM "StudentUser" WHERE "githubProfile" IS NOT NULL AND "githubProfile" != ''
        ON CONFLICT ("studentId", "platform") DO UPDATE SET "url" = EXCLUDED."url";
    END IF;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'StudentUser' AND column_name = 'linkedinProfile') THEN
        INSERT INTO "StudentSocialLink" ("id", "studentId", "platform", "url")
        SELECT SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24), "id", 'LINKEDIN'::"SocialPlatform", "linkedinProfile"
        FROM "StudentUser" WHERE "linkedinProfile" IS NOT NULL AND "linkedinProfile" != ''
        ON CONFLICT ("studentId", "platform") DO UPDATE SET "url" = EXCLUDED."url";
    END IF;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'StudentUser' AND column_name = 'instagramProfile') THEN
        INSERT INTO "StudentSocialLink" ("id", "studentId", "platform", "url")
        SELECT SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24), "id", 'INSTAGRAM'::"SocialPlatform", "instagramProfile"
        FROM "StudentUser" WHERE "instagramProfile" IS NOT NULL AND "instagramProfile" != ''
        ON CONFLICT ("studentId", "platform") DO UPDATE SET "url" = EXCLUDED."url";
    END IF;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'StudentUser' AND column_name = 'whatsappNumber') THEN
        INSERT INTO "StudentSocialLink" ("id", "studentId", "platform", "url")
        SELECT SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24), "id", 'WHATSAPP'::"SocialPlatform", "whatsappNumber"
        FROM "StudentUser" WHERE "whatsappNumber" IS NOT NULL AND "whatsappNumber" != ''
        ON CONFLICT ("studentId", "platform") DO UPDATE SET "url" = EXCLUDED."url";
    END IF;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'StudentUser' AND column_name = 'xProfile') THEN
        INSERT INTO "StudentSocialLink" ("id", "studentId", "platform", "url")
        SELECT SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24), "id", 'X'::"SocialPlatform", "xProfile"
        FROM "StudentUser" WHERE "xProfile" IS NOT NULL AND "xProfile" != ''
        ON CONFLICT ("studentId", "platform") DO UPDATE SET "url" = EXCLUDED."url";
    END IF;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'StudentUser' AND column_name = 'portfolioUrl') THEN
        INSERT INTO "StudentSocialLink" ("id", "studentId", "platform", "url")
        SELECT SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 24), "id", 'PORTFOLIO'::"SocialPlatform", "portfolioUrl"
        FROM "StudentUser" WHERE "portfolioUrl" IS NOT NULL AND "portfolioUrl" != ''
        ON CONFLICT ("studentId", "platform") DO UPDATE SET "url" = EXCLUDED."url";
    END IF;
END $$;

-- 3. Participation.userId Backfill and Constraints
ALTER TABLE "Participation" ADD COLUMN IF NOT EXISTS "userId" VARCHAR(24);

UPDATE "Participation"
SET "userId" = COALESCE("studentId", "externalUserId")
WHERE "userId" IS NULL;

ALTER TABLE "Participation" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Participation_userId_createdAt_idx" ON "Participation"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Participation_userId_eventId_idx" ON "Participation"("userId", "eventId");

-- 4. Certificate.userId Backfill and Constraints
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "userId" VARCHAR(24);

UPDATE "Certificate"
SET "userId" = COALESCE("studentId", "externalUserId")
WHERE "userId" IS NULL;

ALTER TABLE "Certificate" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Certificate_userId_idx" ON "Certificate"("userId");

-- 5. Team & TeamMember relations
UPDATE "Team" SET "leaderStudentId" = "leaderId" WHERE "leaderStudentId" IS NULL;
ALTER TABLE "Team" ALTER COLUMN "leaderStudentId" SET NOT NULL;

ALTER TABLE "Team"
    DROP CONSTRAINT IF EXISTS "Team_leaderStudentId_fkey",
    ADD CONSTRAINT "Team_leaderStudentId_fkey" FOREIGN KEY ("leaderStudentId") REFERENCES "StudentUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "TeamMember" SET "studentId" = "userId" WHERE "studentId" IS NULL;
ALTER TABLE "TeamMember" ALTER COLUMN "studentId" SET NOT NULL;

ALTER TABLE "TeamMember"
    DROP CONSTRAINT IF EXISTS "TeamMember_studentId_fkey",
    ADD CONSTRAINT "TeamMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Ensure default CURRENT_TIMESTAMP for updatedAt columns on core tables
ALTER TABLE "AdminRole" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Club" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StudentUser" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
