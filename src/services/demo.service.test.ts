import assert from "node:assert/strict";
import test from "node:test";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { DemoService } from "@/services/demo.service";

type Row = Record<string, unknown>;
type TableData = Record<string, Row[]>;

interface QueryResult {
  count?: number | null;
  data: Row[] | null;
  error: null;
}

class MockQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private head = false;
  private limitValue: number | null = null;
  private operation: "select" | "update" | "insert" | "delete" = "select";
  private orderBy: { ascending: boolean; field: string } | null = null;
  private payload: Row | Row[] | null = null;

  constructor(
    private readonly tables: TableData,
    private readonly table: string,
  ) {}

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

  neq(field: string, value: unknown): this {
    this.filters.push((row) => row[field] !== value);
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

  update(payload: Row): this {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.operation = "insert";
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
    if (this.operation === "insert") {
      const tableRows = this.tables[this.table] ?? (this.tables[this.table] = []);
      const payloads = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const inserted = payloads.map((payload, index) => {
        const row = {
          id: `${this.table}-inserted-${tableRows.length + index + 1}`,
          ...payload,
        };
        tableRows.push(row);
        return { ...row };
      });

      return {
        data: inserted,
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

    const rows = this.materialize();
    if (this.head) {
      return {
        count: rows.length,
        data: null,
        error: null,
      };
    }

    return {
      data: rows,
      error: null,
    };
  }

  private materialize(): Row[] {
    let output = (this.tables[this.table] ?? []).map((row) => ({ ...row }));

    for (const filter of this.filters) {
      output = output.filter((row) => filter(row));
    }

    if (this.orderBy) {
      const { ascending, field } = this.orderBy;
      const direction = ascending ? 1 : -1;
      output.sort((left, right) =>
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
    from: (table: string) => new MockQuery(tables, table),
  } as unknown as SupabaseClient;
}

function buildAuthContext(userId: string): AuthContext {
  return {
    supabase: {} as SupabaseClient,
    session: {} as Session,
    user: {
      id: userId,
      email: "demo-viewer@example.com",
    } as User,
    profile: {
      id: userId,
      email: "demo-viewer@example.com",
      display_name: "Demo Viewer",
      base_currency: "SEK",
      onboarding_completed: true,
    },
    demoContext: null,
  };
}

test("demo initialization activates the selected household and returns seeded counts", async () => {
  const userId = "99999999-9999-4999-8999-999999999999";
  const tables: TableData = {
    households: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Andersson Family",
        is_demo: true,
        demo_variant: "standard",
        created_at: "2026-03-01T10:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Lindberg FIRE Plan",
        is_demo: true,
        demo_variant: "fire",
        created_at: "2026-03-01T11:00:00.000Z",
        deleted_at: null,
      },
    ],
    household_members: [
      {
        id: "membership-fire",
        household_id: "22222222-2222-4222-8222-222222222222",
        user_id: userId,
        role: "member",
        status: "active",
      },
      {
        id: "seed-owner-1",
        household_id: "11111111-1111-4111-8111-111111111111",
        user_id: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        role: "owner",
        status: "active",
      },
      {
        id: "seed-owner-2",
        household_id: "11111111-1111-4111-8111-111111111111",
        user_id: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
        role: "member",
        status: "active",
      },
    ],
    profiles: [
      {
        id: userId,
        is_demo_user: false,
      },
      {
        id: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        is_demo_user: true,
      },
      {
        id: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
        is_demo_user: true,
      },
    ],
    accounts: [
      {
        id: "acc-1",
        household_id: "11111111-1111-4111-8111-111111111111",
        is_active: true,
        deleted_at: null,
      },
      {
        id: "acc-2",
        household_id: "11111111-1111-4111-8111-111111111111",
        is_active: true,
        deleted_at: null,
      },
    ],
    timeline_entries: [
      {
        id: "tl-1",
        household_id: "11111111-1111-4111-8111-111111111111",
        deleted_at: null,
      },
      {
        id: "tl-2",
        household_id: "11111111-1111-4111-8111-111111111111",
        deleted_at: null,
      },
      {
        id: "tl-3",
        household_id: "11111111-1111-4111-8111-111111111111",
        deleted_at: null,
      },
    ],
  };

  const service = new DemoService(() => createMockSupabase(tables), () => new Date("2026-03-07T10:00:00.000Z"));
  const result = await service.initialize(buildAuthContext(userId), "standard");

  assert.deepEqual(result, {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Andersson Family",
    isDemo: true,
    demoVariant: "standard",
    memberCount: 2,
    accountCount: 2,
    timelineEntries: 3,
  });

  const householdMembers = tables.household_members ?? [];
  const fireMembership = householdMembers.find((row) => row.id === "membership-fire");
  assert.equal(fireMembership?.status, "removed");

  const activatedMembership = householdMembers.find(
    (row) =>
      row.user_id === userId &&
      row.household_id === "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(activatedMembership?.status, "active");
  assert.equal(activatedMembership?.role, "member");
});
