import type { Event } from "@prisma/client";

export type EventTypeLabel =
  | "PUBLIC_FREE"
  | "PUBLIC_PAID"
  | "PRIVATE_FREE"
  | "PRIVATE_PAID";

export type EventSafe = Pick<
  Event,
  | "id"
  | "title"
  | "description"
  | "dateTime"
  | "venue"
  | "isPublic"
  | "isPaid"
  | "fee"
  | "createdById"
  | "createdAt"
  | "updatedAt"
> & {
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

export type EventWithType = EventSafe & { eventType: EventTypeLabel };

export type EventQuery = {
  search?: string;
  isPublic?: boolean;
  isPaid?: boolean;
  page: number;
  limit: number;
};

