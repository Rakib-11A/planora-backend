import type { Notification, Prisma } from "@prisma/client";

import prisma from "../../config/database";

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  metadata: true,
  createdAt: true,
} as const;

export type NotificationItem = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export async function createNotification(
  data: Prisma.NotificationUncheckedCreateInput,
): Promise<Notification> {
  return prisma.notification.create({ data });
}

export async function findPotentialDuplicate(
  userId: string,
  type: string,
  title: string,
  message: string,
  since: Date,
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: {
      userId,
      type,
      title,
      message,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMyNotifications(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: NotificationItem[]; total: number }> {
  const skip = (page - 1) * limit;
  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: notificationSelect,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return { items, total };
}

export async function findNotificationById(id: string): Promise<Notification | null> {
  return prisma.notification.findUnique({ where: { id } });
}

export async function markNotificationReadById(
  id: string,
): Promise<Notification> {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsReadByUserId(
  userId: string,
): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { count: result.count };
}

