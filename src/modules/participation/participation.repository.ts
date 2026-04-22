import type {
  Participation,
  ParticipationStatus,
  Prisma,
} from "@prisma/client";

import prisma from "../../config/database";

const participationWithEventSelect = {
  id: true,
  userId: true,
  eventId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  event: {
    select: {
      id: true,
      title: true,
      dateTime: true,
      venue: true,
      isPublic: true,
      isPaid: true,
      fee: true,
      createdById: true,
    },
  },
} as const;

const participationWithUserSelect = {
  id: true,
  userId: true,
  eventId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
    },
  },
} as const;

export type ParticipationWithEvent = Prisma.ParticipationGetPayload<{
  select: typeof participationWithEventSelect;
}>;

export type ParticipationWithUser = Prisma.ParticipationGetPayload<{
  select: typeof participationWithUserSelect;
}>;

export async function findParticipationByUserAndEvent(
  userId: string,
  eventId: string,
): Promise<Participation | null> {
  return prisma.participation.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
  });
}

export async function createParticipation(
  data: Prisma.ParticipationUncheckedCreateInput,
): Promise<Participation> {
  return prisma.participation.create({ data });
}

export async function updateParticipationStatus(
  id: string,
  status: ParticipationStatus,
): Promise<Participation> {
  return prisma.participation.update({
    where: { id },
    data: { status },
  });
}

export async function listUserParticipations(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: ParticipationWithEvent[]; total: number }> {
  const skip = (page - 1) * limit;
  const where: Prisma.ParticipationWhereInput = { userId };

  const [items, total] = await prisma.$transaction([
    prisma.participation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: participationWithEventSelect,
    }),
    prisma.participation.count({ where }),
  ]);

  return { items, total };
}

export async function listEventParticipants(
  eventId: string,
  status?: ParticipationStatus,
): Promise<ParticipationWithUser[]> {
  return prisma.participation.findMany({
    where: {
      eventId,
      ...(status !== undefined ? { status } : {}),
    },
    orderBy: [{ createdAt: "asc" }],
    select: participationWithUserSelect,
  });
}

export async function findParticipationWithUserByUserAndEvent(
  userId: string,
  eventId: string,
): Promise<{
  id: string;
  userId: string;
  eventId: string;
  status: ParticipationStatus;
  user: { id: string; name: string; email: string };
  event: { id: string; title: string };
} | null> {
  return prisma.participation.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
    select: {
      id: true,
      userId: true,
      eventId: true,
      status: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

