import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { EventService } from "@/services/event.service";

type Row = Record<string, unknown>;
type TableData = Record<string, Row[]>;

interface QueryResult {
  data: Row[] | null;
  error: null;
}

class MockQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private operation: "insert" | "select" | "update" = "select";
  private orderBy: { ascending: boolean; field: string } | null = null;
  private payload: Row | Row[] | null = null;

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

  order(field: string, options: { ascending: boolean }): this {
    this.orderBy = {
      ascending: options.ascending,
      field,
    };
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const rows = this.execute().data ?? [];

    return {
      data: rows[0] ?? null,
      error: null,
    };
  }

  async single(): Promise<{ data: Row; error: null }> {
    const rows = this.execute().data ?? [];

    return {
      data: (rows[0] ?? {}) as Row,
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
    if (this.operation === "insert") {
      const tableRows = this.tables[this.table] ?? (this.tables[this.table] = []);
      const payloads = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const inserted = payloads.map((payload, index) => {
        const nextIndex = tableRows.length + index + 1;
        const nowIso = `2026-03-12T13:${String(nextIndex).padStart(2, "0")}:00.000Z`;
        const row = this.decorateRow({
          id: payload.id ?? `${this.table}-${nextIndex}`,
          ...payload,
        }, nowIso);

        tableRows.push(row);
        return { ...row };
      });

      return {
        data: this.sortRows(inserted),
        error: null,
      };
    }

    if (this.operation === "update") {
      const tableRows = this.tables[this.table] ?? [];
      const matched = tableRows.filter((row) => this.filters.every((filter) => filter(row)));

      for (const row of matched) {
        Object.assign(row, this.payload ?? {});
      }

      return {
        data: this.sortRows(matched.map((row) => ({ ...row }))),
        error: null,
      };
    }

    const filtered = (this.tables[this.table] ?? [])
      .map((row) => ({ ...row }))
      .filter((row) => this.filters.every((filter) => filter(row)));

    return {
      data: this.sortRows(filtered),
      error: null,
    };
  }

  private decorateRow(row: Row, nowIso: string): Row {
    if (this.table === "life_events") {
      return {
        completed_at: null,
        created_at: nowIso,
        deleted_at: null,
        timeline_entry_id: null,
        updated_at: nowIso,
        ...row,
      };
    }

    if (this.table === "playbook_actions") {
      return {
        assigned_to: null,
        completed_at: null,
        completion_notes: null,
        created_at: nowIso,
        estimated_impact_amount: null,
        updated_at: nowIso,
        ...row,
      };
    }

    if (this.table === "timeline_entries") {
      return {
        created_at: nowIso,
        updated_at: nowIso,
        ...row,
      };
    }

    return row;
  }

  private sortRows(rows: Row[]): Row[] {
    if (!this.orderBy) {
      return rows;
    }

    const direction = this.orderBy.ascending ? 1 : -1;
    const field = this.orderBy.field;

    return [...rows].sort((left, right) => {
      return String(left[field] ?? "").localeCompare(String(right[field] ?? "")) * direction;
    });
  }
}

function createMockSupabase(tables: TableData): SupabaseClient {
  return {
    from: (table: string) => new MockQuery(tables, table),
  } as unknown as SupabaseClient;
}

function buildAuthContext(supabase: SupabaseClient, userId: string): AuthContext {
  return {
    supabase,
    session: {} as Session,
    user: {
      id: userId,
      email: "alex@example.com",
    } as User,
    profile: {
      id: userId,
      email: "alex@example.com",
      display_name: "Alex",
      base_currency: "SEK",
      onboarding_completed: true,
    },
    demoContext: null,
  };
}

function buildBaseTables(): TableData {
  const householdId = "11111111-1111-4111-8111-111111111111";
  const selfUserId = "22222222-2222-4222-8222-222222222222";
  const partnerUserId = "33333333-3333-4333-8333-333333333333";

  return {
    households: [
      {
        id: householdId,
        is_demo: false,
        deleted_at: null,
      },
    ],
    household_members: [
      {
        id: "membership-self",
        household_id: householdId,
        user_id: selfUserId,
        role: "owner",
        status: "active",
      },
      {
        id: "membership-partner",
        household_id: householdId,
        user_id: partnerUserId,
        role: "member",
        status: "active",
      },
    ],
    profiles: [
      {
        id: selfUserId,
        email: "alex@example.com",
        display_name: "Alex",
      },
      {
        id: partnerUserId,
        email: "partner@example.com",
        display_name: "Partner",
      },
    ],
  };
}

test("list returns UI-stable event payloads with assignee labels and progress", async () => {
  const tables = buildBaseTables();
  const householdId = "11111111-1111-4111-8111-111111111111";
  const selfUserId = "22222222-2222-4222-8222-222222222222";
  const partnerUserId = "33333333-3333-4333-8333-333333333333";

  tables.life_events = [
    {
      id: "event-new",
      household_id: householdId,
      triggered_by: selfUserId,
      event_type: "buying_apartment",
      title: "Buying our first apartment",
      status: "active",
      inputs: {
        budget: 350_000_000,
        targetDate: "2026-09-01",
      },
      impact_summary: "A home purchase can materially lower short-term liquidity.",
      impact_data: {
        downPaymentRequired: 52_500_000,
        fitnessScoreImpact: -32,
        monthlyMortgageCost: 1_200_000,
        netWorthImpactPct: -11.2,
      },
      target_date: "2026-09-01",
      completed_at: null,
      timeline_entry_id: "timeline-1",
      created_at: "2026-03-10T10:00:00.000Z",
      updated_at: "2026-03-10T10:00:00.000Z",
      deleted_at: null,
    },
    {
      id: "event-old",
      household_id: householdId,
      triggered_by: selfUserId,
      event_type: "retirement",
      title: "Retirement planning",
      status: "completed",
      inputs: {},
      impact_summary: null,
      impact_data: null,
      target_date: null,
      completed_at: "2026-02-02T10:00:00.000Z",
      timeline_entry_id: "timeline-2",
      created_at: "2026-02-01T10:00:00.000Z",
      updated_at: "2026-02-02T10:00:00.000Z",
      deleted_at: null,
    },
  ];
  tables.playbook_actions = [
    {
      id: "action-b",
      life_event_id: "event-new",
      title: "Collect lender documents",
      description: null,
      category: "administrative",
      priority: "medium",
      sort_order: 1,
      assigned_to: partnerUserId,
      status: "pending",
      estimated_impact_amount: null,
      estimated_impact_description: null,
      completed_at: null,
      completion_notes: null,
      created_at: "2026-03-10T10:01:00.000Z",
      updated_at: "2026-03-10T10:01:00.000Z",
    },
    {
      id: "action-a",
      life_event_id: "event-new",
      title: "Stress test the budget",
      description: "Review the cash buffer before committing.",
      category: "legal",
      priority: "high",
      sort_order: 0,
      assigned_to: null,
      status: "completed",
      estimated_impact_amount: null,
      estimated_impact_description: "Keeps the purchase realistic.",
      completed_at: "2026-03-10T10:02:00.000Z",
      completion_notes: null,
      created_at: "2026-03-10T10:02:00.000Z",
      updated_at: "2026-03-10T10:02:00.000Z",
    },
    {
      id: "action-c",
      life_event_id: "event-old",
      title: "Book advisor meeting",
      description: "Discuss drawdown timing.",
      category: "financial",
      priority: "high",
      sort_order: 0,
      assigned_to: null,
      status: "skipped",
      estimated_impact_amount: null,
      estimated_impact_description: "Clarifies drawdown assumptions.",
      completed_at: null,
      completion_notes: null,
      created_at: "2026-02-01T11:00:00.000Z",
      updated_at: "2026-02-01T11:00:00.000Z",
    },
  ];

  const service = new EventService();
  const result = await service.list(
    buildAuthContext(createMockSupabase(tables), selfUserId),
    householdId,
  );

  assert.equal(result.length, 2);
  assert.equal(result[0]?.id, "event-new");
  assert.equal(result[0]?.playbook.actions[0]?.id, "action-a");
  assert.equal(result[0]?.playbook.actions[1]?.category, "planning");
  assert.equal(result[0]?.playbook.actions[1]?.assignedToLabel, "Partner");
  assert.deepEqual(result[0]?.progress, {
    completed: 1,
    pct: 50,
    skipped: 0,
    total: 2,
  });
  assert.equal(Boolean(result[1]?.impactSummary.length), true);
  assert.equal(result[1]?.playbook.actions[0]?.status, "skipped");
});

test("updateAction resolves frontend partner placeholder and returns the full event payload", async () => {
  const tables = buildBaseTables();
  const householdId = "11111111-1111-4111-8111-111111111111";
  const selfUserId = "22222222-2222-4222-8222-222222222222";
  const partnerUserId = "33333333-3333-4333-8333-333333333333";

  tables.life_events = [
    {
      id: "event-1",
      household_id: householdId,
      triggered_by: selfUserId,
      event_type: "buying_apartment",
      title: "Buying our first apartment",
      status: "active",
      inputs: {
        budget: 350_000_000,
        targetDate: "2026-09-01",
      },
      impact_summary: "A home purchase can materially lower short-term liquidity.",
      impact_data: {
        downPaymentRequired: 52_500_000,
        fitnessScoreImpact: -32,
        monthlyMortgageCost: 1_200_000,
        netWorthImpactPct: -11.2,
      },
      target_date: "2026-09-01",
      completed_at: null,
      timeline_entry_id: "timeline-1",
      created_at: "2026-03-10T10:00:00.000Z",
      updated_at: "2026-03-10T10:00:00.000Z",
      deleted_at: null,
    },
  ];
  tables.playbook_actions = [
    {
      id: "action-1",
      life_event_id: "event-1",
      title: "Collect lender documents",
      description: "Gather proof of income and buffers.",
      category: "administrative",
      priority: "medium",
      sort_order: 0,
      assigned_to: null,
      status: "pending",
      estimated_impact_amount: null,
      estimated_impact_description: "Keeps the approval process moving.",
      completed_at: null,
      completion_notes: null,
      created_at: "2026-03-10T10:01:00.000Z",
      updated_at: "2026-03-10T10:01:00.000Z",
    },
    {
      id: "action-2",
      life_event_id: "event-1",
      title: "Stress test the budget",
      description: "Review the cash buffer before committing.",
      category: "financial",
      priority: "high",
      sort_order: 1,
      assigned_to: selfUserId,
      status: "completed",
      estimated_impact_amount: null,
      estimated_impact_description: "Protects the emergency buffer.",
      completed_at: "2026-03-10T10:02:00.000Z",
      completion_notes: null,
      created_at: "2026-03-10T10:02:00.000Z",
      updated_at: "2026-03-10T10:02:00.000Z",
    },
  ];

  const service = new EventService();
  const result = await service.updateAction(
    buildAuthContext(createMockSupabase(tables), selfUserId),
    "event-1",
    "action-1",
    {
      assignedTo: "partner-member",
      assignedToLabel: "Partner",
      householdId,
      status: "completed",
    },
  );

  const updatedAction = result.playbook.actions.find((action) => action.id === "action-1");
  const storedAction = tables.playbook_actions?.find((action) => action.id === "action-1");
  const storedEvent = tables.life_events?.find((event) => event.id === "event-1");

  assert.equal(updatedAction?.assignedTo, partnerUserId);
  assert.equal(updatedAction?.assignedToLabel, "Partner");
  assert.equal(updatedAction?.status, "completed");
  assert.deepEqual(result.progress, {
    completed: 2,
    pct: 100,
    skipped: 0,
    total: 2,
  });
  assert.equal(result.status, "completed");
  assert.equal(storedAction?.assigned_to, partnerUserId);
  assert.equal(storedEvent?.status, "completed");
});

test("create returns the same event payload contract used by the upgraded UI", async () => {
  const tables = buildBaseTables();
  const householdId = "11111111-1111-4111-8111-111111111111";
  const selfUserId = "22222222-2222-4222-8222-222222222222";

  const service = new EventService({
    generatePlaybook: async () => ({
      actions: [
        {
          title: "Stress test the budget",
          description: "Review the cash buffer before committing.",
          category: "financial",
          priority: "critical",
          estimatedImpactDescription: "Protects liquidity.",
        },
        {
          title: "Collect lender documents",
          description: "Gather proof of income and buffers.",
          category: "administrative",
          priority: "medium",
          estimatedImpactDescription: "Keeps paperwork moving.",
        },
        {
          title: "Review legal costs",
          description: "Budget for registration and legal fees.",
          category: "legal",
          priority: "high",
          estimatedImpactDescription: "Avoids closing surprises.",
        },
        {
          title: "Check home insurance",
          description: "Confirm scope before purchase completion.",
          category: "insurance",
          priority: "high",
          estimatedImpactDescription: "Reduces downside risk.",
        },
        {
          title: "Plan tax adjustments",
          description: "Review wrapper liquidity before the move.",
          category: "tax",
          priority: "medium",
          estimatedImpactDescription: "Limits avoidable tax drag.",
        },
      ],
      source: "fallback",
    }),
    getBalanceSheet: async () =>
      ({
        totalNetWorth: 400_000_000,
      }) as never,
  });

  const result = await service.create(
    buildAuthContext(createMockSupabase(tables), selfUserId),
    {
      householdId,
      eventType: "buying_apartment",
      title: "Buying our first apartment",
      inputs: {
        budget: 350_000_000,
        targetDate: "2026-09-01",
      },
    },
  );

  assert.equal(result.householdId, householdId);
  assert.equal(result.targetDate, "2026-09-01");
  assert.equal(result.playbook.totalActions, 5);
  assert.equal(result.playbook.actions[1]?.category, "planning");
  assert.equal(result.impactData.downPaymentRequired, 52_500_000);
  assert.deepEqual(result.progress, {
    completed: 0,
    pct: 0,
    skipped: 0,
    total: 5,
  });
  assert.equal(tables.timeline_entries?.length, 1);
});
