import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { FitnessService } from "@/services/fitness.service";

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

  constructor(private readonly rows: Row[]) {}

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

  gte(field: string, value: string | number): this {
    this.filters.push((row) => String(row[field] ?? "") >= String(value));
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
      field,
      ascending: options.ascending,
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
      error: null,
    };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.materialize(),
      error: null,
    }).then(onfulfilled, onrejected);
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
          String(left[field] ?? "").localeCompare(String(right[field] ?? "")) * direction,
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
    from: (table: string) => new MockQuery(tables[table] ?? []),
  } as unknown as SupabaseClient;
}

function buildAuthContext(supabase: SupabaseClient, householdId: string): AuthContext {
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  return {
    supabase,
    session: {} as Session,
    user: {
      id: userId,
      email: "demo-owner@example.com",
    } as User,
    profile: {
      id: userId,
      email: "demo-owner@example.com",
      display_name: "Demo Owner",
      base_currency: "SEK",
      onboarding_completed: true,
    },
    demoContext: {
      householdId,
      householdName: "Demo household",
      variant: "standard",
      readOnly: true,
    },
  };
}

test("getFitness returns a deterministic fallback score when demo precompute is missing", async () => {
  const householdId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const tables: TableData = {
    household_members: [
      {
        id: "membership-1",
        household_id: householdId,
        user_id: userId,
        role: "owner",
        status: "active",
      },
    ],
    fitness_scores: [],
    accounts: [
      {
        id: "account-1",
        household_id: householdId,
        owner_user_id: userId,
        visibility: "full",
        is_active: true,
        deleted_at: null,
      },
    ],
    transactions: [
      {
        account_id: "account-1",
        type: "withdrawal",
        amount: -125_000,
        transaction_date: "2026-02-14",
      },
      {
        account_id: "account-1",
        type: "fee",
        amount: -2_500,
        transaction_date: "2026-02-14",
      },
    ],
  };

  const service = new FitnessService({
    getBalanceSheet: async () =>
      ({
        totalNetWorth: 2_100_000,
        totalAssets: 3_000_000,
        totalLiabilities: 900_000,
        liquidAssets: 650_000,
        byAccountType: [
          { type: "savings", value: 650_000 },
          { type: "investment", value: 1_900_000 },
          { type: "insurance", value: 450_000 },
        ],
        allocation: {
          byAssetClass: [
            { class: "cash", value: 650_000, pct: 21.7 },
            { class: "fund", value: 1_450_000, pct: 48.3 },
            { class: "equity", value: 900_000, pct: 30 },
          ],
        },
        byWrapperType: [
          { wrapperType: "ISK", value: 1_400_000 },
          { wrapperType: "KF", value: 500_000 },
          { wrapperType: "depa", value: 100_000 },
        ],
      }) as never,
    getHistory: async () =>
      ({
        history: [
          { date: "2025-11-30", netWorth: 1_880_000 },
          { date: "2025-12-31", netWorth: 1_940_000 },
          { date: "2026-01-31", netWorth: 2_020_000 },
          { date: "2026-02-28", netWorth: 2_100_000 },
        ],
      }) as never,
  });

  const result = await service.getFitness(
    buildAuthContext(createMockSupabase(tables), householdId),
    householdId,
  );

  assert.equal(result.current.explanationSource, "fallback");
  assert.equal(result.current.totalScore > 0, true);
  assert.equal(result.current.explanation.length > 0, true);
  assert.equal(result.history.length, 1);
  assert.equal(result.history[0]?.score, result.current.totalScore);
});
