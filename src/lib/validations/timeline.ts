import { z } from "zod";

const uuidSchema = z.string().uuid();

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Must be an ISO date (YYYY-MM-DD)");

export const timelineEntryTypes = [
  "life_event",
  "decision",
  "milestone",
  "review",
  "system",
  "note",
] as const;

export const timelineCategories = [
  "housing",
  "family",
  "career",
  "investment",
  "retirement",
  "other",
] as const;

const timelineEntryTypeSchema = z.enum(timelineEntryTypes);
const timelineCategorySchema = z.enum(timelineCategories);

const metadataSchema = z.record(z.string(), z.unknown());

export const timelinePathParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const timelineQuerySchema = z
  .object({
    householdId: uuidSchema,
    types: z
      .string()
      .trim()
      .optional()
      .transform((value) => {
        if (!value) {
          return [];
        }

        return value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
      })
      .refine(
        (value) => value.every((entry) => (timelineEntryTypes as readonly string[]).includes(entry)),
        {
          message: "One or more timeline entry types are invalid",
        },
      ),
    from: dateOnlySchema.optional(),
    cursor: uuidSchema.optional(),
    limit: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === "") {
          return undefined;
        }

        if (typeof value === "string") {
          return Number.parseInt(value, 10);
        }

        return value;
      },
      z.number().int().min(1).max(100).default(20),
    ),
  })
  .strict();

export const createTimelineEntrySchema = z
  .object({
    householdId: uuidSchema,
    entryType: timelineEntryTypeSchema.default("note"),
    category: timelineCategorySchema.nullable().optional(),
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().max(4000).nullable().optional(),
    reasoning: z.string().trim().max(4000).nullable().optional(),
    expectedOutcome: z.string().trim().max(4000).nullable().optional(),
    linkedAccountIds: z.array(uuidSchema).max(25).optional(),
    linkedProposalId: uuidSchema.nullable().optional(),
    linkedReviewId: uuidSchema.nullable().optional(),
    linkedEventId: uuidSchema.nullable().optional(),
    entryDate: dateOnlySchema,
    isFuture: z.boolean().default(false),
    metadata: metadataSchema.default({}),
  })
  .strict();

export const updateTimelineEntrySchema = z
  .object({
    entryType: timelineEntryTypeSchema.optional(),
    category: timelineCategorySchema.nullable().optional(),
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    reasoning: z.string().trim().max(4000).nullable().optional(),
    expectedOutcome: z.string().trim().max(4000).nullable().optional(),
    linkedAccountIds: z.array(uuidSchema).max(25).optional(),
    linkedProposalId: uuidSchema.nullable().optional(),
    linkedReviewId: uuidSchema.nullable().optional(),
    linkedEventId: uuidSchema.nullable().optional(),
    entryDate: dateOnlySchema.optional(),
    isFuture: z.boolean().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type TimelineQueryInput = z.infer<typeof timelineQuerySchema>;
export type CreateTimelineEntryInput = z.infer<typeof createTimelineEntrySchema>;
export type UpdateTimelineEntryInput = z.infer<typeof updateTimelineEntrySchema>;
