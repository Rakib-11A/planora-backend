/**
 * Database seed for Planora (development / staging).
 * Run: npx prisma db seed
 *
 * Clears events then users (FK-safe), then inserts users, events, participations, and reviews.
 * Maps EventType enum conceptually: PUBLIC → isPublic true, PRIVATE → isPublic false.
 */

import { Prisma, PrismaClient, ParticipationStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Shared dev password (documented in .env.example / README — never use in production data). */
const SEED_USER_PASSWORD = "Password123!";

const BCRYPT_ROUNDS = 12;

/** Deterministic PRNG for stable “random” assignments across runs. */
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), state | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assertSeedAllowed(): void {
  const allow =
    process.env.SEED_ALLOW_RESET === "true" || process.env.NODE_ENV !== "production";
  if (!allow) {
    throw new Error(
      "Seed refused: set SEED_ALLOW_RESET=true to run in production, or use NODE_ENV!=production.",
    );
  }
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

type SeedUser = { id: string; email: string; role: UserRole };

async function seedUsers(
  tx: Prisma.TransactionClient,
  passwordHash: string,
): Promise<{ admin: SeedUser; regulars: SeedUser[] }> {
  const admin = await tx.user.create({
    data: {
      name: "Alex Admin",
      email: "admin@planora.test",
      password: passwordHash,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    },
    select: { id: true, email: true, role: true },
  });

  const regularNames = [
    "Jordan Lee",
    "Sam Rivera",
    "Taylor Chen",
    "Riley Morgan",
    "Casey Patel",
    "Morgan Brooks",
    "Jamie Nguyen",
  ];

  const regulars: SeedUser[] = [];
  for (let i = 0; i < regularNames.length; i++) {
    const u = await tx.user.create({
      data: {
        name: regularNames[i]!,
        email: `user${i + 1}@planora.test`,
        password: passwordHash,
        role: UserRole.USER,
        isEmailVerified: true,
      },
      select: { id: true, email: true, role: true },
    });
    regulars.push(u);
  }

  return { admin, regulars };
}

type EventSeedRow = {
  title: string;
  description: string;
  venue: string;
  /** Days from “now” at seed time */
  daysFromNow: number;
  /** EventType.PUBLIC | PRIVATE → isPublic */
  isPublic: boolean;
  isPaid: boolean;
  /** Decimal string; must be > 0 when isPaid */
  fee: string;
};

function buildEventTemplates(): EventSeedRow[] {
  return [
    {
      title: "Product Design Summit 2026",
      description:
        "Two days of talks and workshops on design systems, research ops, and cross-functional collaboration.",
      venue: "Harbor Convention Center, Hall A",
      daysFromNow: 34,
      isPublic: true,
      isPaid: true,
      fee: "149.00",
    },
    {
      title: "Founders Breakfast Club",
      description:
        "Small-group breakfast for early-stage founders: fundraising narratives, cap tables, and hiring.",
      venue: "Northside Roastery — private room",
      daysFromNow: 12,
      isPublic: false,
      isPaid: false,
      fee: "0",
    },
    {
      title: "React & TypeScript Deep Dive",
      description:
        "Hands-on session: patterns for scalable frontends, server components boundaries, and strict typing.",
      venue: "TechHub Downtown — Lab 3",
      daysFromNow: 21,
      isPublic: true,
      isPaid: true,
      fee: "79.50",
    },
    {
      title: "Community Park Cleanup",
      description:
        "Volunteer morning: supplies provided, refreshments after. Family-friendly.",
      venue: "Riverside Community Park",
      daysFromNow: 9,
      isPublic: true,
      isPaid: false,
      fee: "0",
    },
    {
      title: "Executive Roundtable: AI Governance",
      description:
        "Invitation-only discussion on risk frameworks, vendor review, and internal policy templates.",
      venue: "Skyline Tower — 42nd floor boardroom",
      daysFromNow: 45,
      isPublic: false,
      isPaid: true,
      fee: "299.00",
    },
    {
      title: "Indie Game Jam Weekend",
      description:
        "48-hour build sprint with mentors, asset packs, and a Sunday showcase for friends and press.",
      venue: "Pixel Arcade Co-working",
      daysFromNow: 56,
      isPublic: true,
      isPaid: false,
      fee: "0",
    },
    {
      title: "Women in Tech Networking Night",
      description:
        "Lightning talks, mentor tables, and structured networking. Allies welcome.",
      venue: "Gallery District Loft",
      daysFromNow: 18,
      isPublic: true,
      isPaid: true,
      fee: "25.00",
    },
    {
      title: "Board Strategy Offsite",
      description:
        "Closed session for portfolio company boards: scenario planning and compensation committees.",
      venue: "Lakeside Retreat Lodge",
      daysFromNow: 60,
      isPublic: false,
      isPaid: true,
      fee: "890.00",
    },
    {
      title: "UX Research Office Hours",
      description:
        "Drop-in critiques of study plans, discussion guides, and synthesis workflows.",
      venue: "Design Guild Studio",
      daysFromNow: 7,
      isPublic: true,
      isPaid: false,
      fee: "0",
    },
    {
      title: "Kubernetes Security Workshop",
      description:
        "Labs covering RBAC, admission controllers, supply chain basics, and incident drills.",
      venue: "CloudOps Training Center",
      daysFromNow: 28,
      isPublic: true,
      isPaid: true,
      fee: "199.00",
    },
    {
      title: "Jazz & Wine Evening",
      description:
        "Live quartet, curated flights, and a short talk on the history of bebop.",
      venue: "Cellar Door Venue",
      daysFromNow: 40,
      isPublic: true,
      isPaid: true,
      fee: "55.00",
    },
    {
      title: "Staff Engineer Reading Group",
      description:
        "Private cohort discussing classics on reliability, ownership, and technical strategy.",
      venue: "Remote-first (Slack + monthly Zoom)",
      daysFromNow: 15,
      isPublic: false,
      isPaid: false,
      fee: "0",
    },
    {
      title: "City Marathon Packet Pickup",
      description:
        "Bib pickup, merch, pace team sign-ups, and course safety briefing.",
      venue: "Metro Sports Arena — West entrance",
      daysFromNow: 3,
      isPublic: true,
      isPaid: false,
      fee: "0",
    },
    {
      title: "Data Engineering Meetup",
      description:
        "Talks on dbt, streaming pipelines, and cost-aware warehouse design. Pizza sponsored.",
      venue: "Analytics Co. Auditorium",
      daysFromNow: 11,
      isPublic: true,
      isPaid: false,
      fee: "0",
    },
    {
      title: "Photography Walk: Golden Hour",
      description:
        "Guided street photography walk; limited spots for instructor feedback.",
      venue: "Old Quarter — fountain square",
      daysFromNow: 5,
      isPublic: true,
      isPaid: true,
      fee: "35.00",
    },
    {
      title: "CFO Circle: Q2 Close Prep",
      description:
        "Peer exchange on close calendars, audit coordination, and narrative for investors.",
      venue: "Financial District Club — Room 7",
      daysFromNow: 22,
      isPublic: false,
      isPaid: true,
      fee: "120.00",
    },
    {
      title: "Green Building Tour",
      description:
        "Guided tour of a LEED Platinum retrofit: HVAC, envelope, and monitoring stack.",
      venue: "EcoTower — lobby meetup",
      daysFromNow: 31,
      isPublic: true,
      isPaid: true,
      fee: "18.00",
    },
    {
      title: "Open Source Maintainer Summit",
      description:
        "Unconference for maintainers: burnout, funding models, and security disclosures.",
      venue: "Convention Center South Wing",
      daysFromNow: 72,
      isPublic: true,
      isPaid: false,
      fee: "0",
    },
    {
      title: "Parent-Child Robotics Lab",
      description:
        "Build a simple line-following bot together; kits included. Ages 8+.",
      venue: "STEM Learning Lab",
      daysFromNow: 26,
      isPublic: true,
      isPaid: true,
      fee: "42.00",
    },
    {
      title: "Legal Clinic: Startup Contracts",
      description:
        "Pro bono office hours with volunteer attorneys; NDA and MSA templates provided.",
      venue: "Civic Innovation Hub",
      daysFromNow: 19,
      isPublic: true,
      isPaid: false,
      fee: "0",
    },
    {
      title: "Investor Demo Day (Invite)",
      description:
        "Curated pitches for Series A; investors and founders by invitation only.",
      venue: "Innovation Wharf — Pier 4",
      daysFromNow: 38,
      isPublic: false,
      isPaid: false,
      fee: "0",
    },
  ];
}

type CreatedEvent = {
  id: string;
  isPublic: boolean;
  createdById: string;
};

async function seedEvents(
  tx: Prisma.TransactionClient,
  adminId: string,
  regularIds: string[],
): Promise<CreatedEvent[]> {
  const templates = buildEventTemplates();
  const base = new Date();
  const created: CreatedEvent[] = [];

  for (let i = 0; i < templates.length; i++) {
    const row = templates[i]!;
    const ownerId =
      i % 6 === 0 || i % 11 === 0 ? adminId : regularIds[i % regularIds.length]!;

    const dateTime = new Date(base);
    dateTime.setDate(dateTime.getDate() + row.daysFromNow);
    dateTime.setHours(10 + (i % 8), (i * 7) % 60, 0, 0);

    const isPaid = row.isPaid;
    const fee = isPaid ? new Prisma.Decimal(row.fee) : new Prisma.Decimal("0");
    if (isPaid && fee.lte(0)) {
      throw new Error(`Paid event "${row.title}" must have fee > 0`);
    }

    const ev = await tx.event.create({
      data: {
        title: row.title,
        description: row.description,
        venue: row.venue,
        dateTime,
        isPublic: row.isPublic,
        isPaid,
        fee,
        createdById: ownerId,
      },
      select: { id: true, isPublic: true, createdById: true },
    });
    created.push(ev);
  }

  return created;
}

function participationStatusForSlot(
  isPublic: boolean,
  slot: number,
): ParticipationStatus {
  if (!isPublic) {
    if (slot % 10 < 4) return ParticipationStatus.PENDING;
    if (slot % 10 < 8) return ParticipationStatus.APPROVED;
    return ParticipationStatus.REJECTED;
  }
  if (slot % 10 < 7) return ParticipationStatus.APPROVED;
  if (slot % 10 < 9) return ParticipationStatus.PENDING;
  return ParticipationStatus.REJECTED;
}

type ParticipationRecord = {
  userId: string;
  eventId: string;
  status: ParticipationStatus;
};

async function seedParticipations(
  tx: Prisma.TransactionClient,
  events: CreatedEvent[],
  allUserIds: string[],
  rng: () => number,
): Promise<ParticipationRecord[]> {
  const records: ParticipationRecord[] = [];
  const seen = new Set<string>();

  for (let ei = 0; ei < events.length; ei++) {
    const event = events[ei]!;
    const candidates = allUserIds.filter((id) => id !== event.createdById);
    const want = Math.min(
      candidates.length,
      2 + Math.floor(rng() * Math.min(4, candidates.length)),
    );

    const shuffled = [...candidates].sort(() => rng() - 0.5);
    const chosen = shuffled.slice(0, want);

    for (let ci = 0; ci < chosen.length; ci++) {
      const userId = chosen[ci]!;
      const key = `${userId}:${event.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const status = participationStatusForSlot(event.isPublic, ei * 17 + ci * 3);
      records.push({ userId, eventId: event.id, status });
    }
  }

  if (records.length > 0) {
    await tx.participation.createMany({
      data: records.map((r) => ({
        userId: r.userId,
        eventId: r.eventId,
        status: r.status,
      })),
    });
  }

  return records;
}

const REVIEW_COMMENTS = [
  "Well organized — great MC and pacing.",
  "Venue was easy to find; signage could be better.",
  "Learned a lot; would attend again next year.",
  "Good content; networking breaks felt short.",
  "Excellent speakers and practical takeaways.",
  "Friendly crowd and inclusive atmosphere.",
  "Solid value for the ticket price.",
  "Enjoyed the hands-on exercises.",
];

async function seedReviews(
  tx: Prisma.TransactionClient,
  participations: ParticipationRecord[],
  rng: () => number,
): Promise<number> {
  const approved = participations.filter((p) => p.status === ParticipationStatus.APPROVED);
  const toReview = approved.filter(() => rng() > 0.35);

  let count = 0;
  for (let i = 0; i < toReview.length; i++) {
    const p = toReview[i]!;
    const rating = 1 + Math.floor(rng() * 5);
    const comment = REVIEW_COMMENTS[Math.floor(rng() * REVIEW_COMMENTS.length)] ?? null;

    await tx.review.create({
      data: {
        userId: p.userId,
        eventId: p.eventId,
        rating,
        comment,
      },
    });
    count++;
  }

  return count;
}

async function clearDomainData(tx: Prisma.TransactionClient): Promise<void> {
  await tx.event.deleteMany();
  await tx.user.deleteMany();
}

async function main(): Promise<void> {
  assertSeedAllowed();

  const passwordHash = await hashPassword(SEED_USER_PASSWORD);
  const rng = createSeededRng(20260419);

  const seeded = await prisma.$transaction(async (tx) => {
    await clearDomainData(tx);

    const users = await seedUsers(tx, passwordHash);
    const regularIds = users.regulars.map((u) => u.id);
    const allUserIds = [users.admin.id, ...regularIds];

    const events = await seedEvents(tx, users.admin.id, regularIds);
    const participations = await seedParticipations(tx, events, allUserIds, rng);
    const reviewCount = await seedReviews(tx, participations, rng);

    return { ...users, events, participations, reviewCount };
  });

  const userCount = 1 + seeded.regulars.length;
  console.log(`[seed] Users created: ${userCount} (admin: ${seeded.admin.email})`);
  console.log(`[seed] Events created: ${seeded.events.length}`);
  console.log(
    `[seed] Participations created: ${seeded.participations.length}; reviews: ${seeded.reviewCount}`,
  );
  console.log("[seed] Done — Planora database seeded successfully.");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
