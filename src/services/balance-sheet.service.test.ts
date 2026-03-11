import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { BalanceSheetService } from "@/services/balance-sheet.service";

type Row = Record<string, unknown>;
type TableData = Record<string, Row[]>;

interface QueryResult {
  data: Row[] | null;
  error: null;
  count?: number | null;
}

class MockQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private orderBy: { field: string; ascending: boolean } | null = null;
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
    this.filters.push((row) => {
      const current = row[field];
      if (typeof current === "number" && typeof value === "number") {
        return current >= value;
      }
      return String(current ?? "") >= String(value);
    });
    return this;
  }

  lte(field: string, value: string | number): this {
    this.filters.push((row) => {
      const current = row[field];
      if (typeof current === "number" && typeof value === "number") {
        return current <= value;
      }
      return String(current ?? "") <= String(value);
    });
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
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): QueryResult {
    const rows = this.materialize();
    if (this.head) {
      return {
        data: null,
        error: null,
        count: rows.length,
      };
    }

    return {
      data: rows,
      error: null,
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
      output.sort((left, right) => {
        const leftValue = left[field];
        const rightValue = right[field];

        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * direction;
        }

        return String(leftValue ?? "").localeCompare(String(rightValue ?? "")) * direction;
      });
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

function buildAuthContext(supabase: SupabaseClient, userId: string): AuthContext {
  const user = {
    id: userId,
    email: "owner@example.com",
  } as User;

  return {
    supabase,
    session: {} as Session,
    user,
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

function buildFxSnapshot() {
  return {
    source: "ecb" as const,
    baseCurrency: "EUR" as const,
    asOfDate: "2026-03-03",
    rates: {
      EUR: 1,
      USD: 1,
      SEK: 10,
    },
    fetchedAt: "2026-03-03T08:00:00.000Z",
    staleAfter: "2026-03-05T08:00:00.000Z",
    stale: false,
  };
}

test("getBalanceSheet keeps existing fields and adds deterministic metadata", async () => {
  const householdId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";

  const tables: TableData = {
    household_members: [
      {
        id: "hm-1",
        household_id: householdId,
        user_id: userId,
        role: "owner",
        status: "active",
      },
    ],
    households: [
      {
        id: householdId,
        base_currency: "SEK",
        deleted_at: null,
      },
    ],
    accounts: [
      {
        id: "acc-invest",
        household_id: householdId,
        owner_user_id: userId,
        account_type: "investment",
        wrapper_type: "ISK",
        currency: "USD",
        visibility: "full",
        last_synced: "2026-03-03T08:00:00.000Z",
        is_active: true,
        deleted_at: null,
      },
      {
        id: "acc-mortgage",
        household_id: householdId,
        owner_user_id: userId,
        account_type: "mortgage",
        wrapper_type: null,
        currency: "SEK",
        visibility: "full",
        last_synced: "2026-02-20T08:00:00.000Z",
        is_active: true,
        deleted_at: null,
      },
    ],
    holdings: [
      {
        id: "h-usd",
        account_id: "acc-invest",
        instrument_id: "ins-1",
        market_value: 100_000,
        value_currency: "USD",
        as_of_date: "2026-03-03",
        instruments: {
          id: "ins-1",
          asset_class: "equity",
          country: "US",
          currency: "USD",
          sector: "tech",
        },
        deleted_at: null,
      },
      {
        id: "h-missing",
        account_id: "acc-invest",
        instrument_id: "ins-2",
        market_value: null,
        value_currency: "USD",
        as_of_date: "2026-03-03",
        instruments: {
          id: "ins-2",
          asset_class: "fund",
          country: "SE",
          currency: "SEK",
          sector: "finance",
        },
        deleted_at: null,
      },
      {
        id: "h-loan",
        account_id: "acc-mortgage",
        instrument_id: null,
        market_value: 500_000,
        value_currency: "SEK",
        as_of_date: "2026-03-03",
        instruments: null,
        deleted_at: null,
      },
    ],
    profiles: [
      {
        id: userId,
        email: "owner@example.com",
        display_name: "Owner",
      },
    ],
  };

  const supabase = createMockSupabase(tables);
  const serviceRoleSupabase = createMockSupabase(tables);
  const service = new BalanceSheetService({
    createServiceRoleClient: () => serviceRoleSupabase,
    fetchFxSnapshot: async () => buildFxSnapshot(),
    now: () => new Date("2026-03-03T10:00:00.000Z"),
  });

  const result = await service.getBalanceSheet(buildAuthContext(supabase, userId), householdId);

  assert.equal(result.totalAssets, 1_000_000);
  assert.equal(result.totalLiabilities, 500_000);
  assert.equal(result.totalNetWorth, 500_000);
  assert.equal(result.dataQuality.coveragePct, 67);
  assert.equal(result.dataQuality.staleAccounts, 1);
  assert.deepEqual(result.dataQuality.missingPrices, ["h-missing"]);
  assert.equal(result.byWrapperType[0]?.wrapperType, "ISK");
  assert.equal(result.metadata.assumptions.sourceTier, "system_default");
  assert.equal(result.metadata.fx.source, "ecb");
  assert.ok(Array.isArray(result.byMember));
  assert.ok(Array.isArray(result.allocation.byAssetClass));
});

test("getHistory uses household snapshots as primary source when visibility allows it", async () => {
  const householdId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const tables: TableData = {
    household_members: [
      {
        id: "hm-1",
        household_id: householdId,
        user_id: userId,
        role: "owner",
        status: "active",
      },
    ],
    households: [
      {
        id: householdId,
        base_currency: "SEK",
        deleted_at: null,
      },
    ],
    accounts: [
      {
        id: "acc-1",
        household_id: householdId,
        owner_user_id: userId,
        account_type: "investment",
        wrapper_type: "ISK",
        currency: "SEK",
        visibility: "full",
        last_synced: "2026-03-03T08:00:00.000Z",
        is_active: true,
        deleted_at: null,
      },
    ],
    household_snapshots: [
      {
        household_id: householdId,
        snapshot_date: "2026-02-01",
        total_net_worth: 1_000_000,
        total_assets: 1_300_000,
        total_liabilities: 300_000,
        currency: "SEK",
      },
      {
        household_id: householdId,
        snapshot_date: "2026-03-01",
        total_net_worth: 1_300_000,
        total_assets: 1_500_000,
        total_liabilities: 200_000,
        currency: "SEK",
      },
    ],
    account_snapshots: [
      {
        account_id: "acc-1",
        snapshot_date: "2026-02-01",
        total_value: 100_000,
        currency: "SEK",
      },
      {
        account_id: "acc-1",
        snapshot_date: "2026-03-01",
        total_value: 120_000,
        currency: "SEK",
      },
    ],
  };

  const service = new BalanceSheetService({
    now: () => new Date("2026-03-03T10:00:00.000Z"),
  });
  const result = await service.getHistory(buildAuthContext(createMockSupabase(tables), userId), {
    householdId,
    period: "3m",
  });

  assert.equal(result.metadata.source, "household_snapshots");
  assert.equal(result.metadata.fallbackReason, null);
  assert.equal(result.history[0]?.netWorth, 1_000_000);
  assert.equal(result.history[1]?.netWorth, 1_300_000);
  assert.equal(result.change.amount, 300_000);
});

test("getHistory falls back to account snapshots when visibility is restricted", async () => {
  const householdId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const otherUserId = "33333333-3333-4333-8333-333333333333";
  const tables: TableData = {
    household_members: [
      {
        id: "hm-1",
        household_id: householdId,
        user_id: userId,
        role: "member",
        status: "active",
      },
    ],
    households: [
      {
        id: householdId,
        base_currency: "SEK",
        deleted_at: null,
      },
    ],
    accounts: [
      {
        id: "acc-visible",
        household_id: householdId,
        owner_user_id: userId,
        account_type: "investment",
        wrapper_type: "ISK",
        currency: "SEK",
        visibility: "full",
        last_synced: "2026-03-03T08:00:00.000Z",
        is_active: true,
        deleted_at: null,
      },
      {
        id: "acc-hidden",
        household_id: householdId,
        owner_user_id: otherUserId,
        account_type: "investment",
        wrapper_type: "ISK",
        currency: "SEK",
        visibility: "amount_hidden",
        last_synced: "2026-03-03T08:00:00.000Z",
        is_active: true,
        deleted_at: null,
      },
    ],
    household_snapshots: [
      {
        household_id: householdId,
        snapshot_date: "2026-02-01",
        total_net_worth: 2_000_000,
        total_assets: 2_000_000,
        total_liabilities: 0,
        currency: "SEK",
      },
      {
        household_id: householdId,
        snapshot_date: "2026-03-01",
        total_net_worth: 2_200_000,
        total_assets: 2_200_000,
        total_liabilities: 0,
        currency: "SEK",
      },
    ],
    account_snapshots: [
      {
        account_id: "acc-visible",
        snapshot_date: "2026-02-01",
        total_value: 400_000,
        currency: "SEK",
      },
      {
        account_id: "acc-visible",
        snapshot_date: "2026-03-01",
        total_value: 450_000,
        currency: "SEK",
      },
    ],
  };

  const service = new BalanceSheetService({
    now: () => new Date("2026-03-03T10:00:00.000Z"),
  });
  const result = await service.getHistory(buildAuthContext(createMockSupabase(tables), userId), {
    householdId,
    period: "3m",
  });

  assert.equal(result.metadata.source, "account_snapshots");
  assert.equal(result.metadata.fallbackReason, "visibility_restricted");
  assert.equal(result.history[0]?.netWorth, 400_000);
  assert.equal(result.history[1]?.netWorth, 450_000);
  assert.equal(result.change.amount, 50_000);
});
