import type { Prisma } from "@prisma/client";

import prisma from "../../config/database";
import type { EventQuery, EventSafe } from "./event.types";

const eventSelect = {
  id: true,
  title: true,
  description: true,
  dateTime: true,
  venue: true,
  isPublic: true,
  isPaid: true,
  fee: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

type EventWhere = Prisma.EventWhereInput;

export async function createEvent(
  data: Prisma.EventUncheckedCreateInput,
): Promise<EventSafe> {
  return prisma.event.create({ data, select: eventSelect });
}

export async function findEventById(id: string): Promise<EventSafe | null> {
  return prisma.event.findUnique({ where: { id }, select: eventSelect });
}

export async function listEvents(
  query: EventQuery,
): Promise<{ items: EventSafe[]; total: number }> {
  const where: EventWhere = {};

  // Public browsing default.
  where.isPublic = query.isPublic ?? true;
  if (query.isPaid !== undefined) where.isPaid = query.isPaid;
  if (query.search !== undefined && query.search !== "") {
    where.title = { contains: query.search, mode: "insensitive" };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: { dateTime: "asc" },
      skip,
      take: query.limit,
      select: eventSelect,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total };
}

export async function updateEventById(
  id: string,
  data: Prisma.EventUncheckedUpdateInput,
): Promise<EventSafe> {
  return prisma.event.update({
    where: { id },
    data,
    select: eventSelect,
  });
}

export async function deleteEventById(id: string): Promise<EventSafe> {
  return prisma.event.delete({
    where: { id },
    select: eventSelect,
  });
}

