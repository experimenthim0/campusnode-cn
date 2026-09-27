import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { recordDbQuery, recordTransaction } from "./observability.js";

const { PrismaClient } = prismaPkg;

const globalForPrisma = globalThis;
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

// Address the pg library SECURITY WARNING for SSL modes
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

if (!isLocal) {
  if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat=true')) {
    connectionString = connectionString.replace('sslmode=require', 'uselibpqcompat=true&sslmode=require');
  } else if (!connectionString.includes('sslmode=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += separator + 'uselibpqcompat=true&sslmode=require';
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
