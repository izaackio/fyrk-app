import assert from "node:assert/strict";
import test from "node:test";

import { generateFitnessExplanation } from "@/lib/ai/fitness-explanation";
import type { FitnessSuggestedAction } from "@/lib/calculations/fitness";

const fallbackActions: FitnessSuggestedAction[] = [
  {
    component: "buffer",
    title: "Increase liquid buffer",
    impact: "+20 points",
    description: "Build emergency savings until at least 3 months of expenses are covered.",
  },
];

test("generateFitnessExplanation accepts validated AI output", async () => {
  const result = await generateFitnessExplanation(
    {
      totalScore: 640,
      bufferScore: 110,
      growthScore: 135,
      protectionScore: 120,
      efficiencyScore: 145,
      trajectoryScore: 130,
      trend: "stable",
      calculatedAt: "2026-03-04",
      componentDetails: {
        buffer: { monthsCovered: 2.3 },
      },
    },
    {
      fallbackExplanation: "Fallback explanation",
      fallbackActions,
      retries: 1,
      jsonGenerator: async () =>
        JSON.stringify({
          explanation: "Your score is developing and buffer remains the key constraint.",
          suggestedActions: [
            {
              component: "buffer",
              title: "Automate buffer contribution",
              impact: "+10 to +20 points",
              description:
                "Set a recurring transfer after salary day to increase liquid savings every month.",
            },
          ],
        }),
    },
  );

  assert.equal(result.source, "ai");
  assert.equal(result.explanation.includes("score"), true);
  assert.equal(result.suggestedActions.length, 1);
  assert.equal(result.suggestedActions[0]?.component, "buffer");
});

test("generateFitnessExplanation falls back when AI returns invalid JSON", async () => {
  const result = await generateFitnessExplanation(
    {
      totalScore: 640,
      bufferScore: 110,
      growthScore: 135,
      protectionScore: 120,
      efficiencyScore: 145,
      trajectoryScore: 130,
      trend: "stable",
      calculatedAt: "2026-03-04",
      componentDetails: {},
    },
    {
      fallbackExplanation: "Fallback explanation",
      fallbackActions,
      retries: 1,
      jsonGenerator: async () => "not-json",
    },
  );

  assert.equal(result.source, "fallback");
  assert.equal(result.explanation, "Fallback explanation");
  assert.equal(result.suggestedActions.length, 1);
});

test("generateFitnessExplanation falls back to default explanation when fallback text is empty", async () => {
  const result = await generateFitnessExplanation(
    {
      totalScore: 512,
      bufferScore: 100,
      growthScore: 100,
      protectionScore: 100,
      efficiencyScore: 100,
      trajectoryScore: 112,
      trend: "stable",
      calculatedAt: "2026-03-04",
      componentDetails: {},
    },
    {
      fallbackExplanation: "   ",
      fallbackActions: [],
      retries: 1,
      jsonGenerator: async () => {
        throw new Error("model unavailable");
      },
    },
  );

  assert.equal(result.source, "fallback");
  assert.equal(result.explanation, "Your household financial fitness score is 512.");
  assert.deepEqual(result.suggestedActions, []);
});
