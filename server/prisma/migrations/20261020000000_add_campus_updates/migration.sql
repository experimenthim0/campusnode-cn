-- CreateEnum
CREATE TYPE "UpdateCategory" AS ENUM ('OFFICIAL', 'TPO', 'IMPORTANT');

-- CreateEnum
CREATE TYPE "UpdateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

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
CREATE INDEX "CampusUpdate_status_publishedAt_idx" ON "CampusUpdate"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "CampusUpdate_category_status_idx" ON "CampusUpdate"("category", "status");

-- CreateIndex
CREATE INDEX "CampusUpdate_isPinned_status_idx" ON "CampusUpdate"("isPinned", "status");

-- CreateIndex
CREATE INDEX "CampusUpdate_createdAt_idx" ON "CampusUpdate"("createdAt");
