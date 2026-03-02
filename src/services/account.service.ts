import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import type { AccountTransactionsQueryInput, CreateAccountInput, UpdateAccountInput } from "@/lib/validations/accounts";
import { convertFxAmount, fetchEcbFxSnapshot, type FxRatesSnapshot } from "@/lib/market-data/fx";
import { ServiceError } from "@/services/errors";
import type {
  AccountDetailView,
  AccountHoldingView,
  AccountSummaryView,
  AccountTransactionType,
  AccountTransactionView,
  AccountTransactionsMeta,
  AccountType,
  AccountVisibility,
  AccountWrapperType,
  HouseholdMemberStatus,
  HouseholdRole,
} from "@/types/domain";

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

interface AccountRow {
  id: string;
  household_id: string;
  owner_user_id: string;
  provider_id: string;
  provider_name: string;
  name: string;
  account_type: AccountType;
  wrapper_type: AccountWrapperType | null;
  currency: string;
  visibility: string;
  last_synced: string | null;
  sync_source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface HoldingAggregateRow {
  account_id: string;
  market_value: number | string | null;
  value_currency: string | null;
}

interface InstrumentRow {
  id: string;
  isin: string | null;
  ticker: string | null;
  name: string;
  asset_class: string;
  currency: string;
}

interface HoldingRow {
  id: string;
  instrument_id: string;
  quantity: number | string;
  average_cost: number | string | null;
  market_value: number | string | null;
  value_currency: string | null;
  as_of_date: string;
  instruments: InstrumentRow | InstrumentRow[] | null;
}

interface TransactionInstrumentRow {
  id: string;
  isin: string | null;
  name: string;
}

interface TransactionRow {
  id: string;
  transaction_date: string;
  type: AccountTransactionType;
  quantity: number | string | null;
  price: number | string | null;
  amount: number | string;
  currency: string;
  instruments: TransactionInstrumentRow | TransactionInstrumentRow[] | null;
}

interface AccountAccessContext {
  account: AccountRow;
  isOwner: boolean;
  canViewAmounts: boolean;
}

interface AccountAggregates {
  holdingsCount: number;
  totalValue: number;
}

const householdWritableRoles: HouseholdRole[] = ["owner", "admin", "member"];

const providerNameById: Record<string, string> = {
  avanza: "Avanza",
  nordnet: "Nordnet",
  seb: "SEB",
  nordea: "Nordea",
  swedbank: "Swedbank",
  handelsbanken: "Handelsbanken",
};

export class AccountService {
  async create(authContext: AuthContext, input: CreateAccountInput): Promise<AccountDetailView> {
    const { supabase, user } = authContext;
    const membership = await this.requireHouseholdMembership(supabase, input.householdId, user.id);

    if (!householdWritableRoles.includes(membership.role)) {
      throw new ServiceError("FORBIDDEN", "You are not allowed to add accounts to this household");
    }

    const providerName = this.resolveProviderName(input.providerId);

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        household_id: input.householdId,
        owner_user_id: user.id,
        provider_id: input.providerId,
        provider_name: providerName,
        name: input.name,
        account_type: input.accountType,
        wrapper_type: input.wrapperType ?? null,
        currency: input.currency,
        visibility: input.visibility,
        sync_source: "manual",
      })
      .select(
        "id, household_id, owner_user_id, provider_id, provider_name, name, account_type, wrapper_type, currency, visibility, last_synced, sync_source, is_active, created_at, updated_at, deleted_at",
      )
      .single();

    if (error) {
      throw error;
    }

    const account = data as AccountRow;
    return {
      ...this.mapAccountSummary(account, {
        holdingsCount: 0,
        totalValue: 0,
      }, authContext.profile.display_name ?? authContext.profile.email, user.id),
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }

  async list(authContext: AuthContext, householdId: string): Promise<AccountSummaryView[]> {
    const { supabase, user } = authContext;
    await this.requireHouseholdMembership(supabase, householdId, user.id);

    const { data, error } = await supabase
      .from("accounts")
      .select(
        "id, household_id, owner_user_id, provider_id, provider_name, name, account_type, wrapper_type, currency, visibility, last_synced, sync_source, is_active, created_at, updated_at, deleted_at",
      )
      .eq("household_id", householdId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const accounts = (data ?? []) as AccountRow[];
    const visibleAccounts = accounts.filter((account) => {
      if (account.owner_user_id === user.id) {
        return true;
      }

      return this.normalizeVisibility(account.visibility) !== "private";
    });

    if (visibleAccounts.length === 0) {
      return [];
    }

    const aggregates = await this.getAccountAggregates(supabase, visibleAccounts);
    const ownerProfiles = await this.getProfilesByUserIds(
      visibleAccounts.map((account) => account.owner_user_id),
    );

    return visibleAccounts.map((account) => {
      const profile = ownerProfiles.get(account.owner_user_id);
      const ownerDisplayName = profile?.display_name ?? profile?.email ?? "Household member";

      return this.mapAccountSummary(
        account,
        aggregates.get(account.id) ?? { holdingsCount: 0, totalValue: 0 },
        ownerDisplayName,
        user.id,
      );
    });
  }

  async getById(authContext: AuthContext, accountId: string): Promise<AccountDetailView> {
    const access = await this.requireAccountReadAccess(authContext, accountId);
    const aggregates = await this.getAccountAggregates(authContext.supabase, [access.account]);
    const ownerProfiles = await this.getProfilesByUserIds([access.account.owner_user_id]);
    const owner = ownerProfiles.get(access.account.owner_user_id);

    const summary = this.mapAccountSummary(
      access.account,
      aggregates.get(access.account.id) ?? { holdingsCount: 0, totalValue: 0 },
      owner?.display_name ?? owner?.email ?? "Household member",
      authContext.user.id,
    );

    return {
      ...summary,
      createdAt: access.account.created_at,
      updatedAt: access.account.updated_at,
    };
  }

  async update(
    authContext: AuthContext,
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountDetailView> {
    const account = await this.requireOwnedAccount(authContext, accountId);

    const updatePayload: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updatePayload.name = input.name;
    }

    if (input.visibility !== undefined) {
      updatePayload.visibility = input.visibility;
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.getById(authContext, account.id);
    }

    const { error } = await authContext.supabase
      .from("accounts")
      .update(updatePayload)
      .eq("id", account.id)
      .eq("owner_user_id", authContext.user.id);

    if (error) {
      throw error;
    }

    return this.getById(authContext, account.id);
  }

  async remove(authContext: AuthContext, accountId: string): Promise<{ id: string; deleted: boolean }> {
    const account = await this.requireOwnedAccount(authContext, accountId);
    const nowIso = new Date().toISOString();

    const { error } = await authContext.supabase
      .from("accounts")
      .update({
        is_active: false,
        deleted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", account.id)
      .eq("owner_user_id", authContext.user.id);

    if (error) {
      throw error;
    }

    return {
      id: account.id,
      deleted: true,
    };
  }

  async getHoldings(authContext: AuthContext, accountId: string): Promise<AccountHoldingView[]> {
    const access = await this.requireAccountReadAccess(authContext, accountId);

    const { data, error } = await authContext.supabase
      .from("holdings")
      .select(
        "id, instrument_id, quantity, average_cost, market_value, value_currency, as_of_date, instruments(id, isin, ticker, name, asset_class, currency)",
      )
      .eq("account_id", access.account.id)
      .is("deleted_at", null)
      .order("as_of_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as HoldingRow[];

    return rows.map((row) => {
      const instrument = this.resolveJoinedRecord(row.instruments);
      const quantity = this.toDecimal(row.quantity) ?? 0;
      const averageCost = access.canViewAmounts ? this.toInteger(row.average_cost) : null;
      const marketValue = access.canViewAmounts ? this.toInteger(row.market_value) : null;

      let unrealizedPnl: number | null = null;
      let unrealizedPnlPct: number | null = null;

      if (averageCost !== null && marketValue !== null) {
        const costBasis = Math.round(averageCost * quantity);
        unrealizedPnl = marketValue - costBasis;
        unrealizedPnlPct = costBasis === 0 ? null : Number(((unrealizedPnl / costBasis) * 100).toFixed(2));
      }

      return {
        id: row.id,
        instrument: {
          id: instrument?.id ?? row.instrument_id,
          isin: instrument?.isin ?? null,
          ticker: instrument?.ticker ?? null,
          name: instrument?.name ?? "Unknown instrument",
          assetClass: instrument?.asset_class ?? "other",
          currency: instrument?.currency ?? access.account.currency,
        },
        quantity,
        averageCost,
        marketValue,
        valueCurrency: row.value_currency ?? access.account.currency,
        unrealizedPnl,
        unrealizedPnlPct,
        asOfDate: row.as_of_date,
      };
    });
  }

  async getTransactions(
    authContext: AuthContext,
    accountId: string,
    queryInput: AccountTransactionsQueryInput,
  ): Promise<{ data: AccountTransactionView[]; meta: AccountTransactionsMeta }> {
    const access = await this.requireAccountReadAccess(authContext, accountId);

    let query = authContext.supabase
      .from("transactions")
      .select(
        "id, transaction_date, type, quantity, price, amount, currency, instruments(id, isin, name)",
        { count: "exact" },
      )
      .eq("account_id", access.account.id)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(queryInput.limit + 1);

    if (queryInput.type.length > 0) {
      query = query.in("type", queryInput.type);
    }

    if (queryInput.from) {
      query = query.gte("transaction_date", queryInput.from);
    }

    if (queryInput.to) {
      query = query.lte("transaction_date", queryInput.to);
    }

    if (queryInput.cursor) {
      query = query.lt("id", queryInput.cursor);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as TransactionRow[];
    const hasMore = rows.length > queryInput.limit;
    const pageRows = hasMore ? rows.slice(0, queryInput.limit) : rows;

    const transactions = pageRows.map((row) => {
      const instrument = this.resolveJoinedRecord(row.instruments);

      return {
        id: row.id,
        transactionDate: row.transaction_date,
        type: row.type,
        instrumentName: instrument?.name ?? null,
        isin: instrument?.isin ?? null,
        quantity: this.toNullableDecimal(row.quantity),
        price: access.canViewAmounts ? this.toInteger(row.price) : null,
        amount: access.canViewAmounts ? this.toInteger(row.amount) : null,
        currency: row.currency,
      } satisfies AccountTransactionView;
    });

    return {
      data: transactions,
      meta: {
        cursor: transactions[transactions.length - 1]?.id ?? null,
        hasMore,
        total: count ?? transactions.length,
      },
    };
  }

  private async requireOwnedAccount(authContext: AuthContext, accountId: string): Promise<AccountRow> {
    const access = await this.requireAccountReadAccess(authContext, accountId);

    if (!access.isOwner) {
      throw new ServiceError("FORBIDDEN", "Only account owners can modify account settings");
    }

    return access.account;
  }

  private async requireAccountReadAccess(
    authContext: AuthContext,
    accountId: string,
  ): Promise<AccountAccessContext> {
    const account = await this.getAccountById(authContext.supabase, accountId);

    if (!account || !account.is_active || account.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Account was not found");
    }

    await this.requireHouseholdMembership(authContext.supabase, account.household_id, authContext.user.id);

    const visibility = this.normalizeVisibility(account.visibility);
    const isOwner = account.owner_user_id === authContext.user.id;

    if (!isOwner && visibility === "private") {
      throw new ServiceError("NOT_FOUND", "Account was not found");
    }

    return {
      account,
      isOwner,
      canViewAmounts: isOwner || visibility === "full",
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

  private async getAccountById(supabase: SupabaseClient, accountId: string): Promise<AccountRow | null> {
    const { data, error } = await supabase
      .from("accounts")
      .select(
        "id, household_id, owner_user_id, provider_id, provider_name, name, account_type, wrapper_type, currency, visibility, last_synced, sync_source, is_active, created_at, updated_at, deleted_at",
      )
      .eq("id", accountId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as AccountRow | null) ?? null;
  }

  private async getAccountAggregates(
    supabase: SupabaseClient,
    accounts: AccountRow[],
  ): Promise<Map<string, AccountAggregates>> {
    const aggregates = new Map<string, AccountAggregates>();
    if (accounts.length === 0) {
      return aggregates;
    }

    for (const account of accounts) {
      aggregates.set(account.id, {
        holdingsCount: 0,
        totalValue: 0,
      });
    }

    const accountIds = accounts.map((account) => account.id);
    const accountById = new Map(accounts.map((account) => [account.id, account]));

    const { data, error } = await supabase
      .from("holdings")
      .select("account_id, market_value, value_currency")
      .in("account_id", accountIds)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    const holdings = (data ?? []) as HoldingAggregateRow[];
    const requiresFx = holdings.some((holding) => {
      const account = accountById.get(holding.account_id);
      if (!account) {
        return false;
      }

      const valueCurrency = (holding.value_currency ?? account.currency).toUpperCase();
      return valueCurrency !== account.currency.toUpperCase();
    });

    let fxSnapshot: FxRatesSnapshot | null = null;
    if (requiresFx) {
      try {
        fxSnapshot = await fetchEcbFxSnapshot();
      } catch {
        fxSnapshot = null;
      }
    }

    for (const holding of holdings) {
      const account = accountById.get(holding.account_id);
      if (!account) {
        continue;
      }

      const next = aggregates.get(holding.account_id);
      if (!next) {
        continue;
      }

      next.holdingsCount += 1;

      const marketValue = this.toInteger(holding.market_value);
      if (marketValue === null) {
        continue;
      }

      const fromCurrency = (holding.value_currency ?? account.currency).toUpperCase();
      const toCurrency = account.currency.toUpperCase();

      if (fromCurrency === toCurrency) {
        next.totalValue += marketValue;
        continue;
      }

      if (!fxSnapshot) {
        next.totalValue += marketValue;
        continue;
      }

      try {
        next.totalValue += Math.round(convertFxAmount(marketValue, fxSnapshot, fromCurrency, toCurrency));
      } catch {
        next.totalValue += marketValue;
      }
    }

    return aggregates;
  }

  private mapAccountSummary(
    account: AccountRow,
    aggregates: AccountAggregates,
    ownerDisplayName: string,
    requestingUserId: string,
  ): AccountSummaryView {
    const visibility = this.normalizeVisibility(account.visibility);
    const isOwn = account.owner_user_id === requestingUserId;
    const canViewAmounts = isOwn || visibility === "full";

    return {
      id: account.id,
      householdId: account.household_id,
      name: account.name,
      providerId: account.provider_id,
      providerName: account.provider_name,
      accountType: account.account_type,
      wrapperType: account.wrapper_type,
      currency: account.currency,
      visibility,
      ownerDisplayName,
      isOwn,
      totalValue: canViewAmounts ? aggregates.totalValue : null,
      holdingsCount: aggregates.holdingsCount,
      lastSynced: account.last_synced,
      syncSource: this.normalizeSyncSource(account.sync_source),
    };
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

  private resolveProviderName(providerId: string): string {
    return providerNameById[providerId.toLowerCase()] ?? providerId;
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

  private normalizeSyncSource(value: string): "manual" | "csv" | "psd2" | "fida" {
    if (value === "csv" || value === "psd2" || value === "fida") {
      return value;
    }

    return "manual";
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

  private toNullableDecimal(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return this.toDecimal(value);
  }

  private toDecimal(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }
}

export const accountService = new AccountService();
