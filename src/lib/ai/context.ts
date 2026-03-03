import type { AuthContext } from "@/lib/auth/middleware";
import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import { ServiceError } from "@/services/errors";
import type { HouseholdRole, HouseholdMemberStatus } from "@/types/domain";

interface HouseholdRow {
  id: string;
  name: string;
  base_currency: string;
  deleted_at: string | null;
}

interface HouseholdMemberRow {
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
  invited_email: string | null;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface AccountRow {
  id: string;
  account_type: string;
  wrapper_type: string | null;
  provider_name: string;
  name: string;
  currency: string;
  is_active: boolean;
  deleted_at: string | null;
}

interface SnapshotRow {
  snapshot_date: string;
  total_net_worth: number | string;
  total_assets: number | string;
  total_liabilities: number | string;
  currency: string;
}

interface TransactionRow {
  id: string;
  type: string;
  amount: number | string;
  currency: string;
  transaction_date: string;
  description: string | null;
}

export interface WeeklyNarrativeMemberContext {
  displayName: string;
  role: HouseholdRole;
}

export interface WeeklyNarrativeAccountContext {
  name: string;
  accountType: string;
  wrapperType: string | null;
  provider: string;
  currency: string;
}

export interface WeeklyNarrativeContext {
  asOfWeek: string;
  household: {
    id: string;
    name: string;
    baseCurrency: string;
    memberCount: number;
    members: WeeklyNarrativeMemberContext[];
  };
  financials: {
    totalNetWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    currency: string;
  };
  recentChanges: {
    periodStart: string;
    periodEnd: string;
    asOfDate: string;
    previousNetWorth: number | null;
    netWorthChange: number;
    netWorthChangePct: number | null;
    newTransactions: number;
    significantEvents: string[];
  };
  accounts: {
    totalCount: number;
    byType: Record<string, number>;
    sample: WeeklyNarrativeAccountContext[];
  };
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getCurrentIsoWeekStart(today = new Date()): string {
  const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const day = utcDate.getUTCDay();
  const offset = (day + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - offset);
  return toIsoDate(utcDate);
}

function toInt(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function summarizeTransaction(row: TransactionRow): string {
  const amount = Math.abs(toInt(row.amount));
  const currency = row.currency?.toUpperCase() || "SEK";
  const label = row.type.replace(/_/gu, " ");

  return `${label} ${formatMinorAmount(amount)} ${currency} on ${row.transaction_date}`;
}

function formatMinorAmount(minorUnits: number): string {
  const sign = minorUnits < 0 ? "-" : "";
  const whole = Math.trunc(Math.abs(minorUnits) / 100);
  return `${sign}${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, " ")}`;
}

async function getDisplayNamesByUserId(userIds: string[]): Promise<Map<string, string>> {
  const output = new Map<string, string>();
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return output;
  }

  try {
    const serviceRoleClient = createServiceRoleSupabaseClient();
    const { data, error } = await serviceRoleClient
      .from("profiles")
      .select("id, email, display_name")
      .in("id", uniqueUserIds);

    if (error) {
      return output;
    }

    for (const row of (data ?? []) as ProfileRow[]) {
      output.set(row.id, row.display_name ?? row.email ?? "Household member");
    }
  } catch {
    return output;
  }

  return output;
}

async function requireHouseholdMembership(authContext: AuthContext, householdId: string): Promise<void> {
  const { data, error } = await authContext.supabase
    .from("household_members")
    .select("id, status")
    .eq("household_id", householdId)
    .eq("user_id", authContext.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.status !== "active") {
    throw new ServiceError("FORBIDDEN", "You are not a member of this household");
  }
}

export async function assembleWeeklyNarrativeContext(
  authContext: AuthContext,
  householdId: string,
): Promise<WeeklyNarrativeContext> {
  await requireHouseholdMembership(authContext, householdId);

  const weekStart = getCurrentIsoWeekStart();
  const today = toIsoDate(new Date());

  const { data: householdData, error: householdError } = await authContext.supabase
    .from("households")
    .select("id, name, base_currency, deleted_at")
    .eq("id", householdId)
    .maybeSingle();

  if (householdError) {
    throw householdError;
  }

  const household = householdData as HouseholdRow | null;

  if (!household || household.deleted_at) {
    throw new ServiceError("NOT_FOUND", "Household was not found");
  }

  const { data: memberRows, error: memberError } = await authContext.supabase
    .from("household_members")
    .select("user_id, role, status, invited_email")
    .eq("household_id", householdId)
    .in("status", ["active", "invited"]);

  if (memberError) {
    throw memberError;
  }

  const members = (memberRows ?? []) as HouseholdMemberRow[];
  const activeMembers = members.filter((member) => member.status === "active");
  const displayNameByUserId = await getDisplayNamesByUserId(activeMembers.map((member) => member.user_id));

  const memberContexts: WeeklyNarrativeMemberContext[] = activeMembers.map((member) => ({
    displayName:
      displayNameByUserId.get(member.user_id) ??
      (member.user_id === authContext.user.id
        ? authContext.profile.display_name ?? authContext.profile.email
        : "Household member"),
    role: member.role,
  }));

  const { data: accountRows, error: accountError } = await authContext.supabase
    .from("accounts")
    .select("id, account_type, wrapper_type, provider_name, name, currency, is_active, deleted_at")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (accountError) {
    throw accountError;
  }

  const accounts = (accountRows ?? []) as AccountRow[];
  const accountIds = accounts.map((account) => account.id);

  const byType: Record<string, number> = {};
  for (const account of accounts) {
    byType[account.account_type] = (byType[account.account_type] ?? 0) + 1;
  }

  const { data: snapshotRows, error: snapshotError } = await authContext.supabase
    .from("household_snapshots")
    .select("snapshot_date, total_net_worth, total_assets, total_liabilities, currency")
    .eq("household_id", householdId)
    .order("snapshot_date", { ascending: false })
    .limit(8);

  if (snapshotError) {
    throw snapshotError;
  }

  const snapshots = (snapshotRows ?? []) as SnapshotRow[];
  const latest = snapshots[0] ?? null;
  const previous =
    snapshots.find((row) => row.snapshot_date < weekStart) ??
    (snapshots.length > 1 ? snapshots[1] : null);

  const currentNetWorth = latest ? toInt(latest.total_net_worth) : 0;
  const previousNetWorth = previous ? toInt(previous.total_net_worth) : null;
  const netWorthChange = previousNetWorth === null ? 0 : currentNetWorth - previousNetWorth;
  const netWorthChangePct =
    previousNetWorth === null || previousNetWorth === 0
      ? null
      : Number(((netWorthChange / previousNetWorth) * 100).toFixed(2));

  let newTransactions = 0;
  let significantEvents: string[] = [];

  if (accountIds.length > 0) {
    const countQuery = authContext.supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("account_id", accountIds)
      .is("deleted_at", null)
      .gte("transaction_date", weekStart)
      .lte("transaction_date", today);

    const { count, error: countError } = await countQuery;
    if (countError) {
      throw countError;
    }

    newTransactions = count ?? 0;

    const { data: txRows, error: txError } = await authContext.supabase
      .from("transactions")
      .select("id, type, amount, currency, transaction_date, description")
      .in("account_id", accountIds)
      .is("deleted_at", null)
      .gte("transaction_date", weekStart)
      .lte("transaction_date", today)
      .order("transaction_date", { ascending: false })
      .limit(40);

    if (txError) {
      throw txError;
    }

    const transactions = (txRows ?? []) as TransactionRow[];
    significantEvents = transactions
      .sort((left, right) => Math.abs(toInt(right.amount)) - Math.abs(toInt(left.amount)))
      .slice(0, 3)
      .map(summarizeTransaction);
  }

  return {
    asOfWeek: weekStart,
    household: {
      id: household.id,
      name: household.name,
      baseCurrency: household.base_currency,
      memberCount: activeMembers.length,
      members: memberContexts,
    },
    financials: {
      totalNetWorth: currentNetWorth,
      totalAssets: latest ? toInt(latest.total_assets) : 0,
      totalLiabilities: latest ? toInt(latest.total_liabilities) : 0,
      currency: latest?.currency ?? household.base_currency,
    },
    recentChanges: {
      periodStart: weekStart,
      periodEnd: today,
      asOfDate: latest?.snapshot_date ?? today,
      previousNetWorth,
      netWorthChange,
      netWorthChangePct,
      newTransactions,
      significantEvents,
    },
    accounts: {
      totalCount: accounts.length,
      byType,
      sample: accounts.slice(0, 5).map((account) => ({
        name: account.name,
        accountType: account.account_type,
        wrapperType: account.wrapper_type,
        provider: account.provider_name,
        currency: account.currency,
      })),
    },
  };
}
