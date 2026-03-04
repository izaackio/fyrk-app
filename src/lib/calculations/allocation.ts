import { convertMinorUnits, normalizeCurrencyCode } from "@/lib/calculations/fx";
import type {
  AllocationBreakdown,
  AllocationInput,
  AllocationResult,
  ConcentrationRisk,
  ConcentrationRiskSeverity,
  DriftInput,
  DriftResult,
} from "@/lib/calculations/types";

interface AllocationBucket {
  value: number;
  memberBreakdown: Record<string, number>;
}

function toIsoTimestamp(input?: string | Date): string {
  if (!input) {
    return new Date().toISOString();
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  const parsed = Date.parse(input);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** Math.max(decimals, 0);
  return Math.round(value * factor) / factor;
}

function normalizeBucketKey(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function addBucketValue(
  map: Map<string, AllocationBucket>,
  category: string,
  value: number,
  memberId: string,
): void {
  const existing = map.get(category) ?? {
    value: 0,
    memberBreakdown: {},
  };

  existing.value += value;
  existing.memberBreakdown[memberId] = (existing.memberBreakdown[memberId] ?? 0) + value;
  map.set(category, existing);
}

function mapToBreakdown(map: Map<string, AllocationBucket>, totalValue: number): AllocationBreakdown[] {
  return Array.from(map.entries())
    .filter(([, bucket]) => bucket.value > 0)
    .sort((left, right) => right[1].value - left[1].value)
    .map(([category, bucket]) => ({
      category,
      value: Math.round(bucket.value),
      percentage: totalValue > 0 ? roundTo((bucket.value / totalValue) * 100, 2) : 0,
      memberBreakdown: bucket.memberBreakdown,
    }));
}

function riskSeverity(percentage: number): ConcentrationRiskSeverity {
  if (percentage > 50) {
    return "critical";
  }

  if (percentage > 30) {
    return "warning";
  }

  return "info";
}

function addRisk(
  output: ConcentrationRisk[],
  type: ConcentrationRisk["type"],
  name: string,
  value: number,
  totalValue: number,
): void {
  if (totalValue <= 0 || value <= 0) {
    return;
  }

  const percentage = roundTo((value / totalValue) * 100, 2);
  if (percentage <= 15) {
    return;
  }

  output.push({
    type,
    name,
    percentage,
    severity: riskSeverity(percentage),
  });
}

function convertToBase(
  amountMinor: number,
  fromCurrency: string | null | undefined,
  input: AllocationInput,
): number {
  const from = normalizeCurrencyCode(fromCurrency, input.baseCurrency);
  const to = normalizeCurrencyCode(input.baseCurrency, input.baseCurrency);

  if (from === to || !input.fxRates) {
    return amountMinor;
  }

  try {
    const conversion = convertMinorUnits(amountMinor, from, to, input.fxRates);
    return conversion.converted;
  } catch {
    return amountMinor;
  }
}

export function calculateAllocation(input: AllocationInput): AllocationResult {
  const byAssetClass = new Map<string, AllocationBucket>();
  const byGeography = new Map<string, AllocationBucket>();
  const byCurrency = new Map<string, AllocationBucket>();
  const bySector = new Map<string, AllocationBucket>();
  const byHolding = new Map<string, number>();
  let totalValue = 0;

  for (const holding of input.holdings) {
    if (typeof holding.valueMinor !== "number" || !Number.isFinite(holding.valueMinor)) {
      continue;
    }

    const convertedValue = convertToBase(Math.trunc(holding.valueMinor), holding.valueCurrency, input);
    if (convertedValue <= 0) {
      continue;
    }

    const assetClass = normalizeBucketKey(holding.assetClass, "other");
    const country = normalizeBucketKey(holding.country, "unknown").toUpperCase();
    const currency = normalizeCurrencyCode(holding.valueCurrency, input.baseCurrency);
    const sector = normalizeBucketKey(holding.sector, "unknown");
    const holdingName = normalizeBucketKey(holding.name, holding.holdingId);

    totalValue += convertedValue;
    addBucketValue(byAssetClass, assetClass, convertedValue, holding.memberId);
    addBucketValue(byGeography, country, convertedValue, holding.memberId);
    addBucketValue(byCurrency, currency, convertedValue, holding.memberId);
    addBucketValue(bySector, sector, convertedValue, holding.memberId);
    byHolding.set(holdingName, (byHolding.get(holdingName) ?? 0) + convertedValue);
  }

  const assetClassBreakdown = mapToBreakdown(byAssetClass, totalValue);
  const geographyBreakdown = mapToBreakdown(byGeography, totalValue);
  const currencyBreakdown = mapToBreakdown(byCurrency, totalValue);
  const sectorBreakdown = mapToBreakdown(bySector, totalValue);

  const concentrationRisks: ConcentrationRisk[] = [];
  for (const [name, value] of byHolding.entries()) {
    addRisk(concentrationRisks, "single_holding", name, value, totalValue);
  }
  for (const row of sectorBreakdown) {
    addRisk(concentrationRisks, "single_sector", row.category, row.value, totalValue);
  }
  for (const row of currencyBreakdown) {
    addRisk(concentrationRisks, "single_currency", row.category, row.value, totalValue);
  }
  for (const row of geographyBreakdown) {
    addRisk(concentrationRisks, "single_country", row.category, row.value, totalValue);
  }

  concentrationRisks.sort((left, right) => right.percentage - left.percentage);

  return {
    byAssetClass: assetClassBreakdown,
    byGeography: geographyBreakdown,
    byCurrency: currencyBreakdown,
    bySector: sectorBreakdown,
    concentrationRisks,
    totalValue: Math.round(totalValue),
    calculatedAt: toIsoTimestamp(input.calculatedAt),
  };
}

export function calculateAllocationDrift(input: DriftInput): DriftResult {
  const currentByCategory = new Map(input.current.map((entry) => [entry.category, entry]));
  const targetByCategory = new Map(input.target.map((entry) => [entry.category, entry]));
  const categories = Array.from(new Set([...currentByCategory.keys(), ...targetByCategory.keys()]));
  const totalCurrent = input.current.reduce((sum, entry) => sum + (entry.value > 0 ? entry.value : 0), 0);
  const drifts = categories.map((category) => {
    const current = currentByCategory.get(category);
    const target = targetByCategory.get(category);
    const currentPct = current?.percentage ?? 0;
    const targetPct = target?.percentage ?? 0;
    const driftPct = roundTo(currentPct - targetPct, 2);

    const currentValue =
      typeof current?.value === "number" && Number.isFinite(current.value)
        ? current.value
        : (totalCurrent * currentPct) / 100;
    const targetValue = (totalCurrent * targetPct) / 100;
    const rebalanceAmount = Math.round(targetValue - currentValue);

    return {
      category,
      currentPct: roundTo(currentPct, 2),
      targetPct: roundTo(targetPct, 2),
      driftPct,
      rebalanceAmount,
    };
  });

  drifts.sort((left, right) => Math.abs(right.driftPct) - Math.abs(left.driftPct));

  const maxDrift = drifts.reduce((max, entry) => Math.max(max, Math.abs(entry.driftPct)), 0);
  return {
    drifts,
    maxDrift: roundTo(maxDrift, 2),
    needsRebalancing: maxDrift > 5,
  };
}
