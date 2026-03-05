import { z } from "zod";

import { playbookActionCategories, playbookActionPriorities } from "@/lib/validations/events";

const uuidSchema = z.string().uuid();

export const weeklyNarrativeRequestSchema = z
  .object({
    householdId: uuidSchema,
  })
  .strict();

export const weeklyNarrativeHighlightSchema = z
  .object({
    type: z.enum(["positive", "neutral", "negative", "action"]),
    text: z.string().trim().min(1).max(280),
  })
  .strict();

export const weeklyNarrativeOutputSchema = z
  .object({
    narrative: z.string().trim().min(1).max(1600),
    highlights: z.array(weeklyNarrativeHighlightSchema).min(1).max(6),
  })
  .strict();

export const weeklyNarrativeCacheHighlightsSchema = z.array(weeklyNarrativeHighlightSchema);

export const playbookActionAiSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().min(1).max(500),
    category: z.enum(playbookActionCategories),
    priority: z.enum(playbookActionPriorities),
    estimatedImpactDescription: z.string().trim().min(1).max(240),
  })
  .strict();

export const playbookAiOutputSchema = z
  .object({
    actions: z.array(playbookActionAiSchema).min(5).max(15),
  })
  .strict();

const fitnessActionComponents = [
  "buffer",
  "growth",
  "protection",
  "efficiency",
  "trajectory",
] as const;

export const fitnessActionAiSchema = z
  .object({
    component: z.enum(fitnessActionComponents),
    title: z.string().trim().min(1).max(120),
    impact: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(360),
  })
  .strict();

export const fitnessExplanationAiOutputSchema = z
  .object({
    explanation: z.string().trim().min(1).max(1800),
    suggestedActions: z.array(fitnessActionAiSchema).max(5),
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
        message: `Duplicate component in suggestedActions: ${action.component}`,
      });
    }
  });

export type WeeklyNarrativeRequestInput = z.infer<typeof weeklyNarrativeRequestSchema>;
export type WeeklyNarrativeHighlight = z.infer<typeof weeklyNarrativeHighlightSchema>;
export type WeeklyNarrativeOutput = z.infer<typeof weeklyNarrativeOutputSchema>;
export type PlaybookAiAction = z.infer<typeof playbookActionAiSchema>;
export type PlaybookAiOutput = z.infer<typeof playbookAiOutputSchema>;
export type FitnessActionAi = z.infer<typeof fitnessActionAiSchema>;
export type FitnessExplanationAiOutput = z.infer<typeof fitnessExplanationAiOutputSchema>;
