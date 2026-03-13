import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { FitnessService } from "@/services/fitness.service";

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

function buildAuthContext(supabase: SupabaseClient, householdId: string, userId: string): AuthContext {
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

test("getFitness reuses the persisted daily score when a concurrent insert wins the race", async () => {
  const householdId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const today = new Date().toISOString().slice(0, 10);

  const concurrentRow = {
    id: "fitness-existing",
    household_id: householdId,
    total_score: 612,
    buffer_score: 120,
    growth_score: 132,
    protection_score: 118,
    efficiency_score: 121,
    trajectory_score: 121,
    component_details: {
      ai: {
        fitnessExplanationSource: "ai",
      },
    },
    explanation: "Existing explanation",
    suggested_actions: [],
    calculated_at: today,
    created_at: `${today}T08:00:00.000Z`,
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
    transactions: [],
    fitness_scores: [],
  };

  let injected = false;
  const supabase = createMockSupabase(tables, {
    onInsert: (table, payload, currentTables) => {
      if (table !== "fitness_scores" || injected) {
        return null;
      }

      injected = true;
      currentTables.fitness_scores = [concurrentRow];

      return {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint",
        },
      };
    },
  });

  const service = new FitnessService(
    {
      getBalanceSheet: async () =>
        ({
          totalNetWorth: 1_500_000,
          totalAssets: 2_000_000,
          totalLiabilities: 500_000,
          liquidAssets: 400_000,
          byAccountType: [
            { type: "savings", value: 400_000 },
            { type: "investment", value: 1_300_000 },
          ],
          allocation: {
            byAssetClass: [
              { class: "cash", value: 400_000, pct: 20 },
              { class: "fund", value: 1_600_000, pct: 80 },
            ],
          },
          byWrapperType: [{ wrapperType: "ISK", value: 1_600_000 }],
        }) as never,
      getHistory: async () =>
        ({
          history: [
            { date: "2025-12-31", netWorth: 1_300_000 },
            { date: "2026-01-31", netWorth: 1_380_000 },
            { date: "2026-02-28", netWorth: 1_450_000 },
          ],
        }) as never,
    },
    async () => ({
      explanation: "Fresh explanation",
      suggestedActions: [],
      source: "ai",
    }),
  );

  const result = await service.getFitness(
    buildAuthContext(supabase, householdId, userId),
    householdId,
  );

  assert.equal(result.current.totalScore, concurrentRow.total_score);
  assert.equal(result.current.explanation, concurrentRow.explanation);
  assert.equal(result.current.calculatedAt, today);
  assert.equal((tables.fitness_scores ?? []).length, 1);
});
