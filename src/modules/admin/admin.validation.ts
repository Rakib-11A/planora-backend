import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().cuid({ message: "Invalid user id" }),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().cuid({ message: "Invalid event id" }),
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string().cuid({ message: "Invalid review id" }),
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
});

export const adminEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  isPublic: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  isPaid: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const adminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const setSiteFeaturedBodySchema = z.object({
  eventId: z.union([z.string().cuid({ message: "Invalid event id" }), z.null()]),
});

export type AdminUsersQueryInput = z.infer<typeof adminUsersQuerySchema>;
export type AdminEventsQueryInput = z.infer<typeof adminEventsQuerySchema>;
export type AdminReviewsQueryInput = z.infer<typeof adminReviewsQuerySchema>;
export type SetSiteFeaturedBodyInput = z.infer<typeof setSiteFeaturedBodySchema>;

