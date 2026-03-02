import type { AccountSyncSource } from "./contracts";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatMoney = (minorUnits: number, currency: string): string => {
  const majorUnits = minorUnits / 100;

  return new Intl.NumberFormat("sv-SE", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(majorUnits);
};

export const formatNumber = (value: number, maximumFractionDigits = 2): string =>
  new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);

export const formatPercent = (value: number): string =>
  `${new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)}%`;

export const formatDate = (dateInput: string): string => {
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return dateInput;
  }

  return DATE_FORMATTER.format(parsed);
};

export const formatDateTime = (dateInput: string): string => {
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return dateInput;
  }

  return DATE_TIME_FORMATTER.format(parsed);
};

export interface FreshnessSummary {
  details: string;
  level: "fresh" | "aged" | "stale" | "unknown";
  sourceLabel: string;
}

const SOURCE_LABELS: Record<AccountSyncSource, string> = {
  csv: "CSV import",
  manual: "Manual entry",
  provider: "Provider sync",
};

export const getFreshnessSummary = (
  lastSynced: string | null | undefined,
  syncSource: AccountSyncSource,
): FreshnessSummary => {
  const sourceLabel = SOURCE_LABELS[syncSource];

  if (!lastSynced) {
    return {
      details: `No sync timestamp from ${sourceLabel.toLowerCase()}.`,
      level: "unknown",
      sourceLabel,
    };
  }

  const parsed = new Date(lastSynced);
  if (Number.isNaN(parsed.getTime())) {
    return {
      details: `Reported by ${sourceLabel.toLowerCase()} at ${lastSynced}.`,
      level: "unknown",
      sourceLabel,
    };
  }

  const ageMs = Date.now() - parsed.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  let level: FreshnessSummary["level"] = "fresh";
  if (ageHours >= 48 && ageHours < 168) {
    level = "aged";
  } else if (ageHours >= 168) {
    level = "stale";
  }

  return {
    details: `Provider-reported values from ${sourceLabel.toLowerCase()} at ${formatDateTime(lastSynced)}.`,
    level,
    sourceLabel,
  };
};
