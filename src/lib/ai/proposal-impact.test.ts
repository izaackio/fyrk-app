import assert from "node:assert/strict";
import test from "node:test";

import { interpretProposalImpact } from "@/lib/ai/proposal-impact";
import type { ProposalImpactPromptContext } from "@/lib/ai/prompts/proposal-impact";

const proposalContext: ProposalImpactPromptContext = {
  householdName: "Lindberg household",
  proposalTitle: "Reallocate 5% from cash to global equity index",
  proposalCategory: "allocation",
  proposalDescription:
    "Shift part of excess cash into diversified global index exposure while preserving emergency runway.",
  currency: "SEK",
  deterministicImpact: {
    allocationChange: {
      cash: { from: 24.5, to: 19.5 },
      equities: { from: 52.0, to: 57.0 },
    },
    fitnessImpact: "+8 (growth component)",
    keyTradeoffs: ["Higher long-term growth exposure vs lower short-term liquidity flexibility."],
    riskFlags: ["Higher market volatility sensitivity in the next 12 months."],
    assumptions: ["Emergency cash policy threshold remains satisfied after reallocation."],
  },
  approvalContext: {
    requiredApprovers: ["alex@example.com"],
    decisionDeadline: "2026-04-15",
    governanceNote: "Both partners must confirm liquidity comfort before execution.",
  },
};

function validProposalAiPayload(): string {
  return JSON.stringify({
    summary:
      "This proposal increases growth orientation while staying within the household's stated liquidity guardrails.",
    householdImpact:
      "If approved, the household becomes slightly more return-sensitive and less idle-cash heavy while preserving emergency policy coverage.",
    riskAssessment:
      "Main risk is short-term market drawdown pressure; mitigation is to confirm liquidity policy and rebalance cadence upfront.",
    approvalConsiderations: [
      "Verify both partners are aligned on acceptable short-term volatility.",
      "Confirm planned reallocation timing does not conflict with upcoming known expenses.",
    ],
    discussionPrompts: [
      "What level of near-term drawdown still feels acceptable to both decision makers?",
      "Which household goals benefit most from this allocation change over the next 12 months?",
    ],
  });
}

test("interpretProposalImpact returns validated AI interpretation with deterministic context attached", async () => {
  const result = await interpretProposalImpact(proposalContext, {
    retries: 1,
    jsonGenerator: async () => validProposalAiPayload(),
  });

  assert.equal(result.source, "ai");
  assert.equal(result.interpretation.approvalConsiderations.length, 2);
  assert.equal(result.interpretation.deterministicImpact.fitnessImpact, "+8 (growth component)");
});

test("interpretProposalImpact retries and succeeds on a second attempt", async () => {
  let attempts = 0;

  const result = await interpretProposalImpact(proposalContext, {
    retries: 2,
    retryDelayMs: 0,
    jsonGenerator: async () => {
      attempts += 1;
      if (attempts === 1) {
        return "not-json";
      }
      return validProposalAiPayload();
    },
  });

  assert.equal(attempts, 2);
  assert.equal(result.source, "ai");
});

test("interpretProposalImpact falls back to deterministic data-only interpretation on malformed output", async () => {
  const result = await interpretProposalImpact(proposalContext, {
    retries: 1,
    jsonGenerator: async () =>
      JSON.stringify({
        summary: "Missing required fields should fail schema validation",
      }),
  });

  assert.equal(result.source, "fallback");
  assert.equal(result.interpretation.summary.includes("data-only mode"), true);
  assert.equal(result.interpretation.discussionPrompts.length >= 1, true);
});
