import "dotenv/config";
import prisma from "../lib/prisma.js";

async function syncCounts() {
  console.log("Resyncing event registered counts...");
  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      registeredCount: true,
      _count: {
        select: {
          participations: {
            where: {
              status: { in: ["REGISTERED", "ATTENDED"] },
            },
          },
        },
      },
    },
  });

  for (const ev of events) {
    const actual = ev._count.participations;
    if (ev.registeredCount !== actual) {
      console.log(`Event "${ev.title}" (ID: ${ev.id}): DB registeredCount was ${ev.registeredCount}, updating to actual ${actual}`);
      await prisma.event.update({
        where: { id: ev.id },
        data: { registeredCount: actual },
      });
    }
  }

  console.log("Registered count sync completed successfully.");
}

syncCounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
