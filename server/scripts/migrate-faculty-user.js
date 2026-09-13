import prisma from "../lib/prisma.js";

async function main() {
  console.log("Starting FacultyUser table creation and data migration...");

  // 1. Create FacultyUser table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FacultyUser" (
      "id" VARCHAR(24) PRIMARY KEY,
      "name" VARCHAR NOT NULL,
      "email" VARCHAR NOT NULL UNIQUE,
      "password" VARCHAR NOT NULL,
      "department" VARCHAR NOT NULL,
      "profileImage" VARCHAR,
      "designation" VARCHAR,
      "isVerified" BOOLEAN NOT NULL DEFAULT true,
      "isTwoStepEnabled" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FacultyUser_email_idx" ON "FacultyUser"("email");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FacultyUser_department_idx" ON "FacultyUser"("department");
  `);
  console.log("FacultyUser table and indexes ensured.");

  // 2. Fetch existing faculty coordinators from AdminRole
  const coords = await prisma.adminRole.findMany({
    where: { role: "facultyCoordinator" },
  });
  console.log(`Found ${coords.length} faculty coordinators in AdminRole.`);

  let inserted = 0;
  for (const c of coords) {
    const existing = await prisma.$queryRaw`
      SELECT id FROM "FacultyUser" WHERE id = ${c.id} OR email = ${c.email}
    `;
    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO "FacultyUser" (
          id, name, email, password, department, "profileImage", "isVerified", "isTwoStepEnabled", "createdAt", "updatedAt"
        ) VALUES (
          ${c.id},
          ${c.name},
          ${c.email},
          ${c.password},
          'General',
          ${c.profileImage || null},
          true,
          ${c.isTwoStepEnabled || false},
          ${c.createdAt},
          ${c.updatedAt}
        )
      `;
      inserted++;
    }
  }
  console.log(`Successfully migrated ${inserted} faculty coordinator records into FacultyUser.`);

  // 3. Verify all clubs with facultyCoordinatorId have matching FacultyUser
  const clubs = await prisma.club.findMany({
    where: { facultyCoordinatorId: { not: null } },
    select: { id: true, clubName: true, facultyCoordinatorId: true },
  });

  console.log(`Checking ${clubs.length} clubs with facultyCoordinatorId...`);
  let missing = 0;
  for (const club of clubs) {
    const fac = await prisma.$queryRaw`
      SELECT id FROM "FacultyUser" WHERE id = ${club.facultyCoordinatorId}
    `;
    if (fac.length === 0) {
      console.warn(`Club ${club.clubName} (${club.id}) references missing coordinator ${club.facultyCoordinatorId}`);
      missing++;
    }
  }

  if (missing === 0) {
    console.log("All club coordinator references match records in FacultyUser!");
  } else {
    console.warn(`${missing} references were missing!`);
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
