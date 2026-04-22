import type { Prisma } from "@prisma/client";

import prisma from "../../config/database";
import { NOTIFICATION_TYPES, type NotificationType } from "./notification.types";

export type NotificationPreferences = {
  /** Master switch for transactional emails. In-app delivery is always on. */
  emailEnabled: boolean;
  /** Notification types whose emails the user has opted out of. */
  mutedTypes: NotificationType[];
};

const ALL_TYPES = Object.values(NOTIFICATION_TYPES) as NotificationType[];
const VALID_TYPE_SET = new Set<string>(ALL_TYPES);

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  mutedTypes: [],
};

/** Coerce arbitrary stored JSON into a sound preferences object. */
export function normalizePreferences(raw: unknown): NotificationPreferences {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  const emailEnabled =
    typeof obj.emailEnabled === "boolean"
      ? obj.emailEnabled
      : DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled;

  const mutedRaw = Array.isArray(obj.mutedTypes) ? obj.mutedTypes : [];
  const mutedTypes = Array.from(
    new Set(
      mutedRaw.filter(
        (t): t is NotificationType => typeof t === "string" && VALID_TYPE_SET.has(t),
      ),
    ),
  );

  return { emailEnabled, mutedTypes };
}

/** Read prefs for a user, with defaults if unset or row not found. */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });
  return normalizePreferences(row?.notificationPreferences ?? null);
}

/** Replace stored prefs (always writes both fields, normalized). */
export async function setNotificationPreferences(
  userId: string,
  next: NotificationPreferences,
): Promise<NotificationPreferences> {
  const normalized = normalizePreferences(next);
  await prisma.user.update({
    where: { id: userId },
    data: {
      notificationPreferences: normalized as unknown as Prisma.InputJsonValue,
    },
  });
  return normalized;
}

export function isEmailAllowed(
  prefs: NotificationPreferences,
  type: NotificationType,
): boolean {
  if (!prefs.emailEnabled) return false;
  return !prefs.mutedTypes.includes(type);
}

export const NOTIFICATION_TYPE_LIST = ALL_TYPES;
