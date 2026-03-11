import { getAccountHoldings, listAccounts } from "../accounts/client";
import type {
  AccountHolding,
  AccountSyncSource,
  AccountSummary,
  AccountType,
} from "../accounts/contracts";
import { formatDateTime, formatMoney, formatPercent } from "../accounts/formatters";

export type AllocationDimension = "assetClass" | "geography" | "currency" | "sector";

export const ALLOCATION_DIMENSIONS: Array<{
  id: AllocationDimension;
  label: string;
}> = [
  { id: "assetClass", label: "Asset class" },
  { id: "geography", label: "Geography" },
  { id: "currency", label: "Currency" },
  { id: "sector", label: "Sector" },
];

export interface AllocationSlice {
  key: string;
  label: string;
  pct: number;
  value: number;
}

export interface AccountTypeSlice {
  key: string;
  label: string;
  value: number;
}

export interface MemberBalanceView {
  accountsCount: number;
  allocation: Record<AllocationDimension, AllocationSlice[]>;
  byAccountType: AccountTypeSlice[];
  displayName: string;
  id: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface FreshnessSummary {
  coveragePct: number;
  lastFullUpdate: string | null;
  level: "fresh" | "aged" | "stale" | "unknown";
  message: string;
  primarySyncSource: AccountSyncSource;
  staleAccounts: number;
}

export interface BalanceSheetSnapshot {
  accountsCount: number;
  allocation: Record<AllocationDimension, AllocationSlice[]>;
  asOfDate: string | null;
  byAccountType: AccountTypeSlice[];
  currency: string;
  freshness: FreshnessSummary;
  householdId: string;
  members: MemberBalanceView[];
  totalAssets: number;
  totalLiabilities: number;
  totalNetWorth: number;
}

export interface BalanceSheetViewSelection {
  accountsCount: number;
  allocation: Record<AllocationDimension, AllocationSlice[]>;
  byAccountType: AccountTypeSlice[];
  id: string;
  label: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface WeeklyNetWorthDelta {
  amount: number | null;
  endDate: string | null;
  pct: number | null;
  startDate: string | null;
}

export type WeeklyHighlightType = "positive" | "neutral" | "action";

export interface WeeklyHighlight {
  text: string;
  type: WeeklyHighlightType;
}

export interface WeeklyNarrative {
  generatedAt: string;
  highlights: WeeklyHighlight[];
  narrative: string;
  source: "ai" | "fallback";
  sourceMessage: string;
}

export interface DashboardInsights {
  snapshot: BalanceSheetSnapshot;
  weeklyDelta: WeeklyNetWorthDelta;
  weeklyNarrative: WeeklyNarrative;
}

interface AllocationBucket {
  label: string;
  value: number;
}

type AllocationAccumulator = Record<AllocationDimension, Map<string, AllocationBucket>>;

interface MemberAccumulator {
  accountsCount: number;
  allocations: AllocationAccumulator;
  byAccountType: Map<string, AccountTypeSlice>;
  displayName: string;
  id: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  investment: "Investment",
  loan: "Loan",
  mortgage: "Mortgage",
  pension: "Pension",
  savings: "Savings",
};

const SOURCE_LABELS: Record<AccountSyncSource, string> = {
  csv: "CSV import",
  manual: "Manual entry",
  provider: "Provider sync",
};

const LIABILITY_ACCOUNT_TYPES = new Set<AccountType>(["loan", "mortgage"]);

const COUNTRY_BY_ISIN_PREFIX: Record<string, string> = {
  DE: "Germany",
  DK: "Denmark",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  NL: "Netherlands",
  NO: "Norway",
  SE: "Sweden",
  US: "United States",
};

const buildAllocationAccumulator = (): AllocationAccumulator => ({
  assetClass: new Map<string, AllocationBucket>(),
  currency: new Map<string, AllocationBucket>(),
  geography: new Map<string, AllocationBucket>(),
  sector: new Map<string, AllocationBucket>(),
});

const createMemberId = (displayName: string): string => {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return slug ? `member-${slug}` : "member";
};

const ensureMember = (
  members: Map<string, MemberAccumulator>,
  displayName: string,
): MemberAccumulator => {
  const key = displayName.trim().toLowerCase() || "member";
  const existing = members.get(key);
  if (existing) {
    return existing;
  }

  const member: MemberAccumulator = {
    accountsCount: 0,
    allocations: buildAllocationAccumulator(),
    byAccountType: new Map<string, AccountTypeSlice>(),
    displayName,
    id: createMemberId(displayName),
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
  };

  members.set(key, member);
  return member;
};

const upsertAllocation = (
  accumulator: AllocationAccumulator,
  dimension: AllocationDimension,
  key: string,
  label: string,
  value: number,
): void => {
  if (value <= 0) {
    return;
  }

  const normalizedKey = key.trim().toLowerCase() || "unknown";
  const bucket = accumulator[dimension].get(normalizedKey);
  if (bucket) {
    bucket.value += value;
    return;
  }

  accumulator[dimension].set(normalizedKey, {
    label,
    value,
  });
};

const upsertAccountType = (
  bucket: Map<string, AccountTypeSlice>,
  accountType: AccountType,
  value: number,
): void => {
  const key = accountType;
  const existing = bucket.get(key);

  if (existing) {
    existing.value += value;
    return;
  }

  bucket.set(key, {
    key,
    label: ACCOUNT_TYPE_LABELS[accountType],
    value,
  });
};

const toSignedValue = (account: AccountSummary): number => {
  if (!LIABILITY_ACCOUNT_TYPES.has(account.accountType)) {
    return account.totalValue;
  }

  return account.totalValue > 0 ? -account.totalValue : account.totalValue;
};

const inferAssetClassFromAccountType = (accountType: AccountType): string => {
  if (accountType === "investment") {
    return "Equity";
  }
  if (accountType === "pension") {
    return "Pension";
  }
  if (accountType === "savings" || accountType === "cash") {
    return "Cash";
  }

  return "Other";
};

const normalizeAssetClass = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[_-]+/g, " ");

  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

const inferGeographyFromHolding = (holding: AccountHolding): string => {
  const isin = holding.instrument.isin?.toUpperCase() ?? "";
  const prefix = isin.slice(0, 2);
  if (prefix && COUNTRY_BY_ISIN_PREFIX[prefix]) {
    return COUNTRY_BY_ISIN_PREFIX[prefix];
  }

  return "Global / Unknown";
};

const inferSectorFromHolding = (holding: AccountHolding): string => {
  const value = `${holding.instrument.name} ${holding.instrument.ticker ?? ""}`.toLowerCase();

  if (value.includes("bank") || value.includes("finance") || value.includes("finans")) {
    return "Financials";
  }
  if (value.includes("health") || value.includes("pharma") || value.includes("med")) {
    return "Healthcare";
  }
  if (value.includes("energy") || value.includes("oil") || value.includes("renew")) {
    return "Energy";
  }
  if (value.includes("real estate") || value.includes("property")) {
    return "Real estate";
  }
  if (value.includes("tech") || value.includes("software") || value.includes("cloud")) {
    return "Technology";
  }

  return "Unclassified";
};

const toAllocationSlices = (
  bucket: Map<string, AllocationBucket>,
  totalValue: number,
): AllocationSlice[] => {
  if (bucket.size === 0) {
    return [];
  }

  const denominator = totalValue > 0 ? totalValue : 0;

  return [...bucket.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      pct: denominator > 0 ? (value.value / denominator) * 100 : 0,
      value: value.value,
    }))
    .sort((left, right) => right.value - left.value);
};

const toAccountTypeSlices = (bucket: Map<string, AccountTypeSlice>): AccountTypeSlice[] =>
  [...bucket.values()].sort(
    (left, right) => Math.abs(right.value) - Math.abs(left.value),
  );

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
};

const buildFreshnessSummary = ({
  coverageCount,
  latestTimestamp,
  primarySyncSource,
  staleAccounts,
  totalAccounts,
}: {
  coverageCount: number;
  latestTimestamp: number | null;
  primarySyncSource: AccountSyncSource;
  staleAccounts: number;
  totalAccounts: number;
}): FreshnessSummary => {
  const coveragePct =
    totalAccounts === 0 ? 0 : Math.round((coverageCount / totalAccounts) * 100);

  if (!latestTimestamp) {
    return {
      coveragePct,
      lastFullUpdate: null,
      level: "unknown",
      message: `No sync timestamp available from ${SOURCE_LABELS[primarySyncSource].toLowerCase()}.`,
      primarySyncSource,
      staleAccounts,
    };
  }

  const ageHours = (Date.now() - latestTimestamp) / (1000 * 60 * 60);
  let level: FreshnessSummary["level"] = "fresh";

  if (ageHours >= 168 || staleAccounts > 0) {
    level = "stale";
  } else if (ageHours >= 48) {
    level = "aged";
  }

  const syncLabel = SOURCE_LABELS[primarySyncSource].toLowerCase();
  const latestIso = new Date(latestTimestamp).toISOString();
  const staleLabel =
    staleAccounts > 0
      ? ` ${staleAccounts} account${staleAccounts === 1 ? " is" : "s are"} older than 7 days.`
      : "";

  return {
    coveragePct,
    lastFullUpdate: latestIso,
    level,
    message: `Values last refreshed ${formatDateTime(latestIso)} via ${syncLabel}.${staleLabel}`,
    primarySyncSource,
    staleAccounts,
  };
};

const loadHoldings = async (
  accounts: AccountSummary[],
): Promise<Record<string, AccountHolding[]>> => {
  const entries = await Promise.all(
    accounts.map(async (account) => {
      try {
        const response = await getAccountHoldings(account.id);
        return [account.id, response.data] as const;
      } catch {
        return [account.id, []] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
};

export const loadBalanceSheetSnapshot = async (
  householdId: string,
): Promise<BalanceSheetSnapshot> => {
  const accountResponse = await listAccounts(householdId);
  const accounts = accountResponse.data;

  if (accounts.length === 0) {
    return {
      accountsCount: 0,
      allocation: {
        assetClass: [],
        currency: [],
        geography: [],
        sector: [],
      },
      asOfDate: null,
      byAccountType: [],
      currency: "SEK",
      freshness: {
        coveragePct: 0,
        lastFullUpdate: null,
        level: "unknown",
        message: "No balance-sheet data yet. Add your first account to begin.",
        primarySyncSource: "manual",
        staleAccounts: 0,
      },
      householdId,
      members: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalNetWorth: 0,
    };
  }

  const holdingsByAccountId = await loadHoldings(accounts);

  const householdAllocations = buildAllocationAccumulator();
  const byAccountType = new Map<string, AccountTypeSlice>();
  const members = new Map<string, MemberAccumulator>();

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalNetWorth = 0;

  let coverageCount = 0;
  let latestTimestamp: number | null = null;
  let primarySyncSource: AccountSyncSource = "manual";
  let staleAccounts = 0;

  accounts.forEach((account) => {
    const signedValue = toSignedValue(account);

    totalNetWorth += signedValue;
    if (signedValue >= 0) {
      totalAssets += signedValue;
    } else {
      totalLiabilities += Math.abs(signedValue);
    }

    upsertAccountType(byAccountType, account.accountType, signedValue);

    const memberName = account.ownerDisplayName?.trim() || "Member";
    const member = ensureMember(members, memberName);

    member.accountsCount += 1;
    member.netWorth += signedValue;
    if (signedValue >= 0) {
      member.totalAssets += signedValue;
    } else {
      member.totalLiabilities += Math.abs(signedValue);
    }
    upsertAccountType(member.byAccountType, account.accountType, signedValue);

    if (account.holdingsCount > 0 || Math.abs(account.totalValue) > 0) {
      coverageCount += 1;
    }

    const parsedTimestamp = parseTimestamp(account.lastSynced);
    if (parsedTimestamp) {
      if (!latestTimestamp || parsedTimestamp > latestTimestamp) {
        latestTimestamp = parsedTimestamp;
        primarySyncSource = account.syncSource;
      }

      const ageHours = (Date.now() - parsedTimestamp) / (1000 * 60 * 60);
      if (ageHours >= 168) {
        staleAccounts += 1;
      }
    }

    const holdings = holdingsByAccountId[account.id] ?? [];

    if (holdings.length > 0) {
      holdings.forEach((holding) => {
        const holdingValue = Math.max(0, holding.marketValue);
        if (holdingValue <= 0) {
          return;
        }

        const assetClass = normalizeAssetClass(holding.instrument.assetClass);
        const geography = inferGeographyFromHolding(holding);
        const currency = holding.valueCurrency || holding.instrument.currency || account.currency;
        const sector = inferSectorFromHolding(holding);

        upsertAllocation(
          householdAllocations,
          "assetClass",
          assetClass,
          assetClass,
          holdingValue,
        );
        upsertAllocation(
          householdAllocations,
          "geography",
          geography,
          geography,
          holdingValue,
        );
        upsertAllocation(
          householdAllocations,
          "currency",
          currency,
          currency,
          holdingValue,
        );
        upsertAllocation(
          householdAllocations,
          "sector",
          sector,
          sector,
          holdingValue,
        );

        upsertAllocation(
          member.allocations,
          "assetClass",
          assetClass,
          assetClass,
          holdingValue,
        );
        upsertAllocation(
          member.allocations,
          "geography",
          geography,
          geography,
          holdingValue,
        );
        upsertAllocation(
          member.allocations,
          "currency",
          currency,
          currency,
          holdingValue,
        );
        upsertAllocation(
          member.allocations,
          "sector",
          sector,
          sector,
          holdingValue,
        );
      });

      return;
    }

    if (signedValue <= 0) {
      return;
    }

    const assetClass = inferAssetClassFromAccountType(account.accountType);
    const fallbackSector = ACCOUNT_TYPE_LABELS[account.accountType];

    upsertAllocation(
      householdAllocations,
      "assetClass",
      assetClass,
      assetClass,
      signedValue,
    );
    upsertAllocation(
      householdAllocations,
      "geography",
      "unknown",
      "Global / Unknown",
      signedValue,
    );
    upsertAllocation(
      householdAllocations,
      "currency",
      account.currency,
      account.currency,
      signedValue,
    );
    upsertAllocation(
      householdAllocations,
      "sector",
      fallbackSector,
      fallbackSector,
      signedValue,
    );

    upsertAllocation(
      member.allocations,
      "assetClass",
      assetClass,
      assetClass,
      signedValue,
    );
    upsertAllocation(
      member.allocations,
      "geography",
      "unknown",
      "Global / Unknown",
      signedValue,
    );
    upsertAllocation(
      member.allocations,
      "currency",
      account.currency,
      account.currency,
      signedValue,
    );
    upsertAllocation(
      member.allocations,
      "sector",
      fallbackSector,
      fallbackSector,
      signedValue,
    );
  });

  const currency = accounts[0]?.currency ?? "SEK";
  const asOfDate = accounts
    .map((account) => account.lastSynced)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;

  const memberViews: MemberBalanceView[] = [...members.values()].map((member) => ({
    accountsCount: member.accountsCount,
    allocation: {
      assetClass: toAllocationSlices(member.allocations.assetClass, member.totalAssets),
      currency: toAllocationSlices(member.allocations.currency, member.totalAssets),
      geography: toAllocationSlices(member.allocations.geography, member.totalAssets),
      sector: toAllocationSlices(member.allocations.sector, member.totalAssets),
    },
    byAccountType: toAccountTypeSlices(member.byAccountType),
    displayName: member.displayName,
    id: member.id,
    netWorth: member.netWorth,
    totalAssets: member.totalAssets,
    totalLiabilities: member.totalLiabilities,
  }));

  return {
    accountsCount: accounts.length,
    allocation: {
      assetClass: toAllocationSlices(householdAllocations.assetClass, totalAssets),
      currency: toAllocationSlices(householdAllocations.currency, totalAssets),
      geography: toAllocationSlices(householdAllocations.geography, totalAssets),
      sector: toAllocationSlices(householdAllocations.sector, totalAssets),
    },
    asOfDate,
    byAccountType: toAccountTypeSlices(byAccountType),
    currency,
    freshness: buildFreshnessSummary({
      coverageCount,
      latestTimestamp,
      primarySyncSource,
      staleAccounts,
      totalAccounts: accounts.length,
    }),
    householdId,
    members: memberViews.sort((left, right) => right.netWorth - left.netWorth),
    totalAssets,
    totalLiabilities,
    totalNetWorth,
  };
};

export const selectBalanceSheetView = (
  snapshot: BalanceSheetSnapshot,
  selectedMemberId: string,
): BalanceSheetViewSelection => {
  if (selectedMemberId === "household") {
    return {
      accountsCount: snapshot.accountsCount,
      allocation: snapshot.allocation,
      byAccountType: snapshot.byAccountType,
      id: "household",
      label: "Household",
      netWorth: snapshot.totalNetWorth,
      totalAssets: snapshot.totalAssets,
      totalLiabilities: snapshot.totalLiabilities,
    };
  }

  const member = snapshot.members.find((candidate) => candidate.id === selectedMemberId);
  if (!member) {
    return {
      accountsCount: snapshot.accountsCount,
      allocation: snapshot.allocation,
      byAccountType: snapshot.byAccountType,
      id: "household",
      label: "Household",
      netWorth: snapshot.totalNetWorth,
      totalAssets: snapshot.totalAssets,
      totalLiabilities: snapshot.totalLiabilities,
    };
  }

  return {
    accountsCount: member.accountsCount,
    allocation: member.allocation,
    byAccountType: member.byAccountType,
    id: member.id,
    label: member.displayName,
    netWorth: member.netWorth,
    totalAssets: member.totalAssets,
    totalLiabilities: member.totalLiabilities,
  };
};

const requestJson = async <T,>(path: string, init: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
};

interface HistoryPoint {
  date: string;
  netWorth: number;
}

const toHistoryPoints = (payload: unknown): HistoryPoint[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    const date =
      typeof candidate.date === "string"
        ? candidate.date
        : typeof candidate.asOfDate === "string"
          ? candidate.asOfDate
          : null;
    const netWorth =
      typeof candidate.netWorth === "number"
        ? candidate.netWorth
        : typeof candidate.totalNetWorth === "number"
          ? candidate.totalNetWorth
          : null;

    if (!date || netWorth === null) {
      return [];
    }

    return [{ date, netWorth }];
  });
};

export const loadWeeklyNetWorthDelta = async (
  householdId: string,
): Promise<WeeklyNetWorthDelta> => {
  try {
    const payload = await requestJson<unknown>(
      `/api/balance-sheet/history?householdId=${encodeURIComponent(householdId)}&period=1m`,
      {
        method: "GET",
      },
    );

    const history = toHistoryPoints(payload).sort((left, right) =>
      left.date.localeCompare(right.date),
    );

    if (history.length < 2) {
      return {
        amount: null,
        endDate: null,
        pct: null,
        startDate: null,
      };
    }

    const latest = history[history.length - 1];
    if (!latest) {
      return {
        amount: null,
        endDate: null,
        pct: null,
        startDate: null,
      };
    }
    const latestTime = new Date(latest.date).getTime();
    const oneWeekAgo = latestTime - 7 * 24 * 60 * 60 * 1000;

    let baseline = history[0] ?? latest;
    for (const point of history) {
      const pointTime = new Date(point.date).getTime();
      if (!Number.isNaN(pointTime) && pointTime <= oneWeekAgo) {
        baseline = point;
      }
    }

    if (baseline === latest && history.length > 1) {
      baseline = history[history.length - 2] ?? latest;
    }

    const amount = latest.netWorth - baseline.netWorth;
    const pct =
      baseline.netWorth === 0
        ? null
        : (amount / Math.abs(baseline.netWorth)) * 100;

    return {
      amount,
      endDate: latest.date,
      pct,
      startDate: baseline.date,
    };
  } catch {
    return {
      amount: null,
      endDate: null,
      pct: null,
      startDate: null,
    };
  }
};

interface AiNarrativeResponse {
  data?: {
    fromCache?: unknown;
    generatedAt?: unknown;
    highlights?: unknown;
    narrative?: unknown;
    source?: unknown;
  };
}

const normalizeHighlightType = (value: unknown): WeeklyHighlightType => {
  if (value === "positive" || value === "neutral" || value === "action") {
    return value;
  }

  return "neutral";
};

const normalizeHighlights = (value: unknown): WeeklyHighlight[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidate = entry as Record<string, unknown>;
      if (typeof candidate.text !== "string" || !candidate.text.trim()) {
        return [];
      }

      return [
        {
          text: candidate.text.trim(),
          type: normalizeHighlightType(candidate.type),
        },
      ];
    })
    .slice(0, 4);
};

const buildFallbackNarrative = (
  snapshot: BalanceSheetSnapshot,
  weeklyDelta: WeeklyNetWorthDelta,
): WeeklyNarrative => {
  const weekSentence = (() => {
    if (weeklyDelta.amount === null) {
      return "Weekly net worth trend is not available yet because no historical snapshot was found.";
    }

    if (weeklyDelta.amount === 0) {
      return "Net worth was broadly flat compared with last week.";
    }

    const direction = weeklyDelta.amount > 0 ? "increased" : "decreased";
    const amountLabel = formatMoney(Math.abs(weeklyDelta.amount), snapshot.currency);
    const pctLabel = weeklyDelta.pct === null ? "" : ` (${formatPercent(Math.abs(weeklyDelta.pct))})`;
    return `Net worth ${direction} by ${amountLabel}${pctLabel} versus the previous weekly snapshot.`;
  })();

  const leader = snapshot.allocation.assetClass[0];
  const allocationSentence = leader
    ? `${leader.label} remains the largest allocation at ${formatPercent(leader.pct)} of assets.`
    : "Allocation detail is still limited until holdings are synced.";

  const freshnessSentence =
    snapshot.freshness.staleAccounts > 0
      ? `${snapshot.freshness.staleAccounts} account${snapshot.freshness.staleAccounts === 1 ? " is" : "s are"} stale and should be refreshed.`
      : "Data freshness is within the current quality target.";

  const asOfLabel = snapshot.asOfDate
    ? formatDateTime(snapshot.asOfDate)
    : "the latest available sync";

  const narrative = `Household net worth is ${formatMoney(snapshot.totalNetWorth, snapshot.currency)} as of ${asOfLabel}. ${weekSentence} ${allocationSentence} ${freshnessSentence}`;

  const highlights: WeeklyHighlight[] = [
    {
      text: `Assets: ${formatMoney(snapshot.totalAssets, snapshot.currency)} | Liabilities: ${formatMoney(snapshot.totalLiabilities, snapshot.currency)}`,
      type: "neutral",
    },
  ];

  if (leader) {
    highlights.push({
      text: `${leader.label} is the largest slice at ${formatPercent(leader.pct)}.`,
      type: "positive",
    });
  }

  if (snapshot.freshness.staleAccounts > 0) {
    highlights.push({
      text: "Refresh stale accounts to improve narrative confidence.",
      type: "action",
    });
  } else {
    highlights.push({
      text: snapshot.freshness.message,
      type: "neutral",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    highlights,
    narrative,
    source: "fallback",
    sourceMessage:
      "AI narrative unavailable. Showing structured fallback summary based on current balances.",
  };
};

export const loadWeeklyNarrative = async (
  householdId: string,
  snapshot: BalanceSheetSnapshot,
  weeklyDelta: WeeklyNetWorthDelta,
): Promise<WeeklyNarrative> => {
  try {
    const payload = await requestJson<AiNarrativeResponse>("/api/ai/narrative", {
      body: JSON.stringify({ householdId }),
      method: "POST",
    });

    const narrativeRaw = payload.data?.narrative;
    const narrative =
      typeof narrativeRaw === "string" ? narrativeRaw.trim() : "";

    if (!narrative) {
      throw new Error("Narrative missing from response");
    }

    const highlights = normalizeHighlights(payload.data?.highlights);
    const generatedAtRaw = payload.data?.generatedAt;
    const generatedAt =
      typeof generatedAtRaw === "string" && generatedAtRaw
        ? generatedAtRaw
        : new Date().toISOString();
    const source = payload.data?.source === "ai" ? "ai" : "fallback";
    const fromCache = payload.data?.fromCache === true;

    return {
      generatedAt,
      highlights,
      narrative,
      source,
      sourceMessage:
        source === "ai"
          ? fromCache
            ? `Loaded ${formatDateTime(generatedAt)} from the cached AI narrative artifact.`
            : `Generated ${formatDateTime(generatedAt)} by AI narrative service.`
          : fromCache
            ? `Loaded ${formatDateTime(generatedAt)} from the precomputed fallback narrative artifact.`
            : `Generated ${formatDateTime(generatedAt)} from deterministic fallback data.`,
    };
  } catch {
    return buildFallbackNarrative(snapshot, weeklyDelta);
  }
};

export const loadDashboardInsights = async (
  householdId: string,
): Promise<DashboardInsights> => {
  const snapshot = await loadBalanceSheetSnapshot(householdId);
  const weeklyDelta = await loadWeeklyNetWorthDelta(householdId);
  const weeklyNarrative = await loadWeeklyNarrative(
    householdId,
    snapshot,
    weeklyDelta,
  );

  return {
    snapshot,
    weeklyDelta,
    weeklyNarrative,
  };
};
