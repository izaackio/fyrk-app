import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { ReviewService } from "@/services/review.service";

type Row = Record<string, unknown>;
type TableData = Record<string, Row[]>;

interface QueryResult {
  data: Row[] | null;
  error: null | { code?: string; message: string; status?: number };
}

class MockQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private operation: "insert" | "select" = "select";
  private orderBy: Array<{ ascending: boolean; field: string }> = [];
  private limitValue: number | null = null;
  private payload: Row | null = null;

  constructor(
    private readonly tables: TableData,
    private readonly table: string,
    private readonly hooks: {
      onInsert?: (table: string, payload: Row, tables: TableData) => QueryResult | null;
    } = {},
  ) {}

  select(_columns: string): this {
    return this;
  }

  eq(field: string, value: unknown): this {
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
    this.orderBy.push({
      ascending: options.ascending,
      field,
    });
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  insert(payload: Row): this {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: QueryResult["error"] }> {
    const result = this.execute();
    return {
      data: result.data?.[0] ?? null,
      error: result.error,
    };
  }

  async single(): Promise<{ data: Row; error: QueryResult["error"] }> {
    const result = this.execute();
    return {
      data: (result.data?.[0] ?? {}) as Row,
      error: result.error,
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
      const payload = this.payload ?? {};
      const hooked = this.hooks.onInsert?.(this.table, payload, this.tables);
      if (hooked) {
        return hooked;
      }

      const rows = this.tables[this.table] ?? (this.tables[this.table] = []);
      rows.push({ ...payload });
      return {
        data: [{ ...payload }],
        error: null,
      };
    }

    let rows = (this.tables[this.table] ?? [])
      .map((row) => ({ ...row }))
      .filter((row) => this.filters.every((filter) => filter(row)));

    for (let index = this.orderBy.length - 1; index >= 0; index -= 1) {
      const sort = this.orderBy[index];
      if (!sort) {
        continue;
      }

      const direction = sort.ascending ? 1 : -1;
      rows = [...rows].sort(
        (left, right) =>
          String(left[sort.field] ?? "").localeCompare(String(right[sort.field] ?? "")) * direction,
      );
    }

    if (this.limitValue !== null) {
      rows = rows.slice(0, this.limitValue);
    }

    return {
      data: rows,
      error: null,
    };
  }
}

function createMockSupabase(
  tables: TableData,
  hooks?: {
    onInsert?: (table: string, payload: Row, tables: TableData) => QueryResult | null;
  },
): SupabaseClient {
  return {
    from: (table: string) => new MockQuery(tables, table, hooks),
  } as unknown as SupabaseClient;
}

function buildAuthContext(supabase: SupabaseClient, userId: string): AuthContext {
  return {
    supabase,
    session: {} as Session,
    user: {
      id: userId,
      email: "owner@example.com",
    } as User,
    profile: {
      id: userId,
      email: "owner@example.com",
      display_name: "Owner",
      base_currency: "SEK",
      onboarding_completed: true,
    },
    demoContext: null,
  };
}

function getCurrentQuarterPeriod(now: Date): {
  periodStart: string;
  periodEnd: string;
  quarterLabel: string;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const quarterIndex = Math.floor(month / 3);
  const quarter = quarterIndex + 1;

  const start = new Date(Date.UTC(year, quarterIndex * 3, 1));
  const end = new Date(Date.UTC(year, quarterIndex * 3 + 3, 0));

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    quarterLabel: `Q${quarter} ${year}`,
  };
}

test("generate returns the already-created review when a concurrent insert wins the race", async () => {
  const householdId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const now = new Date();
  const { periodStart, periodEnd, quarterLabel } = getCurrentQuarterPeriod(now);

  const existingReview = {
    id: "review-existing",
    household_id: householdId,
    period_start: periodStart,
    period_end: periodEnd,
    quarter_label: quarterLabel,
    net_worth_start: 1_000_000,
    net_worth_end: 1_100_000,
    net_worth_change: 100_000,
    market_returns_amount: 40_000,
    net_savings_amount: 60_000,
    debt_reduction_amount: 0,
    fees_drag_amount: 0,
    narrative: "Existing review",
    recommendations: [],
    fitness_score: null,
    fitness_components: null,
    upcoming_events: [],
    status: "draft",
    generated_at: now.toISOString(),
    published_at: null,
    timeline_entry_id: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const tables: TableData = {
    households: [
      {
        id: householdId,
        is_demo: false,
        deleted_at: null,
      },
    ],
    household_members: [
      {
        id: "membership-1",
        household_id: householdId,
        user_id: userId,
        role: "owner",
        status: "active",
      },
    ],
    quarterly_reviews: [],
    household_snapshots: [
      {
        household_id: householdId,
        snapshot_date: periodStart,
        total_net_worth: 1_000_000,
        total_liabilities: 300_000,
      },
      {
        household_id: householdId,
        snapshot_date: periodEnd,
        total_net_worth: 1_100_000,
        total_liabilities: 280_000,
      },
    ],
    accounts: [
      {
        id: "account-1",
        household_id: householdId,
        is_active: true,
        deleted_at: null,
      },
    ],
    transactions: [],
  };

  let injected = false;
  const supabase = createMockSupabase(tables, {
    onInsert: (table, _payload, currentTables) => {
      if (table !== "quarterly_reviews" || injected) {
        return null;
      }

      injected = true;
      currentTables.quarterly_reviews = [existingReview];

      return {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint",
        },
      };
    },
  });

  const service = new ReviewService();
  const result = await service.generate(buildAuthContext(supabase, userId), {
    householdId,
  });

  assert.equal(result.reviewId, existingReview.id);
  assert.equal(result.status, "generating");
  assert.equal((tables.quarterly_reviews ?? []).length, 1);
});
