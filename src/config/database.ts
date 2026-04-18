import { PrismaClient } from "@prisma/client";

import { logger } from "../lib/logger/logger";


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const isDev = process.env.NODE_ENV === "development";
  return new PrismaClient({
    log: isDev ? (["query", "error"] as const) : (["error"] as const),
  });
}

const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Database connection failed", { message });
    throw err;
  }
}

export default prisma;
