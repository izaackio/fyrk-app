import type { AssumptionMetadata, AssumptionSet, AssumptionSourceTier, AssumptionValue } from "@/lib/calculations/types";

const systemDefaults: Record<keyof AssumptionSet, number> = {
  equityReturn: 0.07,
  fixedIncomeReturn: 0.03,
  cashReturn: 0.02,
  inflation: 0.02,
  salaryGrowth: 0.025,
  monthlyExpenses: 35_000_00,
  governmentBorrowingRate: 0.02,
  staleAccountDays: 7,
  staleFxHours: 48,
};

function toAssumptionValue(value: number, source: AssumptionSourceTier): AssumptionValue {
  return {
    value,
    source,
  };
}

export function getSystemDefaultAssumptions(): AssumptionSet {
  return {
    equityReturn: toAssumptionValue(systemDefaults.equityReturn, "system_default"),
    fixedIncomeReturn: toAssumptionValue(systemDefaults.fixedIncomeReturn, "system_default"),
    cashReturn: toAssumptionValue(systemDefaults.cashReturn, "system_default"),
    inflation: toAssumptionValue(systemDefaults.inflation, "system_default"),
    salaryGrowth: toAssumptionValue(systemDefaults.salaryGrowth, "system_default"),
    monthlyExpenses: toAssumptionValue(systemDefaults.monthlyExpenses, "system_default"),
    governmentBorrowingRate: toAssumptionValue(systemDefaults.governmentBorrowingRate, "system_default"),
    staleAccountDays: toAssumptionValue(systemDefaults.staleAccountDays, "system_default"),
    staleFxHours: toAssumptionValue(systemDefaults.staleFxHours, "system_default"),
  };
}

function hasFiniteValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function resolveAssumptionSet(input: {
  historicalDerived?: Partial<Record<keyof AssumptionSet, number>>;
  userOverrides?: Partial<Record<keyof AssumptionSet, number>>;
} = {}): AssumptionSet {
  const defaults = getSystemDefaultAssumptions();
  const historical = input.historicalDerived ?? {};
  const overrides = input.userOverrides ?? {};
  const result: Partial<AssumptionSet> = {};

  for (const key of Object.keys(defaults) as Array<keyof AssumptionSet>) {
    if (hasFiniteValue(overrides[key])) {
      result[key] = toAssumptionValue(overrides[key], "user_override");
      continue;
    }

    if (hasFiniteValue(historical[key])) {
      result[key] = toAssumptionValue(historical[key], "historical_derived");
      continue;
    }

    result[key] = defaults[key];
  }

  return result as AssumptionSet;
}

export function getAssumptionSourceTier(assumptions: AssumptionSet): AssumptionSourceTier {
  const sources = Object.values(assumptions).map((entry) => entry.source);

  if (sources.includes("user_override")) {
    return "user_override";
  }

  if (sources.includes("historical_derived")) {
    return "historical_derived";
  }

  return "system_default";
}

export function getAssumptionMetadata(assumptions: AssumptionSet): AssumptionMetadata {
  return {
    sourceTier: getAssumptionSourceTier(assumptions),
    assumptions,
  };
}
