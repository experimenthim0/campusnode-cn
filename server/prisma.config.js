import "dotenv/config";
import { defineConfig } from "@prisma/config";

// Safety check: Prevent destructive migrations if target database is marked as production
const isDestructive = process.argv.some((arg) =>
  ["push", "reset", "dev"].includes(arg)
);

if (isDestructive) {
  try {
    const { assertDatabaseSafety } = await import("./scripts/db-safety-guard.js");
    assertDatabaseSafety({ command: `prisma ${process.argv.slice(2).join(" ")}` });
  } catch (err) {
    if (err.message === "DATABASE_SAFETY_GUARD_BLOCKED") {
      process.exit(1);
    }
    // Re-throw if it wasn't the safety block to avoid masking unexpected script errors
    if (err.code !== "ERR_MODULE_NOT_FOUND" && !err.message?.includes("Cannot find module")) {
      throw err;
    }
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
