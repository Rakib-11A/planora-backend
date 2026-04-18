import type { Prisma } from "@prisma/client";

import { sendEmail } from "../../config/email";
import { ApiError } from "../../utils/ApiError";
import {
  createNotification,
  findNotificationById,
  findPotentialDuplicate,
  listMyNotifications,
  markAllNotificationsReadByUserId,
  markNotificationReadById,
} from "./notification.repository";
import type { EmitNotificationInput, NotificationQuery } from "./notification.types";

function basicEmailTemplate(title: string, message: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;"><h2>${title}</h2><p>${message}</p></body></html>`;
}

export async function createNotificationService(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await createNotification({ userId, type, title, message, metadata });
}

export async function emitNotification(
  input: EmitNotificationInput,
): Promise<void> {
  const dedupeSince = new Date(Date.now() - 2 * 60 * 1000);
  const duplicate = await findPotentialDuplicate(
    input.userId,
    input.type,
    input.title,
    input.message,
    dedupeSince,
  );

  if (!duplicate) {
    await createNotificationService(
      input.userId,
      input.type,
      input.title,
      input.message,
      input.metadata,
    );
  }

  if (input.email) {
    try {
      await sendEmail({
        to: input.email.to,
        subject: input.email.subject,
        html: input.email.html || basicEmailTemplate(input.title, input.message),
      });
    } catch {
      // Silent by design: notification flow must not fail on email issues.
    }
  }
}

export async function getMyNotificationsService(
  userId: string,
  query: NotificationQuery,
): Promise<{
  items: Awaited<ReturnType<typeof listMyNotifications>>["items"];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { items, total } = await listMyNotifications(userId, query.page, query.limit);
  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function markNotificationReadService(
  notificationId: string,
  userId: string,
): Promise<{ message: string }> {
  const notification = await findNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  if (notification.userId !== userId) {
    throw new ApiError(403, "Forbidden");
  }

  await markNotificationReadById(notificationId);
  return { message: "Notification marked as read" };
}

export async function markAllNotificationsReadService(
  userId: string,
): Promise<{ message: string; updatedCount: number }> {
  const { count } = await markAllNotificationsReadByUserId(userId);
  return { message: "All notifications marked as read", updatedCount: count };
}

