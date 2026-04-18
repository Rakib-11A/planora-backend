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
      email: true,
      avatar: true,
    },
  },
} as const;

export type EventReview = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

export async function findEventByIdForReview(eventId: string): Promise<{ id: string } | null> {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
}

export async function findReviewByUserAndEvent(
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
  return prisma.review.delete({ where: { id } });
}

export async function listEventReviews(eventId: string): Promise<EventReview[]> {
  return prisma.review.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    select: reviewSelect,
  });
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
  const [aggregate, oneStar, twoStar, threeStar, fourStar, fiveStar] =
    await prisma.$transaction([
    prisma.review.aggregate({
      where: { eventId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.count({ where: { eventId, rating: 1 } }),
    prisma.review.count({ where: { eventId, rating: 2 } }),
    prisma.review.count({ where: { eventId, rating: 3 } }),
    prisma.review.count({ where: { eventId, rating: 4 } }),
    prisma.review.count({ where: { eventId, rating: 5 } }),
  ]);

  return {
    avgRating: Number(aggregate._avg.rating ?? 0),
    totalReviews: aggregate._count._all,
    breakdown: {
      1: oneStar,
      2: twoStar,
      3: threeStar,
      4: fourStar,
      5: fiveStar,
    },
  };
}

