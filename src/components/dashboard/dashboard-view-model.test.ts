import assert from "node:assert/strict";
import test from "node:test";

import type { DashboardInsights } from "@/components/balance-sheet/insights";
import { buildDashboardViewModel } from "@/components/dashboard/dashboard-view-model";

const baseFreshness = {
  coveragePct: 100,
  lastFullUpdate: "2026-03-10T09:00:00.000Z",
  level: "fresh" as const,
  message: "All connected balances are within the current freshness target.",
  primarySyncSource: "provider" as const,
  staleAccounts: 0,
};

const emptyQuality = {
  accountsMissingSync: 0,
  csvAccounts: 0,
  estimatedAllocationAccounts: 0,
  estimatedAllocationValue: 0,
  holdingsBackedAccounts: 0,
  holdingsBackedValue: 0,
  manualAccounts: 0,
  providerAccounts: 0,
};

const baseInsights = (): DashboardInsights => ({
  snapshot: {
    accounts: [],
    accountsCount: 4,
    allocation: {
      assetClass: [
        { key: "equity", label: "Equity", pct: 62.5, value: 2_500_000 },
        { key: "cash", label: "Cash", pct: 37.5, value: 1_500_000 },
      ],
      currency: [],
      geography: [],
      sector: [],
    },
    asOfDate: "2026-03-10T09:00:00.000Z",
    byAccountType: [
      { key: "investment", label: "Investment", value: 2_800_000 },
      { key: "cash", label: "Cash", value: 1_200_000 },
    ],
    currency: "SEK",
    freshness: { ...baseFreshness },
    householdId: "hh-1",
    members: [
      {
        accountsCount: 2,
        accounts: [],
        allocation: {
          assetClass: [],
          currency: [],
          geography: [],
          sector: [],
        },
        byAccountType: [],
        displayName: "Alex",
        freshness: { ...baseFreshness },
        id: "member-alex",
        netWorth: 2_100_000,
        quality: { ...emptyQuality },
        totalAssets: 2_600_000,
        totalLiabilities: 500_000,
      } as DashboardInsights["snapshot"]["members"][number],
      {
        accountsCount: 2,
        accounts: [],
        allocation: {
          assetClass: [],
          currency: [],
          geography: [],
          sector: [],
        },
        byAccountType: [],
        displayName: "Sam",
        freshness: { ...baseFreshness },
        id: "member-sam",
        netWorth: 1_100_000,
        quality: { ...emptyQuality },
        totalAssets: 1_400_000,
        totalLiabilities: 300_000,
      } as DashboardInsights["snapshot"]["members"][number],
    ],
    quality: { ...emptyQuality },
    totalAssets: 4_000_000,
    totalLiabilities: 800_000,
    totalNetWorth: 3_200_000,
  } as DashboardInsights["snapshot"],
  weeklyDelta: {
    amount: 180_000,
    endDate: "2026-03-10",
    pct: 5.96,
    startDate: "2026-03-03",
  },
  weeklyNarrative: {
    generatedAt: "2026-03-10T09:15:00.000Z",
    highlights: [],
    narrative: "The household gained ground as investments and cash both moved in the right direction.",
    source: "ai",
    sourceMessage: "Generated 10 Mar 2026, 10:15 by AI narrative service.",
  },
});

test("buildDashboardViewModel surfaces fresh populated state with AI narrative", () => {
  const model = buildDashboardViewModel(baseInsights());

  assert.equal(model.trust.badge, "Fresh data");
  assert.equal(model.narrative.modeLabel, "AI narrative");
  assert.equal(model.hero.trendIntent, "positive");
  assert.equal(model.actions[0]?.title, "Trace the move underneath the headline");
  assert.equal(model.statuses[0]?.label, "Largest allocation");
  assert.equal(model.timeline[1]?.title, "03 mars 2026 to 10 mars 2026");
});

test("buildDashboardViewModel prioritizes stale data refresh and structured summary fallback", () => {
  const insights = baseInsights();
  insights.snapshot.freshness.level = "stale";
  insights.snapshot.freshness.message = "Two connected balances are stale and need refreshing.";
  insights.snapshot.freshness.staleAccounts = 2;
  insights.weeklyDelta.amount = null;
  insights.weeklyDelta.pct = null;
  insights.weeklyDelta.startDate = null;
  insights.weeklyDelta.endDate = null;
  insights.weeklyNarrative.source = "fallback";
  insights.weeklyNarrative.sourceMessage =
    "AI narrative unavailable. Showing structured fallback summary based on current balances.";

  const model = buildDashboardViewModel(insights);

  assert.equal(model.trust.badge, "Stale data");
  assert.equal(model.narrative.modeLabel, "Structured summary");
  assert.equal(model.actions[0]?.title, "Refresh stale accounts");
  assert.equal(model.timeline[1]?.title, "Weekly comparison forming");
  assert.equal(model.milestones[0]?.title, "Restore freshness");
});

test("buildDashboardViewModel highlights incomplete coverage before deeper analysis", () => {
  const insights = baseInsights();
  insights.snapshot.freshness.coveragePct = 72;
  insights.snapshot.freshness.level = "aged";
  insights.snapshot.freshness.message = "Coverage is partial because one connected balance has not refreshed yet.";

  const model = buildDashboardViewModel(insights);

  assert.equal(model.actions[0]?.title, "Complete the household picture");
  assert.equal(model.heroMetrics[2]?.value, "72%");
  assert.equal(model.trust.badge, "Aged data");
});
