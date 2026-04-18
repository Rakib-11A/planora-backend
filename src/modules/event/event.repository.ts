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
type EventBase = Prisma.EventGetPayload<{ select: typeof eventSelect }>;

function withRatings(
  events: EventBase[],
  aggregates: Array<{ eventId: string; avgRating: number; totalReviews: number }>,
): EventSafe[] {
  const aggregateMap = new Map(
    aggregates.map((item) => [item.eventId, item] as const),
  );

  return events.map((event) => {
    const aggregate = aggregateMap.get(event.id);
    return {
      ...event,
      avgRating: aggregate?.avgRating ?? 0,
      totalReviews: aggregate?.totalReviews ?? 0,
    };
  });
}

export async function createEvent(
  data: Prisma.EventUncheckedCreateInput,
): Promise<EventSafe> {
  const event = await prisma.event.create({ data, select: eventSelect });
  return { ...event, avgRating: 0, totalReviews: 0 };
}

export async function findEventById(id: string): Promise<EventSafe | null> {
  const event = await prisma.event.findUnique({ where: { id }, select: eventSelect });
  if (!event) return null;

  const aggregate = await prisma.review.aggregate({
    where: { eventId: id },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return {
    ...event,
    avgRating: Number(aggregate._avg.rating ?? 0),
    totalReviews: aggregate._count._all,
  };
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

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: { dateTime: "asc" },
      skip,
      take: query.limit,
      select: eventSelect,
    }),
    prisma.event.count({ where }),
  ]);

  const eventIds = events.map((event) => event.id);
  const grouped =
    eventIds.length === 0
      ? []
      : await prisma.review.groupBy({
          by: ["eventId"],
          where: { eventId: { in: eventIds } },
          _avg: { rating: true },
          _count: { _all: true },
        });

  const items = withRatings(
    events,
    grouped.map((row) => ({
      eventId: row.eventId,
      avgRating: Number(row._avg.rating ?? 0),
      totalReviews: row._count._all,
    })),
  );

  return { items, total };
}

export async function updateEventById(
  id: string,
  data: Prisma.EventUncheckedUpdateInput,
): Promise<EventSafe> {
  const updated = await prisma.event.update({
    where: { id },
    data,
    select: eventSelect,
  });

  const aggregate = await prisma.review.aggregate({
    where: { eventId: id },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return {
    ...updated,
    avgRating: Number(aggregate._avg.rating ?? 0),
    totalReviews: aggregate._count._all,
  };
}

export async function deleteEventById(id: string): Promise<EventSafe> {
  const deleted = await prisma.event.delete({
    where: { id },
    select: eventSelect,
  });

  return {
    ...deleted,
    avgRating: 0,
    totalReviews: 0,
  };
}

