import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { recordDbQuery, recordTransaction } from "./observability.js";

const { PrismaClient } = prismaPkg;

const globalForPrisma = globalThis;
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

// Address the pg library SECURITY WARNING for SSL modes while respecting explicit settings
try {
  const parsedUrl = new URL(connectionString);
  const hostname = parsedUrl.hostname.toLowerCase();
  const searchParams = parsedUrl.searchParams;
  const hasExplicitSsl = searchParams.has("sslmode") || searchParams.has("ssl");

  const isLocalOrContainerHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "postgres" ||
    hostname === "campusnode-postgres" ||
    hostname === "host.docker.internal";

  if (!hasExplicitSsl) {
    // If not a local or container host, enforce secure SSL for remote cloud databases (Neon, RDS, etc.)
    if (!isLocalOrContainerHost) {
      searchParams.set("sslmode", "require");
      searchParams.set("uselibpqcompat", "true");
      connectionString = parsedUrl.toString();
    }
  } else if (searchParams.get("sslmode") === "require" && !searchParams.has("uselibpqcompat")) {
    searchParams.set("uselibpqcompat", "true");
    connectionString = parsedUrl.toString();
  }
} catch {
  // Fallback to string matching if URL parsing fails
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("@postgres:") ||
    connectionString.includes("@campusnode-postgres:");
  if (!isLocal) {
    if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat=true")) {
      connectionString = connectionString.replace("sslmode=require", "uselibpqcompat=true&sslmode=require");
    } else if (!connectionString.includes("sslmode=")) {
      const separator = connectionString.includes("?") ? "&" : "?";
      connectionString += separator + "uselibpqcompat=true&sslmode=require";
    }
  }
}

const adapter = new PrismaPg({ connectionString });

const createInstrumentedPrisma = () => {
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  const extendedClient = client.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const startedAt = process.hrtime.bigint();
        let error = null;
        try {
          return await query(args);
        } catch (queryError) {
          error = queryError;
          throw queryError;
        } finally {
          recordDbQuery({
            model: model || null,
            operation,
            durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
            error,
          });
        }
      },
    },
  });

  return new Proxy(extendedClient, {
    get(target, property, receiver) {
      if (property !== "$transaction") return Reflect.get(target, property, receiver);

      return async (...args) => {
        const startedAt = process.hrtime.bigint();
        let error = null;
        try {
          return await target.$transaction(...args);
        } catch (transactionError) {
          error = transactionError;
          throw transactionError;
        } finally {
          recordTransaction({
            durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
            error,
          });
        }
      };
    },
  });
};

export const prisma = globalForPrisma.prisma || createInstrumentedPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
