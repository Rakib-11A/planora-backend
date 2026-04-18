import { InvitationStatus } from "@prisma/client";
import { z } from "zod";

export const inviteBodySchema = z.object({
  inviteeId: z.string().cuid({ message: "Invalid inviteeId" }),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().cuid({ message: "Invalid eventId" }),
});

export const invitationIdParamSchema = z.object({
  invitationId: z.string().cuid({ message: "Invalid invitationId" }),
});

export const eventInvitationsQuerySchema = z.object({
  status: z.nativeEnum(InvitationStatus).optional(),
});

export type InviteBodyInput = z.infer<typeof inviteBodySchema>;
export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;
export type InvitationIdParamInput = z.infer<typeof invitationIdParamSchema>;
export type EventInvitationsQueryInput = z.infer<typeof eventInvitationsQuerySchema>;

