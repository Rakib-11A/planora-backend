import { z } from "zod";

const booleanFromQuery = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return undefined;
}, z.boolean().optional());

const feeField = z.coerce
  .number({ invalid_type_error: "Fee must be a number" })
  .min(0, { message: "Fee must be 0 or greater" });

const titleField = z
  .string({ required_error: "Title is required", invalid_type_error: "Title must be a string" })
  .trim()
  .min(1, { message: "Title is required" })
  .max(150, { message: "Title must be at most 150 characters" });

const descriptionField = z
  .string({
    required_error: "Description is required",
    invalid_type_error: "Description must be a string",
  })
  .trim()
  .min(1, { message: "Description is required" })
  .max(5000, { message: "Description must be at most 5000 characters" });

const venueField = z
  .string({ required_error: "Venue is required", invalid_type_error: "Venue must be a string" })
  .trim()
  .min(1, { message: "Venue is required" })
  .max(300, { message: "Venue must be at most 300 characters" });

const dateTimeField = z.coerce.date({
  required_error: "dateTime is required",
  invalid_type_error: "dateTime must be a valid date",
});

function validatePaidFee(
  isPaid: boolean,
  fee: number,
  ctx: z.RefinementCtx,
): void {
  if (!isPaid && fee !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fee"],
      message: "fee must be 0 when isPaid is false",
    });
  }
  if (isPaid && fee <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fee"],
      message: "fee must be greater than 0 when isPaid is true",
    });
  }
}

export const createEventSchema = z
  .object({
    title: titleField,
    description: descriptionField,
    dateTime: dateTimeField,
    venue: venueField,
    isPublic: z.boolean({
      required_error: "isPublic is required",
      invalid_type_error: "isPublic must be boolean",
    }),
    isPaid: z.boolean({
      required_error: "isPaid is required",
      invalid_type_error: "isPaid must be boolean",
    }),
    fee: feeField.default(0),
  })
  .superRefine((value, ctx) => {
    if (value.dateTime <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTime"],
        message: "dateTime must be in the future",
      });
    }
    validatePaidFee(value.isPaid, value.fee, ctx);
  });

export const updateEventSchema = z
  .object({
    title: titleField.optional(),
    description: descriptionField.optional(),
    dateTime: dateTimeField.optional(),
    venue: venueField.optional(),
    isPublic: z.boolean({ invalid_type_error: "isPublic must be boolean" }).optional(),
    isPaid: z.boolean({ invalid_type_error: "isPaid must be boolean" }).optional(),
    fee: feeField.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided",
  });

export const getEventsQuerySchema = z.object({
  search: z.string().trim().min(1).max(150).optional(),
  isPublic: booleanFromQuery,
  isPaid: booleanFromQuery,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const eventIdParamSchema = z.object({
  id: z.string().cuid({ message: "Invalid event id" }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type GetEventsQueryInput = z.infer<typeof getEventsQuerySchema>;
export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;

