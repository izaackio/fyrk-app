import assert from "node:assert/strict";
import test from "node:test";

import { generateQuarterlyReview } from "@/lib/ai/quarterly-review";
import type { QuarterlyReviewPromptContext } from "@/lib/ai/prompts/quarterly-review";

const quarterlyContext: QuarterlyReviewPromptContext = {
  householdName: "Lindberg household",
  quarterLabel: "Q1 2026",
  generatedAt: "2026-03-31T08:00:00.000Z",
  currency: "SEK",
  performanceAttribution: {
    marketReturns: 850_000,
    netSavings: 320_000,
    debtReduction: 150_000,
    feesDrag: -42_000,
    netWorthStart: 18_000_000,
    netWorthEnd: 19_278_000,
    netWorthChange: 1_278_000,
    netWorthChangePct: 7.1,
  },
  fitness: {
    currentScore: 702,
    previousScore: 684,
    trend: "improving",
    componentScores: {
      buffer: 150,
      growth: 142,
      protection: 130,
      efficiency: 140,
      trajectory: 140,
    },
  },
  recommendationOpportunities: [
    {
      id: "fees-01",
      priority: "high",
      title: "Reduce recurring fee drag",
      deterministicRationale:
        "Consolidating high-fee holdings into lower-cost equivalents reduces annual drag.",
      estimatedImpactPerYear: 120_000,
      fitnessComponent: "efficiency",
      actionType: "proposal",
    },
    {
      id: "buffer-01",
      priority: "medium",
      title: "Rebuild liquidity buffer",
      deterministicRationale:
        "Increase automated savings transfers to lift emergency runway toward policy target.",
      estimatedImpactPerYear: null,
      fitnessComponent: "buffer",
      actionType: "monitor",
    },
  ],
  upcomingEvents: [
    {
      title: "Mortgage reset window",
      date: "2026-05-15",
      preparationNeeded: "Review refinancing options before lender notice period closes.",
    },
  ],
  dataQualityNotes: ["One pension provider is missing intramonth updates."],
};

function validQuarterlyAiPayload(): string {
  return JSON.stringify({
    narrative:
      "Q1 closed with steady household progress. Net worth improved with support from both market returns and savings discipline.",
    performanceExplanation:
      "Market contribution was the largest positive driver while fee drag remained a manageable offset.",
    recommendations: [
      {
        opportunityId: "fees-01",
        title: "Prioritize fee-efficiency actions",
        description:
          "Start with the largest recurring fee lines and convert them using a staged transition plan over the quarter.",
        estimatedImpactSummary: "Meaningful recurring improvement once high-fee holdings are reduced.",
      },
    ],
    quarterSummary:
      "The household moved forward with balanced momentum across growth and resilience metrics.",
    nextQuarterFocus:
      "Lock in fee-efficiency actions first, then maintain buffer progress through consistent monthly automation.",
  });
}

test("generateQuarterlyReview maps validated AI payload into deterministic output contract", async () => {
  const result = await generateQuarterlyReview(quarterlyContext, {
    retries: 1,
    jsonGenerator: async () => validQuarterlyAiPayload(),
  });

  assert.equal(result.source, "ai");
  assert.equal(result.review.performanceAttribution.marketReturns, 850_000);
  assert.equal(result.review.recommendations.length, 1);
  assert.equal(result.review.recommendations[0]?.priority, "high");
  assert.equal(result.review.recommendations[0]?.estimatedImpactPerYear, 120_000);
  assert.equal(result.review.recommendations[0]?.fitnessComponent, "efficiency");
});

test("generateQuarterlyReview retries and recovers on second model attempt", async () => {
  let attempts = 0;

  const result = await generateQuarterlyReview(quarterlyContext, {
    retries: 2,
    retryDelayMs: 0,
    jsonGenerator: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("Transient model failure");
      }
      return validQuarterlyAiPayload();
    },
  });

  assert.equal(attempts, 2);
  assert.equal(result.source, "ai");
  assert.equal(result.review.recommendations.length, 1);
});

test("generateQuarterlyReview falls back to data-only output on malformed model JSON", async () => {
  const result = await generateQuarterlyReview(quarterlyContext, {
    retries: 1,
    jsonGenerator: async () => "not-json",
  });

  assert.equal(result.source, "fallback");
  assert.equal(result.review.narrative.includes("data-only mode"), true);
  assert.equal(result.review.recommendations.length >= 1, true);
});

test("generateQuarterlyReview falls back when model references unknown opportunityId", async () => {
  const result = await generateQuarterlyReview(quarterlyContext, {
    retries: 1,
    jsonGenerator: async () =>
      JSON.stringify({
        narrative: "Narrative",
        performanceExplanation: "Explanation",
        recommendations: [
          {
            opportunityId: "unknown-opportunity",
            title: "Title",
            description: "Description",
            estimatedImpactSummary: "Impact",
          },
        ],
        quarterSummary: "Summary",
        nextQuarterFocus: "Focus",
      }),
  });

  assert.equal(result.source, "fallback");
  assert.equal(result.review.recommendations.length >= 1, true);
});
