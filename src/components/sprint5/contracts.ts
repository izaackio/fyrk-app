export type QuarterlyReviewStatus = "draft" | "published" | "archived";

export type QuarterlyReviewRecommendationPriority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type QuarterlyReviewRecommendationActionType =
  | "proposal"
  | "research"
  | "monitor"
  | "discuss";

export interface QuarterlyReviewRecommendationView {
  priority: QuarterlyReviewRecommendationPriority;
  actionType: QuarterlyReviewRecommendationActionType;
  title: string;
  description: string;
  estimatedImpact: string | null;
}

export interface QuarterlyReviewView {
  id: string;
  householdId: string;
  periodStart: string;
  periodEnd: string;
  quarterLabel: string;
  netWorthStart: number;
  netWorthEnd: number;
  netWorthChange: number;
  marketReturnsAmount: number;
  netSavingsAmount: number;
  debtReductionAmount: number;
  feesDragAmount: number;
  narrative: string | null;
  recommendations: QuarterlyReviewRecommendationView[];
  fitnessScore: number | null;
  fitnessComponents: Record<string, unknown> | null;
  upcomingEvents: Record<string, unknown>[];
  status: QuarterlyReviewStatus;
  generatedAt: string | null;
  publishedAt: string | null;
  timelineEntryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewGenerateView {
  reviewId: string;
  status: "generating";
  estimatedSeconds: number;
}

export interface QuarterlyReviewPdfView {
  reviewId: string;
  downloadUrl: string;
  expiresAt: string;
  fileName: string;
  status: "ready";
}

export const proposalCategories = [
  "investment",
  "insurance",
  "debt",
  "savings",
  "other",
] as const;

export type ProposalCategory = (typeof proposalCategories)[number];

export const proposalStatuses = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number];

export interface ProposalActorView {
  id: string;
  displayName: string;
}

export interface ProposalCommentView {
  id: string;
  proposalId: string;
  userId: string;
  content: string;
  createdAt: string;
  author: ProposalActorView;
}

export type ProposalImpactAnalysisView = Record<string, unknown>;

export interface ProposalView {
  id: string;
  householdId: string;
  title: string;
  description: string;
  category: ProposalCategory;
  impactAnalysis: ProposalImpactAnalysisView;
  status: ProposalStatus;
  requiresApprovalFrom: string[];
  approvedBy: string[];
  rejectedBy: string | null;
  resolvedAt: string | null;
  timelineEntryId: string | null;
  commentsCount: number;
  createdBy: ProposalActorView;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProposalInput {
  householdId: string;
  title: string;
  description: string;
  category: ProposalCategory;
}
