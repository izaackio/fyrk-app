import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildDemoSeedDataset, demoVariants } from "@/db/seed/demo-dataset";

function fingerprintDataset(): string {
  const dataset = buildDemoSeedDataset();
  const payload = {
    users: dataset.users,
    households: dataset.households,
    accounts: dataset.accounts,
    holdings: dataset.holdings,
    transactions: dataset.transactions,
    accountSnapshots: dataset.accountSnapshots,
    householdSnapshots: dataset.householdSnapshots,
    timelineEntries: dataset.timelineEntries,
    lifeEvents: dataset.lifeEvents,
    fitnessScores: dataset.fitnessScores,
    weeklyNarratives: dataset.weeklyNarratives,
    quarterlyReviews: dataset.quarterlyReviews,
    expectedByVariant: dataset.expectedByVariant,
    totals: dataset.totals,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

test("demo dataset generation is deterministic", () => {
  const left = fingerprintDataset();
  const right = fingerprintDataset();

  assert.equal(left, right);
});

test("demo dataset meets variant and derived-record requirements", () => {
  const dataset = buildDemoSeedDataset();
  const byVariant = dataset.expectedByVariant;

  assert.equal(byVariant.standard.accounts, 8);
  assert.ok(byVariant.standard.transactions >= 100);
  assert.ok(byVariant.standard.timelineEntries >= 20);
  assert.equal(byVariant.standard.lifeEvents, 2);

  assert.equal(byVariant.fire.accounts, 6);
  assert.ok(byVariant.fire.transactions >= 150);
  assert.ok(byVariant.fire.timelineEntries >= 15);
  assert.equal(byVariant.fire.lifeEvents, 1);

  assert.equal(byVariant.fam_family.accounts, 12);
  assert.ok(byVariant.fam_family.transactions >= 160);
  assert.ok(byVariant.fam_family.timelineEntries >= 25);
  assert.equal(byVariant.fam_family.lifeEvents, 1);

  assert.ok(byVariant.friendly_family.accounts >= 12);
  assert.ok(byVariant.friendly_family.transactions >= 150);
  assert.ok(byVariant.friendly_family.timelineEntries >= 10);
  assert.equal(byVariant.friendly_family.lifeEvents, 0);

  for (const variant of demoVariants) {
    assert.ok(byVariant[variant].accountSnapshots > 0);
    assert.ok(byVariant[variant].householdSnapshots > 0);
    assert.ok(byVariant[variant].fitnessScores > 0);
    assert.ok(byVariant[variant].weeklyNarratives > 0);
  }

  const accountSnapshotCounts = new Map<string, number>();
  for (const row of dataset.accountSnapshots) {
    accountSnapshotCounts.set(row.account_id, (accountSnapshotCounts.get(row.account_id) ?? 0) + 1);
  }

  for (const account of dataset.accounts) {
    assert.equal(accountSnapshotCounts.get(account.id), 24);
  }

  const householdSnapshotCounts = new Map<string, number>();
  for (const row of dataset.householdSnapshots) {
    householdSnapshotCounts.set(row.household_id, (householdSnapshotCounts.get(row.household_id) ?? 0) + 1);
  }

  const fitnessCounts = new Map<string, number>();
  for (const row of dataset.fitnessScores) {
    fitnessCounts.set(row.household_id, (fitnessCounts.get(row.household_id) ?? 0) + 1);
  }

  for (const household of dataset.households) {
    assert.equal(householdSnapshotCounts.get(household.id), 24);
    assert.equal(fitnessCounts.get(household.id), 12);
  }

  const weeklyNarrativeCounts = new Map<string, number>();
  for (const row of dataset.weeklyNarratives) {
    weeklyNarrativeCounts.set(
      row.household_id,
      (weeklyNarrativeCounts.get(row.household_id) ?? 0) + 1,
    );
    assert.equal(row.source, "fallback");
    assert.ok(row.narrative.length > 0);
    assert.ok(row.highlights.length >= 2);
  }

  for (const household of dataset.households) {
    assert.equal(weeklyNarrativeCounts.get(household.id), 1);
  }

  for (const review of dataset.quarterlyReviews) {
    assert.ok(review.recommendations.length >= 1);
    assert.equal(typeof review.recommendations[0]?.priority, "string");
    assert.equal(typeof review.recommendations[0]?.actionType, "string");
    assert.equal(typeof review.recommendations[0]?.description, "string");
  }
});

test("demo dataset matches launch baseline exact counts", () => {
  const dataset = buildDemoSeedDataset();

  assert.deepEqual(dataset.expectedByVariant.standard, {
    households: 1,
    accounts: 8,
    holdings: 17,
    transactions: 412,
    timelineEntries: 22,
    lifeEvents: 2,
    accountSnapshots: 192,
    householdSnapshots: 24,
    fitnessScores: 12,
    weeklyNarratives: 1,
    quarterlyReviews: 4,
  });

  assert.deepEqual(dataset.expectedByVariant.fire, {
    households: 1,
    accounts: 6,
    holdings: 25,
    transactions: 340,
    timelineEntries: 18,
    lifeEvents: 1,
    accountSnapshots: 144,
    householdSnapshots: 24,
    fitnessScores: 12,
    weeklyNarratives: 1,
    quarterlyReviews: 4,
  });

  assert.deepEqual(dataset.expectedByVariant.fam_family, {
    households: 2,
    accounts: 12,
    holdings: 40,
    transactions: 592,
    timelineEntries: 28,
    lifeEvents: 1,
    accountSnapshots: 288,
    householdSnapshots: 48,
    fitnessScores: 24,
    weeklyNarratives: 2,
    quarterlyReviews: 8,
  });

  assert.deepEqual(dataset.expectedByVariant.friendly_family, {
    households: 1,
    accounts: 12,
    holdings: 36,
    transactions: 666,
    timelineEntries: 12,
    lifeEvents: 0,
    accountSnapshots: 288,
    householdSnapshots: 24,
    fitnessScores: 12,
    weeklyNarratives: 1,
    quarterlyReviews: 4,
  });

  assert.deepEqual(dataset.totals, {
    households: 5,
    accounts: 38,
    holdings: 118,
    transactions: 2010,
    timelineEntries: 80,
    lifeEvents: 4,
    accountSnapshots: 912,
    householdSnapshots: 120,
    fitnessScores: 60,
    weeklyNarratives: 5,
    quarterlyReviews: 20,
  });
});
