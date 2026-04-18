import type { Prisma, UserRole } from "@prisma/client";

import prisma from "../../config/database";
import type {
  AdminEventsQueryInput,
  AdminReviewsQueryInput,
  AdminUsersQueryInput,
} from "./admin.validation";

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  isBanned: true,
  bannedAt: true,
  createdAt: true,
} as const;

const adminEventSelect = {
  id: true,
  title: true,
  dateTime: true,
  venue: true,
  isPublic: true,
  isPaid: true,
  fee: true,
  createdById: true,
  deletedAt: true,
  createdAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

const adminReviewSelect = {
  id: true,
  userId: true,
  eventId: true,
  rating: true,
  comment: true,
  deletedAt: true,
  createdAt: true,
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
} as const;

export async function listUsersForAdmin(query: AdminUsersQueryInput) {
  const where: Prisma.UserWhereInput = {};
  if (query.search && query.search.length > 0) {
    where.email = { contains: query.search, mode: "insensitive" };
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: adminUserSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

export async function findUserByIdForAdmin(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function setUserBanState(
  userId: string,
  isBanned: boolean,
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isBanned,
      bannedAt: isBanned ? new Date() : null,
    },
    select: adminUserSelect,
  });
}

export async function revokeAllRefreshTokens(userId: string): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({ where: { userId } });
  return result.count;
}

export async function listEventsForAdmin(query: AdminEventsQueryInput) {
  const where: Prisma.EventWhereInput = {
    ...(query.isPublic !== undefined ? { isPublic: query.isPublic } : {}),
    ...(query.isPaid !== undefined ? { isPaid: query.isPaid } : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: adminEventSelect,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total };
}

export async function findEventByIdForAdmin(eventId: string) {
  return prisma.event.findUnique({ where: { id: eventId } });
}

export async function softDeleteEventById(eventId: string) {
  return prisma.event.update({
    where: { id: eventId },
    data: { deletedAt: new Date() },
    select: adminEventSelect,
  });
}

export async function listReviewsForAdmin(query: AdminReviewsQueryInput) {
  const where: Prisma.ReviewWhereInput = {
    ...(query.rating !== undefined ? { rating: query.rating } : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
      select: adminReviewSelect,
    }),
    prisma.review.count({ where }),
  ]);

  return { items, total };
}

export async function findReviewByIdForAdmin(reviewId: string) {
  return prisma.review.findUnique({ where: { id: reviewId } });
}

export async function softDeleteReviewById(reviewId: string) {
  return prisma.review.update({
    where: { id: reviewId },
    data: { deletedAt: new Date() },
    select: adminReviewSelect,
  });
}

export function isAdminRole(role: UserRole): boolean {
  return role === "ADMIN";
}

