/**
 * backfill-graduation-years.js
 * 
 * Safely and idempotently backfills expectedGraduationYear and academicStatus
 * for existing StudentUser records in PostgreSQL.
 * 
 * Rules:
 * 1. Does not overwrite existing expectedGraduationYear if already set.
 * 2. Inactive/unrecognized records are flagged for manual administrator review.
 * 3. Never deletes or mutates unrelated student data.
 */

import "dotenv/config";
import prisma from "../lib/prisma.js";
import { getMaxDurationForProgram } from "../constants/academicConstants.js";
import { normalizeYearToNumber } from "../utils/academicProgress.js";

async function backfill() {
  console.log("============================================================");
  console.log("   CampusNode Academic Progress: Historical Data Backfill   ");
  console.log("============================================================");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const sessionStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;

  console.log(`Current Reference Date: ${now.toISOString()}`);
  console.log(`Active Academic Session Start Year: ${sessionStartYear} (${sessionStartYear}-${(sessionStartYear + 1).toString().slice(-2)})\n`);

  const students = await prisma.studentUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      rollNo: true,
      program: true,
      expectedGraduationYear: true,
      academicStatus: true,
    },
  });

  console.log(`Found ${students.length} total student records in database.`);

  let updatedCount = 0;
  let alreadySetCount = 0;
  const ambiguousRecords = [];

  for (const student of students) {
    if (student.expectedGraduationYear) {
      alreadySetCount++;
      continue;
    }

    const program = student.program || "BTECH";
    const maxDuration = getMaxDurationForProgram(program);
    const parsedYear = normalizeYearToNumber(student.year);

    if (parsedYear && parsedYear > 0 && parsedYear <= maxDuration) {
      const calculatedGradYear = sessionStartYear + 1 + (maxDuration - parsedYear);
      await prisma.studentUser.update({
        where: { id: student.id },
        data: {
          expectedGraduationYear: calculatedGradYear,
          academicStatus: student.academicStatus || "ACTIVE",
        },
      });
      console.log(`✓ Updated ${student.email} (${student.name}): ${program} [${student.year}] -> GradYear: ${calculatedGradYear}`);
      updatedCount++;
    } else {
      ambiguousRecords.push({
        id: student.id,
        email: student.email,
        name: student.name,
        rollNo: student.rollNo,
        program: student.program,
        year: student.year,
        reason: parsedYear ? `Parsed year (${parsedYear}) exceeds program max duration (${maxDuration})` : "Missing or unrecognized year string",
      });
    }
  }

  console.log("\n============================================================");
  console.log("                   Backfill Summary                         ");
  console.log("============================================================");
  console.log(`Total Students Evaluated:     ${students.length}`);
  console.log(`Successfully Backfilled:      ${updatedCount}`);
  console.log(`Already Had Graduation Year:  ${alreadySetCount}`);
  console.log(`Ambiguous Records Flagged:    ${ambiguousRecords.length}`);

  if (ambiguousRecords.length > 0) {
    console.log("\nAmbiguous Records Requiring Manual Admin Review:");
    ambiguousRecords.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ID: ${r.id} | Email: ${r.email} | Name: ${r.name} | Program: ${r.program || "N/A"} | Year: "${r.year}" | Reason: ${r.reason}`);
    });
  }
  console.log("============================================================\n");
}

backfill()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
