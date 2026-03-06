export const householdRoles = ["owner", "admin", "member", "viewer"] as const;
export type HouseholdRole = (typeof householdRoles)[number];

export const householdManageableRoles = ["admin", "member", "viewer"] as const;
export type HouseholdManageableRole = (typeof householdManageableRoles)[number];

export const householdMemberStatuses = ["active", "invited", "removed"] as const;
export type HouseholdMemberStatus = (typeof householdMemberStatuses)[number];

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  baseCurrency: string;
  onboardingCompleted: boolean;
}

export interface SessionHouseholdSummary {
  id: string;
  name: string;
  role: HouseholdRole;
  memberCount: number;
}

export interface HouseholdMemberView {
  id: string;
  userId: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
  displayName: string | null;
  email: string | null;
  invitedEmail: string | null;
  joinedAt: string | null;
}

export interface HouseholdView {
  id: string;
  name: string;
  type: string;
  baseCurrency: string;
  members: HouseholdMemberView[];
  createdAt: string;
}

export const accountTypes = [
  "investment",
  "savings",
  "pension",
  "loan",
  "mortgage",
  "insurance",
] as const;
export type AccountType = (typeof accountTypes)[number];

export const accountWrapperTypes = [
  "ISK",
  "KF",
  "depa",
  "PPM",
  "tjanstepension",
  "private_pension",
] as const;
export type AccountWrapperType = (typeof accountWrapperTypes)[number];

export const accountVisibilities = ["full", "amount_hidden", "private"] as const;
export type AccountVisibility = (typeof accountVisibilities)[number];

export const accountSyncSources = ["manual", "csv", "psd2", "fida"] as const;
export type AccountSyncSource = (typeof accountSyncSources)[number];

export const accountTransactionTypes = [
  "buy",
  "sell",
  "dividend",
  "deposit",
  "withdrawal",
  "fee",
  "interest",
  "transfer",
  "tax",
] as const;
export type AccountTransactionType = (typeof accountTransactionTypes)[number];

export const balanceSheetHistoryPeriods = ["1m", "3m", "6m", "12m", "24m", "all"] as const;
export type BalanceSheetHistoryPeriod = (typeof balanceSheetHistoryPeriods)[number];

export const importFormats = ["avanza", "nordnet", "unknown"] as const;
export type ImportFormat = (typeof importFormats)[number];

export const importStatuses = ["preview", "confirmed", "failed", "cancelled", "expired"] as const;
export type ImportStatus = (typeof importStatuses)[number];

export interface AccountSummaryView {
  id: string;
  householdId: string;
  name: string;
  providerId: string;
  providerName: string;
  accountType: AccountType;
  wrapperType: AccountWrapperType | null;
  currency: string;
  visibility: AccountVisibility;
  ownerDisplayName: string;
  isOwn: boolean;
  totalValue: number | null;
  holdingsCount: number;
  lastSynced: string | null;
  syncSource: AccountSyncSource;
}

export interface AccountDetailView extends AccountSummaryView {
  createdAt: string;
  updatedAt: string;
}

export interface AccountHoldingView {
  id: string;
  instrument: {
    id: string;
    isin: string | null;
    ticker: string | null;
    name: string;
    assetClass: string;
    currency: string;
  };
  quantity: number;
  averageCost: number | null;
  marketValue: number | null;
  valueCurrency: string;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  asOfDate: string;
}

export interface AccountTransactionView {
  id: string;
  transactionDate: string;
  type: AccountTransactionType;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  currency: string;
}

export interface AccountTransactionsMeta {
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface BalanceSheetMemberNetWorthView {
  userId: string;
  displayName: string;
  netWorth: number;
  assets?: number;
  liabilities?: number;
}

export interface BalanceSheetAccountTypeBreakdownView {
  type: AccountType | "other";
  value: number;
}

export interface BalanceSheetWrapperTypeBreakdownView {
  wrapperType: string;
  value: number;
}

export interface BalanceSheetByAssetClassView {
  class: string;
  value: number;
  pct: number;
  percentage?: number;
  memberBreakdown?: Record<string, number>;
}

export interface BalanceSheetByGeographyView {
  country: string;
  value: number;
  pct: number;
  percentage?: number;
  memberBreakdown?: Record<string, number>;
}

export interface BalanceSheetByCurrencyView {
  currency: string;
  value: number;
  pct: number;
  percentage?: number;
  memberBreakdown?: Record<string, number>;
}

export interface BalanceSheetBySectorView {
  sector: string;
  value: number;
  pct: number;
  percentage?: number;
  memberBreakdown?: Record<string, number>;
}

export interface BalanceSheetConcentrationRiskView {
  type: "single_holding" | "single_sector" | "single_currency" | "single_country";
  name: string;
  percentage: number;
  severity: "info" | "warning" | "critical";
}

export interface BalanceSheetDataQualityView {
  coveragePct: number;
  staleAccounts: number;
  lastFullUpdate: string | null;
  score?: "high" | "medium" | "low";
  coveragePercent?: number;
  staleAccountIds?: string[];
  missingPrices?: string[];
  estimatedValues?: string[];
  missingValuationAccountIds?: string[];
  staleFxRates?: boolean;
}

export interface BalanceSheetAssumptionValueView {
  value: number;
  source: "system_default" | "user_override" | "historical_derived";
}

export interface BalanceSheetAssumptionsView {
  sourceTier: "system_default" | "user_override" | "historical_derived";
  assumptions: {
    equityReturn: BalanceSheetAssumptionValueView;
    fixedIncomeReturn: BalanceSheetAssumptionValueView;
    cashReturn: BalanceSheetAssumptionValueView;
    inflation: BalanceSheetAssumptionValueView;
    salaryGrowth: BalanceSheetAssumptionValueView;
    monthlyExpenses: BalanceSheetAssumptionValueView;
    governmentBorrowingRate: BalanceSheetAssumptionValueView;
    staleAccountDays: BalanceSheetAssumptionValueView;
    staleFxHours: BalanceSheetAssumptionValueView;
  };
}

export interface BalanceSheetMetadataView {
  calculatedAt: string;
  assumptions: BalanceSheetAssumptionsView;
  fx: {
    source: string;
    asOfDate: string | null;
    stale: boolean;
  };
  deterministicPayload: {
    netWorth: {
      totalNetWorth: number;
      totalAssets: number;
      totalLiabilities: number;
      byMember: Record<string, { assets: number; liabilities: number; netWorth: number }>;
      byAccountType: Record<string, number>;
      byWrapperType: Record<string, number>;
      liquidAssets: number;
      illiquidAssets: number;
    };
    allocation: {
      byAssetClass: Array<{
        category: string;
        value: number;
        percentage: number;
        memberBreakdown?: Record<string, number>;
      }>;
      byGeography: Array<{
        category: string;
        value: number;
        percentage: number;
        memberBreakdown?: Record<string, number>;
      }>;
      byCurrency: Array<{
        category: string;
        value: number;
        percentage: number;
        memberBreakdown?: Record<string, number>;
      }>;
      bySector: Array<{
        category: string;
        value: number;
        percentage: number;
        memberBreakdown?: Record<string, number>;
      }>;
      concentrationRisks: BalanceSheetConcentrationRiskView[];
    };
    dataQuality: {
      score: "high" | "medium" | "low";
      coveragePercent: number;
      staleAccountIds: string[];
      missingPrices: string[];
      estimatedValues: string[];
      missingValuationAccountIds: string[];
      staleFxRates: boolean;
    };
  };
}

export interface BalanceSheetHistoryMetadataView {
  calculatedAt: string;
  assumptions: BalanceSheetAssumptionsView;
  source: "household_snapshots" | "account_snapshots";
  fallbackReason:
    | "no_viewable_accounts"
    | "household_snapshots_empty"
    | "household_snapshots_unavailable"
    | "visibility_restricted"
    | null;
}

export interface BalanceSheetView {
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  currency: string;
  asOfDate: string;
  byMember: BalanceSheetMemberNetWorthView[];
  byAccountType: BalanceSheetAccountTypeBreakdownView[];
  byWrapperType: BalanceSheetWrapperTypeBreakdownView[];
  liquidAssets: number;
  illiquidAssets: number;
  allocation: {
    byAssetClass: BalanceSheetByAssetClassView[];
    byGeography: BalanceSheetByGeographyView[];
    byCurrency: BalanceSheetByCurrencyView[];
    bySector: BalanceSheetBySectorView[];
  };
  concentrationRisks: BalanceSheetConcentrationRiskView[];
  dataQuality: BalanceSheetDataQualityView;
  metadata: BalanceSheetMetadataView;
}

export interface BalanceSheetHistoryPointView {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

export interface BalanceSheetHistoryView {
  period: BalanceSheetHistoryPeriod;
  currency: string;
  history: BalanceSheetHistoryPointView[];
  change: {
    amount: number;
    pct: number | null;
  };
  metadata: BalanceSheetHistoryMetadataView;
}

export interface ImportPreviewHoldingView {
  name: string;
  ticker: string | null;
  isin: string | null;
  quantity: number | null;
  marketValue: number | null;
  valueCurrency: string | null;
  asOfDate: string | null;
}

export interface ImportPreviewTransactionView {
  transactionDate: string | null;
  type: string | null;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  currency: string | null;
}

export interface CsvImportPreviewView {
  importId: string;
  format: Exclude<ImportFormat, "unknown">;
  rowsParsed: number;
  holdingsDetected: number;
  transactionsDetected: number;
  instrumentsResolved: number;
  instrumentsUnresolved: number;
  preview: {
    holdings: ImportPreviewHoldingView[];
    transactions: ImportPreviewTransactionView[];
  };
  status: "preview";
}

export interface CsvImportConfirmView {
  holdingsCreated: number;
  transactionsCreated: number;
  accountUpdated: boolean;
}

export const quarterlyReviewStatuses = ["draft", "published", "archived"] as const;
export type QuarterlyReviewStatus = (typeof quarterlyReviewStatuses)[number];

export interface QuarterlyReviewRecommendationView {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  actionType: "proposal" | "research" | "monitor" | "discuss";
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

export const proposalCategories = ["investment", "insurance", "debt", "savings", "other"] as const;
export type ProposalCategory = (typeof proposalCategories)[number];

export const proposalStatuses = ["pending", "approved", "rejected", "withdrawn"] as const;
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
