import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicNetWorthChangePayload,
  calculateNetWorth,
} from "@/lib/calculations/net-worth";
import type { FxRates } from "@/lib/calculations/types";

const fxRates: FxRates = {
  baseCurrency: "EUR",
  rates: {
    EUR: 1,
    USD: 1,
    SEK: 10,
  },
  source: "ecb",
  fetchedAt: "2026-03-03T08:00:00.000Z",
  staleAfter: "2026-03-05T08:00:00.000Z",
};

test("calculateNetWorth handles mixed currency assets, liabilities, and missing values", () => {
  const result = calculateNetWorth({
    baseCurrency: "SEK",
    fxRates,
    calculatedAt: "2026-03-03T10:00:00.000Z",
    accounts: [
      {
        id: "a-invest",
        memberId: "user-1",
        type: "investment",
        wrapperType: "ISK",
        currency: "USD",
        lastSyncedAt: "2026-03-03T07:00:00.000Z",
        cashBalanceMinor: 10_000,
        holdings: [
          {
            id: "h-usd",
            instrumentId: "ins-1",
            valueMinor: 100_000,
            valueCurrency: "USD",
            assetClass: "equity",
            country: "US",
            sector: "tech",
            asOfDate: "2026-03-03",
          },
          {
            id: "h-missing",
            instrumentId: "ins-2",
            valueMinor: null,
            valueCurrency: "USD",
            assetClass: "fund",
            country: "SE",
            sector: null,
            asOfDate: "2026-03-03",
          },
        ],
      },
      {
        id: "a-mortgage",
        memberId: "user-1",
        type: "mortgage",
        wrapperType: null,
        currency: "SEK",
        lastSyncedAt: "2026-02-20T07:00:00.000Z",
        holdings: [
          {
            id: "h-loan",
            instrumentId: null,
            valueMinor: 500_000,
            valueCurrency: "SEK",
            assetClass: "other",
            country: "SE",
            sector: null,
            asOfDate: "2026-03-03",
          },
        ],
      },
    ],
  });

  assert.equal(result.totalAssets, 1_100_000);
  assert.equal(result.totalLiabilities, 500_000);
  assert.equal(result.totalNetWorth, 600_000);
  assert.equal(result.byAccountType.investment, 1_100_000);
  assert.equal(result.byAccountType.mortgage, -500_000);
  assert.equal(result.byWrapperType.ISK, 1_100_000);
  assert.equal(result.liquidAssets, 1_100_000);
  assert.equal(result.illiquidAssets, 0);
  assert.deepEqual(result.dataQuality.missingPrices, ["h-missing"]);
  assert.deepEqual(result.dataQuality.staleAccountIds, ["a-mortgage"]);
  assert.equal(result.dataQuality.coveragePercent, 68.75);
  assert.equal(result.dataQuality.score, "low");
  assert.equal(result.metadata.assumptions.sourceTier, "system_default");
});

test("buildDeterministicNetWorthChangePayload computes deterministic deltas", () => {
  const payload = buildDeterministicNetWorthChangePayload({
    periodStart: "2026-02-24",
    periodEnd: "2026-03-03",
    current: {
      date: "2026-03-03",
      netWorth: 2_000_000,
      assets: 3_000_000,
      liabilities: 1_000_000,
      currency: "SEK",
    },
    previous: {
      date: "2026-02-24",
      netWorth: 1_800_000,
      assets: 2_900_000,
      liabilities: 1_100_000,
      currency: "SEK",
    },
    calculatedAt: "2026-03-03T10:00:00.000Z",
  });

  assert.equal(payload.netWorthChange, 200_000);
  assert.equal(payload.netWorthChangePct, 11.11);
  assert.equal(payload.metadata.source, "deterministic");
});
