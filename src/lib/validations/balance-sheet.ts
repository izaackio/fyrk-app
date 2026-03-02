import { z } from "zod";

import { balanceSheetHistoryPeriods } from "@/types/domain";

const uuidSchema = z.string().uuid();

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Must be an ISO date (YYYY-MM-DD)");

export const balanceSheetQuerySchema = z
  .object({
    householdId: uuidSchema,
  })
  .strict();

export const balanceSheetHistoryPeriodSchema = z.enum(balanceSheetHistoryPeriods);

export const balanceSheetHistoryQuerySchema = z
  .object({
    householdId: uuidSchema,
    period: balanceSheetHistoryPeriodSchema.default("12m"),
  })
  .strict();

export const snapshotDateQuerySchema = z
  .object({
    snapshotDate: dateOnlySchema.optional(),
  })
  .strict();

export type BalanceSheetQueryInput = z.infer<typeof balanceSheetQuerySchema>;
export type BalanceSheetHistoryQueryInput = z.infer<typeof balanceSheetHistoryQuerySchema>;
export type SnapshotDateQueryInput = z.infer<typeof snapshotDateQuerySchema>;
