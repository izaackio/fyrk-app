import {
  createJsonChatCompletion,
  OpenAIClientError,
  type OpenAIChatCompletionOptions,
  type OpenAIChatMessage,
} from "@/lib/ai/client";
import {
  buildQuarterlyReviewUserPrompt,
  QUARTERLY_REVIEW_SYSTEM,
  type QuarterlyReviewPromptContext,
  type QuarterlyReviewRecommendationOpportunityContext,
} from "@/lib/ai/prompts/quarterly-review";
import {
  quarterlyReviewAiOutputSchema,
  quarterlyReviewOutputSchema,
  type QuarterlyReviewAiOutput,
  type QuarterlyReviewOutput,
  type QuarterlyReviewRecommendation,
} from "@/lib/ai/schemas";

type JsonGenerator = (
  messages: OpenAIChatMessage[],
  options?: OpenAIChatCompletionOptions,
) => Promise<string>;

interface GenerateQuarterlyReviewOptions {
  retries?: number;
  retryDelayMs?: number;
  jsonGenerator?: JsonGenerator;
}

export interface GeneratedQuarterlyReview {
  review: QuarterlyReviewOutput;
  source: "ai" | "fallback";
}

const AI_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1_000;

const defaultFallbackOpportunity: QuarterlyReviewRecommendation = {
  opportunityId: "fallback-quarterly-governance-checkin",
  priority: "medium",
  title: "Run a quarterly governance check-in",
  description:
    "Review household objectives, ownership of pending actions, and the next-quarter plan in one shared meeting.",
  estimatedImpactPerYear: null,
  estimatedImpactSummary: "Improves execution consistency and decision quality.",
  fitnessComponent: "governance",
  actionType: "discuss",
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
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

function buildFallbackPerformanceExplanation(context: QuarterlyReviewPromptContext): string {
  const change = context.performanceAttribution.netWorthChange;
  const changeDirection = change > 0 ? "increased" : change < 0 ? "decreased" : "was stable";

  if (context.performanceAttribution.netWorthChangePct === null) {
    return `Net worth baseline for ${context.quarterLabel} is available, but comparable prior-quarter data is limited.`;
  }

  return `Net worth ${changeDirection} during ${context.quarterLabel}; attribution values are from deterministic backend calculations.`;
}

function mapFallbackRecommendation(
  opportunity: QuarterlyReviewRecommendationOpportunityContext,
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
    actionType: opportunity.actionType,
  };
}

function buildFallbackRecommendations(
  opportunities: QuarterlyReviewRecommendationOpportunityContext[],
): QuarterlyReviewRecommendation[] {
  const normalized = opportunities.map(mapFallbackRecommendation).slice(0, 5);
  if (normalized.length > 0) {
    return normalized;
  }

  return [defaultFallbackOpportunity];
}

function buildRecommendationMap(
  opportunities: QuarterlyReviewRecommendationOpportunityContext[],
): Map<string, QuarterlyReviewRecommendationOpportunityContext> {
  const output = new Map<string, QuarterlyReviewRecommendationOpportunityContext>();
  for (const opportunity of opportunities) {
    if (!output.has(opportunity.id)) {
      output.set(opportunity.id, opportunity);
    }
  }
  return output;
}

function buildRecommendationsFromAiOutput(
  aiOutput: QuarterlyReviewAiOutput,
  opportunities: QuarterlyReviewRecommendationOpportunityContext[],
): QuarterlyReviewRecommendation[] {
  const opportunityMap = buildRecommendationMap(opportunities);

  return aiOutput.recommendations.map((recommendation) => {
    const opportunity = opportunityMap.get(recommendation.opportunityId);
    if (!opportunity) {
      throw new OpenAIClientError(
        `OpenAI returned recommendation with unknown opportunityId: ${recommendation.opportunityId}`,
      );
    }

    return {
      opportunityId: recommendation.opportunityId,
      priority: opportunity.priority,
      title: recommendation.title,
      description: recommendation.description,
      estimatedImpactPerYear: opportunity.estimatedImpactPerYear,
      estimatedImpactSummary: recommendation.estimatedImpactSummary,
      fitnessComponent: opportunity.fitnessComponent,
      actionType: opportunity.actionType,
    };
  });
}

function buildDataOnlyFallback(context: QuarterlyReviewPromptContext): QuarterlyReviewOutput {
  return quarterlyReviewOutputSchema.parse({
    narrative: `Quarterly review for ${context.quarterLabel} is shown in data-only mode because AI narrative generation is temporarily unavailable.`,
    performanceAttribution: {
      marketReturns: context.performanceAttribution.marketReturns,
      netSavings: context.performanceAttribution.netSavings,
      debtReduction: context.performanceAttribution.debtReduction,
      feesDrag: context.performanceAttribution.feesDrag,
      explanation: buildFallbackPerformanceExplanation(context),
    },
    recommendations: buildFallbackRecommendations(context.recommendationOpportunities),
    upcomingEvents: context.upcomingEvents,
    quarterSummary:
      "Deterministic quarterly metrics and pre-ranked opportunities are available while narrative generation is unavailable.",
    nextQuarterFocus:
      "Prioritize high-impact deterministic opportunities first, then run a household governance check-in before quarter close.",
    dataQualityNotes: normalizeDataQualityNotes(context.dataQualityNotes),
  });
}

async function generateWithOpenAi(
  context: QuarterlyReviewPromptContext,
  jsonGenerator: JsonGenerator,
): Promise<QuarterlyReviewOutput> {
  const content = await jsonGenerator(
    [
      {
        role: "system",
        content: QUARTERLY_REVIEW_SYSTEM,
      },
      {
        role: "user",
        content: buildQuarterlyReviewUserPrompt(context),
      },
    ],
    {
      model: process.env.OPENAI_QUARTERLY_REVIEW_MODEL?.trim() || "gpt-4o",
      temperature: 0.2,
      maxTokens: 2_200,
      timeoutMs: 20_000,
    },
  );

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    throw new OpenAIClientError("OpenAI returned invalid JSON payload");
  }

  const aiOutput = quarterlyReviewAiOutputSchema.parse(parsedContent);
  const recommendations = buildRecommendationsFromAiOutput(
    aiOutput,
    context.recommendationOpportunities,
  );

  return quarterlyReviewOutputSchema.parse({
    narrative: aiOutput.narrative,
    performanceAttribution: {
      marketReturns: context.performanceAttribution.marketReturns,
      netSavings: context.performanceAttribution.netSavings,
      debtReduction: context.performanceAttribution.debtReduction,
      feesDrag: context.performanceAttribution.feesDrag,
      explanation: aiOutput.performanceExplanation,
    },
    recommendations,
    upcomingEvents: context.upcomingEvents,
    quarterSummary: aiOutput.quarterSummary,
    nextQuarterFocus: aiOutput.nextQuarterFocus,
    dataQualityNotes: normalizeDataQualityNotes(context.dataQualityNotes),
  });
}

export async function generateQuarterlyReview(
  context: QuarterlyReviewPromptContext,
  options: GenerateQuarterlyReviewOptions = {},
): Promise<GeneratedQuarterlyReview> {
  const jsonGenerator = options.jsonGenerator ?? createJsonChatCompletion;
  const retries = Math.max(1, options.retries ?? AI_RETRIES);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return {
        review: await generateWithOpenAi(context, jsonGenerator),
        source: "ai",
      };
    } catch {
      if (attempt < retries - 1 && retryDelayMs > 0) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  return {
    review: buildDataOnlyFallback(context),
    source: "fallback",
  };
}
