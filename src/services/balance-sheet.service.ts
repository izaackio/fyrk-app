import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import {
  addSignedValueToTotals,
  buildAllocationRows,
  normalizeIsoCurrency,
  resolveHistoryStartDate,
  toIsoDate,
  toSignedAccountValue,
  type NetWorthTotals,
} from "@/lib/calculations/balance-sheet";
import { convertFxAmount, fetchEcbFxSnapshot, type FxRatesSnapshot } from "@/lib/market-data/fx";
import { ServiceError } from "@/services/errors";
import type {
  AccountType,
  AccountVisibility,
  BalanceSheetAccountTypeBreakdownView,
  BalanceSheetHistoryPeriod,
  BalanceSheetHistoryView,
  BalanceSheetView,
  HouseholdMemberStatus,
  HouseholdRole,
} from "@/types/domain";
import { accountTypes } from "@/types/domain";

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

interface HouseholdRow {
  id: string;
  base_currency: string;
  deleted_at: string | null;
}

interface AccountRow {
  id: string;
  household_id: string;
  owner_user_id: string;
  account_type: string;
  currency: string;
  visibility: string;
  last_synced: string | null;
  is_active: boolean;
  deleted_at: string | null;
}

interface InstrumentRow {
  asset_class: string;
  country: string | null;
  currency: string;
  sector: string | null;
}

interface HoldingRow {
  account_id: string;
  market_value: number | string | null;
  value_currency: string | null;
  as_of_date: string;
  instruments: InstrumentRow | InstrumentRow[] | null;
}

interface AccountSnapshotRow {
  account_id: string;
  snapshot_date: string;
  total_value: number | string | null;
  currency: string;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface VisibleAccount {
  account: AccountRow;
  visibility: AccountVisibility;
  canViewAmounts: boolean;
}

interface HoldingsAggregation {
  accountTotals: Map<string, number>;
  accountsWithValuation: Set<string>;
  latestAsOfDate: string | null;
  allocationByAssetClass: Map<string, number>;
  allocationByGeography: Map<string, number>;
  allocationByCurrency: Map<string, number>;
  allocationBySector: Map<string, number>;
  allocationTotal: number;
}

const staleThresholdMs = 7 * 24 * 60 * 60 * 1000;

export class BalanceSheetService {
  async getBalanceSheet(authContext: AuthContext, householdId: string): Promise<BalanceSheetView> {
    const { baseCurrency, visibleAccounts } = await this.loadBalanceSheetAccess(authContext, householdId);
    const requestingUserId = authContext.user.id;
    const today = toIsoDate(new Date());

    if (visibleAccounts.length === 0) {
      return this.emptyBalanceSheet(baseCurrency, today);
    }

    const viewableAccounts = visibleAccounts.filter((entry) => entry.canViewAmounts);
    const holdings = await this.aggregateHoldings(viewableAccounts, baseCurrency, authContext.supabase);
    const totals: NetWorthTotals = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalNetWorth: 0,
    };
    const byAccountType = new Map<AccountType | "other", number>();
    const byMember = new Map<string, number>();

    for (const visibleAccount of visibleAccounts) {
      const ownerId = visibleAccount.account.owner_user_id;
      if (!byMember.has(ownerId)) {
        byMember.set(ownerId, 0);
      }

      if (!visibleAccount.canViewAmounts) {
        continue;
      }

      const accountTotal = holdings.accountTotals.get(visibleAccount.account.id) ?? 0;
      const signedValue = toSignedAccountValue(accountTotal, visibleAccount.account.account_type);
      const normalizedType = this.normalizeAccountType(visibleAccount.account.account_type);
      const currentTypeTotal = byAccountType.get(normalizedType) ?? 0;

      byAccountType.set(normalizedType, currentTypeTotal + signedValue);
      byMember.set(ownerId, (byMember.get(ownerId) ?? 0) + signedValue);
      addSignedValueToTotals(totals, signedValue);
    }

    const ownerProfiles = await this.getProfilesByUserIds(Array.from(byMember.keys()));

    const visibleAccountsCount = visibleAccounts.length;
    const coveredAccountsCount = visibleAccounts.reduce((count, account) => {
      if (!account.canViewAmounts) {
        return count + 1;
      }

      return holdings.accountsWithValuation.has(account.account.id) ? count + 1 : count;
    }, 0);

    const coveragePct =
      visibleAccountsCount === 0
        ? 100
        : Math.round((coveredAccountsCount / visibleAccountsCount) * 100);

    const staleAccounts = visibleAccounts.filter((entry) => this.isAccountStale(entry.account.last_synced)).length;

    const viewableSyncedAt = viewableAccounts
      .map((entry) => entry.account.last_synced)
      .filter((value): value is string => typeof value === "string");
    const hasMissingSyncAt = viewableAccounts.some((entry) => !entry.account.last_synced);
    const lastFullUpdate =
      viewableAccounts.length === 0 || hasMissingSyncAt || viewableSyncedAt.length === 0
        ? null
        : viewableSyncedAt.reduce((oldest, current) =>
            Date.parse(current) < Date.parse(oldest) ? current : oldest,
          );

    const byAssetClassRows = buildAllocationRows(holdings.allocationByAssetClass, holdings.allocationTotal).map(
      (entry) => ({
        class: entry.label,
        value: entry.value,
        pct: entry.pct,
      }),
    );

    const byGeographyRows = buildAllocationRows(holdings.allocationByGeography, holdings.allocationTotal).map(
      (entry) => ({
        country: entry.label,
        value: entry.value,
        pct: entry.pct,
      }),
    );

    const byCurrencyRows = buildAllocationRows(holdings.allocationByCurrency, holdings.allocationTotal).map(
      (entry) => ({
        currency: entry.label,
        value: entry.value,
        pct: entry.pct,
      }),
    );

    const bySectorRows = buildAllocationRows(holdings.allocationBySector, holdings.allocationTotal).map((entry) => ({
      sector: entry.label,
      value: entry.value,
      pct: entry.pct,
    }));

    return {
      totalNetWorth: totals.totalNetWorth,
      totalAssets: totals.totalAssets,
      totalLiabilities: totals.totalLiabilities,
      currency: baseCurrency,
      asOfDate: holdings.latestAsOfDate ?? today,
      byMember: Array.from(byMember.entries())
        .map(([userId, netWorth]) => ({
          userId,
          displayName:
            ownerProfiles.get(userId)?.display_name ??
            ownerProfiles.get(userId)?.email ??
            (userId === requestingUserId ? authContext.profile.email : "Household member"),
          netWorth,
        }))
        .sort((left, right) => right.netWorth - left.netWorth),
      byAccountType: this.toSortedAccountTypeBreakdown(byAccountType),
      allocation: {
        byAssetClass: byAssetClassRows,
        byGeography: byGeographyRows,
        byCurrency: byCurrencyRows,
        bySector: bySectorRows,
      },
      dataQuality: {
        coveragePct,
        staleAccounts,
        lastFullUpdate,
      },
    };
  }

  async getHistory(
    authContext: AuthContext,
    input: { householdId: string; period: BalanceSheetHistoryPeriod },
  ): Promise<BalanceSheetHistoryView> {
    const { baseCurrency, visibleAccounts } = await this.loadBalanceSheetAccess(authContext, input.householdId);
    const viewableAccounts = visibleAccounts.filter((entry) => entry.canViewAmounts);

    if (viewableAccounts.length === 0) {
      return {
        period: input.period,
        currency: baseCurrency,
        history: [],
        change: {
          amount: 0,
          pct: null,
        },
      };
    }

    const accountMap = new Map(viewableAccounts.map((entry) => [entry.account.id, entry.account]));
    const accountIds = Array.from(accountMap.keys());
    const startDate = resolveHistoryStartDate(input.period);

    let query = authContext.supabase
      .from("account_snapshots")
      .select("account_id, snapshot_date, total_value, currency")
      .in("account_id", accountIds)
      .order("snapshot_date", { ascending: true });

    if (startDate) {
      query = query.gte("snapshot_date", startDate);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const rows = (data ?? []) as AccountSnapshotRow[];
    const requiresFx = rows.some((row) => {
      const rowCurrency = normalizeIsoCurrency(row.currency, baseCurrency);
      return rowCurrency !== baseCurrency;
    });
    const fxSnapshot = await this.fetchFxSnapshotIfNeeded(requiresFx);

    const totalsByDate = new Map<string, NetWorthTotals>();

    for (const row of rows) {
      const account = accountMap.get(row.account_id);
      if (!account) {
        continue;
      }

      const totalValue = this.toInteger(row.total_value);
      if (totalValue === null) {
        continue;
      }

      const rowCurrency = normalizeIsoCurrency(row.currency, account.currency);
      const convertedValue = this.convertValue(totalValue, rowCurrency, baseCurrency, fxSnapshot);
      const signedValue = toSignedAccountValue(convertedValue, account.account_type);
      const existingTotals = totalsByDate.get(row.snapshot_date) ?? {
        totalAssets: 0,
        totalLiabilities: 0,
        totalNetWorth: 0,
      };

      addSignedValueToTotals(existingTotals, signedValue);
      totalsByDate.set(row.snapshot_date, existingTotals);
    }

    const history = Array.from(totalsByDate.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, totals]) => ({
        date,
        netWorth: totals.totalNetWorth,
        assets: totals.totalAssets,
        liabilities: totals.totalLiabilities,
      }));

    const first = history[0];
    const last = history[history.length - 1];

    if (!first || !last) {
      return {
        period: input.period,
        currency: baseCurrency,
        history: [],
        change: {
          amount: 0,
          pct: null,
        },
      };
    }

    const amount = last.netWorth - first.netWorth;
    const pct =
      first.netWorth === 0
        ? null
        : Number(((amount / Math.abs(first.netWorth)) * 100).toFixed(2));

    return {
      period: input.period,
      currency: baseCurrency,
      history,
      change: {
        amount,
        pct,
      },
    };
  }

  private async loadBalanceSheetAccess(
    authContext: AuthContext,
    householdId: string,
  ): Promise<{ baseCurrency: string; visibleAccounts: VisibleAccount[] }> {
    await this.requireHouseholdMembership(authContext.supabase, householdId, authContext.user.id);
    const household = await this.getHouseholdById(authContext.supabase, householdId);

    if (!household || household.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Household was not found");
    }

    const accounts = await this.listActiveHouseholdAccounts(authContext.supabase, householdId);
    const visibleAccounts = accounts
      .map((account) => this.resolveVisibleAccount(account, authContext.user.id))
      .filter((entry): entry is VisibleAccount => entry !== null);

    return {
      baseCurrency: normalizeIsoCurrency(household.base_currency, authContext.profile.base_currency),
      visibleAccounts,
    };
  }

  private async aggregateHoldings(
    accounts: VisibleAccount[],
    baseCurrency: string,
    supabase: SupabaseClient,
  ): Promise<HoldingsAggregation> {
    const accountTotals = new Map<string, number>();
    const accountsWithValuation = new Set<string>();
    const allocationByAssetClass = new Map<string, number>();
    const allocationByGeography = new Map<string, number>();
    const allocationByCurrency = new Map<string, number>();
    const allocationBySector = new Map<string, number>();

    if (accounts.length === 0) {
      return {
        accountTotals,
        accountsWithValuation,
        latestAsOfDate: null,
        allocationByAssetClass,
        allocationByGeography,
        allocationByCurrency,
        allocationBySector,
        allocationTotal: 0,
      };
    }

    for (const account of accounts) {
      accountTotals.set(account.account.id, 0);
    }

    const accountById = new Map(accounts.map((entry) => [entry.account.id, entry.account]));
    const accountIds = Array.from(accountById.keys());

    const { data, error } = await supabase
      .from("holdings")
      .select("account_id, market_value, value_currency, as_of_date, instruments(asset_class, country, currency, sector)")
      .in("account_id", accountIds)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as HoldingRow[];
    const requiresFx = rows.some((row) => {
      const account = accountById.get(row.account_id);
      if (!account) {
        return false;
      }

      const fromCurrency = normalizeIsoCurrency(row.value_currency, account.currency);
      return fromCurrency !== baseCurrency;
    });
    const fxSnapshot = await this.fetchFxSnapshotIfNeeded(requiresFx);

    let latestAsOfDate: string | null = null;
    let allocationTotal = 0;

    for (const row of rows) {
      const account = accountById.get(row.account_id);
      if (!account) {
        continue;
      }

      const marketValue = this.toInteger(row.market_value);
      if (marketValue === null) {
        continue;
      }

      const instrument = this.resolveJoinedRecord(row.instruments);
      const fromCurrency = normalizeIsoCurrency(row.value_currency ?? instrument?.currency, account.currency);
      const convertedValue = this.convertValue(marketValue, fromCurrency, baseCurrency, fxSnapshot);
      const currentTotal = accountTotals.get(row.account_id) ?? 0;

      accountTotals.set(row.account_id, currentTotal + convertedValue);
      accountsWithValuation.add(row.account_id);

      if (!latestAsOfDate || row.as_of_date > latestAsOfDate) {
        latestAsOfDate = row.as_of_date;
      }

      if (convertedValue <= 0) {
        continue;
      }

      if (this.isLiabilityType(account.account_type)) {
        continue;
      }

      allocationTotal += convertedValue;
      this.incrementMap(allocationByAssetClass, instrument?.asset_class ?? "other", convertedValue);
      this.incrementMap(allocationByGeography, (instrument?.country ?? "unknown").toUpperCase(), convertedValue);
      this.incrementMap(allocationByCurrency, fromCurrency, convertedValue);
      this.incrementMap(allocationBySector, instrument?.sector ?? "unknown", convertedValue);
    }

    return {
      accountTotals,
      accountsWithValuation,
      latestAsOfDate,
      allocationByAssetClass,
      allocationByGeography,
      allocationByCurrency,
      allocationBySector,
      allocationTotal,
    };
  }

  private async requireHouseholdMembership(
    supabase: SupabaseClient,
    householdId: string,
    userId: string,
  ): Promise<HouseholdMemberRow> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.status !== "active") {
      throw new ServiceError("FORBIDDEN", "You are not a member of this household");
    }

    return data as HouseholdMemberRow;
  }

  private async getHouseholdById(
    supabase: SupabaseClient,
    householdId: string,
  ): Promise<HouseholdRow | null> {
    const { data, error } = await supabase
      .from("households")
      .select("id, base_currency, deleted_at")
      .eq("id", householdId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as HouseholdRow | null) ?? null;
  }

  private async listActiveHouseholdAccounts(
    supabase: SupabaseClient,
    householdId: string,
  ): Promise<AccountRow[]> {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, household_id, owner_user_id, account_type, currency, visibility, last_synced, is_active, deleted_at")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    return (data ?? []) as AccountRow[];
  }

  private resolveVisibleAccount(account: AccountRow, requestingUserId: string): VisibleAccount | null {
    const visibility = this.normalizeVisibility(account.visibility);
    const isOwner = account.owner_user_id === requestingUserId;

    if (!isOwner && visibility === "private") {
      return null;
    }

    return {
      account,
      visibility,
      canViewAmounts: isOwner || visibility === "full",
    };
  }

  private normalizeVisibility(visibility: string): AccountVisibility {
    if (visibility === "hidden") {
      return "amount_hidden";
    }

    if (visibility === "full" || visibility === "amount_hidden" || visibility === "private") {
      return visibility;
    }

    return "private";
  }

  private normalizeAccountType(accountType: string): AccountType | "other" {
    if ((accountTypes as readonly string[]).includes(accountType)) {
      return accountType as AccountType;
    }

    return "other";
  }

  private isLiabilityType(accountType: string): boolean {
    return accountType === "loan" || accountType === "mortgage";
  }

  private toSortedAccountTypeBreakdown(
    byAccountType: Map<AccountType | "other", number>,
  ): BalanceSheetAccountTypeBreakdownView[] {
    return Array.from(byAccountType.entries())
      .map(([type, value]) => ({ type, value }))
      .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
  }

  private emptyBalanceSheet(currency: string, asOfDate: string): BalanceSheetView {
    return {
      totalNetWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      currency,
      asOfDate,
      byMember: [],
      byAccountType: [],
      allocation: {
        byAssetClass: [],
        byGeography: [],
        byCurrency: [],
        bySector: [],
      },
      dataQuality: {
        coveragePct: 100,
        staleAccounts: 0,
        lastFullUpdate: null,
      },
    };
  }

  private isAccountStale(lastSynced: string | null): boolean {
    if (!lastSynced) {
      return true;
    }

    const lastSyncedMs = Date.parse(lastSynced);
    if (!Number.isFinite(lastSyncedMs)) {
      return true;
    }

    return Date.now() - lastSyncedMs > staleThresholdMs;
  }

  private async getProfilesByUserIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const result = new Map<string, ProfileRow>();

    if (uniqueIds.length === 0) {
      return result;
    }

    const serviceRoleClient = createServiceRoleSupabaseClient();
    const { data, error } = await serviceRoleClient
      .from("profiles")
      .select("id, email, display_name")
      .in("id", uniqueIds);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as ProfileRow[]) {
      result.set(row.id, row);
    }

    return result;
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

  private resolveJoinedRecord<T>(value: T | T[] | null): T | null {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value;
  }

  private incrementMap(map: Map<string, number>, key: string, value: number): void {
    map.set(key, (map.get(key) ?? 0) + value);
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
}

export const balanceSheetService = new BalanceSheetService();
