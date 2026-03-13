import type {
  QuarterlyReviewActionType,
  QuarterlyReviewFitnessComponent,
  QuarterlyReviewRecommendationPriority,
  QuarterlyReviewUpcomingEvent
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
- Write like a premium household review: concise, trustworthy, and easy to scan.

Strict rules:
- Return strict JSON only.
- Use only the amounts, percentages, scores, and dates already present in the deterministic context.
- Do not invent or calculate new financial amounts, percentages, scores, totals, or rankings.
- Use recommendation opportunityId values exactly as provided.
- Do not provide personalized security recommendations or specific buy/sell security advice.
- Avoid urgency, fear-based wording, and speculative macro commentary.
- Acknowledge data limitations where relevant.
- Keep recommendations specific, actionable, and realistic for the next quarter.
- Keep estimatedImpactSummary qualitative and non-numeric.`;

export function buildQuarterlyReviewUserPrompt(context: QuarterlyReviewPromptContext): string {
  return `Create a quarterly review from this deterministic household context:

${JSON.stringify(context, null, 2)}

Return JSON with exactly this structure:
{
  "narrative": "string (2-4 sentences, Warm Authority tone)",
  "performanceExplanation": "string (1-3 sentences, explain only the provided attribution)",
  "recommendations": [
    {
      "opportunityId": "string",
      "title": "string (short, calm action label)",
      "description": "string (1-3 sentences, practical and non-alarmist)",
      "estimatedImpactSummary": "string (qualitative only, no digits or new calculations)"
    }
  ],
  "quarterSummary": "string (1-2 sentences)",
  "nextQuarterFocus": "string (1-2 sentences)"
}`;
}
