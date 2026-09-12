-- DropIndex
DROP INDEX IF EXISTS "Participation_externalEmail_idx";

-- AlterTable
ALTER TABLE "Participation" DROP COLUMN IF EXISTS "externalEmail",
DROP COLUMN IF EXISTS "externalName";
