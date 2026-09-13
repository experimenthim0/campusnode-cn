-- CreateTable: FacultyUser
CREATE TABLE IF NOT EXISTS "FacultyUser" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultyUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: FacultyUser_email_key
CREATE UNIQUE INDEX IF NOT EXISTS "FacultyUser_email_key" ON "FacultyUser"("email");

-- CreateIndex: FacultyUser_email_idx
CREATE INDEX IF NOT EXISTS "FacultyUser_email_idx" ON "FacultyUser"("email");

-- CreateIndex: FacultyUser_department_idx
CREATE INDEX IF NOT EXISTS "FacultyUser_department_idx" ON "FacultyUser"("department");

-- Data Migration: Migrate existing faculty coordinators from AdminRole into FacultyUser
INSERT INTO "FacultyUser" (
    "id", "name", "email", "password", "department", "designation", "profileImage", "isVerified", "isTwoStepEnabled", "createdAt", "updatedAt"
)
SELECT
    a."id",
    a."name",
    a."email",
    a."password",
    'General' AS "department",
    'Faculty Coordinator' AS "designation",
    a."profileImage",
    true AS "isVerified",
    COALESCE(a."isTwoStepEnabled", false),
    a."createdAt",
    a."updatedAt"
FROM "AdminRole" a
WHERE a."role" = 'facultyCoordinator'
   OR a."id" IN (SELECT "facultyCoordinatorId" FROM "Club" WHERE "facultyCoordinatorId" IS NOT NULL)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable: Club - re-point facultyCoordinatorId foreign key to FacultyUser
ALTER TABLE "Club" DROP CONSTRAINT IF EXISTS "Club_facultyCoordinatorId_fkey";

ALTER TABLE "Club" ADD CONSTRAINT "Club_facultyCoordinatorId_fkey"
    FOREIGN KEY ("facultyCoordinatorId") REFERENCES "FacultyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Participation - add facultyId, foreign key, index and unique constraint
ALTER TABLE "Participation" ADD COLUMN IF NOT EXISTS "facultyId" VARCHAR(24);

ALTER TABLE "Participation" DROP CONSTRAINT IF EXISTS "Participation_facultyId_fkey";

ALTER TABLE "Participation" ADD CONSTRAINT "Participation_facultyId_fkey"
    FOREIGN KEY ("facultyId") REFERENCES "FacultyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Participation_facultyId_idx" ON "Participation"("facultyId");

CREATE UNIQUE INDEX IF NOT EXISTS "Participation_eventId_facultyId_key" ON "Participation"("eventId", "facultyId");

-- AlterTable: Certificate - add facultyId, foreign key and index
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "facultyId" VARCHAR(24);

ALTER TABLE "Certificate" DROP CONSTRAINT IF EXISTS "Certificate_facultyId_fkey";

ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_facultyId_fkey"
    FOREIGN KEY ("facultyId") REFERENCES "FacultyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Certificate_facultyId_idx" ON "Certificate"("facultyId");
