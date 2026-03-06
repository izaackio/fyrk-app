import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import type { GenerateReviewInput } from "@/lib/validations/reviews";
import { ServiceError } from "@/services/errors";
import type {
  HouseholdMemberStatus,
  HouseholdRole,
  QuarterlyReviewPdfView,
  QuarterlyReviewRecommendationView,
  QuarterlyReviewStatus,
  QuarterlyReviewView,
  ReviewGenerateView,
} from "@/types/domain";

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

interface QuarterlyReviewRow {
  id: string;
  household_id: string;
  period_start: string;
  period_end: string;
  quarter_label: string;
  net_worth_start: number | string;
  net_worth_end: number | string;
  net_worth_change: number | string;
  market_returns_amount: number | string;
  net_savings_amount: number | string;
  debt_reduction_amount: number | string;
  fees_drag_amount: number | string;
  narrative: string | null;
  recommendations: unknown;
  fitness_score: number | null;
  fitness_components: unknown;
  upcoming_events: unknown;
  status: string;
  generated_at: string | null;
  published_at: string | null;
  timeline_entry_id: string | null;
  created_at: string;
  updated_at: string;
}

interface HouseholdSnapshotRow {
  snapshot_date: string;
  total_net_worth: number | string;
  total_liabilities: number | string;
}

interface TransactionRow {
  type: string;
  amount: number | string;
  fee_amount: number | string | null;
}

interface ReviewMetrics {
  netWorthStart: number;
  netWorthEnd: number;
  netWorthChange: number;
  marketReturnsAmount: number;
  netSavingsAmount: number;
  debtReductionAmount: number;
  feesDragAmount: number;
}

const householdWritableRoles: HouseholdRole[] = ["owner", "admin", "member"];
const reviewSelectColumns = [
  "id",
  "household_id",
  "period_start",
  "period_end",
  "quarter_label",
  "net_worth_start",
  "net_worth_end",
  "net_worth_change",
  "market_returns_amount",
  "net_savings_amount",
  "debt_reduction_amount",
  "fees_drag_amount",
  "narrative",
  "recommendations",
  "fitness_score",
  "fitness_components",
  "upcoming_events",
  "status",
  "generated_at",
  "published_at",
  "timeline_entry_id",
  "created_at",
  "updated_at",
].join(", ");

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatSek(amountMinor: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function toReviewStatus(value: string): QuarterlyReviewStatus {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  return "draft";
}

function getCurrentQuarterPeriod(now: Date): {
  periodStart: string;
  periodEnd: string;
  quarterLabel: string;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const quarterIndex = Math.floor(month / 3);
  const quarter = quarterIndex + 1;

  const start = new Date(Date.UTC(year, quarterIndex * 3, 1));
  const end = new Date(Date.UTC(year, quarterIndex * 3 + 3, 0));

  return {
    periodStart: toIsoDate(start),
    periodEnd: toIsoDate(end),
    quarterLabel: `Q${quarter} ${year}`,
  };
}

function normalizeRecommendations(value: unknown): QuarterlyReviewRecommendationView[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const output: QuarterlyReviewRecommendationView[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const priority = entry.priority;
    const actionType = entry.actionType;
    const title = entry.title;
    const description = entry.description;
    const estimatedImpact = entry.estimatedImpact;

    if (
      (priority !== "critical" &&
        priority !== "high" &&
        priority !== "medium" &&
        priority !== "low") ||
      (actionType !== "proposal" &&
        actionType !== "research" &&
        actionType !== "monitor" &&
        actionType !== "discuss") ||
      typeof title !== "string" ||
      typeof description !== "string"
    ) {
      continue;
    }

    output.push({
      priority,
      actionType,
      title,
      description,
      estimatedImpact: typeof estimatedImpact === "string" ? estimatedImpact : null,
    });
  }

  return output;
}

function normalizeUpcomingEvents(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is Record<string, unknown> => isRecord(entry));
}

export class ReviewService {
  async generate(authContext: AuthContext, input: GenerateReviewInput): Promise<ReviewGenerateView> {
    const membership = await this.requireHouseholdMembership(
      authContext.supabase,
      input.householdId,
      authContext.user.id,
    );

    if (!householdWritableRoles.includes(membership.role)) {
      throw new ServiceError("FORBIDDEN", "You are not allowed to generate quarterly reviews");
    }

    const now = new Date();
    const { periodStart, periodEnd, quarterLabel } = getCurrentQuarterPeriod(now);
    const existing = await this.findQuarterReview(
      authContext.supabase,
      input.householdId,
      periodStart,
      periodEnd,
    );

    if (existing) {
      return {
        reviewId: existing.id,
        status: "generating",
        estimatedSeconds: 30,
      };
    }

    const metrics = await this.computeMetrics(
      authContext.supabase,
      input.householdId,
      periodStart,
      periodEnd,
    );
    const recommendations = this.buildRecommendations(metrics);

    const { data, error } = await authContext.supabase
      .from("quarterly_reviews")
      .insert({
        household_id: input.householdId,
        period_start: periodStart,
        period_end: periodEnd,
        quarter_label: quarterLabel,
        net_worth_start: metrics.netWorthStart,
        net_worth_end: metrics.netWorthEnd,
        net_worth_change: metrics.netWorthChange,
        market_returns_amount: metrics.marketReturnsAmount,
        net_savings_amount: metrics.netSavingsAmount,
        debt_reduction_amount: metrics.debtReductionAmount,
        fees_drag_amount: metrics.feesDragAmount,
        narrative: this.buildNarrative(quarterLabel, metrics),
        recommendations,
        status: "draft",
        generated_at: now.toISOString(),
      })
      .select(reviewSelectColumns)
      .single();

    if (error) {
      throw error;
    }

    const review = data as unknown as QuarterlyReviewRow;
    await this.writeAuditLog(authContext, {
      householdId: review.household_id,
      action: "review.generated",
      entityType: "review",
      entityId: review.id,
      changes: {
        status: { old: null, new: review.status },
        quarterLabel: { old: null, new: review.quarter_label },
      },
      metadata: {
        periodStart,
        periodEnd,
        deterministic: true,
      },
    });

    return {
      reviewId: review.id,
      status: "generating",
      estimatedSeconds: 30,
    };
  }

  async getById(authContext: AuthContext, reviewId: string): Promise<QuarterlyReviewView> {
    const review = await this.getReviewRow(authContext.supabase, reviewId);
    if (!review) {
      throw new ServiceError("NOT_FOUND", "Quarterly review was not found");
    }

    await this.requireHouseholdMembership(authContext.supabase, review.household_id, authContext.user.id);
    return this.mapReview(review);
  }

  async list(authContext: AuthContext, householdId: string): Promise<QuarterlyReviewView[]> {
    await this.requireHouseholdMembership(authContext.supabase, householdId, authContext.user.id);

    const { data, error } = await authContext.supabase
      .from("quarterly_reviews")
      .select(reviewSelectColumns)
      .eq("household_id", householdId)
      .order("period_end", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as QuarterlyReviewRow[]).map((row) => this.mapReview(row));
  }

  async getPdf(authContext: AuthContext, reviewId: string): Promise<QuarterlyReviewPdfView> {
    const review = await this.getReviewRow(authContext.supabase, reviewId);
    if (!review) {
      throw new ServiceError("NOT_FOUND", "Quarterly review was not found");
    }

    await this.requireHouseholdMembership(authContext.supabase, review.household_id, authContext.user.id);

    if (toReviewStatus(review.status) !== "published") {
      throw new ServiceError("REVIEW_PDF_NOT_READY", "Quarterly review PDF is not generated yet", {
        reviewId: review.id,
      });
    }

    const bucket = process.env.REVIEW_PDF_BUCKET?.trim() || "reviews";
    const storagePath = `${review.household_id}/${review.id}.pdf`;
    const expiresInSeconds = 15 * 60;
    const { data, error } = await authContext.supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new ServiceError("REVIEW_PDF_NOT_READY", "Quarterly review PDF is not generated yet", {
        reviewId: review.id,
      });
    }

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const fileName = `fyrk-quarterly-review-${review.quarter_label
      .toLowerCase()
      .replace(/\s+/g, "-")}.pdf`;

    return {
      reviewId: review.id,
      downloadUrl: data.signedUrl,
      expiresAt,
      fileName,
      status: "ready",
    };
  }

  private async computeMetrics(
    supabase: SupabaseClient,
    householdId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ReviewMetrics> {
    const { data: withinPeriod, error: periodError } = await supabase
      .from("household_snapshots")
      .select("snapshot_date, total_net_worth, total_liabilities")
      .eq("household_id", householdId)
      .gte("snapshot_date", periodStart)
      .lte("snapshot_date", periodEnd)
      .order("snapshot_date", { ascending: true });

    if (periodError) {
      throw periodError;
    }

    const rows = (withinPeriod ?? []) as HouseholdSnapshotRow[];
    const startFallback = await this.findSnapshotAtOrBefore(supabase, householdId, periodStart);
    const endFallback = await this.findSnapshotAtOrBefore(supabase, householdId, periodEnd);

    const startSnapshot = rows[0] ?? startFallback ?? endFallback;
    const endSnapshot = rows[rows.length - 1] ?? endFallback ?? startFallback;

    const netWorthStart = Math.round(toNumber(startSnapshot?.total_net_worth));
    const netWorthEnd = Math.round(toNumber(endSnapshot?.total_net_worth));
    const netWorthChange = netWorthEnd - netWorthStart;

    const liabilitiesStart = Math.round(toNumber(startSnapshot?.total_liabilities));
    const liabilitiesEnd = Math.round(toNumber(endSnapshot?.total_liabilities));
    const debtReductionAmount = Math.max(0, liabilitiesStart - liabilitiesEnd);

    const cashflow = await this.computeCashflowAttribution(
      supabase,
      householdId,
      periodStart,
      periodEnd,
    );
    const marketReturnsAmount =
      netWorthChange - cashflow.netSavingsAmount - debtReductionAmount + cashflow.feesDragAmount;

    return {
      netWorthStart,
      netWorthEnd,
      netWorthChange,
      marketReturnsAmount,
      netSavingsAmount: cashflow.netSavingsAmount,
      debtReductionAmount,
      feesDragAmount: cashflow.feesDragAmount,
    };
  }

  private async computeCashflowAttribution(
    supabase: SupabaseClient,
    householdId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ netSavingsAmount: number; feesDragAmount: number }> {
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (accountsError) {
      throw accountsError;
    }

    const accountIds = (accounts ?? [])
      .map((row) => (isRecord(row) && typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => id !== null);

    if (accountIds.length === 0) {
      return {
        netSavingsAmount: 0,
        feesDragAmount: 0,
      };
    }

    const { data: transactions, error: transactionError } = await supabase
      .from("transactions")
      .select("type, amount, fee_amount")
      .in("account_id", accountIds)
      .gte("transaction_date", periodStart)
      .lte("transaction_date", periodEnd)
      .is("deleted_at", null);

    if (transactionError) {
      throw transactionError;
    }

    let netSavingsAmount = 0;
    let feesDragAmount = 0;

    for (const row of (transactions ?? []) as TransactionRow[]) {
      const amount = Math.round(Math.abs(toNumber(row.amount)));
      const feeAmount = Math.round(Math.abs(toNumber(row.fee_amount)));

      if (row.type === "deposit" || row.type === "interest" || row.type === "dividend") {
        netSavingsAmount += amount;
      } else if (row.type === "withdrawal" || row.type === "tax") {
        netSavingsAmount -= amount;
      }

      if (row.type === "fee") {
        feesDragAmount += amount;
      }

      feesDragAmount += feeAmount;
    }

    return {
      netSavingsAmount,
      feesDragAmount,
    };
  }

  private async findSnapshotAtOrBefore(
    supabase: SupabaseClient,
    householdId: string,
    date: string,
  ): Promise<HouseholdSnapshotRow | null> {
    const { data, error } = await supabase
      .from("household_snapshots")
      .select("snapshot_date, total_net_worth, total_liabilities")
      .eq("household_id", householdId)
      .lte("snapshot_date", date)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as unknown as HouseholdSnapshotRow | null) ?? null;
  }

  private async findQuarterReview(
    supabase: SupabaseClient,
    householdId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<QuarterlyReviewRow | null> {
    const { data, error } = await supabase
      .from("quarterly_reviews")
      .select(reviewSelectColumns)
      .eq("household_id", householdId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as unknown as QuarterlyReviewRow | null) ?? null;
  }

  private buildNarrative(quarterLabel: string, metrics: ReviewMetrics): string {
    const direction = metrics.netWorthChange >= 0 ? "increased" : "decreased";

    return [
      `${quarterLabel} household net worth ${direction} by ${formatSek(Math.abs(metrics.netWorthChange))}.`,
      `Net savings contributed ${formatSek(metrics.netSavingsAmount)} and fees reduced outcomes by ${formatSek(metrics.feesDragAmount)}.`,
      `This review was generated from deterministic financial data.`,
    ].join(" ");
  }

  private buildRecommendations(metrics: ReviewMetrics): QuarterlyReviewRecommendationView[] {
    const recommendations: QuarterlyReviewRecommendationView[] = [];

    if (metrics.feesDragAmount > 0) {
      recommendations.push({
        priority: metrics.feesDragAmount > 200_000 ? "high" : "medium",
        title: "Review fees and account costs",
        description: "Compare wrappers, product fees, and execution costs to lower long-term drag.",
        actionType: "proposal",
        estimatedImpact: `Potential annual savings around ${formatSek(metrics.feesDragAmount * 4)}.`,
      });
    }

    if (metrics.netSavingsAmount < 0) {
      recommendations.push({
        priority: "high",
        title: "Stabilize household net savings",
        description: "Current quarter outflows exceeded inflows. Revisit recurring spend and transfer plans.",
        actionType: "monitor",
        estimatedImpact: `Close at least ${formatSek(Math.abs(metrics.netSavingsAmount))} next quarter.`,
      });
    }

    if (metrics.marketReturnsAmount < 0) {
      recommendations.push({
        priority: "medium",
        title: "Rebalance risk exposure",
        description: "Market contribution was negative. Reassess concentration and match exposure with risk tolerance.",
        actionType: "research",
        estimatedImpact: null,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: "low",
        title: "Maintain current plan",
        description: "No urgent issues detected for this quarter. Continue tracking the same strategy.",
        actionType: "monitor",
        estimatedImpact: null,
      });
    }

    return recommendations.slice(0, 3);
  }

  private mapReview(row: QuarterlyReviewRow): QuarterlyReviewView {
    return {
      id: row.id,
      householdId: row.household_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      quarterLabel: row.quarter_label,
      netWorthStart: Math.round(toNumber(row.net_worth_start)),
      netWorthEnd: Math.round(toNumber(row.net_worth_end)),
      netWorthChange: Math.round(toNumber(row.net_worth_change)),
      marketReturnsAmount: Math.round(toNumber(row.market_returns_amount)),
      netSavingsAmount: Math.round(toNumber(row.net_savings_amount)),
      debtReductionAmount: Math.round(toNumber(row.debt_reduction_amount)),
      feesDragAmount: Math.round(toNumber(row.fees_drag_amount)),
      narrative: row.narrative,
      recommendations: normalizeRecommendations(row.recommendations),
      fitnessScore: row.fitness_score,
      fitnessComponents: isRecord(row.fitness_components) ? row.fitness_components : null,
      upcomingEvents: normalizeUpcomingEvents(row.upcoming_events),
      status: toReviewStatus(row.status),
      generatedAt: row.generated_at,
      publishedAt: row.published_at,
      timelineEntryId: row.timeline_entry_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async getReviewRow(
    supabase: SupabaseClient,
    reviewId: string,
  ): Promise<QuarterlyReviewRow | null> {
    const { data, error } = await supabase
      .from("quarterly_reviews")
      .select(reviewSelectColumns)
      .eq("id", reviewId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as unknown as QuarterlyReviewRow | null) ?? null;
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

    return data as unknown as HouseholdMemberRow;
  }

  private async writeAuditLog(
    authContext: AuthContext,
    input: {
      householdId: string;
      action: string;
      entityType: string;
      entityId: string;
      changes?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const { error } = await authContext.supabase.from("audit_log").insert({
      household_id: input.householdId,
      user_id: authContext.user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      changes: input.changes ?? {},
      metadata: input.metadata ?? {},
    });

    if (error) {
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
