import type { SupabaseClient } from "@supabase/supabase-js";

import { generateFitnessExplanation } from "@/lib/ai/fitness-explanation";
import type { AuthContext } from "@/lib/auth/middleware";
import {
  calculateFitnessScore,
  type FitnessSuggestedAction,
} from "@/lib/calculations/fitness";
import { resolveAssumptionSet } from "@/lib/calculations/assumptions";
import { balanceSheetService } from "@/services/balance-sheet.service";
import { ServiceError } from "@/services/errors";
import type { AccountVisibility, HouseholdMemberStatus, HouseholdRole } from "@/types/domain";

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

interface AccountVisibilityRow {
  id: string;
  owner_user_id: string;
  visibility: string;
  is_active: boolean;
  deleted_at: string | null;
}

interface OutflowTransactionRow {
  amount: number | string;
  transaction_date: string;
}

interface FitnessScoreRow {
  id: string;
  household_id: string;
  total_score: number;
  buffer_score: number;
  growth_score: number;
  protection_score: number;
  efficiency_score: number;
  trajectory_score: number;
  component_details: unknown;
  explanation: string | null;
  suggested_actions: unknown;
  calculated_at: string;
  created_at: string;
}

interface FitnessCurrentView {
  totalScore: number;
  bufferScore: number;
  growthScore: number;
  protectionScore: number;
  efficiencyScore: number;
  trajectoryScore: number;
  explanation: string;
  explanationSource: "ai" | "fallback";
  suggestedActions: FitnessSuggestedAction[];
  calculatedAt: string;
}

interface FitnessHistoryView {
  date: string;
  score: number;
}

interface FitnessResponseView {
  current: FitnessCurrentView;
  history: FitnessHistoryView[];
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

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** Math.max(decimals, 0);
  return Math.round(value * factor) / factor;
}

const feeRateByAssetClass: Record<string, number> = {
  equity: 0.008,
  fund: 0.005,
  etf: 0.002,
  fixed_income: 0.004,
  cash: 0,
  real_estate: 0.007,
  crypto: 0.01,
  other: 0.005,
};

const wrapperTaxWeight: Record<string, number> = {
  isk: 1.0,
  kf: 0.8,
  depa: 0.3,
  ppm: 0.75,
  tjanstepension: 0.7,
  private_pension: 0.6,
};

export class FitnessService {
  async getFitness(authContext: AuthContext, householdId: string): Promise<FitnessResponseView> {
    await this.requireHouseholdMembership(authContext.supabase, householdId, authContext.user.id);

    const today = toIsoDate();
    let rows = await this.listRecentScores(authContext.supabase, householdId, 36);
    let currentRow = rows[0] ?? null;

    if (!currentRow || currentRow.calculated_at !== today) {
      currentRow = await this.calculateAndPersist(authContext, householdId, rows);
      rows = await this.listRecentScores(authContext.supabase, householdId, 36);
    }

    if (!currentRow) {
      throw new ServiceError("INTERNAL_ERROR", "Unable to load household fitness score");
    }

    return {
      current: this.mapCurrentScore(currentRow),
      history: this.mapHistory(rows),
    };
  }

  private async calculateAndPersist(
    authContext: AuthContext,
    householdId: string,
    existingRows: FitnessScoreRow[],
  ): Promise<FitnessScoreRow> {
    const balanceSheet = await balanceSheetService.getBalanceSheet(authContext, householdId);
    const history = await balanceSheetService.getHistory(authContext, {
      householdId,
      period: "12m",
    });

    const amountVisibleAccountIds = await this.listAmountVisibleAccountIds(
      authContext.supabase,
      householdId,
      authContext.user.id,
    );

    const monthlyExpenses = await this.estimateMonthlyExpenses(
      authContext.supabase,
      amountVisibleAccountIds,
    );
    const assumptions = resolveAssumptionSet();
    const fallbackMonthlyExpenses = assumptions.monthlyExpenses.value;

    const investableAssets = balanceSheet.byAccountType
      .filter((entry) => entry.type === "investment" || entry.type === "savings")
      .reduce((sum, entry) => sum + Math.max(0, entry.value), 0);

    const equityAllocationPct = balanceSheet.allocation.byAssetClass
      .filter((entry) => entry.class === "equity" || entry.class === "fund" || entry.class === "etf")
      .reduce((sum, entry) => sum + entry.pct, 0);

    const hasInsuranceAccount = balanceSheet.byAccountType.some(
      (entry) => entry.type === "insurance" && entry.value > 0,
    );

    const weightedFeeRate = this.estimateWeightedFeeRate(balanceSheet.allocation.byAssetClass);
    const taxEfficientAllocationPct = this.estimateTaxEfficiency(balanceSheet.byWrapperType);

    const fitness = calculateFitnessScore({
      totalNetWorth: balanceSheet.totalNetWorth,
      totalAssets: balanceSheet.totalAssets,
      totalLiabilities: balanceSheet.totalLiabilities,
      liquidAssets: balanceSheet.liquidAssets,
      monthlyExpenses: monthlyExpenses ?? fallbackMonthlyExpenses,
      equityAllocationPct,
      investableAssets,
      hasInsuranceAccount,
      weightedFeeRate,
      taxEfficientAllocationPct,
      netWorthHistory: history.history.map((point) => ({
        date: point.date,
        netWorth: point.netWorth,
      })),
      fitnessScoreHistory: existingRows.map((row) => ({
        date: row.calculated_at,
        score: row.total_score,
      })),
      calculatedAt: toIsoDate(),
    });

    const generatedExplanation = await generateFitnessExplanation(
      {
        totalScore: fitness.totalScore,
        bufferScore: fitness.bufferScore,
        growthScore: fitness.growthScore,
        protectionScore: fitness.protectionScore,
        efficiencyScore: fitness.efficiencyScore,
        trajectoryScore: fitness.trajectoryScore,
        trend: fitness.trend,
        calculatedAt: fitness.calculatedAt,
        componentDetails: fitness.componentDetails,
      },
      {
        fallbackExplanation: fitness.explanation,
        fallbackActions: fitness.suggestedActions,
      },
    );

    const { data, error } = await authContext.supabase
      .from("fitness_scores")
      .insert({
        household_id: householdId,
        total_score: fitness.totalScore,
        buffer_score: fitness.bufferScore,
        growth_score: fitness.growthScore,
        protection_score: fitness.protectionScore,
        efficiency_score: fitness.efficiencyScore,
        trajectory_score: fitness.trajectoryScore,
        component_details: this.attachAiMetadata(fitness.componentDetails, generatedExplanation.source),
        explanation: generatedExplanation.explanation,
        suggested_actions: generatedExplanation.suggestedActions,
        calculated_at: fitness.calculatedAt,
      })
      .select(
        "id, household_id, total_score, buffer_score, growth_score, protection_score, efficiency_score, trajectory_score, component_details, explanation, suggested_actions, calculated_at, created_at",
      )
      .single();

    if (error) {
      throw error;
    }

    return data as FitnessScoreRow;
  }

  private async listRecentScores(
    supabase: SupabaseClient,
    householdId: string,
    limit: number,
  ): Promise<FitnessScoreRow[]> {
    const { data, error } = await supabase
      .from("fitness_scores")
      .select(
        "id, household_id, total_score, buffer_score, growth_score, protection_score, efficiency_score, trajectory_score, component_details, explanation, suggested_actions, calculated_at, created_at",
      )
      .eq("household_id", householdId)
      .order("calculated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as FitnessScoreRow[];
  }

  private mapCurrentScore(row: FitnessScoreRow): FitnessCurrentView {
    const suggestedActions = this.normalizeSuggestedActions(row.suggested_actions);
    return {
      totalScore: row.total_score,
      bufferScore: row.buffer_score,
      growthScore: row.growth_score,
      protectionScore: row.protection_score,
      efficiencyScore: row.efficiency_score,
      trajectoryScore: row.trajectory_score,
      explanation: row.explanation ?? `Your household financial fitness score is ${row.total_score}.`,
      explanationSource: this.extractExplanationSource(row.component_details),
      suggestedActions,
      calculatedAt: row.calculated_at,
    };
  }

  private attachAiMetadata(
    componentDetails: Record<string, unknown>,
    source: "ai" | "fallback",
  ): Record<string, unknown> {
    return {
      ...componentDetails,
      ai: {
        fitnessExplanationSource: source,
      },
    };
  }

  private extractExplanationSource(componentDetails: unknown): "ai" | "fallback" {
    if (typeof componentDetails !== "object" || componentDetails === null) {
      return "fallback";
    }

    const root = componentDetails as Record<string, unknown>;
    if (typeof root.ai !== "object" || root.ai === null) {
      return "fallback";
    }

    const aiMeta = root.ai as Record<string, unknown>;
    return aiMeta.fitnessExplanationSource === "ai" ? "ai" : "fallback";
  }

  private mapHistory(rows: FitnessScoreRow[]): FitnessHistoryView[] {
    const uniqueByDate = new Map<string, number>();
    for (const row of rows) {
      if (!uniqueByDate.has(row.calculated_at)) {
        uniqueByDate.set(row.calculated_at, row.total_score);
      }
    }

    return Array.from(uniqueByDate.entries())
      .slice(0, 12)
      .map(([date, score]) => ({ date, score }));
  }

  private normalizeSuggestedActions(value: unknown): FitnessSuggestedAction[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const output: FitnessSuggestedAction[] = [];
    for (const entry of value) {
      if (!this.isSuggestedAction(entry)) {
        continue;
      }

      output.push(entry);
    }

    return output;
  }

  private isSuggestedAction(value: unknown): value is FitnessSuggestedAction {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const record = value as Record<string, unknown>;
    return (
      (record.component === "buffer" ||
        record.component === "growth" ||
        record.component === "protection" ||
        record.component === "efficiency" ||
        record.component === "trajectory") &&
      typeof record.title === "string" &&
      typeof record.impact === "string" &&
      typeof record.description === "string"
    );
  }

  private async estimateMonthlyExpenses(
    supabase: SupabaseClient,
    accountIds: string[],
  ): Promise<number | null> {
    if (accountIds.length === 0) {
      return null;
    }

    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1))
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from("transactions")
      .select("amount, transaction_date")
      .in("account_id", accountIds)
      .in("type", ["withdrawal", "fee", "tax"])
      .gte("transaction_date", from);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as OutflowTransactionRow[];
    if (rows.length === 0) {
      return null;
    }

    let totalOutflow = 0;
    const monthBuckets = new Set<string>();

    for (const row of rows) {
      const amount = this.toInteger(row.amount);
      if (amount === null) {
        continue;
      }

      totalOutflow += Math.abs(amount);
      monthBuckets.add(row.transaction_date.slice(0, 7));
    }

    const months = Math.max(1, monthBuckets.size);
    if (totalOutflow <= 0) {
      return null;
    }

    return Math.round(totalOutflow / months);
  }

  private async listAmountVisibleAccountIds(
    supabase: SupabaseClient,
    householdId: string,
    userId: string,
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, owner_user_id, visibility, is_active, deleted_at")
      .eq("household_id", householdId);

    if (error) {
      throw error;
    }

    const output: string[] = [];

    for (const row of (data ?? []) as AccountVisibilityRow[]) {
      if (!row.is_active || row.deleted_at) {
        continue;
      }

      const visibility = this.normalizeVisibility(row.visibility);
      const isOwner = row.owner_user_id === userId;
      if (isOwner || visibility === "full") {
        output.push(row.id);
      }
    }

    return output;
  }

  private estimateWeightedFeeRate(
    byAssetClass: Array<{ class: string; value: number; pct: number }>,
  ): number {
    const totalValue = byAssetClass.reduce((sum, entry) => sum + Math.max(0, entry.value), 0);
    if (totalValue <= 0) {
      return 0;
    }

    let weighted = 0;
    for (const entry of byAssetClass) {
      if (entry.value <= 0) {
        continue;
      }

      const key = entry.class.toLowerCase();
      const feeRate = feeRateByAssetClass[key] ?? feeRateByAssetClass.other ?? 0.005;
      weighted += (entry.value / totalValue) * feeRate;
    }

    return roundTo(weighted, 4);
  }

  private estimateTaxEfficiency(
    byWrapperType: Array<{ wrapperType: string; value: number }>,
  ): number {
    const totalValue = byWrapperType.reduce((sum, entry) => sum + Math.max(0, entry.value), 0);
    if (totalValue <= 0) {
      return 50;
    }

    let weightedScore = 0;
    for (const entry of byWrapperType) {
      if (entry.value <= 0) {
        continue;
      }

      const wrapper = entry.wrapperType.toLowerCase();
      const weight = wrapperTaxWeight[wrapper] ?? 0.4;
      weightedScore += (entry.value / totalValue) * weight;
    }

    return roundTo(Math.max(0, Math.min(100, weightedScore * 100)), 2);
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

  private normalizeVisibility(visibility: string): AccountVisibility {
    if (visibility === "hidden") {
      return "amount_hidden";
    }

    if (visibility === "full" || visibility === "amount_hidden" || visibility === "private") {
      return visibility;
    }

    return "private";
  }
}

export const fitnessService = new FitnessService();
