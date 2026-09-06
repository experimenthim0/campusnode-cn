import "dotenv/config";
import { defineConfig, env } from "@prisma/config";
import { assertDatabaseSafety } from "./scripts/db-safety-guard.js";

// Safety check: Prevent destructive migrations if target database is marked as production
try {
  const isDestructive = process.argv.some((arg) =>
    ["push", "reset", "dev"].includes(arg)
  );
  if (isDestructive) {
    assertDatabaseSafety({ command: `prisma ${process.argv.slice(2).join(" ")}` });
  }
} catch (err) {
  if (err.message === "DATABASE_SAFETY_GUARD_BLOCKED") {
    process.exit(1);
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
