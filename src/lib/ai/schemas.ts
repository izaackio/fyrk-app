import { z } from "zod";

import { warmAuthorityTextSchema } from "@/lib/ai/quality";
import { playbookActionCategories, playbookActionPriorities } from "@/lib/validations/events";

const uuidSchema = z.string().uuid();

export const weeklyNarrativeRequestSchema = z
  .object({
    householdId: uuidSchema
  })
  .strict();

export const weeklyNarrativeHighlightSchema = z
  .object({
    type: z.enum(["positive", "neutral", "negative", "action"]),
    text: warmAuthorityTextSchema({
      maxLength: 280,
      maxSentences: 1,
      maxWords: 24,
      minSentences: 1
    })
  })
  .strict();

export const weeklyNarrativeOutputSchema = z
  .object({
    narrative: warmAuthorityTextSchema({
      maxLength: 1200,
      maxSentences: 5,
      maxWords: 120,
      minSentences: 3
    }),
    highlights: z.array(weeklyNarrativeHighlightSchema).min(1).max(6)
  })
  .strict();

export const weeklyNarrativeCacheHighlightsSchema = z.array(weeklyNarrativeHighlightSchema);

export const playbookActionAiSchema = z
  .object({
    title: warmAuthorityTextSchema({
      maxLength: 140,
      maxSentences: 1,
      maxWords: 12,
      minSentences: 1
    }),
    description: warmAuthorityTextSchema({
      maxLength: 500,
      maxSentences: 3,
      maxWords: 70,
      minSentences: 1
    }),
    category: z.enum(playbookActionCategories),
    priority: z.enum(playbookActionPriorities),
    estimatedImpactDescription: warmAuthorityTextSchema({
      disallowDigits: true,
      maxLength: 240,
      maxSentences: 2,
      maxWords: 26,
      minSentences: 1
    })
  })
  .strict();

export const playbookAiOutputSchema = z
  .object({
    actions: z.array(playbookActionAiSchema).min(5).max(15)
  })
  .strict();

const fitnessActionComponents = [
  "buffer",
  "growth",
  "protection",
  "efficiency",
  "trajectory"
] as const;

const quarterlyReviewFitnessComponents = [
  "buffer",
  "growth",
  "protection",
  "efficiency",
  "trajectory",
  "governance"
] as const;

const quarterlyReviewActionTypes = ["proposal", "research", "monitor", "discuss"] as const;

export const fitnessActionAiSchema = z
  .object({
    component: z.enum(fitnessActionComponents),
    title: z.string().trim().min(1).max(120),
    impact: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(360)
  })
  .strict();

export const fitnessExplanationAiOutputSchema = z
  .object({
    explanation: z.string().trim().min(1).max(1800),
    suggestedActions: z.array(fitnessActionAiSchema).max(5)
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();

    for (const action of value.suggestedActions) {
      if (!seen.has(action.component)) {
        seen.add(action.component);
        continue;
      }

      context.addIssue({
        code: "custom",
        message: `Duplicate component in suggestedActions: ${action.component}`
      });
    }
  });

export const quarterlyReviewRecommendationAiSchema = z
  .object({
    opportunityId: z.string().trim().min(1).max(80),
    title: warmAuthorityTextSchema({
      maxLength: 140,
      maxSentences: 1,
      maxWords: 12,
      minSentences: 1
    }),
    description: warmAuthorityTextSchema({
      maxLength: 700,
      maxSentences: 3,
      maxWords: 90,
      minSentences: 1
    }),
    estimatedImpactSummary: warmAuthorityTextSchema({
      disallowDigits: true,
      maxLength: 240,
      maxSentences: 2,
      maxWords: 26,
      minSentences: 1
    })
  })
  .strict();

export const quarterlyReviewAiOutputSchema = z
  .object({
    narrative: warmAuthorityTextSchema({
      maxLength: 2600,
      maxSentences: 4,
      maxWords: 160,
      minSentences: 2
    }),
    performanceExplanation: warmAuthorityTextSchema({
      maxLength: 1200,
      maxSentences: 3,
      maxWords: 100,
      minSentences: 1
    }),
    recommendations: z.array(quarterlyReviewRecommendationAiSchema).min(1).max(8),
    quarterSummary: warmAuthorityTextSchema({
      maxLength: 1200,
      maxSentences: 2,
      maxWords: 45,
      minSentences: 1
    }),
    nextQuarterFocus: warmAuthorityTextSchema({
      maxLength: 700,
      maxSentences: 2,
      maxWords: 40,
      minSentences: 1
    })
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();

    for (const recommendation of value.recommendations) {
      if (!seen.has(recommendation.opportunityId)) {
        seen.add(recommendation.opportunityId);
        continue;
      }

      context.addIssue({
        code: "custom",
        message: `Duplicate opportunityId in recommendations: ${recommendation.opportunityId}`
      });
    }
  });

export const quarterlyReviewPerformanceAttributionSchema = z
  .object({
    marketReturns: z.number().int(),
    netSavings: z.number().int(),
    debtReduction: z.number().int(),
    feesDrag: z.number().int(),
    explanation: warmAuthorityTextSchema({
      maxLength: 1200,
      maxSentences: 3,
      maxWords: 100,
      minSentences: 1
    })
  })
  .strict();

export const quarterlyReviewRecommendationSchema = z
  .object({
    opportunityId: z.string().trim().min(1).max(80),
    priority: z.enum(playbookActionPriorities),
    title: warmAuthorityTextSchema({
      maxLength: 140,
      maxSentences: 1,
      maxWords: 12,
      minSentences: 1
    }),
    description: warmAuthorityTextSchema({
      maxLength: 700,
      maxSentences: 3,
      maxWords: 90,
      minSentences: 1
    }),
    estimatedImpactPerYear: z.number().int().nullable(),
    estimatedImpactSummary: warmAuthorityTextSchema({
      disallowDigits: true,
      maxLength: 240,
      maxSentences: 2,
      maxWords: 26,
      minSentences: 1
    }),
    fitnessComponent: z.enum(quarterlyReviewFitnessComponents),
    actionType: z.enum(quarterlyReviewActionTypes)
  })
  .strict();

export const quarterlyReviewUpcomingEventSchema = z
  .object({
    title: warmAuthorityTextSchema({
      maxLength: 140,
      maxSentences: 1,
      maxWords: 12,
      minSentences: 1
    }),
    date: z.string().trim().min(1).max(40),
    preparationNeeded: warmAuthorityTextSchema({
      maxLength: 320,
      maxSentences: 2,
      maxWords: 40,
      minSentences: 1
    })
  })
  .strict();

export const quarterlyReviewOutputSchema = z
  .object({
    narrative: warmAuthorityTextSchema({
      maxLength: 2600,
      maxSentences: 4,
      maxWords: 160,
      minSentences: 2
    }),
    performanceAttribution: quarterlyReviewPerformanceAttributionSchema,
    recommendations: z.array(quarterlyReviewRecommendationSchema).min(1).max(8),
    upcomingEvents: z.array(quarterlyReviewUpcomingEventSchema).max(12),
    quarterSummary: warmAuthorityTextSchema({
      maxLength: 1200,
      maxSentences: 2,
      maxWords: 45,
      minSentences: 1
    }),
    nextQuarterFocus: warmAuthorityTextSchema({
      maxLength: 700,
      maxSentences: 2,
      maxWords: 40,
      minSentences: 1
    }),
    dataQualityNotes: z
      .array(
        warmAuthorityTextSchema({
          maxLength: 240,
          maxSentences: 1,
          maxWords: 32,
          minSentences: 1
        })
      )
      .max(8)
  })
  .strict();

const proposalImpactAllocationChangeSchema = z
  .object({
    from: z.number(),
    to: z.number()
  })
  .strict();

export const proposalImpactDeterministicContextSchema = z
  .object({
    allocationChange: z.record(z.string(), proposalImpactAllocationChangeSchema),
    fitnessImpact: z.string().trim().min(1).max(180),
    keyTradeoffs: z.array(z.string().trim().min(1).max(240)).max(8),
    riskFlags: z.array(z.string().trim().min(1).max(240)).max(8),
    assumptions: z.array(z.string().trim().min(1).max(240)).max(8)
  })
  .strict();

export const proposalImpactAiOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(900),
    householdImpact: z.string().trim().min(1).max(900),
    riskAssessment: z.string().trim().min(1).max(900),
    approvalConsiderations: z.array(z.string().trim().min(1).max(220)).min(1).max(6),
    discussionPrompts: z.array(z.string().trim().min(1).max(220)).min(1).max(6)
  })
  .strict();

export const proposalImpactOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(900),
    householdImpact: z.string().trim().min(1).max(900),
    riskAssessment: z.string().trim().min(1).max(900),
    approvalConsiderations: z.array(z.string().trim().min(1).max(220)).min(1).max(6),
    discussionPrompts: z.array(z.string().trim().min(1).max(220)).min(1).max(6),
    deterministicImpact: proposalImpactDeterministicContextSchema
  })
  .strict();

export type WeeklyNarrativeRequestInput = z.infer<typeof weeklyNarrativeRequestSchema>;
export type WeeklyNarrativeHighlight = z.infer<typeof weeklyNarrativeHighlightSchema>;
export type WeeklyNarrativeOutput = z.infer<typeof weeklyNarrativeOutputSchema>;
export type PlaybookAiAction = z.infer<typeof playbookActionAiSchema>;
export type PlaybookAiOutput = z.infer<typeof playbookAiOutputSchema>;
export type FitnessActionAi = z.infer<typeof fitnessActionAiSchema>;
export type FitnessExplanationAiOutput = z.infer<typeof fitnessExplanationAiOutputSchema>;
export type QuarterlyReviewRecommendationPriority = z.infer<
  typeof quarterlyReviewRecommendationSchema
>["priority"];
export type QuarterlyReviewFitnessComponent = z.infer<
  typeof quarterlyReviewRecommendationSchema
>["fitnessComponent"];
export type QuarterlyReviewActionType = z.infer<
  typeof quarterlyReviewRecommendationSchema
>["actionType"];
export type QuarterlyReviewAiRecommendation = z.infer<typeof quarterlyReviewRecommendationAiSchema>;
export type QuarterlyReviewAiOutput = z.infer<typeof quarterlyReviewAiOutputSchema>;
export type QuarterlyReviewPerformanceAttribution = z.infer<
  typeof quarterlyReviewPerformanceAttributionSchema
>;
export type QuarterlyReviewRecommendation = z.infer<typeof quarterlyReviewRecommendationSchema>;
export type QuarterlyReviewUpcomingEvent = z.infer<typeof quarterlyReviewUpcomingEventSchema>;
export type QuarterlyReviewOutput = z.infer<typeof quarterlyReviewOutputSchema>;
export type ProposalImpactDeterministicContext = z.infer<
  typeof proposalImpactDeterministicContextSchema
>;
export type ProposalImpactAiOutput = z.infer<typeof proposalImpactAiOutputSchema>;
export type ProposalImpactOutput = z.infer<typeof proposalImpactOutputSchema>;
