import assert from "node:assert/strict";
import test from "node:test";

import { calculateAllocation, calculateAllocationDrift } from "@/lib/calculations/allocation";

test("calculateAllocation returns breakdowns and concentration risks", () => {
  const result = calculateAllocation({
    baseCurrency: "SEK",
    holdings: [
      {
        holdingId: "h-1",
        memberId: "user-1",
        valueMinor: 600_000,
        valueCurrency: "SEK",
        assetClass: "equity",
        country: "SE",
        sector: "tech",
        name: "Volvo",
      },
      {
        holdingId: "h-2",
        memberId: "user-2",
        valueMinor: 300_000,
        valueCurrency: "SEK",
        assetClass: "fund",
        country: "US",
        sector: "tech",
        name: "Global Fund",
      },
      {
        holdingId: "h-3",
        memberId: "user-2",
        valueMinor: 100_000,
        valueCurrency: "SEK",
        assetClass: "fixed_income",
        country: "SE",
        sector: "finance",
        name: "Bond",
      },
    ],
    calculatedAt: "2026-03-03T10:00:00.000Z",
  });

  assert.equal(result.totalValue, 1_000_000);
  assert.equal(result.byAssetClass[0]?.category, "equity");
  assert.equal(result.byAssetClass[0]?.percentage, 60);
  assert.equal(result.byCurrency[0]?.category, "SEK");
  assert.equal(result.byCurrency[0]?.percentage, 100);
  assert.ok(result.concentrationRisks.some((risk) => risk.type === "single_holding" && risk.name === "Volvo"));
  assert.ok(result.concentrationRisks.some((risk) => risk.type === "single_sector" && risk.severity === "critical"));
});

test("calculateAllocationDrift computes rebalance needs above threshold", () => {
  const drift = calculateAllocationDrift({
    current: [
      { category: "equity", value: 700_000, percentage: 70 },
      { category: "fixed_income", value: 300_000, percentage: 30 },
    ],
    target: [
      { category: "equity", value: 0, percentage: 60 },
      { category: "fixed_income", value: 0, percentage: 40 },
    ],
  });

  assert.equal(drift.maxDrift, 10);
  assert.equal(drift.needsRebalancing, true);
  assert.equal(drift.drifts[0]?.category, "equity");
  assert.equal(drift.drifts[0]?.rebalanceAmount, -100_000);
});
