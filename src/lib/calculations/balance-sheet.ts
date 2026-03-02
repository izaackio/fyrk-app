import type { AccountType, BalanceSheetHistoryPeriod } from "@/types/domain";

const liabilityAccountTypes = new Set<AccountType>(["loan", "mortgage"]);

const historyPeriodMonths: Record<Exclude<BalanceSheetHistoryPeriod, "all">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "12m": 12,
  "24m": 24,
};

export interface NetWorthTotals {
  totalAssets: number;
  totalLiabilities: number;
  totalNetWorth: number;
}

export interface AllocationRow {
  label: string;
  value: number;
  pct: number;
}

export function isLiabilityAccountType(accountType: string): boolean {
  return liabilityAccountTypes.has(accountType as AccountType);
}

export function normalizeIsoCurrency(currency: string | null | undefined, fallback: string): string {
  const next = currency?.trim().toUpperCase();
  return next && /^[A-Z]{3}$/u.test(next) ? next : fallback.toUpperCase();
}

export function toSignedAccountValue(value: number, accountType: string): number {
  const integerValue = Math.trunc(value);

  if (isLiabilityAccountType(accountType)) {
    return -Math.abs(integerValue);
  }

  return integerValue;
}

export function addSignedValueToTotals(totals: NetWorthTotals, signedValue: number): void {
  if (signedValue >= 0) {
    totals.totalAssets += signedValue;
  } else {
    totals.totalLiabilities += Math.abs(signedValue);
  }

  totals.totalNetWorth = totals.totalAssets - totals.totalLiabilities;
}

export function toPercent(value: number, total: number, decimals = 1): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const factor = 10 ** Math.max(decimals, 0);
  return Math.round(((value / total) * 100) * factor) / factor;
}

export function buildAllocationRows(
  buckets: Map<string, number>,
  total: number,
): AllocationRow[] {
  return Array.from(buckets.entries())
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({
      label,
      value,
      pct: toPercent(value, total, 1),
    }));
}

export function toIsoDate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export function resolveHistoryStartDate(
  period: BalanceSheetHistoryPeriod,
  now: Date = new Date(),
): string | null {
  if (period === "all") {
    return null;
  }

  const months = historyPeriodMonths[period];
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCMonth(start.getUTCMonth() - months);
  return toIsoDate(start);
}
