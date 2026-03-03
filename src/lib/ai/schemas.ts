import { z } from "zod";

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

export type WeeklyNarrativeRequestInput = z.infer<typeof weeklyNarrativeRequestSchema>;
export type WeeklyNarrativeHighlight = z.infer<typeof weeklyNarrativeHighlightSchema>;
export type WeeklyNarrativeOutput = z.infer<typeof weeklyNarrativeOutputSchema>;
