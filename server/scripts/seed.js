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
    console.log("Seeding Admin...");
    const adminPasswordHash = await bcrypt.hash("nikhil@him0148", 10);
    await prisma.adminRole.upsert({
      where: { email: "clubsetuadmin@nitj.ac.in" },
      update: { password: adminPasswordHash },
      create: {
        id: createObjectId(),
        name: "Admin",
        email: "clubsetuadmin@nitj.ac.in",
        password: adminPasswordHash,
        role: "admin",
        isTwoStepEnabled: false,
      },
    });

    console.log("Seeding Lost & Found Admin...");
    await prisma.adminRole.upsert({
      where: { email: "lostfoundadmin@nitj.ac.in" },
      update: { password: adminPasswordHash },
      create: {
        id: createObjectId(),
        name: "L&F Admin",
        email: "lostfoundadmin@nitj.ac.in",
        password: adminPasswordHash,
        role: "lostFoundAdmin",
        isTwoStepEnabled: false,
      },
    });

    console.log("Seeding Central Event Organiser (ODSW)...");
    await prisma.studentUser.upsert({
      where: { email: "odsw@nitj.ac.in" },
      update: {
        name: "Office of Dean Student Welfare (ODSW)",
        password: adminPasswordHash,
        accessLevel: "central_organizer",
        isVerified: true,
        isBlocked: false,
      },
      create: {
        id: createObjectId(),
        name: "Office of Dean Student Welfare (ODSW)",
        email: "odsw@nitj.ac.in",
        password: adminPasswordHash,
        accessLevel: "central_organizer",
        isVerified: true,
        isBlocked: false,
      },
    });

    console.log("Seeding Clubs...");
    for (const [clubName, facultyName, facultyEmail, clubEmail] of clubsData) {
      const slug = slugify(clubName);
      // Password logic: clubemail(before @) + "@him0148"
      const prefix = clubEmail.split("@")[0];
      const clubPassword = `${prefix}@him0148`;
      const clubPasswordHash = await bcrypt.hash(clubPassword, 10);

      await prisma.$transaction(async (tx) => {
        // 1. Create or Find Club record
        let club = await tx.club.findUnique({ where: { slug } });
        const clubId = club?.id || createObjectId();

        if (!club) {
          club = await tx.club.create({
            data: {
              id: clubId,
              clubName,
              slug,
              facultyName,
              facultyEmail,
              clubEmail,
            },
          });
        }

        // 2. Create AdminRole for Faculty Coordinator
        const facultyUser = await tx.adminRole.upsert({
          where: { email: facultyEmail },
          update: { password: clubPasswordHash },
          create: {
            id: createObjectId(),
            name: facultyName,
            email: facultyEmail,
            password: clubPasswordHash,
            role: "facultyCoordinator",
            isTwoStepEnabled: false,
          },
        });

        // 3. Create or Update dedicated ClubAccount for the official club login
        await tx.clubAccount.upsert({
          where: { clubId: club.id },
          update: {
            email: clubEmail,
            password: clubPasswordHash,
            isActive: true,
          },
          create: {
            id: createObjectId(),
            clubId: club.id,
            email: clubEmail,
            password: clubPasswordHash,
            isActive: true,
          },
        });

        // 4. Update Club with FKs
        await tx.club.update({
          where: { id: club.id },
          data: {
            facultyCoordinatorId: facultyUser.id,
          },
        });
      });
      console.log(`Seeded: ${clubName}`);
    }

    // Seed DSW Institutional Account
    console.log("Seeding DSW Institutional Account...");
    const dswAccount = await prisma.institutionalAccount.upsert({
      where: { email: "odsw@nitj.ac.in" },
      update: {
        name: "Dean Student Welfare (DSW)",
        type: "DSW",
        isActive: true,
      },
      create: {
        id: createObjectId(),
        name: "Dean Student Welfare (DSW)",
        email: "odsw@nitj.ac.in",
        type: "DSW",
        isActive: true,
      },
    });

    const coStudent = await prisma.studentUser.upsert({
      where: { email: "odsw@nitj.ac.in" },
      update: {
        name: "Central Event Organiser (DSW)",
        password: defaultPasswordHash,
        accessLevel: "central_organizer",
        isVerified: true,
        isBlocked: false,
      },
      create: {
        id: createObjectId(),
        name: "Central Event Organiser (DSW)",
        email: "odsw@nitj.ac.in",
        password: defaultPasswordHash,
        accessLevel: "central_organizer",
        isVerified: true,
        isBlocked: false,
      },
    });

    await prisma.institutionalAccountAssignment.upsert({
      where: {
        institutionalAccountId_studentId: {
          institutionalAccountId: dswAccount.id,
          studentId: coStudent.id,
        },
      },
      update: {
        role: "CENTRAL_EVENT_ORGANISER",
        status: "ACTIVE",
        canManageEvents: true,
        canTakeAttendance: true,
        canVerifyPayments: true,
        canDelegateStaff: true,
      },
      create: {
        id: createObjectId(),
        institutionalAccountId: dswAccount.id,
        studentId: coStudent.id,
        role: "CENTRAL_EVENT_ORGANISER",
        status: "ACTIVE",
        canManageEvents: true,
        canTakeAttendance: true,
        canVerifyPayments: true,
        canDelegateStaff: true,
      },
    });
    console.log("Seeded DSW Institutional Account and Central Event Organiser.");

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
