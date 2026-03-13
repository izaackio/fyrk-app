import assert from "node:assert/strict";
import test from "node:test";

import { ServiceError } from "@/services/errors";
import {
  applyProposalTransition,
  type ProposalTransitionState,
} from "@/services/proposal.service";

function buildState(overrides: Partial<ProposalTransitionState> = {}): ProposalTransitionState {
  return {
    status: "pending",
    requiresApprovalFrom: ["user-a", "user-b"],
    approvedBy: [],
    rejectedBy: null,
    resolvedAt: null,
    ...overrides,
  };
}

test("proposal approve transition is deterministic and idempotent", () => {
  const now = "2026-03-05T10:00:00.000Z";
  const afterFirstApproval = applyProposalTransition(
    buildState(),
    { type: "approve", actorId: "user-a" },
    now,
  );
  assert.equal(afterFirstApproval.changed, true);
  assert.equal(afterFirstApproval.next.status, "pending");
  assert.deepEqual(afterFirstApproval.next.approvedBy, ["user-a"]);

  const secondCallSameActor = applyProposalTransition(
    afterFirstApproval.next,
    { type: "approve", actorId: "user-a" },
    now,
  );
  assert.equal(secondCallSameActor.changed, false);
  assert.deepEqual(secondCallSameActor.next.approvedBy, ["user-a"]);

  const finalApproval = applyProposalTransition(
    afterFirstApproval.next,
    { type: "approve", actorId: "user-b" },
    now,
  );
  assert.equal(finalApproval.changed, true);
  assert.equal(finalApproval.next.status, "approved");
  assert.equal(finalApproval.next.resolvedAt, now);
});

test("proposal reject transition is idempotent", () => {
  const now = "2026-03-05T10:00:00.000Z";
  const rejected = applyProposalTransition(
    buildState(),
    { type: "reject", actorId: "user-b" },
    now,
  );
  assert.equal(rejected.changed, true);
  assert.equal(rejected.next.status, "rejected");
  assert.equal(rejected.next.rejectedBy, "user-b");

  const repeatReject = applyProposalTransition(
    rejected.next,
    { type: "reject", actorId: "user-b" },
    now,
  );
  assert.equal(repeatReject.changed, false);
  assert.equal(repeatReject.next.status, "rejected");
});

test("proposal transitions reject invalid status changes", () => {
  const rejectedState = buildState({
    status: "rejected",
    rejectedBy: "user-a",
    resolvedAt: "2026-03-05T10:00:00.000Z",
  });

  assert.throws(
    () => applyProposalTransition(rejectedState, { type: "approve", actorId: "user-b" }, "2026-03-05T10:05:00.000Z"),
    (error: unknown) => error instanceof ServiceError && error.code === "VALIDATION_ERROR",
  );

  const approvedState = buildState({
    status: "approved",
    approvedBy: ["user-a", "user-b"],
    resolvedAt: "2026-03-05T10:00:00.000Z",
  });

  assert.throws(
    () => applyProposalTransition(approvedState, { type: "reject", actorId: "user-a" }, "2026-03-05T10:10:00.000Z"),
    (error: unknown) => error instanceof ServiceError && error.code === "VALIDATION_ERROR",
  );
});
