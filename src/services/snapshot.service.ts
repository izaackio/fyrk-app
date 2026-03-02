import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import {
  addSignedValueToTotals,
  normalizeIsoCurrency,
  toIsoDate,
  toSignedAccountValue,
  type NetWorthTotals,
} from "@/lib/calculations/balance-sheet";
import { convertFxAmount, fetchEcbFxSnapshot, type FxRatesSnapshot } from "@/lib/market-data/fx";
import { ServiceError } from "@/services/errors";

interface HouseholdRow {
  id: string;
  base_currency: string;
  deleted_at: string | null;
}

interface AccountRow {
  id: string;
  household_id: string;
  account_type: string;
  currency: string;
  is_active: boolean;
  deleted_at: string | null;
}

interface HoldingRow {
  account_id: string;
  market_value: number | string | null;
  value_currency: string | null;
}

interface SnapshotRunOptions {
  snapshotDate?: string;
}

export interface SnapshotRunResult {
  snapshotDate: string;
  householdsProcessed: number;
  accountsProcessed: number;
  accountSnapshotsUpserted: number;
  householdSnapshotsUpserted: number;
}

const chunkSize = 500;

export class SnapshotService {
  async createDailySnapshots(options: SnapshotRunOptions = {}): Promise<SnapshotRunResult> {
    const snapshotDate = this.resolveSnapshotDate(options.snapshotDate);
    const supabase = createServiceRoleSupabaseClient();
    const households = await this.getActiveHouseholds(supabase);

    if (households.length === 0) {
      return {
        snapshotDate,
        householdsProcessed: 0,
        accountsProcessed: 0,
        accountSnapshotsUpserted: 0,
        householdSnapshotsUpserted: 0,
      };
    }

    const accounts = await this.getActiveAccounts(
      supabase,
      households.map((household) => household.id),
    );
    const accountTotals = await this.calculateAccountTotalsInAccountCurrency(supabase, accounts);

    const accountSnapshotsPayload = accounts.map((account) => ({
      account_id: account.id,
      snapshot_date: snapshotDate,
      total_value: accountTotals.get(account.id) ?? 0,
      cash_balance: 0,
      currency: normalizeIsoCurrency(account.currency, "SEK"),
    }));

    const accountSnapshotsUpserted = await this.upsertAccountSnapshots(supabase, accountSnapshotsPayload);

    const householdById = new Map(households.map((household) => [household.id, household]));
    const householdTotals = new Map<string, NetWorthTotals>();

    for (const household of households) {
      householdTotals.set(household.id, {
        totalAssets: 0,
        totalLiabilities: 0,
        totalNetWorth: 0,
      });
    }

    const needsHouseholdFx = accounts.some((account) => {
      const household = householdById.get(account.household_id);
      if (!household) {
        return false;
      }

      const accountCurrency = normalizeIsoCurrency(account.currency, "SEK");
      const householdCurrency = normalizeIsoCurrency(household.base_currency, "SEK");
      return accountCurrency !== householdCurrency;
    });
    const householdFxSnapshot = await this.fetchFxSnapshotIfNeeded(needsHouseholdFx);

    for (const account of accounts) {
      const household = householdById.get(account.household_id);
      if (!household) {
        continue;
      }

      const totals = householdTotals.get(household.id);
      if (!totals) {
        continue;
      }

      const accountTotal = accountTotals.get(account.id) ?? 0;
      const accountCurrency = normalizeIsoCurrency(account.currency, "SEK");
      const householdCurrency = normalizeIsoCurrency(household.base_currency, "SEK");
      const convertedAccountTotal = this.convertValue(
        accountTotal,
        accountCurrency,
        householdCurrency,
        householdFxSnapshot,
      );
      const signedValue = toSignedAccountValue(convertedAccountTotal, account.account_type);

      addSignedValueToTotals(totals, signedValue);
    }

    const householdSnapshotsPayload = households.map((household) => {
      const totals = householdTotals.get(household.id) ?? {
        totalAssets: 0,
        totalLiabilities: 0,
        totalNetWorth: 0,
      };

      return {
        household_id: household.id,
        snapshot_date: snapshotDate,
        total_net_worth: totals.totalNetWorth,
        total_assets: totals.totalAssets,
        total_liabilities: totals.totalLiabilities,
        currency: normalizeIsoCurrency(household.base_currency, "SEK"),
      };
    });

    const householdSnapshotsUpserted = await this.upsertHouseholdSnapshots(
      supabase,
      householdSnapshotsPayload,
    );

    return {
      snapshotDate,
      householdsProcessed: households.length,
      accountsProcessed: accounts.length,
      accountSnapshotsUpserted,
      householdSnapshotsUpserted,
    };
  }

  private resolveSnapshotDate(snapshotDate?: string): string {
    if (!snapshotDate) {
      return toIsoDate(new Date());
    }

    if (!/^\d{4}-\d{2}-\d{2}$/u.test(snapshotDate)) {
      throw ServiceError.validation("snapshotDate must be an ISO date (YYYY-MM-DD)");
    }

    return snapshotDate;
  }

  private async getActiveHouseholds(supabase: SupabaseClient): Promise<HouseholdRow[]> {
    const { data, error } = await supabase
      .from("households")
      .select("id, base_currency, deleted_at")
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    return (data ?? []) as HouseholdRow[];
  }

  private async getActiveAccounts(
    supabase: SupabaseClient,
    householdIds: string[],
  ): Promise<AccountRow[]> {
    if (householdIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("id, household_id, account_type, currency, is_active, deleted_at")
      .in("household_id", householdIds)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    return (data ?? []) as AccountRow[];
  }

  private async calculateAccountTotalsInAccountCurrency(
    supabase: SupabaseClient,
    accounts: AccountRow[],
  ): Promise<Map<string, number>> {
    const totals = new Map<string, number>();

    for (const account of accounts) {
      totals.set(account.id, 0);
    }

    if (accounts.length === 0) {
      return totals;
    }

    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const accountIds = Array.from(accountById.keys());

    const { data, error } = await supabase
      .from("holdings")
      .select("account_id, market_value, value_currency")
      .in("account_id", accountIds)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as HoldingRow[];
    const needsFx = rows.some((row) => {
      const account = accountById.get(row.account_id);
      if (!account) {
        return false;
      }

      const fromCurrency = normalizeIsoCurrency(row.value_currency, account.currency);
      const toCurrency = normalizeIsoCurrency(account.currency, "SEK");
      return fromCurrency !== toCurrency;
    });
    const fxSnapshot = await this.fetchFxSnapshotIfNeeded(needsFx);

    for (const row of rows) {
      const account = accountById.get(row.account_id);
      if (!account) {
        continue;
      }

      const marketValue = this.toInteger(row.market_value);
      if (marketValue === null) {
        continue;
      }

      const fromCurrency = normalizeIsoCurrency(row.value_currency, account.currency);
      const toCurrency = normalizeIsoCurrency(account.currency, "SEK");
      const convertedValue = this.convertValue(marketValue, fromCurrency, toCurrency, fxSnapshot);
      const currentTotal = totals.get(row.account_id) ?? 0;

      totals.set(row.account_id, currentTotal + convertedValue);
    }

    return totals;
  }

  private async upsertAccountSnapshots(
    supabase: SupabaseClient,
    payload: Array<{
      account_id: string;
      snapshot_date: string;
      total_value: number;
      cash_balance: number;
      currency: string;
    }>,
  ): Promise<number> {
    if (payload.length === 0) {
      return 0;
    }

    let upserted = 0;

    for (const chunk of this.toChunks(payload, chunkSize)) {
      const { data, error } = await supabase
        .from("account_snapshots")
        .upsert(chunk, { onConflict: "account_id,snapshot_date" })
        .select("id");

      if (error) {
        throw error;
      }

      upserted += (data ?? []).length;
    }

    return upserted;
  }

  private async upsertHouseholdSnapshots(
    supabase: SupabaseClient,
    payload: Array<{
      household_id: string;
      snapshot_date: string;
      total_net_worth: number;
      total_assets: number;
      total_liabilities: number;
      currency: string;
    }>,
  ): Promise<number> {
    if (payload.length === 0) {
      return 0;
    }

    let upserted = 0;

    for (const chunk of this.toChunks(payload, chunkSize)) {
      const { data, error } = await supabase
        .from("household_snapshots")
        .upsert(chunk, { onConflict: "household_id,snapshot_date" })
        .select("id");

      if (error) {
        throw error;
      }

      upserted += (data ?? []).length;
    }

    return upserted;
  }

  private toInteger(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private convertValue(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    fxSnapshot: FxRatesSnapshot | null,
  ): number {
    const from = normalizeIsoCurrency(fromCurrency, toCurrency);
    const to = normalizeIsoCurrency(toCurrency, toCurrency);

    if (from === to || !fxSnapshot) {
      return amount;
    }

    try {
      return Math.round(convertFxAmount(amount, fxSnapshot, from, to));
    } catch {
      return amount;
    }
  }

  private async fetchFxSnapshotIfNeeded(needsFx: boolean): Promise<FxRatesSnapshot | null> {
    if (!needsFx) {
      return null;
    }

    try {
      return await fetchEcbFxSnapshot();
    } catch {
      return null;
    }
  }

  private toChunks<T>(items: T[], size: number): T[][] {
    if (items.length === 0) {
      return [];
    }

    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}

export const snapshotService = new SnapshotService();
