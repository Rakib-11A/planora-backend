import { PrismaClient } from "@prisma/client";


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
    console.log("Database connected successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[database] Failed to connect:", message);
    throw err;
  }
}

export default prisma;
