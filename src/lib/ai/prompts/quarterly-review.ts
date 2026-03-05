import type {
  QuarterlyReviewActionType,
  QuarterlyReviewFitnessComponent,
  QuarterlyReviewRecommendationPriority,
  QuarterlyReviewUpcomingEvent,
} from "@/lib/ai/schemas";

export interface QuarterlyReviewRecommendationOpportunityContext {
  id: string;
  priority: QuarterlyReviewRecommendationPriority;
  title: string;
  deterministicRationale: string;
  estimatedImpactPerYear: number | null;
  fitnessComponent: QuarterlyReviewFitnessComponent;
  actionType: QuarterlyReviewActionType;
}

export interface QuarterlyReviewPromptContext {
  householdName: string;
  quarterLabel: string;
  generatedAt: string;
  currency: string;
  performanceAttribution: {
    marketReturns: number;
    netSavings: number;
    debtReduction: number;
    feesDrag: number;
    netWorthStart: number;
    netWorthEnd: number;
    netWorthChange: number;
    netWorthChangePct: number | null;
  };
  fitness: {
    currentScore: number;
    previousScore: number | null;
    trend: "improving" | "stable" | "declining";
    componentScores: {
      buffer: number;
      growth: number;
      protection: number;
      efficiency: number;
      trajectory: number;
    };
  };
  recommendationOpportunities: QuarterlyReviewRecommendationOpportunityContext[];
  upcomingEvents: QuarterlyReviewUpcomingEvent[];
  dataQualityNotes: string[];
}

export const QUARTERLY_REVIEW_SYSTEM = `You are the Fyrk Digital Family Office reviewer producing a quarterly household review in Warm Authority tone.

Tone rules:
- Calm confidence, practical guidance, and clear plain language.
- Be warm and constructive, never alarmist or judgmental.
- Keep statements grounded in the deterministic context provided.

Strict rules:
- Return strict JSON only.
- Do not invent or calculate new financial amounts, percentages, or scores.
- Use recommendation opportunityId values exactly as provided.
- Do not provide personalized security recommendations or specific buy/sell security advice.
- Acknowledge data limitations where relevant.
- Keep recommendations specific, actionable, and realistic for the next quarter.`;

export function buildQuarterlyReviewUserPrompt(context: QuarterlyReviewPromptContext): string {
  return `Create a quarterly review from this deterministic household context:

${JSON.stringify(context, null, 2)}

Return JSON with exactly this structure:
{
  "narrative": "string",
  "performanceExplanation": "string",
  "recommendations": [
    {
      "opportunityId": "string",
      "title": "string",
      "description": "string",
      "estimatedImpactSummary": "string"
    }
  ],
  "quarterSummary": "string",
  "nextQuarterFocus": "string"
}`;
}
