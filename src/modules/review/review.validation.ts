import { z } from "zod";

export const eventIdParamSchema = z.object({
  eventId: z.string().cuid({ message: "Invalid event id" }),
});

const ratingField = z
  .number({ required_error: "rating is required", invalid_type_error: "rating must be a number" })
  .int({ message: "rating must be an integer" })
  .min(1, { message: "rating must be at least 1" })
  .max(5, { message: "rating must be at most 5" });

const commentField = z
  .string({ invalid_type_error: "comment must be a string" })
  .trim()
  .max(500, { message: "comment must be at most 500 characters" })
  .optional();

export const createReviewSchema = z.object({
  rating: ratingField,
  comment: commentField,
});

export const updateReviewSchema = z
  .object({
    rating: ratingField.optional(),
    comment: commentField,
  })
  .refine((value) => value.rating !== undefined || value.comment !== undefined, {
    message: "At least one field must be provided",
  });

export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

