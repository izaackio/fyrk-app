import assert from "node:assert/strict";
import test from "node:test";

import { generateLifeEventPlaybook } from "@/lib/ai/playbook";
import type { PlaybookAiAction } from "@/lib/ai/schemas";

const fallbackActions: PlaybookAiAction[] = [
  {
    title: "Confirm budget constraints",
    description: "Document max purchase budget, cash buffer, and debt comfort limits.",
    category: "financial",
    priority: "critical",
    estimatedImpactDescription: "Keeps the event plan within affordable limits.",
  },
  {
    title: "Create owner-assigned checklist",
    description: "Assign owners and due dates for each milestone before execution starts.",
    category: "administrative",
    priority: "high",
    estimatedImpactDescription: "Reduces delays and missed dependencies.",
  },
  {
    title: "Review legal document requirements",
    description: "List legal documents needed ahead of commitment and signing windows.",
    category: "legal",
    priority: "high",
    estimatedImpactDescription: "Avoids process blockers close to deadlines.",
  },
  {
    title: "Check insurance implications",
    description: "Validate whether current coverage needs updating for the new event context.",
    category: "insurance",
    priority: "medium",
    estimatedImpactDescription: "Reduces downside risk if circumstances change.",
  },
  {
    title: "Plan tax timing",
    description: "Review the expected tax timing so liquidity is available when due.",
    category: "tax",
    priority: "medium",
    estimatedImpactDescription: "Prevents avoidable tax-related cash flow pressure.",
  },
];

test("generateLifeEventPlaybook accepts validated AI output", async () => {
  const result = await generateLifeEventPlaybook(
    {
      eventType: "buying_apartment",
      title: "Buying our first apartment",
      targetDate: "2026-09-01",
      inputs: { budget: 350_000_000, city: "Stockholm" },
      impactSummary: "Deterministic projection.",
      impactData: { fitnessScoreImpact: -45 },
    },
    {
      fallbackActions,
      retries: 1,
      jsonGenerator: async () =>
        JSON.stringify({
          actions: fallbackActions,
        }),
    },
  );

  assert.equal(result.source, "ai");
  assert.equal(result.actions.length, 5);
  assert.equal(result.actions[0]?.category, "financial");
});

test("generateLifeEventPlaybook falls back when AI payload fails schema", async () => {
  const result = await generateLifeEventPlaybook(
    {
      eventType: "buying_apartment",
      title: "Buying our first apartment",
      targetDate: "2026-09-01",
      inputs: { budget: 350_000_000, city: "Stockholm" },
      impactSummary: "Deterministic projection.",
      impactData: { fitnessScoreImpact: -45 },
    },
    {
      fallbackActions,
      retries: 1,
      jsonGenerator: async () =>
        JSON.stringify({
          actions: [{ title: "Missing required fields" }],
        }),
    },
  );

  assert.equal(result.source, "fallback");
  assert.equal(result.actions.length, 5);
  assert.equal(result.actions[0]?.title, fallbackActions[0]?.title);
});
