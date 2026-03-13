import { createHash } from "node:crypto";

import type { WeeklyNarrativeContext } from "@/lib/ai/context";
import type { QuarterlyReviewPromptContext } from "@/lib/ai/prompts/quarterly-review";
import {
  fitnessActionAiSchema,
  fitnessExplanationAiOutputSchema,
  quarterlyReviewOutputSchema,
  type QuarterlyReviewRecommendation,
  type WeeklyNarrativeHighlight,
  weeklyNarrativeOutputSchema
} from "@/lib/ai/schemas";
import type { FitnessSuggestedAction } from "@/lib/calculations/fitness";

const defaultFallbackOpportunity: QuarterlyReviewRecommendation = {
  opportunityId: "fallback-quarterly-governance-checkin",
  priority: "medium",
  title: "Hold a quarterly household planning check-in",
  description:
    "Review household priorities, action owners, and next-quarter timing in one shared meeting.",
  estimatedImpactPerYear: null,
  estimatedImpactSummary:
    "Improves follow-through and keeps decisions aligned across the household.",
  fitnessComponent: "governance",
  actionType: "discuss"
};

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeForHash(entryValue)] as const);

    return Object.fromEntries(entries);
  }

  return value;
}

function formatMinorAmount(minorUnits: number): string {
  const sign = minorUnits < 0 ? "-" : "";
  const whole = Math.trunc(Math.abs(minorUnits) / 100);
  const formatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, " ");
  return `${sign}${formatted}`;
}

function normalizeFallbackActions(actions: FitnessSuggestedAction[]): FitnessSuggestedAction[] {
  const parsed = fitnessActionAiSchema.array().max(5).safeParse(actions);
  if (!parsed.success) {
    return [];
  }

  return parsed.data;
}

function normalizeFallbackExplanation(explanation: string, totalScore: number): string {
  const normalized = explanation.trim();
  if (normalized.length > 0) {
    return normalized;
  }

  return `Your household financial fitness score is ${totalScore}.`;
}

function normalizeDataQualityNotes(notes: string[]): string[] {
  const output: string[] = [];

  for (const note of notes) {
    const normalized = note.trim();
    if (!normalized || output.includes(normalized)) {
      continue;
    }

    output.push(normalized);
    if (output.length >= 8) {
      break;
    }
  }

  return output;
}

function formatHouseholdReference(context: WeeklyNarrativeContext): string {
  const firstNames = context.household.members
    .map((member) => member.displayName.trim().split(/\s+/u)[0]?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);
  const [firstName, secondName] = firstNames;

  if (firstName && !secondName) {
    return firstName;
  }

  if (firstName && secondName) {
    return `${firstName} and ${secondName}`;
  }

  return context.household.name;
}

function buildFallbackPerformanceExplanation(context: QuarterlyReviewPromptContext): string {
  if (context.performanceAttribution.netWorthChangePct === null) {
    return "A full prior-quarter comparison is not available yet, so this explanation stays anchored to the latest recorded baseline.";
  }

  return "This attribution follows the recorded quarter-end data and uses deterministic backend calculations for each contribution line.";
}

function mapFallbackRecommendation(
  opportunity: QuarterlyReviewPromptContext["recommendationOpportunities"][number]
): QuarterlyReviewRecommendation {
  return {
    opportunityId: opportunity.id,
    priority: opportunity.priority,
    title: opportunity.title,
    description: opportunity.deterministicRationale,
    estimatedImpactPerYear: opportunity.estimatedImpactPerYear,
    estimatedImpactSummary:
      opportunity.estimatedImpactPerYear === null
        ? "Impact estimate requires additional data quality before quantification."
        : "Estimated annual impact is provided from deterministic backend context.",
    fitnessComponent: opportunity.fitnessComponent,
    actionType: opportunity.actionType
  };
}

function buildFallbackRecommendations(
  opportunities: QuarterlyReviewPromptContext["recommendationOpportunities"]
): QuarterlyReviewRecommendation[] {
  const normalized = opportunities.map(mapFallbackRecommendation).slice(0, 5);
  if (normalized.length > 0) {
    return normalized;
  }

  return [defaultFallbackOpportunity];
}

export function buildWeeklyNarrativeContextHash(context: WeeklyNarrativeContext): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeForHash(context)))
    .digest("hex");
}

export function buildDeterministicWeeklyNarrative(context: WeeklyNarrativeContext) {
  const currency = context.financials.currency || context.household.baseCurrency || "SEK";
  const change = context.recentChanges.netWorthChange;
  const changeDirection = change > 0 ? "increased" : change < 0 ? "decreased" : "was flat";
  const changeAbs = formatMinorAmount(Math.abs(change));
  const currentNetWorth = formatMinorAmount(context.financials.totalNetWorth);
  const householdReference = formatHouseholdReference(context);

  const changeSentence =
    context.recentChanges.netWorthChangePct === null
      ? `${householdReference}, your household net worth is ${currentNetWorth} ${currency}, and this is the first comparable weekly snapshot.`
      : `${householdReference}, your household net worth ${changeDirection} by ${changeAbs} ${currency} (${context.recentChanges.netWorthChangePct}%) to ${currentNetWorth} ${currency}.`;

  const txSentence =
    context.recentChanges.newTransactions > 0
      ? `We recorded ${context.recentChanges.newTransactions} new transactions during the week.`
      : "No new transactions were recorded this week.";

  const eventSentence =
    context.recentChanges.significantEvents.length > 0
      ? `The largest recorded move was ${context.recentChanges.significantEvents[0]}.`
      : "Based on the accounts currently connected, there were no major transaction events to call out.";

  const actionSentence =
    context.accounts.totalCount === 0
      ? "Adding an account connection will give next week's summary a fuller household picture."
      : context.recentChanges.significantEvents.length > 0
        ? "A short review of the week's largest movement during your next household check-in would keep the picture current."
        : "A short review of cash flow and liabilities before next week's check-in would keep the picture current.";

  const highlights: WeeklyNarrativeHighlight[] = [
    {
      type: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
      text:
        context.recentChanges.netWorthChangePct === null
          ? `First baseline available at ${currentNetWorth} ${currency}.`
          : `Net worth ${changeDirection} by ${changeAbs} ${currency}.`
    },
    {
      type: "neutral",
      text:
        context.recentChanges.newTransactions > 0
          ? `${context.recentChanges.newTransactions} transactions were recorded this week.`
          : "No new transactions were recorded this week."
    }
  ];

  if (context.accounts.totalCount === 0) {
    highlights.push({
      type: "action",
      text: "Connect an account so next week's summary can reflect more of the household picture."
    });
  } else if (context.recentChanges.significantEvents.length > 0) {
    highlights.push({
      type: "action",
      text: "Review the week's largest recorded movement during the next household check-in."
    });
  }

  return weeklyNarrativeOutputSchema.parse({
    narrative: `${changeSentence} ${txSentence} ${eventSentence} ${actionSentence}`,
    highlights
  });
}

export function buildDeterministicFitnessExplanation(input: {
  totalScore: number;
  fallbackExplanation: string;
  fallbackActions: FitnessSuggestedAction[];
}) {
  return fitnessExplanationAiOutputSchema.parse({
    explanation: normalizeFallbackExplanation(input.fallbackExplanation, input.totalScore),
    suggestedActions: normalizeFallbackActions(input.fallbackActions)
  });
}

export function buildDeterministicQuarterlyReview(context: QuarterlyReviewPromptContext) {
  return quarterlyReviewOutputSchema.parse({
    narrative: `Quarterly review for ${context.quarterLabel} is ready in structured mode. The summary stays anchored to recorded household data for this cycle.`,
    performanceAttribution: {
      marketReturns: context.performanceAttribution.marketReturns,
      netSavings: context.performanceAttribution.netSavings,
      debtReduction: context.performanceAttribution.debtReduction,
      feesDrag: context.performanceAttribution.feesDrag,
      explanation: buildFallbackPerformanceExplanation(context)
    },
    recommendations: buildFallbackRecommendations(context.recommendationOpportunities),
    upcomingEvents: context.upcomingEvents,
    quarterSummary:
      "This review combines recorded quarterly performance with pre-ranked household actions from deterministic rules.",
    nextQuarterFocus:
      "Start with the highest-priority action, then confirm owners and timing in one household check-in.",
    dataQualityNotes: normalizeDataQualityNotes(context.dataQualityNotes)
  });
}
