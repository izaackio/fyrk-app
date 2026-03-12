import { z } from "zod";

const uuidSchema = z.string().uuid();

export const lifeEventTypes = [
  "buying_apartment",
  "having_child",
  "changing_jobs",
  "inheritance",
  "retirement",
  "marriage",
  "divorce",
] as const;

export const playbookActionCategories = [
  "financial",
  "legal",
  "insurance",
  "tax",
  "administrative",
] as const;

export const playbookActionPriorities = ["critical", "high", "medium", "low"] as const;
export const playbookActionStatuses = ["pending", "in_progress", "completed", "skipped"] as const;

export const lifeEventPathParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const lifeEventListQuerySchema = z
  .object({
    householdId: uuidSchema,
  })
  .strict();

export const lifeEventDetailQuerySchema = z
  .object({
    householdId: uuidSchema.optional(),
  })
  .strict();

export const playbookActionPathParamsSchema = z
  .object({
    id: uuidSchema,
    actionId: uuidSchema,
  })
  .strict();

export const createLifeEventSchema = z
  .object({
    householdId: uuidSchema,
    eventType: z.enum(lifeEventTypes),
    title: z.string().trim().min(1).max(160),
    inputs: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const updatePlaybookActionSchema = z
  .object({
    householdId: uuidSchema.optional(),
    status: z.enum(playbookActionStatuses).optional(),
    assignedTo: z.string().trim().min(1).max(160).nullable().optional(),
    assignedToLabel: z.string().trim().min(1).max(160).nullable().optional(),
    completionNotes: z.string().trim().min(1).max(4000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateLifeEventInput = z.infer<typeof createLifeEventSchema>;
export type UpdatePlaybookActionInput = z.infer<typeof updatePlaybookActionSchema>;
