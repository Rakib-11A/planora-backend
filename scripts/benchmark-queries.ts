/**
 * Simple query latency benchmark for Planora (PostgreSQL + Prisma).
 *
 * Usage:
 *   npm run benchmark:queries -- [iterations]
 *
 * Env:
 *   DATABASE_URL      — required
 *   BENCH_EVENT_ID    — optional CUID; otherwise first non-deleted event is used
 *   BENCH_USER_ID     — optional CUID; otherwise first user is used
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BENCH_MARK = "[bench-fixture]";

function stats(times: number[]): { min: number; max: number; avg: number } {
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { min, max, avg };
}

async function timeRuns<T>(label: string, n: number, fn: () => Promise<T>): Promise<void> {
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  const s = stats(times);
  console.log(
    `${label}: n=${n} min=${s.min.toFixed(2)}ms max=${s.max.toFixed(2)}ms avg=${s.avg.toFixed(2)}ms`,
  );
}

async function ensureBenchmarkFixture(): Promise<{ eventId: string; userId: string }> {
  const existingEvent = await prisma.event.findFirst({
    where: { title: BENCH_MARK, deletedAt: null },
    select: { id: true, createdById: true },
  });
  if (existingEvent) {
    return { eventId: existingEvent.id, userId: existingEvent.createdById };
  }

  const owner = await prisma.user.create({
    data: {
      name: `${BENCH_MARK}-owner`,
      email: `bench-owner-${Date.now()}@planora.local`,
      password: "benchmark-password",
    },
    select: { id: true },
  });

  const event = await prisma.event.create({
    data: {
      title: BENCH_MARK,
      description: "Synthetic event used for query benchmark.",
      dateTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      venue: "Benchmark Hall",
      isPublic: true,
      isPaid: false,
      fee: 0,
      createdById: owner.id,
    },
    select: { id: true },
  });

  for (let rating = 1; rating <= 5; rating++) {
    const reviewer = await prisma.user.create({
      data: {
        name: `${BENCH_MARK}-reviewer-${rating}`,
        email: `bench-reviewer-${rating}-${Date.now()}@planora.local`,
        password: "benchmark-password",
      },
      select: { id: true },
    });

    await prisma.participation.create({
      data: {
        userId: reviewer.id,
        eventId: event.id,
        status: "APPROVED",
      },
    });

    await prisma.review.create({
      data: {
        userId: reviewer.id,
        eventId: event.id,
        rating,
        comment: `benchmark-review-${rating}`,
      },
    });
  }

  return { eventId: event.id, userId: owner.id };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const n = Math.max(1, Number.parseInt(process.argv[2] ?? "10", 10));
  if (Number.isNaN(n)) {
    throw new Error(`Invalid iterations: ${process.argv[2] ?? ""}`);
  }

  const eventIdEnv = process.env.BENCH_EVENT_ID;
  const userIdEnv = process.env.BENCH_USER_ID;
  const fixture = await ensureBenchmarkFixture();

  await timeRuns("events:listPublicUpcoming(take=20)", n, async () => {
    await prisma.event.findMany({
      where: { deletedAt: null, isPublic: true },
      orderBy: { dateTime: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        dateTime: true,
        isPublic: true,
        isPaid: true,
      },
    });
  });

  const eid =
    eventIdEnv ??
    fixture.eventId ??
    (
      await prisma.event.findFirst({
        where: { deletedAt: null },
        select: { id: true },
      })
    )?.id;

  if (eid !== undefined) {
    await timeRuns(`event:findFirstById(${eid.slice(0, 8)}…)`, n, async () => {
      await prisma.event.findFirst({
        where: { id: eid, deletedAt: null },
        select: {
          id: true,
          title: true,
          dateTime: true,
          isPublic: true,
          isPaid: true,
        },
      });
    });

    await timeRuns(`reviews:summaryOptimized(tx: aggregate+groupBy)`, n, async () => {
      await prisma.$transaction([
        prisma.review.aggregate({
          where: { eventId: eid, deletedAt: null },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.review.groupBy({
          by: ["rating"],
          where: { eventId: eid, deletedAt: null },
          _count: { _all: true },
          orderBy: { rating: "asc" },
        }),
      ]);
    });

    await timeRuns(`reviews:summaryLegacy(aggregate+5counts)`, n, async () => {
      await prisma.$transaction([
        prisma.review.aggregate({
          where: { eventId: eid, deletedAt: null },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.review.count({ where: { eventId: eid, rating: 1, deletedAt: null } }),
        prisma.review.count({ where: { eventId: eid, rating: 2, deletedAt: null } }),
        prisma.review.count({ where: { eventId: eid, rating: 3, deletedAt: null } }),
        prisma.review.count({ where: { eventId: eid, rating: 4, deletedAt: null } }),
        prisma.review.count({ where: { eventId: eid, rating: 5, deletedAt: null } }),
      ]);
    });
  } else {
    console.log("Skip event-scoped benchmarks: no row found and BENCH_EVENT_ID unset");
  }

  const uid =
    userIdEnv ??
    fixture.userId ??
    (await prisma.user.findFirst({ select: { id: true } }))?.id;

  if (uid !== undefined) {
    await timeRuns(`participation:listByUser(take=50)`, n, async () => {
      await prisma.participation.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, eventId: true, status: true, createdAt: true },
      });
    });
  } else {
    console.log("Skip user benchmarks: no row found and BENCH_USER_ID unset");
  }

  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  void prisma.$disconnect().finally(() => {
    process.exit(1);
  });
});
