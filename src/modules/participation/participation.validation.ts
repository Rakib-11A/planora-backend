import { ParticipationStatus } from "@prisma/client";
import { z } from "zod";

export const eventIdParamSchema = z.object({
  eventId: z.string().cuid({ message: "Invalid event id" }),
});

export const participantParamSchema = z.object({
  eventId: z.string().cuid({ message: "Invalid event id" }),
  userId: z.string().cuid({ message: "Invalid user id" }),
});

export const participantsQuerySchema = z.object({
  status: z.nativeEnum(ParticipationStatus).optional(),
});

export const myParticipationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;
export type ParticipantParamInput = z.infer<typeof participantParamSchema>;
export type ParticipantsQueryInput = z.infer<typeof participantsQuerySchema>;
export type MyParticipationsQueryInput = z.infer<typeof myParticipationsQuerySchema>;

