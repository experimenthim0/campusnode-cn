import prisma from "../lib/prisma.js";

async function run() {
  console.log("Checking and adding isVerified to StudentUser...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "StudentUser" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;`);
  console.log("Column added or already exists.");

  // Make sure existing seeded students remain verified so devs aren't locked out
  await prisma.$executeRawUnsafe(`UPDATE "StudentUser" SET "isVerified" = true WHERE "isVerified" = false;`);
  console.log("Existing student accounts set to isVerified = true.");

  // Also update default on ExternalUser to false for new registrations
  await prisma.$executeRawUnsafe(`ALTER TABLE "ExternalUser" ALTER COLUMN "isVerified" SET DEFAULT false;`);
  console.log("ExternalUser isVerified default set to false.");

  const cols = await prisma.$queryRaw`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'StudentUser';`;
  console.log("StudentUser columns now:", cols.map(c => c.column_name));

  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
