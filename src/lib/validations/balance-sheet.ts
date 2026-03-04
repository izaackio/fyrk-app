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

const assumptionValueSchema = z.object({
  value: z.number(),
  source: z.enum(["system_default", "user_override", "historical_derived"]),
});

const assumptionsSchema = z.object({
  sourceTier: z.enum(["system_default", "user_override", "historical_derived"]),
  assumptions: z.object({
    equityReturn: assumptionValueSchema,
    fixedIncomeReturn: assumptionValueSchema,
    cashReturn: assumptionValueSchema,
    inflation: assumptionValueSchema,
    salaryGrowth: assumptionValueSchema,
    monthlyExpenses: assumptionValueSchema,
    governmentBorrowingRate: assumptionValueSchema,
    staleAccountDays: assumptionValueSchema,
    staleFxHours: assumptionValueSchema,
  }),
});

const concentrationRiskSchema = z.object({
  type: z.enum(["single_holding", "single_sector", "single_currency", "single_country"]),
  name: z.string(),
  percentage: z.number(),
  severity: z.enum(["info", "warning", "critical"]),
});

export const balanceSheetResponseSchema = z.object({
  totalNetWorth: z.number().int(),
  totalAssets: z.number().int(),
  totalLiabilities: z.number().int(),
  currency: z.string().length(3),
  asOfDate: dateOnlySchema,
  byMember: z.array(
    z.object({
      userId: uuidSchema,
      displayName: z.string(),
      netWorth: z.number().int(),
      assets: z.number().int().optional(),
      liabilities: z.number().int().optional(),
    }),
  ),
  byAccountType: z.array(
    z.object({
      type: z.string(),
      value: z.number().int(),
    }),
  ),
  byWrapperType: z.array(
    z.object({
      wrapperType: z.string(),
      value: z.number().int(),
    }),
  ),
  liquidAssets: z.number().int(),
  illiquidAssets: z.number().int(),
  allocation: z.object({
    byAssetClass: z.array(
      z.object({
        class: z.string(),
        value: z.number().int(),
        pct: z.number(),
        percentage: z.number().optional(),
        memberBreakdown: z.record(z.string(), z.number().int()).optional(),
      }),
    ),
    byGeography: z.array(
      z.object({
        country: z.string(),
        value: z.number().int(),
        pct: z.number(),
        percentage: z.number().optional(),
        memberBreakdown: z.record(z.string(), z.number().int()).optional(),
      }),
    ),
    byCurrency: z.array(
      z.object({
        currency: z.string(),
        value: z.number().int(),
        pct: z.number(),
        percentage: z.number().optional(),
        memberBreakdown: z.record(z.string(), z.number().int()).optional(),
      }),
    ),
    bySector: z.array(
      z.object({
        sector: z.string(),
        value: z.number().int(),
        pct: z.number(),
        percentage: z.number().optional(),
        memberBreakdown: z.record(z.string(), z.number().int()).optional(),
      }),
    ),
  }),
  concentrationRisks: z.array(concentrationRiskSchema),
  dataQuality: z.object({
    coveragePct: z.number().int(),
    staleAccounts: z.number().int(),
    lastFullUpdate: z.string().datetime().nullable(),
    score: z.enum(["high", "medium", "low"]).optional(),
    coveragePercent: z.number().optional(),
    staleAccountIds: z.array(z.string()).optional(),
    missingPrices: z.array(z.string()).optional(),
    estimatedValues: z.array(z.string()).optional(),
    missingValuationAccountIds: z.array(z.string()).optional(),
    staleFxRates: z.boolean().optional(),
  }),
  metadata: z.object({
    calculatedAt: z.string().datetime(),
    assumptions: assumptionsSchema,
    fx: z.object({
      source: z.string(),
      asOfDate: dateOnlySchema.nullable(),
      stale: z.boolean(),
    }),
    deterministicPayload: z.object({
      netWorth: z.object({
        totalNetWorth: z.number().int(),
        totalAssets: z.number().int(),
        totalLiabilities: z.number().int(),
        byMember: z.record(
          z.string(),
          z.object({
            assets: z.number().int(),
            liabilities: z.number().int(),
            netWorth: z.number().int(),
          }),
        ),
        byAccountType: z.record(z.string(), z.number().int()),
        byWrapperType: z.record(z.string(), z.number().int()),
        liquidAssets: z.number().int(),
        illiquidAssets: z.number().int(),
      }),
      allocation: z.object({
        byAssetClass: z.array(
          z.object({
            category: z.string(),
            value: z.number().int(),
            percentage: z.number(),
            memberBreakdown: z.record(z.string(), z.number().int()).optional(),
          }),
        ),
        byGeography: z.array(
          z.object({
            category: z.string(),
            value: z.number().int(),
            percentage: z.number(),
            memberBreakdown: z.record(z.string(), z.number().int()).optional(),
          }),
        ),
        byCurrency: z.array(
          z.object({
            category: z.string(),
            value: z.number().int(),
            percentage: z.number(),
            memberBreakdown: z.record(z.string(), z.number().int()).optional(),
          }),
        ),
        bySector: z.array(
          z.object({
            category: z.string(),
            value: z.number().int(),
            percentage: z.number(),
            memberBreakdown: z.record(z.string(), z.number().int()).optional(),
          }),
        ),
        concentrationRisks: z.array(concentrationRiskSchema),
      }),
      dataQuality: z.object({
        score: z.enum(["high", "medium", "low"]),
        coveragePercent: z.number(),
        staleAccountIds: z.array(z.string()),
        missingPrices: z.array(z.string()),
        estimatedValues: z.array(z.string()),
        missingValuationAccountIds: z.array(z.string()),
        staleFxRates: z.boolean(),
      }),
    }),
  }),
});

export const balanceSheetHistoryResponseSchema = z.object({
  period: balanceSheetHistoryPeriodSchema,
  currency: z.string().length(3),
  history: z.array(
    z.object({
      date: dateOnlySchema,
      netWorth: z.number().int(),
      assets: z.number().int(),
      liabilities: z.number().int(),
    }),
  ),
  change: z.object({
    amount: z.number().int(),
    pct: z.number().nullable(),
  }),
  metadata: z.object({
    calculatedAt: z.string().datetime(),
    assumptions: assumptionsSchema,
    source: z.enum(["household_snapshots", "account_snapshots"]),
    fallbackReason: z
      .enum([
        "no_viewable_accounts",
        "household_snapshots_empty",
        "household_snapshots_unavailable",
        "visibility_restricted",
      ])
      .nullable(),
  }),
});

export type BalanceSheetQueryInput = z.infer<typeof balanceSheetQuerySchema>;
export type BalanceSheetHistoryQueryInput = z.infer<typeof balanceSheetHistoryQuerySchema>;
export type SnapshotDateQueryInput = z.infer<typeof snapshotDateQuerySchema>;
export type BalanceSheetResponse = z.infer<typeof balanceSheetResponseSchema>;
export type BalanceSheetHistoryResponse = z.infer<typeof balanceSheetHistoryResponseSchema>;
