import { getAssumptionMetadata, resolveAssumptionSet } from "@/lib/calculations/assumptions";
import { convertMinorUnits, isFxRatesStale, normalizeCurrencyCode } from "@/lib/calculations/fx";
import type {
  DeterministicNetWorthChangePayload,
  DeterministicNetWorthPoint,
  NetWorthAccountInput,
  NetWorthInput,
  NetWorthMemberBreakdown,
  NetWorthResult,
} from "@/lib/calculations/types";
import { liabilityAccountTypes } from "@/lib/calculations/types";

const liabilityTypeSet = new Set<string>(liabilityAccountTypes);
const illiquidWrapperTypeSet = new Set<string>(["PPM", "TJANSTEPENSION", "PRIVATE_PENSION"]);
const illiquidAccountTypeSet = new Set<string>(["pension", "insurance"]);

function toIsoTimestamp(input: string | Date | undefined): string {
  if (!input) {
    return new Date().toISOString();
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  const parsed = Date.parse(input);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString();
  }

  return new Date(parsed).toISOString();
}

function toInteger(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** Math.max(decimals, 0);
  return Math.round(value * factor) / factor;
}

function toArrayUnique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isLiabilityAccountType(accountType: string): boolean {
  return liabilityTypeSet.has(accountType);
}

function isAccountStale(lastSyncedAt: string | null | undefined, staleAccountDays: number, nowMs: number): boolean {
  if (!lastSyncedAt) {
    return true;
  }

  const timestamp = Date.parse(lastSyncedAt);
  if (!Number.isFinite(timestamp)) {
    return true;
  }

  const staleThresholdMs = staleAccountDays * 24 * 60 * 60 * 1000;
  return nowMs - timestamp > staleThresholdMs;
}

function isIlliquidAccount(account: NetWorthAccountInput): boolean {
  if (illiquidAccountTypeSet.has(account.type)) {
    return true;
  }

  const wrapperType = account.wrapperType?.trim().toUpperCase();
  return Boolean(wrapperType && illiquidWrapperTypeSet.has(wrapperType));
}

function convertValueToBaseCurrency(
  amountMinor: number,
  fromCurrency: string | null | undefined,
  baseCurrency: string,
  input: NetWorthInput,
  options: { staleFxHours: number; now: Date },
): { value: number; estimated: boolean; staleFx: boolean } {
  const from = normalizeCurrencyCode(fromCurrency, baseCurrency);
  const to = normalizeCurrencyCode(baseCurrency, baseCurrency);

  if (from === to) {
    return { value: amountMinor, estimated: false, staleFx: false };
  }

  if (!input.fxRates) {
    return { value: amountMinor, estimated: true, staleFx: true };
  }

  try {
    const conversion = convertMinorUnits(amountMinor, from, to, input.fxRates, {
      now: options.now,
      staleAfterHours: options.staleFxHours,
    });
    return {
      value: conversion.converted,
      estimated: conversion.stale,
      staleFx: conversion.stale,
    };
  } catch {
    return { value: amountMinor, estimated: true, staleFx: true };
  }
}

function ensureMemberMapEntry(map: Record<string, NetWorthMemberBreakdown>, memberId: string): NetWorthMemberBreakdown {
  if (!map[memberId]) {
    map[memberId] = {
      assets: 0,
      liabilities: 0,
      netWorth: 0,
    };
  }

  return map[memberId];
}

function addMapValue(map: Record<string, number>, key: string, value: number): void {
  if (!map[key]) {
    map[key] = 0;
  }
  map[key] += value;
}

function calculateDataQualityScore(input: {
  coveragePercent: number;
  staleAccountIds: string[];
  missingPrices: string[];
  staleFxRates: boolean;
}): "high" | "medium" | "low" {
  if (
    input.coveragePercent >= 90 &&
    input.staleAccountIds.length === 0 &&
    input.missingPrices.length === 0 &&
    !input.staleFxRates
  ) {
    return "high";
  }

  if (input.coveragePercent >= 70 && input.missingPrices.length <= 5) {
    return "medium";
  }

  return "low";
}

export function calculateNetWorth(input: NetWorthInput): NetWorthResult {
  const calculatedAt = toIsoTimestamp(input.calculatedAt);
  const now = new Date(calculatedAt);
  const assumptions = resolveAssumptionSet(
    input.assumptionOverrides
      ? {
          userOverrides: input.assumptionOverrides,
        }
      : {},
  );
  const assumptionMetadata = getAssumptionMetadata(assumptions);
  const staleAccountDays = assumptions.staleAccountDays.value;
  const staleFxHours = assumptions.staleFxHours.value;

  const baseCurrency = normalizeCurrencyCode(input.baseCurrency, "SEK");
  const byMember: Record<string, NetWorthMemberBreakdown> = {};
  const byAccountType: Record<string, number> = {};
  const byWrapperType: Record<string, number> = {};
  const accountValues: Record<string, number> = {};

  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquidAssets = 0;
  let illiquidAssets = 0;
  let totalValuedMinor = 0;
  let freshValuedMinor = 0;

  const staleAccountIds: string[] = [];
  const missingPrices: string[] = [];
  const estimatedValues: string[] = [];
  const missingValuationAccountIds: string[] = [];
  let staleFxRates = input.fxRates
    ? isFxRatesStale(input.fxRates, staleFxHours, now)
    : false;

  for (const account of input.accounts) {
    const accountMember = ensureMemberMapEntry(byMember, account.memberId);
    const accountIsStale = isAccountStale(account.lastSyncedAt, staleAccountDays, now.getTime());

    if (accountIsStale) {
      staleAccountIds.push(account.id);
    }

    let accountAssets = 0;
    let accountLiabilities = 0;
    let accountHasValuation = false;

    for (const holding of account.holdings) {
      const holdingValue = toInteger(holding.valueMinor);
      if (holdingValue === null) {
        missingPrices.push(holding.id);
        continue;
      }

      const conversion = convertValueToBaseCurrency(
        holdingValue,
        holding.valueCurrency ?? account.currency,
        baseCurrency,
        input,
        { staleFxHours, now },
      );
      const convertedValue = conversion.value;
      const estimated = Boolean(holding.estimated) || conversion.estimated;

      accountHasValuation = true;
      totalValuedMinor += Math.abs(convertedValue);
      staleFxRates = staleFxRates || conversion.staleFx;

      if (!accountIsStale && !estimated) {
        freshValuedMinor += Math.abs(convertedValue);
      }

      if (estimated) {
        estimatedValues.push(holding.id);
      }

      if (isLiabilityAccountType(account.type)) {
        accountLiabilities += Math.abs(convertedValue);
      } else if (convertedValue >= 0) {
        accountAssets += convertedValue;
      } else {
        accountLiabilities += Math.abs(convertedValue);
      }
    }

    const cashBalanceMinor = toInteger(account.cashBalanceMinor);
    if (cashBalanceMinor !== null && cashBalanceMinor !== 0) {
      const conversion = convertValueToBaseCurrency(cashBalanceMinor, account.currency, baseCurrency, input, {
        staleFxHours,
        now,
      });
      const convertedValue = conversion.value;
      accountHasValuation = true;
      totalValuedMinor += Math.abs(convertedValue);
      staleFxRates = staleFxRates || conversion.staleFx;

      if (!accountIsStale && !conversion.estimated) {
        freshValuedMinor += Math.abs(convertedValue);
      } else {
        estimatedValues.push(`${account.id}:cash`);
      }

      if (isLiabilityAccountType(account.type)) {
        accountLiabilities += Math.abs(convertedValue);
      } else {
        accountAssets += convertedValue;
      }
    }

    const loanBalanceMinor = toInteger(account.loanBalanceMinor);
    if (loanBalanceMinor !== null && loanBalanceMinor !== 0) {
      const conversion = convertValueToBaseCurrency(loanBalanceMinor, account.currency, baseCurrency, input, {
        staleFxHours,
        now,
      });
      const convertedValue = Math.abs(conversion.value);
      accountHasValuation = true;
      totalValuedMinor += convertedValue;
      staleFxRates = staleFxRates || conversion.staleFx;

      if (!accountIsStale && !conversion.estimated) {
        freshValuedMinor += convertedValue;
      } else {
        estimatedValues.push(`${account.id}:loan_balance`);
      }

      accountLiabilities += convertedValue;
    }

    if (!accountHasValuation) {
      missingValuationAccountIds.push(account.id);
    }

    const accountNetWorth = accountAssets - accountLiabilities;
    accountValues[account.id] = accountNetWorth;

    addMapValue(byAccountType, account.type, accountNetWorth);
    if (account.wrapperType) {
      addMapValue(byWrapperType, account.wrapperType, accountNetWorth);
    }

    accountMember.assets += accountAssets;
    accountMember.liabilities += accountLiabilities;
    accountMember.netWorth += accountNetWorth;

    totalAssets += accountAssets;
    totalLiabilities += accountLiabilities;

    if (accountNetWorth > 0) {
      if (isIlliquidAccount(account)) {
        illiquidAssets += accountNetWorth;
      } else {
        liquidAssets += accountNetWorth;
      }
    }
  }

  const coveragePercent =
    totalValuedMinor === 0 ? 100 : roundTo((freshValuedMinor / totalValuedMinor) * 100, 2);

  return {
    totalNetWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    byMember,
    byAccountType,
    byWrapperType,
    liquidAssets,
    illiquidAssets,
    accountValues,
    dataQuality: {
      score: calculateDataQualityScore({
        coveragePercent,
        staleAccountIds,
        missingPrices,
        staleFxRates,
      }),
      coveragePercent,
      staleAccountIds: toArrayUnique(staleAccountIds),
      missingPrices: toArrayUnique(missingPrices),
      estimatedValues: toArrayUnique(estimatedValues),
      missingValuationAccountIds: toArrayUnique(missingValuationAccountIds),
      staleFxRates,
    },
    metadata: {
      calculatedAt,
      assumptions: assumptionMetadata,
    },
  };
}

export function buildDeterministicNetWorthChangePayload(input: {
  periodStart: string;
  periodEnd: string;
  current: DeterministicNetWorthPoint;
  previous?: DeterministicNetWorthPoint | null;
  calculatedAt?: string | Date;
}): DeterministicNetWorthChangePayload {
  const previousNetWorth = input.previous?.netWorth ?? null;
  const netWorthChange = previousNetWorth === null ? 0 : input.current.netWorth - previousNetWorth;
  const netWorthChangePct =
    previousNetWorth === null || previousNetWorth === 0
      ? null
      : roundTo((netWorthChange / Math.abs(previousNetWorth)) * 100, 2);

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    asOfDate: input.current.date,
    previousNetWorth,
    currentNetWorth: input.current.netWorth,
    netWorthChange,
    netWorthChangePct,
    currency: input.current.currency,
    metadata: {
      calculatedAt: toIsoTimestamp(input.calculatedAt),
      source: "deterministic",
    },
  };
}
