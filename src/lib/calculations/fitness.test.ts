import assert from "node:assert/strict";
import test from "node:test";

import { calculateFitnessScore } from "@/lib/calculations/fitness";

test("calculateFitnessScore returns strong scores for healthy household inputs", () => {
  const result = calculateFitnessScore({
    totalNetWorth: 12_000_000,
    totalAssets: 15_000_000,
    totalLiabilities: 3_000_000,
    liquidAssets: 4_200_000,
    monthlyExpenses: 350_000,
    equityAllocationPct: 70,
    investableAssets: 9_000_000,
    hasInsuranceAccount: true,
    weightedFeeRate: 0.0035,
    taxEfficientAllocationPct: 78,
    netWorthHistory: [
      { date: "2025-10-01", netWorth: 10_500_000 },
      { date: "2026-03-01", netWorth: 12_000_000 },
    ],
    fitnessScoreHistory: [
      { date: "2026-01-01", score: 670 },
      { date: "2026-02-01", score: 690 },
    ],
    calculatedAt: "2026-03-04T08:00:00.000Z",
  });

  assert.equal(result.totalScore >= 750, true);
  assert.equal(result.bufferScore, 200);
  assert.equal(result.trajectoryScore >= 100, true);
  assert.equal(result.explanation.includes("fitness"), true);
  assert.equal(result.calculatedAt, "2026-03-04");
});

test("calculateFitnessScore flags weak components with suggested actions", () => {
  const result = calculateFitnessScore({
    totalNetWorth: 150_000,
    totalAssets: 450_000,
    totalLiabilities: 300_000,
    liquidAssets: 40_000,
    monthlyExpenses: 320_000,
    equityAllocationPct: 18,
    investableAssets: 40_000,
    hasInsuranceAccount: false,
    weightedFeeRate: 0.012,
    taxEfficientAllocationPct: 10,
    netWorthHistory: [
      { date: "2026-01-01", netWorth: 220_000 },
      { date: "2026-03-01", netWorth: 150_000 },
    ],
    fitnessScoreHistory: [{ date: "2026-02-01", score: 420 }],
    calculatedAt: "2026-03-04",
  });

  assert.equal(result.totalScore < 500, true);
  assert.equal(result.bufferScore < 60, true);
  assert.equal(result.trend, "declining");
  assert.equal(
    result.suggestedActions.some((action) => action.component === "buffer"),
    true,
  );
});
