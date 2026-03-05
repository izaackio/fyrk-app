import assert from "node:assert/strict";
import test from "node:test";

import {
  proposalImpactAiOutputSchema,
  quarterlyReviewAiOutputSchema,
  quarterlyReviewOutputSchema,
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
        estimatedImpactSummary: "Impact 1",
      },
      {
        opportunityId: "fees-01",
        title: "Title 2",
        description: "Description 2",
        estimatedImpactSummary: "Impact 2",
      },
    ],
    quarterSummary: "Summary",
    nextQuarterFocus: "Focus",
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
      explanation: "Deterministic explanation.",
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
        extraField: "should fail",
      },
    ],
    upcomingEvents: [],
    quarterSummary: "Summary",
    nextQuarterFocus: "Focus",
    dataQualityNotes: [],
  });

  assert.equal(parsed.success, false);
});

test("proposalImpactAiOutputSchema requires the full structured payload", () => {
  const parsed = proposalImpactAiOutputSchema.safeParse({
    summary: "Summary",
    householdImpact: "Impact",
    riskAssessment: "Risk",
    approvalConsiderations: ["One"],
  });

  assert.equal(parsed.success, false);
});
