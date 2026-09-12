-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_recipientStudentId_fkey";

-- AlterTable
ALTER TABLE "AdminRole" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "recipientStudentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StudentUser" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientStudentId_fkey" FOREIGN KEY ("recipientStudentId") REFERENCES "StudentUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
