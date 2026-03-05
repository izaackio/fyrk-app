import assert from "node:assert/strict";
import test from "node:test";

import { listTimelineEntriesFallback } from "../sprint4/fallback";
import {
  approveProposalFallback,
  createProposalFallback,
  generateReviewFallback,
  getReviewFallback,
  listProposalCommentsFallback,
  listReviewsFallback,
  rejectProposalFallback,
} from "./fallback";

const SPRINT1_STORAGE_KEY = "fyrk:sprint1:ui-state";

interface LocalStorageMock {
  clear: () => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

const installWindowMock = (): {
  localStorage: LocalStorageMock;
  restore: () => void;
} => {
  const previousWindow = (
    globalThis as typeof globalThis & { window?: Window & typeof globalThis }
  ).window;
  const store = new Map<string, string>();

  const localStorage: LocalStorageMock = {
    clear: () => {
      store.clear();
    },
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };

  (
    globalThis as typeof globalThis & { window?: Window & typeof globalThis }
  ).window = { localStorage } as unknown as Window & typeof globalThis;

  return {
    localStorage,
    restore: () => {
      (
        globalThis as typeof globalThis & { window?: Window & typeof globalThis }
      ).window = previousWindow;
    },
  };
};

const seedSprint1Household = (
  localStorage: LocalStorageMock,
  householdId: string,
  memberCount: number,
): void => {
  localStorage.setItem(
    SPRINT1_STORAGE_KEY,
    JSON.stringify({
      households: [
        {
          id: householdId,
          memberCount,
          role: "owner",
        },
      ],
    }),
  );
};

test("Sprint 5 sanity: approvals require all members and write audit + timeline records", async () => {
  const windowMock = installWindowMock();
  try {
    const householdId = "household-approval";
    seedSprint1Household(windowMock.localStorage, householdId, 2);

    const creator = { displayName: "Alex", id: "alex-user" };
    const partner = { displayName: "Sam", id: "sam-user" };

    const created = await createProposalFallback(
      {
        category: "investment",
        description: "Shift 2% cash into global index exposure.",
        householdId,
        title: "Rebalance 2% toward equity index",
      },
      creator,
    );

    assert.equal(created.status, "pending");
    assert.equal(created.requiresApprovalFrom.length, 2);

    const partiallyApproved = await approveProposalFallback(
      householdId,
      created.id,
      creator,
    );

    assert.equal(partiallyApproved.status, "pending");
    assert.equal(partiallyApproved.approvedBy.includes(creator.id), true);
    assert.equal(partiallyApproved.resolvedAt, null);
    assert.equal(partiallyApproved.timelineEntryId, null);

    const auditAfterFirstApproval = await listProposalCommentsFallback(
      householdId,
      created.id,
    );
    assert.equal(auditAfterFirstApproval.length, 1);
    assert.equal(
      auditAfterFirstApproval[0]?.content.includes("[Audit]"),
      true,
    );

    const fullyApproved = await approveProposalFallback(
      householdId,
      created.id,
      partner,
    );

    assert.equal(fullyApproved.status, "approved");
    assert.equal(fullyApproved.approvedBy.includes(creator.id), true);
    assert.equal(fullyApproved.approvedBy.includes(partner.id), true);
    assert.equal(typeof fullyApproved.resolvedAt, "string");
    assert.equal(typeof fullyApproved.timelineEntryId, "string");

    const decisionEntries = await listTimelineEntriesFallback({
      actor: creator,
      filters: { types: ["decision"] },
      householdId,
    });

    assert.equal(
      decisionEntries.some((entry) => entry.id === fullyApproved.timelineEntryId),
      true,
    );
  } finally {
    windowMock.restore();
  }
});

test("Sprint 5 sanity: rejection records reason and decision timeline entry", async () => {
  const windowMock = installWindowMock();
  try {
    const householdId = "household-rejection";
    seedSprint1Household(windowMock.localStorage, householdId, 2);

    const creator = { displayName: "Alex", id: "alex-user" };
    const partner = { displayName: "Sam", id: "sam-user" };

    const created = await createProposalFallback(
      {
        category: "debt",
        description: "Increase principal payment by 1,500 SEK / month.",
        householdId,
        title: "Accelerate mortgage payoff",
      },
      creator,
    );

    const rejected = await rejectProposalFallback(
      householdId,
      created.id,
      "Prefer to preserve monthly liquidity for now.",
      partner,
    );

    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.rejectedBy, partner.id);
    assert.equal(typeof rejected.timelineEntryId, "string");

    const comments = await listProposalCommentsFallback(householdId, created.id);
    assert.equal(comments.some((entry) => entry.content.includes("liquidity")), true);

    const decisionEntries = await listTimelineEntriesFallback({
      actor: creator,
      filters: { types: ["decision"] },
      householdId,
    });

    assert.equal(
      decisionEntries.some((entry) => entry.id === rejected.timelineEntryId),
      true,
    );
  } finally {
    windowMock.restore();
  }
});

test("Sprint 5 sanity: review generation is idempotent per quarter and linked to timeline", async () => {
  const windowMock = installWindowMock();
  try {
    const householdId = "household-review";
    seedSprint1Household(windowMock.localStorage, householdId, 1);

    const firstGeneration = await generateReviewFallback(householdId);
    const review = await getReviewFallback(householdId, firstGeneration.reviewId);

    assert.equal(review.status, "draft");
    assert.equal(typeof review.timelineEntryId, "string");

    const secondGeneration = await generateReviewFallback(householdId);
    assert.equal(secondGeneration.reviewId, firstGeneration.reviewId);

    const reviews = await listReviewsFallback(householdId);
    assert.equal(reviews.length, 1);

    const reviewEntries = await listTimelineEntriesFallback({
      filters: { types: ["review"] },
      householdId,
    });

    assert.equal(
      reviewEntries.some((entry) => entry.id === review.timelineEntryId),
      true,
    );
  } finally {
    windowMock.restore();
  }
});
