import { z } from "zod";

const uuidSchema = z.string().uuid();

export const fitnessQuerySchema = z
  .object({
    householdId: uuidSchema,
  })
  .strict();

export type FitnessQueryInput = z.infer<typeof fitnessQuerySchema>;
