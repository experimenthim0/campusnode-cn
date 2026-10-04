import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { createObjectId } from "../utils/objectId.js";

async function seedAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@nitj.ac.in";
    const adminPassword = process.env.ADMIN_PASS || "admin@123";

    console.log("Seeding CampusNode Admin User...");
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.adminRole.upsert({
      where: { email: adminEmail },
      update: {
        password: adminPasswordHash,
        role: "admin",
      },
      create: {
        id: createObjectId(),
        name: "CampusNode Admin",
        email: adminEmail,
        password: adminPasswordHash,
        role: "admin",
        isTwoStepEnabled: false,
      },
    });

    console.log(`Successfully seeded Admin: ${admin.email} (Role: ${admin.role})`);
    console.log("Clubs and coordinators can be managed directly via the Admin Dashboard.");
  } catch (error) {
    console.error("Seeding admin failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
