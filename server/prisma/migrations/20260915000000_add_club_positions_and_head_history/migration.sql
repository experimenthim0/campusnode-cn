-- AlterTable
ALTER TABLE "ClubMembership" ADD COLUMN     "position" VARCHAR(100);

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

-- CreateIndex
CREATE INDEX "ClubHeadHistory_clubId_idx" ON "ClubHeadHistory"("clubId");

-- CreateIndex
CREATE INDEX "ClubHeadHistory_studentId_idx" ON "ClubHeadHistory"("studentId");

-- CreateIndex
CREATE INDEX "ClubHeadHistory_clubId_endedAt_idx" ON "ClubHeadHistory"("clubId", "endedAt");

-- AddForeignKey
ALTER TABLE "ClubHeadHistory" ADD CONSTRAINT "ClubHeadHistory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubHeadHistory" ADD CONSTRAINT "ClubHeadHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
