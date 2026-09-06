/**
 * CampusNode Database Safety Guard
 *
 * Prevents accidental execution of destructive migrations, pushes,
 * or database resets against the production database from local or staging environments.
 *
 * Safety Logic:
 * 1. Inspects DATABASE_URL and extracts the hostname.
 * 2. Checks if the environment is attempting to run development/migration commands
 *    against a database flagged as production.
 * 3. Blocks execution unless explicit, intentional production migration flags are present.
 */

import "dotenv/config";

export function inspectDatabaseUrl(url = process.env.DATABASE_URL) {
  if (!url) {
    return {
      ok: false,
      error: "DATABASE_URL is not defined in the environment.",
    };
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const database = parsed.pathname.replace(/^\//, "");
    const username = parsed.username;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";

    // Known production host indicators or explicit production markers
    const knownProdHost = process.env.PRODUCTION_DB_HOST || "";
    const isExplicitProd = process.env.CAMPUSNODE_DB_ENV === "production";
    const matchesProdHost = knownProdHost && host.toLowerCase() === knownProdHost.toLowerCase();

    return {
      ok: true,
      host,
      database,
      username,
      isLocalhost,
      isExplicitProd: isExplicitProd || matchesProdHost,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to parse DATABASE_URL: ${err.message}`,
    };
  }
}

export function assertDatabaseSafety(options = {}) {
  const { command = "database operation", allowProduction = false } = options;
  const dbInfo = inspectDatabaseUrl();

  if (!dbInfo.ok) {
    console.error(`\n❌ [DATABASE SAFETY VIOLATION] ${dbInfo.error}\n`);
    throw new Error(dbInfo.error);
  }

  const isProdEnv = process.env.NODE_ENV === "production";
  const explicitBypass = process.env.ALLOW_PROD_DB_OPERATION === "true";

  // If this database is marked as production and bypass is not set
  if (dbInfo.isExplicitProd && !allowProduction && !explicitBypass) {
    const errorMsg = `[DATABASE SAFETY GUARD BLOCKED OPERATION]\n` +
      `Attempted to run: "${command}"\n` +
      `Target host: ${dbInfo.host}\n` +
      `Target database: ${dbInfo.database}\n` +
      `Safety reason: This database is flagged as PRODUCTION. Local, staging, and automated ` +
      `development commands cannot modify the production database.\n` +
      `To protect live student and event data, this command has been aborted.`;

    console.error(`\n=======================================================`);
    console.error(errorMsg);
    console.error(`=======================================================\n`);
    throw new Error("DATABASE_SAFETY_GUARD_BLOCKED");
  }

  return dbInfo;
}

// When executed directly: node scripts/db-safety-guard.js
if (process.argv[1] && process.argv[1].endsWith("db-safety-guard.js")) {
  try {
    const dbInfo = inspectDatabaseUrl();
    if (!dbInfo.ok) {
      console.error(`❌ ${dbInfo.error}`);
      process.exit(1);
    }

    console.log("═══════════════════════════════════════════════");
    console.log("  CampusNode Database Target Verification");
    console.log("═══════════════════════════════════════════════");
    console.log(`  Host       : ${dbInfo.host}`);
    console.log(`  Database   : ${dbInfo.database}`);
    console.log(`  Local DB   : ${dbInfo.isLocalhost ? "YES" : "NO (Cloud Hosted)"}`);
    console.log(`  Prod Flag  : ${dbInfo.isExplicitProd ? "YES (PRODUCTION PROTECTION ACTIVE)" : "NO (Staging/Dev Safe)"}`);
    console.log("═══════════════════════════════════════════════");

    assertDatabaseSafety({ command: "CLI Verification" });
    console.log("✅ Target database is verified safe for development/staging operations.\n");
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}
