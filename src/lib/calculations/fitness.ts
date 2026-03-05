import { getAssumptionMetadata, resolveAssumptionSet } from "@/lib/calculations/assumptions";

export type FitnessComponent = "buffer" | "growth" | "protection" | "efficiency" | "trajectory";
export type FitnessTrend = "improving" | "stable" | "declining";

export interface FitnessNetWorthHistoryPoint {
  date: string;
  netWorth: number;
}

export interface FitnessScoreHistoryPoint {
  date: string;
  score: number;
}

export interface FitnessSuggestedAction {
  component: FitnessComponent;
  title: string;
  impact: string;
  description: string;
}

export interface FitnessScoreInput {
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidAssets: number;
  monthlyExpenses: number;
  equityAllocationPct: number;
  investableAssets: number;
  hasInsuranceAccount: boolean;
  weightedFeeRate: number;
  taxEfficientAllocationPct: number;
  netWorthHistory: FitnessNetWorthHistoryPoint[];
  fitnessScoreHistory: FitnessScoreHistoryPoint[];
  calculatedAt?: string | Date;
}

export interface FitnessScoreResult {
  totalScore: number;
  bufferScore: number;
  growthScore: number;
  protectionScore: number;
  efficiencyScore: number;
  trajectoryScore: number;
  trend: FitnessTrend;
  componentDetails: Record<string, unknown>;
  explanation: string;
  suggestedActions: FitnessSuggestedAction[];
  calculatedAt: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.trunc(clamp(Math.round(value), min, max));
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** Math.max(decimals, 0);
  return Math.round(value * factor) / factor;
}

function toIsoDate(input?: string | Date): string {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }

  if (input instanceof Date) {
    return input.toISOString().slice(0, 10);
  }

  const parsed = Date.parse(input);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function parseDate(value: string): Date | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Date(parsed);
}

function monthDifference(start: string, end: string): number {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) {
    return 1;
  }

  const months =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth());
  return Math.max(1, months);
}

function calculateMonthlyNetWorthGrowth(history: FitnessNetWorthHistoryPoint[]): number {
  if (history.length < 2) {
    return 0;
  }

  const ordered = [...history].sort((left, right) => left.date.localeCompare(right.date));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  if (!first || !last || !Number.isFinite(first.netWorth) || !Number.isFinite(last.netWorth)) {
    return 0;
  }

  if (first.netWorth === 0) {
    return 0;
  }

  const elapsedMonths = monthDifference(first.date, last.date);
  return (last.netWorth - first.netWorth) / Math.abs(first.netWorth) / elapsedMonths;
}

function calculateMomentumScore(history: FitnessScoreHistoryPoint[]): number {
  if (history.length < 2) {
    return 50;
  }

  const ordered = [...history].sort((left, right) => left.date.localeCompare(right.date));
  let totalDeltaPct = 0;
  let deltaCount = 0;

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];

    if (!previous || !current || previous.score === 0) {
      continue;
    }

    const deltaPct = ((current.score - previous.score) / Math.abs(previous.score)) * 100;
    totalDeltaPct += deltaPct;
    deltaCount += 1;
  }

  if (deltaCount === 0) {
    return 50;
  }

  return clamp(50 + (totalDeltaPct / deltaCount) * 2, 0, 100);
}

function createSuggestedActions(input: {
  bufferScore: number;
  growthScore: number;
  protectionScore: number;
  efficiencyScore: number;
  trajectoryScore: number;
}): FitnessSuggestedAction[] {
  const actions: FitnessSuggestedAction[] = [];

  if (input.bufferScore < 140) {
    actions.push({
      component: "buffer",
      title: "Increase emergency buffer",
      impact: "+20 points",
      description: "Build liquid savings to cover at least 3 months of household expenses.",
    });
  }

  if (input.growthScore < 140) {
    actions.push({
      component: "growth",
      title: "Align long-term allocation",
      impact: "+15 points",
      description: "Review equity and savings mix so investable assets better support growth goals.",
    });
  }

  if (input.protectionScore < 140) {
    actions.push({
      component: "protection",
      title: "Review insurance coverage",
      impact: "+20 points",
      description: "Validate that insurance and debt protection are enough for current liabilities.",
    });
  }

  if (input.efficiencyScore < 140) {
    actions.push({
      component: "efficiency",
      title: "Lower portfolio drag",
      impact: "+10 points",
      description: "Move high-fee positions into more tax-efficient wrappers where possible.",
    });
  }

  if (input.trajectoryScore < 140) {
    actions.push({
      component: "trajectory",
      title: "Stabilize monthly progress",
      impact: "+15 points",
      description: "Set a recurring savings target and track net-worth direction month to month.",
    });
  }

  return actions.slice(0, 3);
}

function buildExplanation(input: {
  totalScore: number;
  trend: FitnessTrend;
  lowestComponent: FitnessComponent;
}): string {
  if (input.totalScore >= 800) {
    return `Your household financial fitness is excellent at ${input.totalScore}, with a ${input.trend} trend and room to optimize ${input.lowestComponent}.`;
  }

  if (input.totalScore >= 650) {
    return `Your household financial fitness is strong at ${input.totalScore}. Continue improving ${input.lowestComponent} to reach the next tier.`;
  }

  if (input.totalScore >= 500) {
    return `Your household financial fitness is developing at ${input.totalScore}. Focus on ${input.lowestComponent} to strengthen resilience.`;
  }

  return `Your household financial fitness is currently ${input.totalScore}. Prioritize ${input.lowestComponent} first to improve stability.`;
}

export function calculateFitnessScore(input: FitnessScoreInput): FitnessScoreResult {
  const assumptions = resolveAssumptionSet();
  const monthlyExpenses =
    input.monthlyExpenses > 0 ? Math.trunc(input.monthlyExpenses) : assumptions.monthlyExpenses.value;
  const calculatedAt = toIsoDate(input.calculatedAt);

  const liquidAssets = Math.max(0, Math.trunc(input.liquidAssets));
  const totalNetWorth = Math.trunc(input.totalNetWorth);
  const totalAssets = Math.max(0, Math.trunc(input.totalAssets));
  const totalLiabilities = Math.max(0, Math.trunc(input.totalLiabilities));
  const investableAssets = Math.max(0, Math.trunc(input.investableAssets));
  const equityAllocationPct = clamp(input.equityAllocationPct, 0, 100);
  const weightedFeeRate = Math.max(0, input.weightedFeeRate);
  const taxEfficientAllocationPct = clamp(input.taxEfficientAllocationPct, 0, 100);

  const monthsCovered = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0;
  const bufferScore = clampInt(Math.min(200, monthsCovered * 22.2), 0, 200);

  const targetEquityPct = 65;
  const allocationDrift = Math.abs(equityAllocationPct - targetEquityPct);
  const allocationScore = clamp(100 - allocationDrift * 2.5, 0, 100);
  const investmentRatio = totalNetWorth > 0 ? investableAssets / totalNetWorth : 0;
  const investmentScore = clamp(investmentRatio * 200, 0, 100);
  const growthScore = clampInt(allocationScore + investmentScore, 0, 200);

  const liabilityCoverageRatio = totalLiabilities === 0 ? 2 : totalAssets / totalLiabilities;
  const liabilityCoverageScore = clamp(liabilityCoverageRatio * 60, 0, 120);
  const insuranceScore = input.hasInsuranceAccount ? 80 : 25;
  const protectionScore = clampInt(liabilityCoverageScore + insuranceScore, 0, 200);

  const feeScore = weightedFeeRate <= 0.002 ? 100 : clamp(100 - (weightedFeeRate - 0.002) * 10_000, 0, 100);
  const efficiencyScore = clampInt(feeScore + taxEfficientAllocationPct, 0, 200);

  const monthlyNetWorthGrowth = calculateMonthlyNetWorthGrowth(input.netWorthHistory);
  const trendBaseScore = clamp(50 + monthlyNetWorthGrowth * 1200, 0, 100);
  const momentumScore = calculateMomentumScore(input.fitnessScoreHistory);
  const trajectoryScore = clampInt(trendBaseScore + momentumScore, 0, 200);

  const trend: FitnessTrend =
    monthlyNetWorthGrowth > 0.003 ? "improving" : monthlyNetWorthGrowth < -0.003 ? "declining" : "stable";

  const totalScore = clampInt(
    bufferScore + growthScore + protectionScore + efficiencyScore + trajectoryScore,
    0,
    1000,
  );

  const componentEntries: Array<{ component: FitnessComponent; score: number }> = [
    { component: "buffer", score: bufferScore },
    { component: "growth", score: growthScore },
    { component: "protection", score: protectionScore },
    { component: "efficiency", score: efficiencyScore },
    { component: "trajectory", score: trajectoryScore },
  ];
  const lowestComponent =
    componentEntries.sort((left, right) => left.score - right.score)[0]?.component ?? "buffer";

  const suggestedActions = createSuggestedActions({
    bufferScore,
    growthScore,
    protectionScore,
    efficiencyScore,
    trajectoryScore,
  });

  const explanation = buildExplanation({
    totalScore,
    trend,
    lowestComponent,
  });

  return {
    totalScore,
    bufferScore,
    growthScore,
    protectionScore,
    efficiencyScore,
    trajectoryScore,
    trend,
    componentDetails: {
      assumptions: getAssumptionMetadata(assumptions),
      buffer: {
        monthlyExpenses,
        monthsCovered: roundTo(monthsCovered, 2),
      },
      growth: {
        equityAllocationPct: roundTo(equityAllocationPct, 2),
        targetEquityPct,
        allocationDrift: roundTo(allocationDrift, 2),
        investmentRatio: roundTo(investmentRatio, 4),
      },
      protection: {
        hasInsuranceAccount: input.hasInsuranceAccount,
        liabilityCoverageRatio: roundTo(liabilityCoverageRatio, 2),
      },
      efficiency: {
        weightedFeeRate: roundTo(weightedFeeRate, 4),
        taxEfficientAllocationPct: roundTo(taxEfficientAllocationPct, 2),
      },
      trajectory: {
        trend,
        monthlyNetWorthGrowthPct: roundTo(monthlyNetWorthGrowth * 100, 2),
        momentumScore: roundTo(momentumScore, 2),
      },
    },
    explanation,
    suggestedActions,
    calculatedAt,
  };
}
