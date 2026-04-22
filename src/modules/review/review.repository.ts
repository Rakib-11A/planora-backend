import { ParticipationStatus, type Prisma, type Review } from "@prisma/client";

import prisma from "../../config/database";

const reviewSelect = {
  id: true,
  userId: true,
  eventId: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export type EventReview = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

export async function findEventByIdForReview(
  eventId: string,
): Promise<{ id: string; dateTime: Date } | null> {
  return prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { id: true, dateTime: true },
  });
}

export async function findReviewByUserAndEvent(
  userId: string,
  eventId: string,
): Promise<Review | null> {
  return prisma.review.findFirst({
    where: {
      userId,
      eventId,
      deletedAt: null,
    },
  });
}

export async function findAnyReviewByUserAndEvent(
  userId: string,
  eventId: string,
): Promise<Review | null> {
  return prisma.review.findUnique({
    where: {
      userId_eventId: { userId, eventId },
    },
  });
}

export async function createReview(
  data: Prisma.ReviewUncheckedCreateInput,
): Promise<Review> {
  return prisma.review.create({ data });
}

export async function updateReviewById(
  id: string,
  data: Prisma.ReviewUncheckedUpdateInput,
): Promise<Review> {
  return prisma.review.update({
    where: { id },
    data,
  });
}

export async function deleteReviewById(id: string): Promise<Review> {
  return prisma.review.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

const myReviewSelect = {
  ...reviewSelect,
  event: {
    select: {
      id: true,
      title: true,
      dateTime: true,
    },
  },
} as const;

export type MyEventReview = Prisma.ReviewGetPayload<{ select: typeof myReviewSelect }>;

export async function listMyReviews(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: MyEventReview[]; total: number }> {
  const skip = (page - 1) * limit;
  const where: Prisma.ReviewWhereInput = { userId, deletedAt: null };

  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: myReviewSelect,
    }),
    prisma.review.count({ where }),
  ]);

  return { items, total };
}

export async function listEventReviews(
  eventId: string,
  page: number,
  limit: number,
): Promise<{ items: EventReview[]; total: number }> {
  const skip = (page - 1) * limit;
  const where: Prisma.ReviewWhereInput = { eventId, deletedAt: null };

  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: reviewSelect,
    }),
    prisma.review.count({ where }),
  ]);

  return { items, total };
}

export async function findApprovedParticipation(
  userId: string,
  eventId: string,
): Promise<{ id: string } | null> {
  return prisma.participation.findFirst({
    where: {
      userId,
      eventId,
      status: ParticipationStatus.APPROVED,
    },
    select: { id: true },
  });
}

export async function getEventRatingSummary(eventId: string): Promise<{
  avgRating: number;
  totalReviews: number;
  breakdown: { 1: number; 2: number; 3: number; 4: number; 5: number };
}> {
  const [aggregate, grouped] = await prisma.$transaction([
    prisma.review.aggregate({
      where: { eventId, deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { eventId, deletedAt: null },
      _count: { rating: true },
      orderBy: { rating: "asc" },
    }),
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of grouped) {
    if (row.rating >= 1 && row.rating <= 5) {
      const count = (
        row._count as { rating?: number; _all?: number } | undefined
      )?.rating ?? 0;
      breakdown[row.rating as 1 | 2 | 3 | 4 | 5] = count;
    }
  }

  return {
    avgRating: Number(aggregate._avg.rating ?? 0),
    totalReviews: aggregate._count._all,
    breakdown,
  };
}

