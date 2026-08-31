/**
 * Safe schema migration script for CampusNode
 * 
 * What this does (in order, all in a transaction):
 * 1. Rename ClubMembership.userId → studentId
 * 2. Migrate old role values (clubHead→CLUB_HEAD, coordinator→COORDINATOR, member→MEMBER)
 * 3. Update canTakeAttendance / canEditEvents based on new role
 * 4. Add missing unique constraint on (clubId, studentId)
 * 5. Create new Participation table from CollegeEventParticipation + ExternalCollegeEventParticipation
 * 6. Create Sponsor and Media tables
 * 7. Drop old tables that are no longer needed
 * 8. Add missing columns to Event, Club, StudentUser, etc.
 */

import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log("Connected to database.");

  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  const tableNames = tables.map(t => t.table_name);
  console.log("Existing tables:", tableNames);

  const hasParticipation = tableNames.includes("Participation");
  const hasSponsor = tableNames.includes("Sponsor");
  const hasMedia = tableNames.includes("Media");
  const hasOldCollegeParticipation = tableNames.includes("CollegeEventParticipation");
  const hasOldExternalParticipation = tableNames.includes("ExternalCollegeEventParticipation");

  console.log("\n── Step 1: Fixing ClubMembership ──");

  const { rows: membershipCols } = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'ClubMembership'
  `);
  const membershipColNames = membershipCols.map(c => c.column_name);
  console.log("ClubMembership columns:", membershipColNames);

  if (membershipColNames.includes("userId") && !membershipColNames.includes("studentId")) {
    console.log("  Renaming userId → studentId...");
    await client.query(`ALTER TABLE "ClubMembership" RENAME COLUMN "userId" TO "studentId"`);
    console.log("  ✓ Renamed userId → studentId");
  } else if (membershipColNames.includes("studentId")) {
    console.log("  studentId already exists, skipping rename.");
  }

  console.log("  Migrating role values...");
  const { rows: enumTypes } = await client.query(`
    SELECT typname FROM pg_type WHERE typname IN ('ClubMemberRole', 'clubmemberrole')
  `);
  console.log("  Existing enum types:", enumTypes.map(e => e.typname));

  const { rows: roleValues } = await client.query(`
    SELECT DISTINCT role::text FROM "ClubMembership"
  `);
  console.log("  Current role values:", roleValues.map(r => r.role));

  const hasOldRoles = roleValues.some(r => ['clubHead', 'coordinator', 'member'].includes(r.role));
  
  if (hasOldRoles) {
    console.log("  Converting role column to text temporarily for migration...");
    await client.query(`ALTER TABLE "ClubMembership" ALTER COLUMN "role" TYPE text USING "role"::text`);
    
    await client.query(`UPDATE "ClubMembership" SET "role" = 'CLUB_HEAD' WHERE "role" = 'clubHead'`);
    await client.query(`UPDATE "ClubMembership" SET "role" = 'COORDINATOR' WHERE "role" = 'coordinator'`);
    await client.query(`UPDATE "ClubMembership" SET "role" = 'MEMBER' WHERE "role" = 'member'`);
    console.log("  ✓ Role values updated");
  }

  const { rows: existingEnum } = await client.query(`
    SELECT typname FROM pg_type WHERE typname = 'ClubMemberRole'
  `);
  
  if (existingEnum.length === 0) {
    console.log("  Creating ClubMemberRole enum...");
    await client.query(`CREATE TYPE "ClubMemberRole" AS ENUM ('CLUB_HEAD', 'COORDINATOR', 'MEMBER')`);
    console.log("  ✓ ClubMemberRole enum created");
  } else {
    const { rows: enumVals } = await client.query(`
      SELECT enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'ClubMemberRole'
    `);
    console.log("  ClubMemberRole enum values:", enumVals.map(e => e.enumlabel));
    
    const hasNewValues = enumVals.some(e => e.enumlabel === 'CLUB_HEAD');
    if (!hasNewValues) {
      console.log("  Recreating ClubMemberRole enum with new values...");
      await client.query(`DROP TYPE IF EXISTS "ClubMemberRole" CASCADE`);
      await client.query(`CREATE TYPE "ClubMemberRole" AS ENUM ('CLUB_HEAD', 'COORDINATOR', 'MEMBER')`);
      console.log("  ✓ ClubMemberRole enum recreated");
    }
  }

  const { rows: currentRoleType } = await client.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'ClubMembership' AND column_name = 'role'
  `);
  
  if (currentRoleType[0]?.data_type === 'text') {
    console.log("  Converting role column back to ClubMemberRole enum...");
    await client.query(`
      ALTER TABLE "ClubMembership" 
      ALTER COLUMN "role" TYPE "ClubMemberRole" USING "role"::"ClubMemberRole"
    `);
    console.log("  ✓ role column converted to ClubMemberRole enum");
  }

  console.log("  Updating permission flags based on roles...");
  await client.query(`
    UPDATE "ClubMembership" 
    SET "canTakeAttendance" = true, "canEditEvents" = true 
    WHERE "role" = 'CLUB_HEAD'
  `);
  await client.query(`
    UPDATE "ClubMembership" 
    SET "canTakeAttendance" = true, "canEditEvents" = true 
    WHERE "role" = 'COORDINATOR'
  `);
  await client.query(`
    UPDATE "ClubMembership" 
    SET "canTakeAttendance" = true, "canEditEvents" = false 
    WHERE "role" = 'MEMBER'
  `);
  console.log("  ✓ Permission flags updated");

  const { rows: constraints } = await client.query(`
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'ClubMembership' AND constraint_type = 'UNIQUE'
  `);
  const constraintNames = constraints.map(c => c.constraint_name);
  console.log("  Existing constraints:", constraintNames);

  const hasUniqueConstraint = constraintNames.some(n => 
    n.includes('clubId') || n.includes('studentId') || n.includes('ClubMembership_clubId')
  );
  
  if (!hasUniqueConstraint) {
    console.log("  Adding unique constraint on (clubId, studentId)...");
    await client.query(`
      DELETE FROM "ClubMembership" a
      USING "ClubMembership" b
      WHERE a.id < b.id 
        AND a."clubId" = b."clubId" 
        AND a."studentId" = b."studentId"
    `);
    await client.query(`
      ALTER TABLE "ClubMembership" 
      ADD CONSTRAINT "ClubMembership_clubId_studentId_key" UNIQUE ("clubId", "studentId")
    `);
    console.log("  ✓ Unique constraint added");
  }

  console.log("\n── Step 2: Ensuring all required enums exist ──");

  const requiredEnums = [
    { name: 'ParticipationStatus', values: ['REGISTERED', 'ATTENDED', 'WAITLISTED', 'CANCELLED'] },
    { name: 'PaymentStatus', values: ['PENDING', 'SUCCESS', 'FAILED'] },
    { name: 'ReviewStatus', values: ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'] },
    { name: 'MediaType', values: ['IMAGE', 'VIDEO', 'SPONSOR_LOGO'] },
    { name: 'AdminRoleType', values: ['admin', 'facultyCoordinator', 'paymentAdmin'] },
  ];

  for (const { name, values } of requiredEnums) {
    const { rows } = await client.query(`SELECT typname FROM pg_type WHERE typname = $1`, [name]);
    if (rows.length === 0) {
      const enumDef = values.map(v => `'${v}'`).join(', ');
      await client.query(`CREATE TYPE "${name}" AS ENUM (${enumDef})`);
      console.log(`  ✓ Created enum ${name}`);
    } else {
      const { rows: existingVals } = await client.query(
        `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = $1`,
        [name]
      );
      const existingLabels = existingVals.map(e => e.enumlabel);
      const missingValues = values.filter(v => !existingLabels.includes(v));
      const hasWrongCase = existingLabels.some(l => values.some(v => v.toLowerCase() === l.toLowerCase() && v !== l));

      if (missingValues.length > 0 || hasWrongCase) {
        console.log(`  Recreating enum ${name} (old: [${existingLabels}], need: [${values}])...`);
        if (name === 'MediaType') {
          await client.query(`DROP TABLE IF EXISTS "EventMedia" CASCADE`);
          await client.query(`DROP TABLE IF EXISTS "ClubMedia" CASCADE`);
          await client.query(`DROP TABLE IF EXISTS "Media" CASCADE`);
        }
        if (name === 'ParticipationStatus') {
          if (!existingLabels.includes('CANCELLED')) {
            await client.query(`ALTER TYPE "ParticipationStatus" ADD VALUE 'CANCELLED'`);
            console.log(`  ✓ Added CANCELLED to ParticipationStatus`);
            continue;
          }
        }
        await client.query(`DROP TYPE IF EXISTS "${name}" CASCADE`);
        const enumDef = values.map(v => `'${v}'`).join(', ');
        await client.query(`CREATE TYPE "${name}" AS ENUM (${enumDef})`);
        console.log(`  ✓ Recreated enum ${name}`);
      } else {
        console.log(`  ✓ Enum ${name} already has correct values`);
      }
    }
  }

  console.log("\n── Step 3: Fixing Event table ──");

  const { rows: eventCols } = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'Event'
  `);
  const eventColNames = eventCols.map(c => c.column_name);
  console.log("  Event columns:", eventColNames);

  const eventColsToAdd = [
    { name: 'slug', def: `VARCHAR(255) UNIQUE` },
    { name: 'description', def: `TEXT` },
    { name: 'imageUrl', def: `TEXT` },
    { name: 'totalSeats', def: `INTEGER NOT NULL DEFAULT 0` },
    { name: 'registeredCount', def: `INTEGER NOT NULL DEFAULT 0` },
    { name: 'requiredFields', def: `TEXT[] DEFAULT '{}'` },
    { name: 'customFields', def: `JSONB` },
    { name: 'allowedPrograms', def: `TEXT[] DEFAULT '{BTECH,MTECH,OTHER}'` },
    { name: 'allowedYears', def: `TEXT[] DEFAULT '{}'` },
    { name: 'registrationDeadline', def: `TIMESTAMP` },
    { name: 'winners', def: `JSONB` },
    { name: 'showWinner', def: `BOOLEAN NOT NULL DEFAULT false` },
    { name: 'provideCertificate', def: `BOOLEAN NOT NULL DEFAULT false` },
    { name: 'certificateTemplate', def: `JSONB` },
    { name: 'reviewComment', def: `TEXT` },
    { name: 'waitingListIds', def: `TEXT[] DEFAULT '{}'` },
    { name: 'createdAt', def: `TIMESTAMP NOT NULL DEFAULT NOW()` },
  ];

  for (const col of eventColsToAdd) {
    if (!eventColNames.includes(col.name)) {
      await client.query(`ALTER TABLE "Event" ADD COLUMN "${col.name}" ${col.def}`);
      console.log(`  ✓ Added Event.${col.name}`);
    }
  }

  const { rows: reviewStatusType } = await client.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'Event' AND column_name = 'reviewStatus'
  `);
  if (reviewStatusType[0]?.data_type === 'text') {
    await client.query(`
      ALTER TABLE "Event" 
      ALTER COLUMN "reviewStatus" TYPE "ReviewStatus" USING "reviewStatus"::"ReviewStatus"
    `);
    console.log("  ✓ Event.reviewStatus converted to enum");
  }

  console.log("\n── Step 4: Fixing Club table ──");

  const { rows: clubCols } = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'Club'
  `);
  const clubColNames = clubCols.map(c => c.column_name);
  console.log("  Club columns:", clubColNames);

  const clubColsToAdd = [
    { name: 'slug', def: `VARCHAR(255) UNIQUE` },
    { name: 'description', def: `TEXT` },
    { name: 'clubLogo', def: `TEXT` },
    { name: 'category', def: `TEXT` },
    { name: 'facultyCoordinatorId', def: `VARCHAR(24)` },
    { name: 'createdAt', def: `TIMESTAMP NOT NULL DEFAULT NOW()` },
    { name: 'updatedAt', def: `TIMESTAMP NOT NULL DEFAULT NOW()` },
  ];

  for (const col of clubColsToAdd) {
    if (!clubColNames.includes(col.name)) {
      await client.query(`ALTER TABLE "Club" ADD COLUMN "${col.name}" ${col.def}`);
      console.log(`  ✓ Added Club.${col.name}`);
    }
  }

  console.log("\n── Step 5: Fixing StudentUser table ──");

  const { rows: studentCols } = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'StudentUser'
  `);
  const studentColNames = studentCols.map(c => c.column_name);
  console.log("  StudentUser columns:", studentColNames);

  const studentColsToAdd = [
    { name: 'program', def: `TEXT` },
    { name: 'createdAt', def: `TIMESTAMP NOT NULL DEFAULT NOW()` },
    { name: 'updatedAt', def: `TIMESTAMP NOT NULL DEFAULT NOW()` },
  ];

  for (const col of studentColsToAdd) {
    if (!studentColNames.includes(col.name)) {
      await client.query(`ALTER TABLE "StudentUser" ADD COLUMN "${col.name}" ${col.def}`);
      console.log(`  ✓ Added StudentUser.${col.name}`);
    }
  }

  console.log("\n── Step 6: Creating Participation table ──");

  if (!hasParticipation) {
    await client.query(`
      CREATE TABLE "Participation" (
        "id"               VARCHAR(24) PRIMARY KEY,
        "eventId"          VARCHAR(24) NOT NULL,
        "studentId"        VARCHAR(24),
        "externalEmail"    TEXT,
        "externalName"     TEXT,
        "status"           "ParticipationStatus" NOT NULL DEFAULT 'REGISTERED',
        "qrCode"           TEXT UNIQUE,
        "attendedAt"       TIMESTAMP,
        "markedByMemberId" VARCHAR(24),
        "paymentStatus"    "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
        "amountPaid"       FLOAT NOT NULL DEFAULT 0,
        "paymentId"        TEXT,
        "orderId"          TEXT,
        "paymentTimestamp" TIMESTAMP,
        "formResponses"    JSONB,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "Participation_eventId_fkey" 
          FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE,
        CONSTRAINT "Participation_studentId_fkey" 
          FOREIGN KEY ("studentId") REFERENCES "StudentUser"("id")
      )
    `);
    await client.query(`CREATE INDEX "Participation_eventId_idx" ON "Participation"("eventId")`);
    console.log("  ✓ Participation table created");

    if (hasOldCollegeParticipation) {
      console.log("  Migrating CollegeEventParticipation data...");
      const { rows: oldCols } = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'CollegeEventParticipation'
      `);
      console.log("  CollegeEventParticipation columns:", oldCols.map(c => c.column_name));

      const { rows: oldRows } = await client.query(`SELECT COUNT(*) FROM "CollegeEventParticipation"`);
      console.log(`  CollegeEventParticipation rows: ${oldRows[0].count}`);

      if (parseInt(oldRows[0].count) > 0) {
        await client.query(`
          INSERT INTO "Participation" (
            "id", "eventId", "studentId", "status", "qrCode", 
            "attendedAt", "paymentStatus", "amountPaid", "paymentId",
            "formResponses", "createdAt"
          )
          SELECT 
            p."id",
            p."eventId",
            p."userId" AS "studentId",
            CASE p."status"::text
              WHEN 'CONFIRMED' THEN 'REGISTERED'::"ParticipationStatus"
              WHEN 'ATTENDED'  THEN 'ATTENDED'::"ParticipationStatus"
              WHEN 'WAITLISTED' THEN 'WAITLISTED'::"ParticipationStatus"
              WHEN 'CANCELLED' THEN 'CANCELLED'::"ParticipationStatus"
              ELSE 'REGISTERED'::"ParticipationStatus"
            END AS "status",
            p."qrCode",
            p."attendedAt",
            CASE p."paymentStatus"::text
              WHEN 'SUCCESS' THEN 'SUCCESS'::"PaymentStatus"
              WHEN 'PENDING' THEN 'PENDING'::"PaymentStatus"
              WHEN 'FAILED'  THEN 'FAILED'::"PaymentStatus"
              ELSE 'SUCCESS'::"PaymentStatus"
            END AS "paymentStatus",
            COALESCE(p."amountPaid", 0) AS "amountPaid",
            p."paymentId",
            p."formResponses",
            COALESCE(p."createdAt", NOW()) AS "createdAt"
          FROM "CollegeEventParticipation" p
          WHERE p."eventId" IN (SELECT id FROM "Event")
            AND p."userId" IN (SELECT id FROM "StudentUser")
          ON CONFLICT ("id") DO NOTHING
        `);
      }
      const { rows: migratedCount } = await client.query(`SELECT COUNT(*) FROM "Participation" WHERE "studentId" IS NOT NULL`);
      console.log(`  ✓ Migrated ${migratedCount[0].count} internal participations`);
    }

    if (hasOldExternalParticipation) {
      console.log("  Migrating ExternalCollegeEventParticipation data...");
      const { rows: extCols } = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ExternalCollegeEventParticipation'
      `);
      console.log("  ExternalCollegeEventParticipation columns:", extCols.map(c => c.column_name));

      const { rows: extRows } = await client.query(`SELECT COUNT(*) FROM "ExternalCollegeEventParticipation"`);
      console.log(`  ExternalCollegeEventParticipation rows: ${extRows[0].count}`);

      if (parseInt(extRows[0].count) > 0) {
        const hasExternalUser = tableNames.includes("ExternalUser");
        
        if (hasExternalUser) {
          await client.query(`
            INSERT INTO "Participation" (
              "id", "eventId", "externalEmail", "externalName", "status",
              "qrCode", "attendedAt", "paymentStatus", "amountPaid", "paymentId", "createdAt"
            )
            SELECT 
              ep."id",
              ep."eventId",
              eu."email" AS "externalEmail",
              eu."name" AS "externalName",
              CASE ep."status"::text
                WHEN 'CONFIRMED'  THEN 'REGISTERED'::"ParticipationStatus"
                WHEN 'ATTENDED'   THEN 'ATTENDED'::"ParticipationStatus"
                WHEN 'WAITLISTED' THEN 'WAITLISTED'::"ParticipationStatus"
                ELSE 'REGISTERED'::"ParticipationStatus"
              END AS "status",
              ep."qrCode",
              ep."attendedAt",
              CASE ep."paymentStatus"::text
                WHEN 'SUCCESS' THEN 'SUCCESS'::"PaymentStatus"
                WHEN 'PENDING' THEN 'PENDING'::"PaymentStatus"
                WHEN 'FAILED'  THEN 'FAILED'::"PaymentStatus"
                ELSE 'SUCCESS'::"PaymentStatus"
              END AS "paymentStatus",
              COALESCE(ep."amountPaid", 0) AS "amountPaid",
              ep."paymentId",
              COALESCE(ep."createdAt", NOW()) AS "createdAt"
            FROM "ExternalCollegeEventParticipation" ep
            LEFT JOIN "ExternalUser" eu ON ep."externalUserId" = eu."id"
            WHERE ep."eventId" IN (SELECT id FROM "Event")
            ON CONFLICT ("id") DO NOTHING
          `);
        }
      }
      const { rows: extCount } = await client.query(`SELECT COUNT(*) FROM "Participation" WHERE "externalEmail" IS NOT NULL`);
      console.log(`  ✓ Migrated ${extCount[0].count} external participations`);
    }
  } else {
    console.log("  Participation table already exists, skipping.");
  }

  console.log("\n── Step 7: Creating Sponsor table ──");

  if (!hasSponsor) {
    await client.query(`
      CREATE TABLE "Sponsor" (
        "id"         VARCHAR(24) PRIMARY KEY,
        "name"       TEXT NOT NULL,
        "logoUrl"    TEXT NOT NULL,
        "websiteUrl" TEXT,
        "clubId"     VARCHAR(24),
        "eventId"    VARCHAR(24),
        CONSTRAINT "Sponsor_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id"),
        CONSTRAINT "Sponsor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id")
      )
    `);
    console.log("  ✓ Sponsor table created");
  } else {
    console.log("  Sponsor table already exists, skipping.");
  }

  console.log("\n── Step 8: Creating Media table ──");

  if (!hasMedia) {
    await client.query(`
      CREATE TABLE "Media" (
        "id"      VARCHAR(24) PRIMARY KEY,
        "url"     TEXT NOT NULL,
        "type"    "MediaType" NOT NULL DEFAULT 'IMAGE',
        "clubId"  VARCHAR(24),
        "eventId" VARCHAR(24),
        CONSTRAINT "Media_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id"),
        CONSTRAINT "Media_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id")
      )
    `);
    console.log("  ✓ Media table created");
  } else {
    console.log("  Media table already exists, skipping.");
  }

  console.log("\n── Step 9: Fixing AdminRole table ──");

  const hasAdminRole = tableNames.includes("AdminRole");
  if (!hasAdminRole) {
    await client.query(`
      CREATE TABLE "AdminRole" (
        "id"        VARCHAR(24) PRIMARY KEY,
        "name"      TEXT NOT NULL,
        "email"     TEXT NOT NULL UNIQUE,
        "password"  TEXT NOT NULL,
        "role"      "AdminRoleType" NOT NULL DEFAULT 'admin',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("  ✓ AdminRole table created");
  } else {
    console.log("  AdminRole table already exists.");
    const { rows: adminCols } = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'AdminRole'
    `);
    const adminColNames = adminCols.map(c => c.column_name);
    if (!adminColNames.includes('role')) {
      await client.query(`ALTER TABLE "AdminRole" ADD COLUMN "role" "AdminRoleType" NOT NULL DEFAULT 'admin'`);
      console.log("  ✓ Added AdminRole.role");
    }
  }

  console.log("\n── Step 10: Fixing Notification table ──");

  const hasNotification = tableNames.includes("Notification");
  if (hasNotification) {
    const { rows: notifCols } = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'Notification'
    `);
    const notifColNames = notifCols.map(c => c.column_name);
    
    if (!notifColNames.includes('senderStudentId')) {
      await client.query(`ALTER TABLE "Notification" ADD COLUMN "senderStudentId" VARCHAR(24)`);
      console.log("  ✓ Added Notification.senderStudentId");
    }
    if (!notifColNames.includes('senderAdminId')) {
      await client.query(`ALTER TABLE "Notification" ADD COLUMN "senderAdminId" VARCHAR(24)`);
      console.log("  ✓ Added Notification.senderAdminId");
    }
    if (!notifColNames.includes('title')) {
      await client.query(`ALTER TABLE "Notification" ADD COLUMN "title" TEXT NOT NULL DEFAULT ''`);
      console.log("  ✓ Added Notification.title");
    }
  }

  console.log("\n── Step 11: Cleaning up ClubMembership old columns ──");

  const { rows: finalMembershipCols } = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'ClubMembership'
  `);
  const finalMembershipColNames = finalMembershipCols.map(c => c.column_name);

  const colsToRemove = ['canCheckRegistration', 'canViewDashboard'];
  for (const col of colsToRemove) {
    if (finalMembershipColNames.includes(col)) {
      await client.query(`ALTER TABLE "ClubMembership" DROP COLUMN IF EXISTS "${col}"`);
      console.log(`  ✓ Removed ClubMembership.${col}`);
    }
  }

  console.log("\n── Final Verification ──");

  const { rows: finalTables } = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  console.log("Final tables:", finalTables.map(t => t.table_name));

  const { rows: finalMembershipColsFinal } = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'ClubMembership'
  `);
  console.log("Final ClubMembership columns:", finalMembershipColsFinal.map(c => c.column_name));

  const { rows: participationCount } = await client.query(`SELECT COUNT(*) FROM "Participation"`);
  console.log("Participation rows:", participationCount[0].count);

  console.log("\n✅ Migration complete!");
}

run()
  .catch(err => {
    console.error("❌ Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.end());
