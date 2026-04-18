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

export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;
export type ParticipantParamInput = z.infer<typeof participantParamSchema>;
export type ParticipantsQueryInput = z.infer<typeof participantsQuerySchema>;

