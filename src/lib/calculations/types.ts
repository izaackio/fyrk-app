export const liabilityAccountTypes = ["loan", "mortgage"] as const;
export type LiabilityAccountType = (typeof liabilityAccountTypes)[number];

export type CalculationDataQualityScore = "high" | "medium" | "low";

export type AssumptionSourceTier = "system_default" | "user_override" | "historical_derived";

export interface AssumptionValue {
  value: number;
  source: AssumptionSourceTier;
}

export interface AssumptionSet {
  equityReturn: AssumptionValue;
  fixedIncomeReturn: AssumptionValue;
  cashReturn: AssumptionValue;
  inflation: AssumptionValue;
  salaryGrowth: AssumptionValue;
  monthlyExpenses: AssumptionValue;
  governmentBorrowingRate: AssumptionValue;
  staleAccountDays: AssumptionValue;
  staleFxHours: AssumptionValue;
}

export interface AssumptionMetadata {
  sourceTier: AssumptionSourceTier;
  assumptions: AssumptionSet;
}

export interface CalculationDataQualityIndicator {
  score: CalculationDataQualityScore;
  coveragePercent: number;
  staleAccountIds: string[];
  missingPrices: string[];
  estimatedValues: string[];
  missingValuationAccountIds: string[];
  staleFxRates: boolean;
}

export interface CalculationMetadata {
  calculatedAt: string;
  assumptions: AssumptionMetadata;
}

export interface NetWorthHoldingInput {
  id: string;
  instrumentId: string | null;
  valueMinor: number | null;
  valueCurrency: string | null;
  assetClass: string | null;
  country: string | null;
  sector: string | null;
  asOfDate: string | null;
  estimated?: boolean;
}

export interface NetWorthAccountInput {
  id: string;
  memberId: string;
  type: string;
  wrapperType: string | null;
  currency: string;
  holdings: NetWorthHoldingInput[];
  cashBalanceMinor?: number | null;
  loanBalanceMinor?: number | null;
  lastSyncedAt?: string | null;
}

export interface NetWorthInput {
  accounts: NetWorthAccountInput[];
  baseCurrency: string;
  fxRates?: FxRates | null;
  calculatedAt?: string | Date;
  assumptionOverrides?: Partial<Record<keyof AssumptionSet, number>>;
}

export interface NetWorthMemberBreakdown {
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface NetWorthResult {
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  byMember: Record<string, NetWorthMemberBreakdown>;
  byAccountType: Record<string, number>;
  byWrapperType: Record<string, number>;
  liquidAssets: number;
  illiquidAssets: number;
  accountValues: Record<string, number>;
  dataQuality: CalculationDataQualityIndicator;
  metadata: CalculationMetadata;
}

export interface AllocationHoldingInput {
  holdingId: string;
  memberId: string;
  valueMinor: number | null;
  valueCurrency: string | null;
  assetClass: string | null;
  country: string | null;
  sector: string | null;
  name?: string | null;
}

export interface AllocationInput {
  baseCurrency: string;
  holdings: AllocationHoldingInput[];
  fxRates?: FxRates | null;
  calculatedAt?: string | Date;
}

export interface AllocationBreakdown {
  category: string;
  value: number;
  percentage: number;
  memberBreakdown?: Record<string, number>;
}

export type ConcentrationRiskType =
  | "single_holding"
  | "single_sector"
  | "single_currency"
  | "single_country";

export type ConcentrationRiskSeverity = "info" | "warning" | "critical";

export interface ConcentrationRisk {
  type: ConcentrationRiskType;
  name: string;
  percentage: number;
  severity: ConcentrationRiskSeverity;
}

export interface AllocationResult {
  byAssetClass: AllocationBreakdown[];
  byGeography: AllocationBreakdown[];
  byCurrency: AllocationBreakdown[];
  bySector: AllocationBreakdown[];
  concentrationRisks: ConcentrationRisk[];
  totalValue: number;
  calculatedAt: string;
}

export interface DriftInput {
  current: AllocationBreakdown[];
  target: AllocationBreakdown[];
}

export interface DriftEntry {
  category: string;
  currentPct: number;
  targetPct: number;
  driftPct: number;
  rebalanceAmount: number;
}

export interface DriftResult {
  drifts: DriftEntry[];
  maxDrift: number;
  needsRebalancing: boolean;
}

export interface FxRates {
  baseCurrency: string;
  rates: Record<string, number>;
  source: string;
  fetchedAt: string;
  staleAfter?: string;
}

export interface FxConversionResult {
  converted: number;
  rate: number;
  rateSource: string;
  stale: boolean;
}

export interface DeterministicNetWorthPoint {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  currency: string;
}

export interface DeterministicNetWorthChangePayload {
  periodStart: string;
  periodEnd: string;
  asOfDate: string;
  previousNetWorth: number | null;
  currentNetWorth: number;
  netWorthChange: number;
  netWorthChangePct: number | null;
  currency: string;
  metadata: {
    calculatedAt: string;
    source: "deterministic";
  };
}
