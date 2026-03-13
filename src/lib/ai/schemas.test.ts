import assert from "node:assert/strict";
import test from "node:test";

import {
  playbookAiOutputSchema,
  proposalImpactAiOutputSchema,
  weeklyNarrativeOutputSchema,
  quarterlyReviewAiOutputSchema,
  quarterlyReviewOutputSchema
} from "@/lib/ai/schemas";

test("quarterlyReviewAiOutputSchema rejects duplicate opportunityId values", () => {
  const parsed = quarterlyReviewAiOutputSchema.safeParse({
    narrative: "Narrative",
    performanceExplanation: "Explanation",
    recommendations: [
      {
        opportunityId: "fees-01",
        title: "Title 1",
        description: "Description 1",
        estimatedImpactSummary: "Impact 1"
      },
      {
        opportunityId: "fees-01",
        title: "Title 2",
        description: "Description 2",
        estimatedImpactSummary: "Impact 2"
      }
    ],
    quarterSummary: "Summary",
    nextQuarterFocus: "Focus"
  });

  assert.equal(parsed.success, false);
});

test("weeklyNarrativeOutputSchema rejects alarmist security language", () => {
  const parsed = weeklyNarrativeOutputSchema.safeParse({
    narrative:
      "Household net worth increased by 1 000 SEK this week. Urgent action is required immediately. Sell the equity funds now. Review the mortgage account today.",
    highlights: [
      {
        type: "action",
        text: "Sell equity funds immediately."
      }
    ]
  });

  assert.equal(parsed.success, false);
});

test("quarterlyReviewOutputSchema enforces strict recommendation shape", () => {
  const parsed = quarterlyReviewOutputSchema.safeParse({
    narrative: "Narrative",
    performanceAttribution: {
      marketReturns: 100,
      netSavings: 50,
      debtReduction: 10,
      feesDrag: -2,
      explanation: "Deterministic explanation."
    },
    recommendations: [
      {
        opportunityId: "fees-01",
        priority: "high",
        title: "Lower fee drag",
        description: "Do the thing.",
        estimatedImpactPerYear: 120_000,
        estimatedImpactSummary: "Impact summary",
        fitnessComponent: "efficiency",
        actionType: "proposal",
        extraField: "should fail"
      }
    ],
    upcomingEvents: [],
    quarterSummary: "Summary",
    nextQuarterFocus: "Focus",
    dataQualityNotes: []
  });

  assert.equal(parsed.success, false);
});

test("quarterlyReviewAiOutputSchema rejects numeric impact summaries and security advice", () => {
  const parsed = quarterlyReviewAiOutputSchema.safeParse({
    narrative:
      "Q1 closed with progress across the household. Urgent action is required immediately.",
    performanceExplanation:
      "Recorded attribution showed gains from savings and returns. Sell the fund exposure now.",
    recommendations: [
      {
        opportunityId: "fees-01",
        title: "Sell fund exposure now",
        description: "Sell the high-fee funds immediately and rotate into lower-risk holdings.",
        estimatedImpactSummary: "Save 120 000 SEK this year."
      }
    ],
    quarterSummary: "The quarter needs an urgent reset.",
    nextQuarterFocus: "Sell the funds now."
  });

  assert.equal(parsed.success, false);
});

test("playbookAiOutputSchema rejects numeric impact descriptions", () => {
  const parsed = playbookAiOutputSchema.safeParse({
    actions: Array.from({ length: 5 }, () => ({
      title: "Sell risky funds now",
      description: "Sell the concentrated equity funds immediately and move into safer bonds.",
      category: "financial",
      priority: "high",
      estimatedImpactDescription: "Saves 50 000 SEK."
    }))
  });

  assert.equal(parsed.success, false);
});

test("proposalImpactAiOutputSchema requires the full structured payload", () => {
  const parsed = proposalImpactAiOutputSchema.safeParse({
    summary: "Summary",
    householdImpact: "Impact",
    riskAssessment: "Risk",
    approvalConsiderations: ["One"]
  });

  assert.equal(parsed.success, false);
});
