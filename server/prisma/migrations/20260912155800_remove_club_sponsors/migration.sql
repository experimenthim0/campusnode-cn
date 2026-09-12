-- Delete existing club-only sponsors before removing clubId column
DELETE FROM "Sponsor" WHERE "clubId" IS NOT NULL AND "eventId" IS NULL;

-- DropForeignKey
ALTER TABLE "Sponsor" DROP CONSTRAINT IF EXISTS "Sponsor_clubId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Sponsor_clubId_idx";

-- AlterTable
ALTER TABLE "Sponsor" DROP COLUMN IF EXISTS "clubId";
