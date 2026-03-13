import { z } from "zod";

const uuidSchema = z.string().uuid();

export const reviewPathParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const reviewListQuerySchema = z
  .object({
    householdId: uuidSchema,
  })
  .strict();

export const generateReviewSchema = z
  .object({
    householdId: uuidSchema,
  })
  .strict();

export type GenerateReviewInput = z.infer<typeof generateReviewSchema>;
export type ReviewListQueryInput = z.infer<typeof reviewListQuerySchema>;
