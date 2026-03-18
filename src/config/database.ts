import { PrismaClient } from "@prisma/client";

/**
 * Hot reload (e.g. ts-node-dev / Next.js dev) re-executes modules; reusing one
 * PrismaClient on `globalThis` avoids exhausting DB connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma log levels: in development, log every query plus errors; otherwise errors only.
 */
function createPrismaClient(): PrismaClient {
  const isDev = process.env.NODE_ENV === "development";
  return new PrismaClient({
    log: isDev ? (["query", "error"] as const) : (["error"] as const),
  });
}

/** Singleton Prisma client for the whole process. */
const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Persist on global in non-production so dev reloads reuse the same instance.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Establish DB connection at startup. Logs success or a clear error then rethrows.
 */
export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[database] Failed to connect:", message);
    throw err;
  }
}

export default prisma;
