import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { generateWeeklyNarrative } from "@/lib/ai/narrative";

type Row = Record<string, unknown>;
type TableData = Record<string, Row[]>;

interface QueryResult {
  count?: number | null;
  data: Row[] | null;
  error: null;
}

class MockQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private orderBy: { ascending: boolean; field: string } | null = null;
  private limitValue: number | null = null;
  private head = false;

  constructor(private readonly rows: Row[]) {}

  select(_columns: string, options?: { count?: "exact"; head?: boolean }): this {
    this.head = Boolean(options?.head);
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

  gte(field: string, value: string | number): this {
    this.filters.push((row) => String(row[field] ?? "") >= String(value));
    return this;
  }

  lte(field: string, value: string | number): this {
    this.filters.push((row) => String(row[field] ?? "") <= String(value));
    return this;
  }

  order(field: string, options: { ascending: boolean }): this {
    this.orderBy = {
      field,
      ascending: options.ascending
    };
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const rows = this.materialize();
    return {
      data: rows[0] ?? null,
      error: null
    };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): QueryResult {
    const rows = this.materialize();
    if (this.head) {
      return {
        count: rows.length,
        data: null,
        error: null
      };
    }

    return {
      data: rows,
      error: null
    };
  }

  private materialize(): Row[] {
    let output = this.rows.map((row) => ({ ...row }));

    for (const filter of this.filters) {
      output = output.filter((row) => filter(row));
    }

    if (this.orderBy) {
      const direction = this.orderBy.ascending ? 1 : -1;
      const field = this.orderBy.field;
      output.sort(
        (left, right) =>
          String(left[field] ?? "").localeCompare(String(right[field] ?? "")) * direction
      );
    }

    if (this.limitValue !== null) {
      output = output.slice(0, this.limitValue);
    }

    return output;
  }
}

function createMockSupabase(tables: TableData): SupabaseClient {
  return {
    from: (table: string) => new MockQuery(tables[table] ?? [])
  } as unknown as SupabaseClient;
}

function buildAuthContext(supabase: SupabaseClient, householdId: string, demo = true): AuthContext {
  const userId = "99999999-9999-4999-8999-999999999999";

  return {
    supabase,
    session: {} as Session,
    user: {
      id: userId,
      email: "demo-viewer@example.com"
    } as User,
    profile: {
      id: userId,
      email: "demo-viewer@example.com",
      display_name: "Demo Viewer",
      base_currency: "SEK",
      onboarding_completed: true
    },
    demoContext: demo
      ? {
          householdId,
          householdName: "Demo household",
          variant: "standard",
          readOnly: true
        }
      : null
  };
}

function buildBaseTables(householdId: string): TableData {
  const userId = "99999999-9999-4999-8999-999999999999";

  return {
    household_members: [
      {
        id: "membership-1",
        household_id: householdId,
        user_id: userId,
        role: "owner",
        status: "active"
      }
    ],
    households: [
      {
        id: householdId,
        name: "Demo household",
        base_currency: "SEK",
        deleted_at: null
      }
    ],
    accounts: [
      {
        id: "account-1",
        household_id: householdId,
        account_type: "investment",
        wrapper_type: "ISK",
        provider_name: "Avanza",
        name: "ISK",
        currency: "SEK",
        is_active: true,
        deleted_at: null
      }
    ],
    household_snapshots: [
      {
        household_id: householdId,
        snapshot_date: "2026-02-28",
        total_net_worth: 1_250_000,
        total_assets: 1_800_000,
        total_liabilities: 550_000,
        currency: "SEK"
      },
      {
        household_id: householdId,
        snapshot_date: "2026-01-31",
        total_net_worth: 1_180_000,
        total_assets: 1_720_000,
        total_liabilities: 540_000,
        currency: "SEK"
      }
    ],
    transactions: [
      {
        id: "txn-1",
        account_id: "account-1",
        type: "deposit",
        amount: 35_000,
        currency: "SEK",
        transaction_date: "2026-02-26",
        description: "Monthly contribution",
        deleted_at: null
      }
    ]
  };
}

test("generateWeeklyNarrative loads the latest precomputed demo artifact when the current week cache is missing", async () => {
  const householdId = "11111111-1111-4111-8111-111111111111";
  const tables = buildBaseTables(householdId);
  tables.weekly_narrative_cache = [
    {
      id: "cache-1",
      household_id: householdId,
      as_of_week: "2026-02-23",
      context_hash: "seeded-context",
      narrative:
        "Demo Viewer, your household net worth increased by 700 SEK (0.2%) to 12 507 SEK. The largest recorded move was a monthly transfer into savings. We recorded two new transactions during the week. A short review of the latest transfer at the next check-in would keep the picture current.",
      highlights: [
        { type: "positive", text: "Net worth held above the previous monthly baseline." },
        { type: "action", text: "Review the latest transfer before the next checkpoint." }
      ],
      source: "fallback",
      generated_at: "2026-03-01T08:00:00.000Z"
    }
  ];

  const result = await generateWeeklyNarrative(
    buildAuthContext(createMockSupabase(tables), householdId),
    householdId
  );

  assert.equal(result.fromCache, true);
  assert.equal(result.source, "fallback");
  assert.equal(result.asOfWeek, "2026-02-23");
  assert.equal(result.narrative.includes("your household net worth increased"), true);
  assert.equal(result.highlights.length, 2);
});

test("generateWeeklyNarrative falls back deterministically for demo households when no precomputed artifact exists", async () => {
  const householdId = "22222222-2222-4222-8222-222222222222";
  const tables = buildBaseTables(householdId);

  const result = await generateWeeklyNarrative(
    buildAuthContext(createMockSupabase(tables), householdId),
    householdId
  );

  assert.equal(result.fromCache, false);
  assert.equal(result.source, "fallback");
  assert.equal(result.narrative.includes("your household net worth"), true);
  assert.equal(result.highlights.length >= 2, true);
});
