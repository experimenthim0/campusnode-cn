import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";
import { slugify } from "../utils/slugify.js";

const clubsData = [
  ["Yoga and Meditation Club", "Dr. Neetu Sood", "soodn@nitj.ac.in", "ymclub@nitj.ac.in"],
  ["SWRAC (Social Works)", "Dr. Ashok Kumar Bagha", "baghaak@nitj.ac.in", "swraclub@nitj.ac.in"],
  ["LADC", "Dr. Shveta Mahajan", "mahajans@nitj.ac.in", "ladc@nitj.ac.in"],
  ["Zeal Society", "Dr. Shyamkiran Kaur", "kaursk@nitj.ac.in", "zealsocietiy@nitj.ac.in"],
  ["Food and Flavors Club", "Dr. Tarun Chaudhary", "chaudharyt@nitj.ac.in", "ffclub@nitj.ac.in"],
  ["Quest Club", "Dr. Gyan Praksh", "prakashg@nitj.ac.in", "questclub@nitj.ac.in"],
  ["Tedx NIT Jalandhar", "Dr. Samayveer Singh", "samays@nitj.ac.in", "tedxnitj@nitj.ac.in"],
  ["Photography and Movie Club", "Dr. Rajeev Verma", "vermar@nitj.ac.in", "photography@nitj.ac.in"],
  ["FinNest Finance Society", "Dr. Gaurav Kumar", "kumarg@nitj.ac.in", "financesociety@nitj.ac.in"],
  ["Media Cell (iota)", "Dr. Mohit Kumar", "kumarmohit@nitj.ac.in", "iota@nitj.ac.in"],
  ["Regional Activity Club", "Dr. K Senthil", "kasilingams@nitj.ac.in", "sanskriticlub@nitj.ac.in"],
  ["Aarogya", "Ravi Verma", "vermaravi@nitj.ac.in", "aarogyaclub@nitj.ac.in"],
];

async function seed() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "testing_admin@nitj.ac.in";
    const adminPassword = process.env.ADMIN_PASS || "testing_admin";
    const commonPassword = process.env.COMMON_PASSWORD || "nikhil@him0148";

    console.log("Seeding Admin User...");
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminRole.upsert({
      where: { email: adminEmail },
      update: { password: adminPasswordHash, role: "admin" },
      create: {
        id: createObjectId(),
        name: "CampusNode Admin",
        email: adminEmail,
        password: adminPasswordHash,
        role: "admin",
        isTwoStepEnabled: false,
      },
    });
    console.log(`Seeded Admin: ${adminEmail}`);

    console.log("Seeding Clubs and Faculty Coordinators...");
    const coordPasswordHash = await bcrypt.hash(commonPassword, 10);

    for (const [clubName, facultyName, facultyEmail, clubEmail] of clubsData) {
      const slug = slugify(clubName);

      const facultyUser = await prisma.adminRole.upsert({
        where: { email: facultyEmail },
        update: { name: facultyName, password: coordPasswordHash, role: "facultyCoordinator" },
        create: {
          id: createObjectId(),
          name: facultyName,
          email: facultyEmail,
          password: coordPasswordHash,
          role: "facultyCoordinator",
          isTwoStepEnabled: false,
        },
      });

      await prisma.club.upsert({
        where: { slug },
        update: {
          clubName,
          facultyName,
          facultyEmail,
          clubEmail,
          facultyCoordinatorId: facultyUser.id,
        },
        create: {
          id: createObjectId(),
          clubName,
          slug,
          facultyName,
          facultyEmail,
          clubEmail,
          facultyCoordinatorId: facultyUser.id,
        },
      });

      console.log(`Seeded Club: ${clubName} -> Coordinator: ${facultyName} (${facultyEmail})`);
    }

    console.log("Seeding completed: Only Admin, Faculty Coordinators, and Clubs seeded.");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
