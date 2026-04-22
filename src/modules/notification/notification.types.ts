import type { Prisma } from "@prisma/client";

export const NOTIFICATION_TYPES = {
  INVITATION_RECEIVED: "INVITATION_RECEIVED",
  INVITATION_ACCEPTED: "INVITATION_ACCEPTED",
  PARTICIPATION_APPROVED: "PARTICIPATION_APPROVED",
  PARTICIPATION_REJECTED: "PARTICIPATION_REJECTED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  EVENT_REMINDER: "EVENT_REMINDER",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type EmitNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  email?: {
    to: string;
    subject: string;
    html: string;
  };
  dedupeKey?: string;
};

export type NotificationQuery = {
  page: number;
  limit: number;
};

