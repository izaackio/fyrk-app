import type { SupabaseClient } from "@supabase/supabase-js";

import {
  addSignedValueToTotals,
  resolveHistoryStartDate,
  toIsoDate,
  toSignedAccountValue,
  type NetWorthTotals,
} from "@/lib/calculations/balance-sheet";
import { calculateAllocation } from "@/lib/calculations/allocation";
import { getAssumptionMetadata, resolveAssumptionSet } from "@/lib/calculations/assumptions";
import { fxRatesFromSnapshot, normalizeCurrencyCode } from "@/lib/calculations/fx";
import { calculateNetWorth } from "@/lib/calculations/net-worth";
import type {
  AllocationHoldingInput,
  NetWorthAccountInput,
  NetWorthHoldingInput,
} from "@/lib/calculations/types";
import type { AuthContext } from "@/lib/auth/middleware";
import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import { fetchEcbFxSnapshot, type FxRatesSnapshot } from "@/lib/market-data/fx";
import { ServiceError } from "@/services/errors";
import type {
  AccountType,
  AccountVisibility,
  BalanceSheetAccountTypeBreakdownView,
  BalanceSheetByAssetClassView,
  BalanceSheetByCurrencyView,
  BalanceSheetByGeographyView,
  BalanceSheetBySectorView,
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
  wrapper_type: string | null;
  currency: string;
  visibility: string;
  last_synced: string | null;
  is_active: boolean;
  deleted_at: string | null;
}

interface InstrumentRow {
  id?: string;
  asset_class: string;
  country: string | null;
  currency: string;
  sector: string | null;
}

interface HoldingRow {
  id: string;
  account_id: string;
  instrument_id: string | null;
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

interface HouseholdSnapshotRow {
  snapshot_date: string;
  total_net_worth: number | string;
  total_assets: number | string;
  total_liabilities: number | string;
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

interface BalanceSheetAccess {
  baseCurrency: string;
  allAccounts: AccountRow[];
  visibleAccounts: VisibleAccount[];
}

interface HistoryBuildResult {
  history: BalanceSheetHistoryView["history"];
  change: BalanceSheetHistoryView["change"];
}

interface BalanceSheetServiceDeps {
  createServiceRoleClient?: () => SupabaseClient;
  fetchFxSnapshot?: () => Promise<FxRatesSnapshot>;
  now?: () => Date;
}

function toPercentage(value: number, total: number, decimals = 1): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const factor = 10 ** Math.max(decimals, 0);
  return Math.round(((value / total) * 100) * factor) / factor;
}

export class BalanceSheetService {
  private readonly createServiceRoleClient: () => SupabaseClient;

  private readonly fetchFxSnapshot: () => Promise<FxRatesSnapshot>;

  private readonly now: () => Date;

  constructor(deps: BalanceSheetServiceDeps = {}) {
    this.createServiceRoleClient = deps.createServiceRoleClient ?? createServiceRoleSupabaseClient;
    this.fetchFxSnapshot = deps.fetchFxSnapshot ?? fetchEcbFxSnapshot;
    this.now = deps.now ?? (() => new Date());
  }

  async getBalanceSheet(authContext: AuthContext, householdId: string): Promise<BalanceSheetView> {
    const access = await this.loadBalanceSheetAccess(authContext, householdId);
    const requestingUserId = authContext.user.id;
    const now = this.now();
    const calculatedAt = now.toISOString();
    const today = toIsoDate(now);

    if (access.visibleAccounts.length === 0) {
      return this.emptyBalanceSheet(access.baseCurrency, today, calculatedAt);
    }

    const viewableAccounts = access.visibleAccounts.filter((entry) => entry.canViewAmounts);
    const accountIds = viewableAccounts.map((entry) => entry.account.id);

    const holdingRows =
      accountIds.length === 0
        ? []
        : await this.listActiveHoldingsByAccountIds(authContext.supabase, accountIds);

    const requiresFx = holdingRows.some((row) => {
      const account = viewableAccounts.find((entry) => entry.account.id === row.account_id)?.account;
      if (!account) {
        return false;
      }

      const fromCurrency = normalizeCurrencyCode(row.value_currency, account.currency);
      return fromCurrency !== access.baseCurrency;
    });

    const fxSnapshot = await this.fetchFxSnapshotIfNeeded(requiresFx);
    const fxRates = fxSnapshot ? fxRatesFromSnapshot(fxSnapshot) : null;

    const holdingsByAccount = new Map<string, NetWorthHoldingInput[]>();
    const allocationHoldings: AllocationHoldingInput[] = [];
    let latestAsOfDate: string | null = null;

    for (const row of holdingRows) {
      const account = viewableAccounts.find((entry) => entry.account.id === row.account_id)?.account;
      if (!account) {
        continue;
      }

      const instrument = this.resolveJoinedRecord(row.instruments);
      const marketValue = this.toInteger(row.market_value);
      const holdingInput: NetWorthHoldingInput = {
        id: row.id,
        instrumentId: row.instrument_id,
        valueMinor: marketValue,
        valueCurrency: row.value_currency,
        assetClass: instrument?.asset_class ?? "other",
        country: instrument?.country ?? "unknown",
        sector: instrument?.sector ?? "unknown",
        asOfDate: row.as_of_date,
        estimated: false,
      };

      if (!holdingsByAccount.has(row.account_id)) {
        holdingsByAccount.set(row.account_id, []);
      }
      holdingsByAccount.get(row.account_id)?.push(holdingInput);

      if (!latestAsOfDate || row.as_of_date > latestAsOfDate) {
        latestAsOfDate = row.as_of_date;
      }

      if (marketValue === null || marketValue <= 0 || this.isLiabilityType(account.account_type)) {
        continue;
      }

      allocationHoldings.push({
        holdingId: row.id,
        memberId: account.owner_user_id,
        valueMinor: marketValue,
        valueCurrency: row.value_currency ?? account.currency,
        assetClass: instrument?.asset_class ?? "other",
        country: instrument?.country ?? "unknown",
        sector: instrument?.sector ?? "unknown",
        name: row.instrument_id ?? row.id,
      });
    }

    const netWorthAccounts: NetWorthAccountInput[] = viewableAccounts.map((entry) => ({
      id: entry.account.id,
      memberId: entry.account.owner_user_id,
      type: entry.account.account_type,
      wrapperType: entry.account.wrapper_type,
      currency: normalizeCurrencyCode(entry.account.currency, access.baseCurrency),
      holdings: holdingsByAccount.get(entry.account.id) ?? [],
      cashBalanceMinor: 0,
      loanBalanceMinor: null,
      lastSyncedAt: entry.account.last_synced,
    }));

    const netWorth = calculateNetWorth({
      accounts: netWorthAccounts,
      baseCurrency: access.baseCurrency,
      fxRates,
      calculatedAt,
    });

    const allocation = calculateAllocation({
      baseCurrency: access.baseCurrency,
      holdings: allocationHoldings,
      fxRates,
      calculatedAt,
    });

    const ownerIds = Array.from(new Set(access.visibleAccounts.map((entry) => entry.account.owner_user_id)));
    const ownerProfiles = await this.getProfilesByUserIds(ownerIds);

    const byMember = ownerIds
      .map((userId) => {
        const memberBreakdown = netWorth.byMember[userId] ?? {
          assets: 0,
          liabilities: 0,
          netWorth: 0,
        };

        return {
          userId,
          displayName:
            ownerProfiles.get(userId)?.display_name ??
            ownerProfiles.get(userId)?.email ??
            (userId === requestingUserId ? authContext.profile.email : "Household member"),
          netWorth: memberBreakdown.netWorth,
          assets: memberBreakdown.assets,
          liabilities: memberBreakdown.liabilities,
        };
      })
      .sort((left, right) => right.netWorth - left.netWorth);

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

    const byAccountType = this.toSortedAccountTypeBreakdown(
      new Map(
        Object.entries(netWorth.byAccountType).map(([type, value]) => [this.normalizeAccountType(type), value]),
      ),
    );

    const byWrapperType = Object.entries(netWorth.byWrapperType)
      .map(([wrapperType, value]) => ({ wrapperType, value }))
      .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));

    const asOfDate = latestAsOfDate ?? today;

    return {
      totalNetWorth: netWorth.totalNetWorth,
      totalAssets: netWorth.totalAssets,
      totalLiabilities: netWorth.totalLiabilities,
      currency: access.baseCurrency,
      asOfDate,
      byMember,
      byAccountType,
      byWrapperType,
      liquidAssets: netWorth.liquidAssets,
      illiquidAssets: netWorth.illiquidAssets,
      allocation: {
        byAssetClass: allocation.byAssetClass.map<BalanceSheetByAssetClassView>((entry) => {
          const row: BalanceSheetByAssetClassView = {
            class: entry.category,
            value: entry.value,
            pct: toPercentage(entry.value, allocation.totalValue, 1),
            percentage: entry.percentage,
          };

          if (entry.memberBreakdown) {
            row.memberBreakdown = entry.memberBreakdown;
          }

          return row;
        }),
        byGeography: allocation.byGeography.map<BalanceSheetByGeographyView>((entry) => {
          const row: BalanceSheetByGeographyView = {
            country: entry.category,
            value: entry.value,
            pct: toPercentage(entry.value, allocation.totalValue, 1),
            percentage: entry.percentage,
          };

          if (entry.memberBreakdown) {
            row.memberBreakdown = entry.memberBreakdown;
          }

          return row;
        }),
        byCurrency: allocation.byCurrency.map<BalanceSheetByCurrencyView>((entry) => {
          const row: BalanceSheetByCurrencyView = {
            currency: entry.category,
            value: entry.value,
            pct: toPercentage(entry.value, allocation.totalValue, 1),
            percentage: entry.percentage,
          };

          if (entry.memberBreakdown) {
            row.memberBreakdown = entry.memberBreakdown;
          }

          return row;
        }),
        bySector: allocation.bySector.map<BalanceSheetBySectorView>((entry) => {
          const row: BalanceSheetBySectorView = {
            sector: entry.category,
            value: entry.value,
            pct: toPercentage(entry.value, allocation.totalValue, 1),
            percentage: entry.percentage,
          };

          if (entry.memberBreakdown) {
            row.memberBreakdown = entry.memberBreakdown;
          }

          return row;
        }),
      },
      concentrationRisks: allocation.concentrationRisks,
      dataQuality: {
        coveragePct: Math.round(netWorth.dataQuality.coveragePercent),
        staleAccounts: netWorth.dataQuality.staleAccountIds.length,
        lastFullUpdate,
        score: netWorth.dataQuality.score,
        coveragePercent: netWorth.dataQuality.coveragePercent,
        staleAccountIds: netWorth.dataQuality.staleAccountIds,
        missingPrices: netWorth.dataQuality.missingPrices,
        estimatedValues: netWorth.dataQuality.estimatedValues,
        missingValuationAccountIds: netWorth.dataQuality.missingValuationAccountIds,
        staleFxRates: netWorth.dataQuality.staleFxRates,
      },
      metadata: {
        calculatedAt,
        assumptions: netWorth.metadata.assumptions,
        fx: {
          source: fxSnapshot?.source ?? "none",
          asOfDate: fxSnapshot?.asOfDate ?? null,
          stale: fxSnapshot?.stale ?? false,
        },
        deterministicPayload: {
          netWorth: {
            totalNetWorth: netWorth.totalNetWorth,
            totalAssets: netWorth.totalAssets,
            totalLiabilities: netWorth.totalLiabilities,
            byMember: netWorth.byMember,
            byAccountType: netWorth.byAccountType,
            byWrapperType: netWorth.byWrapperType,
            liquidAssets: netWorth.liquidAssets,
            illiquidAssets: netWorth.illiquidAssets,
          },
          allocation: {
            byAssetClass: allocation.byAssetClass,
            byGeography: allocation.byGeography,
            byCurrency: allocation.byCurrency,
            bySector: allocation.bySector,
            concentrationRisks: allocation.concentrationRisks,
          },
          dataQuality: netWorth.dataQuality,
        },
      },
    };
  }

  async getHistory(
    authContext: AuthContext,
    input: { householdId: string; period: BalanceSheetHistoryPeriod },
  ): Promise<BalanceSheetHistoryView> {
    const access = await this.loadBalanceSheetAccess(authContext, input.householdId);
    const viewableAccounts = access.visibleAccounts.filter((entry) => entry.canViewAmounts);
    const calculatedAt = this.now().toISOString();
    const assumptions = getAssumptionMetadata(resolveAssumptionSet());

    if (viewableAccounts.length === 0) {
      return {
        period: input.period,
        currency: access.baseCurrency,
        history: [],
        change: {
          amount: 0,
          pct: null,
        },
        metadata: {
          calculatedAt,
          assumptions,
          source: "account_snapshots",
          fallbackReason: "no_viewable_accounts",
        },
      };
    }

    const startDate = resolveHistoryStartDate(input.period, this.now());
    const useHouseholdSnapshots = this.canUseHouseholdSnapshots(access);

    if (useHouseholdSnapshots) {
      const householdRows = await this.tryFetchHouseholdSnapshotHistory(
        authContext.supabase,
        input.householdId,
        startDate,
      );

      if (householdRows.rows.length > 0) {
        const history = await this.buildHistoryFromHouseholdSnapshots(
          householdRows.rows,
          access.baseCurrency,
        );

        return {
          period: input.period,
          currency: access.baseCurrency,
          history: history.history,
          change: history.change,
          metadata: {
            calculatedAt,
            assumptions,
            source: "household_snapshots",
            fallbackReason: null,
          },
        };
      }

      if (!householdRows.error) {
        const fallback = await this.buildHistoryFromAccountSnapshots(
          authContext.supabase,
          viewableAccounts,
          access.baseCurrency,
          startDate,
        );

        return {
          period: input.period,
          currency: access.baseCurrency,
          history: fallback.history,
          change: fallback.change,
          metadata: {
            calculatedAt,
            assumptions,
            source: "account_snapshots",
            fallbackReason: "household_snapshots_empty",
          },
        };
      }
    }

    const fallback = await this.buildHistoryFromAccountSnapshots(
      authContext.supabase,
      viewableAccounts,
      access.baseCurrency,
      startDate,
    );

    return {
      period: input.period,
      currency: access.baseCurrency,
      history: fallback.history,
      change: fallback.change,
      metadata: {
        calculatedAt,
        assumptions,
        source: "account_snapshots",
        fallbackReason: useHouseholdSnapshots ? "household_snapshots_unavailable" : "visibility_restricted",
      },
    };
  }

  private canUseHouseholdSnapshots(access: BalanceSheetAccess): boolean {
    if (access.visibleAccounts.length !== access.allAccounts.length) {
      return false;
    }

    return access.visibleAccounts.every((entry) => entry.canViewAmounts);
  }

  private async tryFetchHouseholdSnapshotHistory(
    supabase: SupabaseClient,
    householdId: string,
    startDate: string | null,
  ): Promise<{ rows: HouseholdSnapshotRow[]; error: unknown | null }> {
    let query = supabase
      .from("household_snapshots")
      .select("snapshot_date, total_net_worth, total_assets, total_liabilities, currency")
      .eq("household_id", householdId)
      .order("snapshot_date", { ascending: true });

    if (startDate) {
      query = query.gte("snapshot_date", startDate);
    }

    try {
      const { data, error } = await query;
      if (error) {
        return {
          rows: [],
          error,
        };
      }

      return {
        rows: (data ?? []) as HouseholdSnapshotRow[],
        error: null,
      };
    } catch (error) {
      return {
        rows: [],
        error,
      };
    }
  }

  private async buildHistoryFromHouseholdSnapshots(
    rows: HouseholdSnapshotRow[],
    baseCurrency: string,
  ): Promise<HistoryBuildResult> {
    if (rows.length === 0) {
      return {
        history: [],
        change: {
          amount: 0,
          pct: null,
        },
      };
    }

    const requiresFx = rows.some((row) => normalizeCurrencyCode(row.currency, baseCurrency) !== baseCurrency);
    const fxSnapshot = await this.fetchFxSnapshotIfNeeded(requiresFx);
    const fxRates = fxSnapshot ? fxRatesFromSnapshot(fxSnapshot) : null;

    const history = rows
      .map((row) => {
        const currency = normalizeCurrencyCode(row.currency, baseCurrency);
        const totals = {
          netWorth: this.toInteger(row.total_net_worth) ?? 0,
          assets: this.toInteger(row.total_assets) ?? 0,
          liabilities: this.toInteger(row.total_liabilities) ?? 0,
        };

        if (currency === baseCurrency || !fxRates) {
          return {
            date: row.snapshot_date,
            netWorth: totals.netWorth,
            assets: totals.assets,
            liabilities: totals.liabilities,
          };
        }

        return {
          date: row.snapshot_date,
          netWorth: this.convertValue(totals.netWorth, currency, baseCurrency, fxRates),
          assets: this.convertValue(totals.assets, currency, baseCurrency, fxRates),
          liabilities: this.convertValue(totals.liabilities, currency, baseCurrency, fxRates),
        };
      })
      .sort((left, right) => left.date.localeCompare(right.date));

    return this.buildHistoryOutput(history);
  }

  private async buildHistoryFromAccountSnapshots(
    supabase: SupabaseClient,
    viewableAccounts: VisibleAccount[],
    baseCurrency: string,
    startDate: string | null,
  ): Promise<HistoryBuildResult> {
    const accountMap = new Map(viewableAccounts.map((entry) => [entry.account.id, entry.account]));
    const accountIds = Array.from(accountMap.keys());

    let query = supabase
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
      const account = accountMap.get(row.account_id);
      if (!account) {
        return false;
      }

      const rowCurrency = normalizeCurrencyCode(row.currency, account.currency);
      return rowCurrency !== baseCurrency;
    });

    const fxSnapshot = await this.fetchFxSnapshotIfNeeded(requiresFx);
    const fxRates = fxSnapshot ? fxRatesFromSnapshot(fxSnapshot) : null;

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

      const rowCurrency = normalizeCurrencyCode(row.currency, account.currency);
      const convertedValue = this.convertValue(totalValue, rowCurrency, baseCurrency, fxRates);
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

    return this.buildHistoryOutput(history);
  }

  private buildHistoryOutput(history: BalanceSheetHistoryView["history"]): HistoryBuildResult {
    const first = history[0];
    const last = history[history.length - 1];

    if (!first || !last) {
      return {
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
  ): Promise<BalanceSheetAccess> {
    await this.requireHouseholdMembership(authContext.supabase, householdId, authContext.user.id);
    const household = await this.getHouseholdById(authContext.supabase, householdId);

    if (!household || household.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Household was not found");
    }

    const allAccounts = await this.listActiveHouseholdAccounts(authContext.supabase, householdId);
    const visibleAccounts = allAccounts
      .map((account) => this.resolveVisibleAccount(account, authContext.user.id))
      .filter((entry): entry is VisibleAccount => entry !== null);

    return {
      baseCurrency: normalizeCurrencyCode(household.base_currency, authContext.profile.base_currency),
      allAccounts,
      visibleAccounts,
    };
  }

  private async listActiveHoldingsByAccountIds(
    supabase: SupabaseClient,
    accountIds: string[],
  ): Promise<HoldingRow[]> {
    const { data, error } = await supabase
      .from("holdings")
      .select(
        "id, account_id, instrument_id, market_value, value_currency, as_of_date, instruments(id, asset_class, country, currency, sector)",
      )
      .in("account_id", accountIds)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    return (data ?? []) as HoldingRow[];
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
      .select(
        "id, household_id, owner_user_id, account_type, wrapper_type, currency, visibility, last_synced, is_active, deleted_at",
      )
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

  private emptyBalanceSheet(currency: string, asOfDate: string, calculatedAt: string): BalanceSheetView {
    const assumptions = getAssumptionMetadata(resolveAssumptionSet());

    return {
      totalNetWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      currency,
      asOfDate,
      byMember: [],
      byAccountType: [],
      byWrapperType: [],
      liquidAssets: 0,
      illiquidAssets: 0,
      allocation: {
        byAssetClass: [],
        byGeography: [],
        byCurrency: [],
        bySector: [],
      },
      concentrationRisks: [],
      dataQuality: {
        coveragePct: 100,
        staleAccounts: 0,
        lastFullUpdate: null,
        score: "high",
        coveragePercent: 100,
        staleAccountIds: [],
        missingPrices: [],
        estimatedValues: [],
        missingValuationAccountIds: [],
        staleFxRates: false,
      },
      metadata: {
        calculatedAt,
        assumptions,
        fx: {
          source: "none",
          asOfDate: null,
          stale: false,
        },
        deterministicPayload: {
          netWorth: {
            totalNetWorth: 0,
            totalAssets: 0,
            totalLiabilities: 0,
            byMember: {},
            byAccountType: {},
            byWrapperType: {},
            liquidAssets: 0,
            illiquidAssets: 0,
          },
          allocation: {
            byAssetClass: [],
            byGeography: [],
            byCurrency: [],
            bySector: [],
            concentrationRisks: [],
          },
          dataQuality: {
            score: "high",
            coveragePercent: 100,
            staleAccountIds: [],
            missingPrices: [],
            estimatedValues: [],
            missingValuationAccountIds: [],
            staleFxRates: false,
          },
        },
      },
    };
  }

  private async getProfilesByUserIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const result = new Map<string, ProfileRow>();

    if (uniqueIds.length === 0) {
      return result;
    }

    const serviceRoleClient = this.createServiceRoleClient();
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

  private convertValue(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    fxRates: ReturnType<typeof fxRatesFromSnapshot> | null,
  ): number {
    const from = normalizeCurrencyCode(fromCurrency, toCurrency);
    const to = normalizeCurrencyCode(toCurrency, toCurrency);

    if (from === to || !fxRates) {
      return amount;
    }

    try {
      const fromRate = from === fxRates.baseCurrency ? 1 : fxRates.rates[from];
      const toRate = to === fxRates.baseCurrency ? 1 : fxRates.rates[to];
      if (!fromRate || !toRate) {
        return amount;
      }

      return Math.round(amount * (toRate / fromRate));
    } catch {
      return amount;
    }
  }

  private async fetchFxSnapshotIfNeeded(needsFx: boolean): Promise<FxRatesSnapshot | null> {
    if (!needsFx) {
      return null;
    }

    try {
      return await this.fetchFxSnapshot();
    } catch {
      return null;
    }
  }
}

export const balanceSheetService = new BalanceSheetService();
