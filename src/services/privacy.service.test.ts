import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import {
  PrivacyService,
  buildDeletedEmailAlias,
  pruneDeletedUserFromProposal,
  selectHouseholdDeletionSuccessor,
} from "@/services/privacy.service";

type Row = Record<string, unknown>;
type TableData = Record<string, Row[]>;

interface QueryResult {
  count?: number | null;
  data: Row[] | null;
  error: null;
}

interface AdminUpdateCall {
  payload: Record<string, unknown>;
  userId: string;
}

interface AdminSignOutCall {
  accessToken: string;
  scope: string;
}

interface RouteSignOutCall {
  scope: string;
}

class MockQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private operation: "delete" | "select" | "update" = "select";
  private payload: Row | null = null;

  constructor(
    private readonly tables: TableData,
    private readonly table: string,
  ) {}

  select(_columns: string): this {
    return this;
  }

  eq(field: string, value: unknown): this {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  neq(field: string, value: unknown): this {
    this.filters.push((row) => row[field] !== value);
    return this;
  }

  in(field: string, values: unknown[]): this {
    const expected = new Set(values);
    this.filters.push((row) => expected.has(row[field]));
    return this;
  }

  is(field: string, value: unknown): this {
    if (value === null) {
      this.filters.push((row) => row[field] === null || row[field] === undefined);
      return this;
    }

    this.filters.push((row) => row[field] === value);
    return this;
  }

  update(payload: Row): this {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const rows = this.materialize();
    return {
      data: rows[0] ?? null,
      error: null,
    };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): QueryResult {
    if (this.operation === "update") {
      const tableRows = this.tables[this.table] ?? [];
      const matched = tableRows.filter((row) => this.filters.every((filter) => filter(row)));

      for (const row of matched) {
        Object.assign(row, this.payload ?? {});
      }

      return {
        data: matched.map((row) => ({ ...row })),
        error: null,
      };
    }

    if (this.operation === "delete") {
      const tableRows = this.tables[this.table] ?? [];
      const nextRows = tableRows.filter((row) => !this.filters.every((filter) => filter(row)));
      const deletedRows = tableRows.filter((row) => this.filters.every((filter) => filter(row)));
      this.tables[this.table] = nextRows;

      return {
        data: deletedRows.map((row) => ({ ...row })),
        error: null,
      };
    }

    return {
      data: this.materialize(),
      error: null,
    };
  }

  private materialize(): Row[] {
    let output = (this.tables[this.table] ?? []).map((row) => ({ ...row }));

    for (const filter of this.filters) {
      output = output.filter((row) => filter(row));
    }

    return output;
  }
}

function createServiceSupabase(
  tables: TableData,
  adminUpdateCalls: AdminUpdateCall[],
  adminSignOutCalls: AdminSignOutCall[],
): SupabaseClient {
  return {
    from: (table: string) => new MockQuery(tables, table),
    auth: {
      admin: {
        updateUserById: async (userId: string, payload: Record<string, unknown>) => {
          adminUpdateCalls.push({ userId, payload });
          return { data: null, error: null };
        },
        signOut: async (accessToken: string, scope: string) => {
          adminSignOutCalls.push({ accessToken, scope });
          return { error: null };
        },
      },
    },
  } as unknown as SupabaseClient;
}

function createRouteSupabase(routeSignOutCalls: RouteSignOutCall[]): SupabaseClient {
  return {
    auth: {
      signOut: async ({ scope }: { scope: string }) => {
        routeSignOutCalls.push({ scope });
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
}

function buildAuthContext(userId: string, routeSupabase: SupabaseClient): AuthContext {
  return {
    supabase: routeSupabase,
    session: {
      access_token: "session-token",
    } as Session,
    user: {
      id: userId,
      email: "user@example.com",
    } as User,
    profile: {
      id: userId,
      email: "user@example.com",
      display_name: "User Example",
      base_currency: "SEK",
      onboarding_completed: true,
    },
    demoContext: null,
  };
}

function pluckIds(rows: Array<Record<string, unknown>>): string[] {
  return rows.map((row) => String(row.id));
}

test("selectHouseholdDeletionSuccessor promotes the strongest remaining active member", () => {
  const successor = selectHouseholdDeletionSuccessor(
    [
      {
        id: "m-deleted",
        household_id: "household-1",
        user_id: "user-deleted",
        role: "owner",
        status: "active",
      },
      {
        id: "m-viewer",
        household_id: "household-1",
        user_id: "user-viewer",
        role: "viewer",
        status: "active",
      },
      {
        id: "m-admin",
        household_id: "household-1",
        user_id: "user-admin",
        role: "admin",
        status: "active",
      },
    ],
    "user-deleted",
  );

  assert.equal(successor?.id, "m-admin");
});

test("pruneDeletedUserFromProposal reopens rejected proposals when the deleted user was the rejector", () => {
  const next = pruneDeletedUserFromProposal(
    {
      id: "proposal-1",
      status: "rejected",
      approved_by: ["user-a", "user-deleted"],
      rejected_by: "user-deleted",
      requires_approval_from: ["user-a", "user-deleted"],
      resolved_at: "2026-03-07T10:00:00.000Z",
    },
    "user-deleted",
  );

  assert.deepEqual(next, {
    status: "pending",
    approved_by: ["user-a"],
    rejected_by: null,
    requires_approval_from: ["user-a"],
    resolved_at: null,
  });
});

test("buildDeletedEmailAlias is deterministic and opaque to the original email", () => {
  assert.equal(
    buildDeletedEmailAlias("12345678-1234-4234-8234-1234567890ab"),
    "deleted+123456781234423482341234567890ab@deleted.fyrk.local",
  );
});

test("exportUserData returns only records scoped to the authenticated user", async () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const adminUpdateCalls: AdminUpdateCall[] = [];
  const adminSignOutCalls: AdminSignOutCall[] = [];
  const routeSignOutCalls: RouteSignOutCall[] = [];
  const tables: TableData = {
    profiles: [
      {
        id: userId,
        email: "user@example.com",
        display_name: "User Example",
        avatar_url: null,
        base_currency: "SEK",
        locale: "en",
        onboarding_completed: true,
        is_demo_user: false,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-09T10:00:00.000Z",
        deleted_at: null,
      },
    ],
    household_members: [
      {
        id: "membership-user",
        household_id: "household-user",
        user_id: userId,
        role: "owner",
        status: "active",
        invited_email: null,
        invited_at: null,
        joined_at: "2026-03-01T10:00:00.000Z",
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-09T10:00:00.000Z",
      },
      {
        id: "membership-other",
        household_id: "household-other",
        user_id: "other-user",
        role: "owner",
        status: "active",
        invited_email: null,
        invited_at: null,
        joined_at: "2026-03-01T10:00:00.000Z",
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-09T10:00:00.000Z",
      },
    ],
    households: [
      {
        id: "household-user",
        name: "User Household",
        type: "family",
        base_currency: "SEK",
        is_demo: false,
        demo_variant: null,
        created_by: userId,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-09T10:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "household-other",
        name: "Other Household",
        type: "family",
        base_currency: "SEK",
        is_demo: false,
        demo_variant: null,
        created_by: "other-user",
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-09T10:00:00.000Z",
        deleted_at: null,
      },
    ],
    accounts: [
      {
        id: "account-user",
        household_id: "household-user",
        owner_user_id: userId,
        provider_id: null,
        provider_name: "Manual",
        name: "Brokerage",
        account_type: "investment",
        wrapper_type: "isk",
        currency: "SEK",
        visibility: "all_members",
        sync_source: "manual",
        notes: null,
        is_active: true,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-09T10:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "account-other",
        household_id: "household-other",
        owner_user_id: "other-user",
        provider_id: null,
        provider_name: "Manual",
        name: "Other Brokerage",
        account_type: "investment",
        wrapper_type: "isk",
        currency: "SEK",
        visibility: "all_members",
        sync_source: "manual",
        notes: null,
        is_active: true,
        created_at: "2026-03-01T10:00:00.000Z",
        updated_at: "2026-03-09T10:00:00.000Z",
        deleted_at: null,
      },
    ],
    holdings: [
      {
        id: "holding-user",
        account_id: "account-user",
      },
      {
        id: "holding-other",
        account_id: "account-other",
      },
    ],
    transactions: [
      {
        id: "transaction-user",
        account_id: "account-user",
      },
      {
        id: "transaction-other",
        account_id: "account-other",
      },
    ],
    account_snapshots: [
      {
        id: "snapshot-user",
        account_id: "account-user",
      },
      {
        id: "snapshot-other",
        account_id: "account-other",
      },
    ],
    import_jobs: [
      {
        id: "job-user",
        account_id: "account-user",
        created_by: userId,
      },
      {
        id: "job-other",
        account_id: "account-other",
        created_by: "other-user",
      },
    ],
    import_rows: [
      {
        id: "row-user",
        import_job_id: "job-user",
      },
      {
        id: "row-other",
        import_job_id: "job-other",
      },
    ],
    proposals: [
      {
        id: "proposal-user",
        household_id: "household-user",
        created_by: userId,
      },
      {
        id: "proposal-other",
        household_id: "household-user",
        created_by: "other-user",
      },
    ],
    proposal_comments: [
      {
        id: "comment-user",
        proposal_id: "proposal-user",
        user_id: userId,
      },
      {
        id: "comment-other",
        proposal_id: "proposal-other",
        user_id: "other-user",
      },
    ],
    proposal_approvals: [
      {
        id: "approval-user",
        proposal_id: "proposal-user",
        approver_user_id: userId,
      },
      {
        id: "approval-other",
        proposal_id: "proposal-other",
        approver_user_id: "other-user",
      },
    ],
    timeline_entries: [
      {
        id: "timeline-user",
        household_id: "household-user",
        created_by: userId,
      },
      {
        id: "timeline-other",
        household_id: "household-user",
        created_by: "other-user",
      },
    ],
    life_events: [
      {
        id: "life-event-user",
        household_id: "household-user",
        triggered_by: userId,
      },
      {
        id: "life-event-other",
        household_id: "household-user",
        triggered_by: "other-user",
      },
    ],
    playbook_actions: [
      {
        id: "playbook-user",
        life_event_id: "life-event-user",
        assigned_to: userId,
      },
      {
        id: "playbook-other",
        life_event_id: "life-event-other",
        assigned_to: "other-user",
      },
    ],
    audit_log: [
      {
        id: "audit-user",
        household_id: "household-user",
        user_id: userId,
      },
      {
        id: "audit-other",
        household_id: "household-user",
        user_id: "other-user",
      },
    ],
  };
  const serviceSupabase = createServiceSupabase(tables, adminUpdateCalls, adminSignOutCalls);
  const routeSupabase = createRouteSupabase(routeSignOutCalls);
  const authContext = buildAuthContext(userId, routeSupabase);
  const service = new PrivacyService(
    () => serviceSupabase,
    () => new Date("2026-03-10T12:00:00.000Z"),
  );

  const payload = await service.exportUserData(authContext);

  assert.deepEqual(payload.metadata, {
    formatVersion: 1,
    generatedAt: "2026-03-10T12:00:00.000Z",
  });
  assert.equal(payload.profile?.id, userId);
  assert.deepEqual(pluckIds(payload.households.memberships), ["membership-user"]);
  assert.deepEqual(pluckIds(payload.households.households), ["household-user"]);
  assert.deepEqual(pluckIds(payload.accounts.accounts), ["account-user"]);
  assert.deepEqual(pluckIds(payload.accounts.holdings), ["holding-user"]);
  assert.deepEqual(pluckIds(payload.accounts.transactions), ["transaction-user"]);
  assert.deepEqual(pluckIds(payload.accounts.snapshots), ["snapshot-user"]);
  assert.deepEqual(pluckIds(payload.imports.jobs), ["job-user"]);
  assert.deepEqual(pluckIds(payload.imports.rows), ["row-user"]);
  assert.deepEqual(pluckIds(payload.activity.proposals), ["proposal-user"]);
  assert.deepEqual(pluckIds(payload.activity.proposalComments), ["comment-user"]);
  assert.deepEqual(pluckIds(payload.activity.proposalApprovals), ["approval-user"]);
  assert.deepEqual(pluckIds(payload.activity.timelineEntries), ["timeline-user"]);
  assert.deepEqual(pluckIds(payload.activity.lifeEvents), ["life-event-user"]);
  assert.deepEqual(pluckIds(payload.activity.playbookActions), ["playbook-user"]);
  assert.deepEqual(pluckIds(payload.activity.auditLog), ["audit-user"]);
});

test("deleteAccount scrubs identity, removes owned records, and rebalances surviving household state", async () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const successorUserId = "22222222-2222-4222-8222-222222222222";
  const deletedAt = "2026-03-10T15:30:00.000Z";
  const adminUpdateCalls: AdminUpdateCall[] = [];
  const adminSignOutCalls: AdminSignOutCall[] = [];
  const routeSignOutCalls: RouteSignOutCall[] = [];
  const tables: TableData = {
    households: [
      {
        id: "household-survivor",
        name: "Shared Household",
        created_by: userId,
        is_demo: false,
      },
    ],
    household_members: [
      {
        id: "membership-deleted",
        household_id: "household-survivor",
        user_id: userId,
        role: "owner",
        status: "active",
      },
      {
        id: "membership-successor",
        household_id: "household-survivor",
        user_id: successorUserId,
        role: "admin",
        status: "active",
      },
    ],
    accounts: [
      {
        id: "account-delete",
        household_id: "household-survivor",
        owner_user_id: userId,
      },
      {
        id: "account-keep",
        household_id: "household-survivor",
        owner_user_id: successorUserId,
      },
    ],
    proposals: [
      {
        id: "proposal-delete",
        household_id: "household-survivor",
        created_by: userId,
        status: "pending",
        approved_by: [userId],
        rejected_by: null,
        requires_approval_from: [userId, successorUserId],
        resolved_at: null,
      },
      {
        id: "proposal-keep",
        household_id: "household-survivor",
        created_by: successorUserId,
        status: "rejected",
        approved_by: [successorUserId, userId],
        rejected_by: userId,
        requires_approval_from: [successorUserId, userId],
        resolved_at: "2026-03-07T10:00:00.000Z",
      },
    ],
    proposal_comments: [
      {
        id: "comment-delete",
        proposal_id: "proposal-keep",
        user_id: userId,
      },
    ],
    proposal_approvals: [
      {
        id: "approval-delete",
        proposal_id: "proposal-keep",
        approver_user_id: userId,
      },
    ],
    timeline_entries: [
      {
        id: "timeline-keep",
        household_id: "household-survivor",
        linked_account_ids: ["account-delete", "account-keep"],
        deleted_at: null,
      },
    ],
    playbook_actions: [
      {
        id: "playbook-1",
        assigned_to: userId,
      },
    ],
    household_snapshots: [
      {
        id: "household-snapshot-1",
        household_id: "household-survivor",
      },
    ],
    weekly_narrative_cache: [
      {
        id: "narrative-1",
        household_id: "household-survivor",
      },
    ],
    fitness_scores: [
      {
        id: "fitness-1",
        household_id: "household-survivor",
      },
    ],
    quarterly_reviews: [
      {
        id: "review-1",
        household_id: "household-survivor",
      },
    ],
    profiles: [
      {
        id: userId,
        email: "user@example.com",
        display_name: "User Example",
        avatar_url: "https://example.com/avatar.png",
        onboarding_completed: true,
        is_demo_user: true,
        deleted_at: null,
        updated_at: "2026-03-09T10:00:00.000Z",
      },
    ],
  };
  const serviceSupabase = createServiceSupabase(tables, adminUpdateCalls, adminSignOutCalls);
  const routeSupabase = createRouteSupabase(routeSignOutCalls);
  const authContext = buildAuthContext(userId, routeSupabase);
  const service = new PrivacyService(() => serviceSupabase, () => new Date(deletedAt));

  const result = await service.deleteAccount(authContext);
  const households = tables.households ?? [];
  const householdMembers = tables.household_members ?? [];
  const accounts = tables.accounts ?? [];
  const proposals = tables.proposals ?? [];
  const proposalComments = tables.proposal_comments ?? [];
  const proposalApprovals = tables.proposal_approvals ?? [];
  const timelineEntries = tables.timeline_entries ?? [];
  const playbookActions = tables.playbook_actions ?? [];
  const householdSnapshots = tables.household_snapshots ?? [];
  const weeklyNarrativeCache = tables.weekly_narrative_cache ?? [];
  const fitnessScores = tables.fitness_scores ?? [];
  const quarterlyReviews = tables.quarterly_reviews ?? [];
  const profiles = tables.profiles ?? [];

  assert.deepEqual(result, {
    deleted: true,
    deletedAt,
    anonymizedEmail: buildDeletedEmailAlias(userId),
  });
  assert.equal(households[0]?.created_by, successorUserId);
  assert.equal(householdMembers.length, 1);
  assert.equal(householdMembers[0]?.user_id, successorUserId);
  assert.equal(householdMembers[0]?.role, "owner");
  assert.deepEqual(pluckIds(accounts), ["account-keep"]);
  assert.deepEqual(pluckIds(proposals), ["proposal-keep"]);
  assert.deepEqual(proposals[0], {
    id: "proposal-keep",
    household_id: "household-survivor",
    created_by: successorUserId,
    status: "pending",
    approved_by: [successorUserId],
    rejected_by: null,
    requires_approval_from: [successorUserId],
    resolved_at: null,
  });
  assert.equal(proposalComments.length, 0);
  assert.equal(proposalApprovals.length, 0);
  assert.deepEqual(timelineEntries[0]?.linked_account_ids, ["account-keep"]);
  assert.equal(timelineEntries[0]?.updated_at, deletedAt);
  assert.equal(playbookActions[0]?.assigned_to, null);
  assert.equal(playbookActions[0]?.updated_at, deletedAt);
  assert.equal(householdSnapshots.length, 0);
  assert.equal(weeklyNarrativeCache.length, 0);
  assert.equal(fitnessScores.length, 0);
  assert.equal(quarterlyReviews.length, 0);
  assert.deepEqual(profiles[0], {
    id: userId,
    email: buildDeletedEmailAlias(userId),
    display_name: null,
    avatar_url: null,
    onboarding_completed: false,
    is_demo_user: false,
    deleted_at: deletedAt,
    updated_at: deletedAt,
  });
  assert.deepEqual(adminUpdateCalls, [
    {
      userId,
      payload: {
        email: buildDeletedEmailAlias(userId),
        email_confirm: true,
        user_metadata: {
          gdprDeletedAt: deletedAt,
        },
      },
    },
  ]);
  assert.deepEqual(adminSignOutCalls, [
    {
      accessToken: "session-token",
      scope: "global",
    },
  ]);
  assert.deepEqual(routeSignOutCalls, [{ scope: "global" }]);
});
