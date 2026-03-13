import { ApiClientError } from "../sprint4/http";
import { createTimelineEntryFallback } from "../sprint4/fallback";
import type {
  CreateProposalInput,
  ProposalActorView,
  ProposalCategory,
  ProposalCommentView,
  ProposalImpactAnalysisView,
  ProposalStatus,
  ProposalView,
  QuarterlyReviewRecommendationView,
  QuarterlyReviewView,
  ReviewGenerateView,
  QuarterlyReviewPdfView,
} from "./contracts";

const STORAGE_KEY = "fyrk:sprint5:governance-state";
const SPRINT1_STORAGE_KEY = "fyrk:sprint1:ui-state";
const SECONDARY_APPROVER_PLACEHOLDER = "__secondary_household_member__";
const API_DELAY_MS = 280;

interface HouseholdState {
  commentsByProposalId: Record<string, ProposalCommentView[]>;
  proposals: ProposalView[];
  reviews: QuarterlyReviewView[];
}

interface Sprint5State {
  households: Record<string, HouseholdState>;
}

const DEFAULT_STATE: Sprint5State = {
  households: {},
};

interface Sprint1HouseholdSummary {
  id: string;
  role: "owner" | "admin" | "member";
  memberCount: number;
}

interface Sprint1UiState {
  households?: Sprint1HouseholdSummary[];
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return randomId;
  }

  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readState = (): Sprint5State => {
  if (typeof window === "undefined") {
    return clone(DEFAULT_STATE);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return clone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw) as Sprint5State;
    if (!parsed || typeof parsed !== "object") {
      return clone(DEFAULT_STATE);
    }

    return {
      households:
        parsed.households && typeof parsed.households === "object"
          ? parsed.households
          : {},
    };
  } catch {
    return clone(DEFAULT_STATE);
  }
};

const writeState = (state: Sprint5State): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const ensureHouseholdState = (
  state: Sprint5State,
  householdId: string,
): HouseholdState => {
  const existing = state.households[householdId];
  if (existing) {
    return existing;
  }

  const next: HouseholdState = {
    commentsByProposalId: {},
    proposals: [],
    reviews: [],
  };

  state.households[householdId] = next;
  return next;
};

const readSprint1HouseholdSummary = (
  householdId: string,
): Sprint1HouseholdSummary | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SPRINT1_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Sprint1UiState;
    if (!Array.isArray(parsed.households)) {
      return null;
    }

    const match = parsed.households.find((household) => household.id === householdId);
    if (!match) {
      return null;
    }

    return {
      ...match,
      memberCount:
        Number.isFinite(match.memberCount) && match.memberCount > 0
          ? Math.round(match.memberCount)
          : 1,
    };
  } catch {
    return null;
  }
};

const resolveRequiredApprovers = (
  householdId: string,
  creatorId: string,
): string[] => {
  const summary = readSprint1HouseholdSummary(householdId);
  if (!summary || summary.memberCount < 2) {
    return [creatorId];
  }

  return [creatorId, SECONDARY_APPROVER_PLACEHOLDER];
};

const canActorResolveProposal = (
  proposal: ProposalView,
  actorId: string,
): boolean =>
  proposal.requiresApprovalFrom.includes(actorId) ||
  (proposal.requiresApprovalFrom.includes(SECONDARY_APPROVER_PLACEHOLDER) &&
    actorId !== proposal.createdBy.id);

const hasAllRequiredApprovals = (
  proposal: ProposalView,
  approvedBy: string[],
): boolean =>
  proposal.requiresApprovalFrom.every((requiredApproverId) => {
    if (requiredApproverId === SECONDARY_APPROVER_PLACEHOLDER) {
      return approvedBy.some((approverId) => approverId !== proposal.createdBy.id);
    }

    return approvedBy.includes(requiredApproverId);
  });

const timelineCategoryByProposalCategory: Record<ProposalCategory, "investing" | "debt" | "insurance" | "planning" | "other"> = {
  debt: "debt",
  insurance: "insurance",
  investment: "investing",
  other: "other",
  savings: "planning",
};

const parseAmountMinor = (text: string): number | null => {
  const compact = text.replace(/\s+/g, "");
  const match = compact.match(/(\d+(?:[.,]\d+)?)(k|m|mn)?/i);

  if (!match) {
    return null;
  }

  const rawAmount = match[1];
  if (!rawAmount) {
    return null;
  }

  const numeric = Number.parseFloat(rawAmount.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const suffix = (match[2] ?? "").toLowerCase();
  const multiplier = suffix === "k" ? 1_000 : suffix === "m" || suffix === "mn" ? 1_000_000 : 1;
  return Math.round(numeric * multiplier * 100);
};

const roundTo = (value: number, decimals = 2): number => {
  const factor = 10 ** Math.max(0, decimals);
  return Math.round(value * factor) / factor;
};

const buildImpactAnalysis = (input: CreateProposalInput): ProposalImpactAnalysisView => {
  const parsedAmountMinor = parseAmountMinor(`${input.title} ${input.description}`);

  const componentByCategory: Record<ProposalCategory, string> = {
    investment: "growth",
    insurance: "protection",
    debt: "efficiency",
    savings: "buffer",
    other: "trajectory",
  };

  const pointsMagnitude = parsedAmountMinor
    ? Math.max(2, Math.min(12, Math.round(parsedAmountMinor / 5_000_000)))
    : 3;
  const points = input.category === "debt" ? Math.min(10, pointsMagnitude + 1) : pointsMagnitude;

  const allocationTo = parsedAmountMinor
    ? roundTo(Math.max(0.5, Math.min(25, parsedAmountMinor / 25_000_000)), 2)
    : 1.5;

  const riskLevel =
    parsedAmountMinor === null ? "moderate" : parsedAmountMinor >= 50_000_000 ? "elevated" : "moderate";

  return {
    allocationChange: {
      [input.category]: {
        from: 0,
        to: allocationTo,
      },
    },
    deterministicInputs: {
      category: input.category,
      modelVersion: "s5.fallback.v1",
      parsedAmountMinor,
    },
    fitnessImpact: `+${points} (${componentByCategory[input.category]} component)`,
    riskAssessment:
      riskLevel === "elevated"
        ? "Larger capital move. Validate concentration and liquidity before execution."
        : "Incremental change with manageable downside under normal market conditions.",
  };
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const getCurrentQuarterPeriod = (now: Date): {
  periodStart: string;
  periodEnd: string;
  quarterLabel: string;
} => {
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
};

const hashSeed = (input: string): number => {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const buildFallbackRecommendations = (
  netSavingsAmount: number,
  marketReturnsAmount: number,
  feesDragAmount: number,
): QuarterlyReviewRecommendationView[] => {
  const recommendations: QuarterlyReviewRecommendationView[] = [];

  if (feesDragAmount > 0) {
    recommendations.push({
      actionType: "proposal",
      description: "Compare wrappers and provider costs to reduce long-term drag.",
      estimatedImpact: `Potential annual savings around ${(feesDragAmount * 4 / 100).toLocaleString("sv-SE")} SEK.`,
      priority: feesDragAmount > 250_000 ? "high" : "medium",
      title: "Review account fees",
    });
  }

  if (netSavingsAmount < 0) {
    recommendations.push({
      actionType: "monitor",
      description: "Quarter outflows exceeded inflows. Revisit recurring transfers and variable spend.",
      estimatedImpact: `Close at least ${(Math.abs(netSavingsAmount) / 100).toLocaleString("sv-SE")} SEK next quarter.`,
      priority: "high",
      title: "Stabilize net savings",
    });
  }

  if (marketReturnsAmount < 0) {
    recommendations.push({
      actionType: "research",
      description: "Returns contribution was negative. Reassess concentration and risk alignment.",
      estimatedImpact: null,
      priority: "medium",
      title: "Rebalance risk exposure",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      actionType: "discuss",
      description: "No urgent flags in this quarter. Confirm targets and keep current cadence.",
      estimatedImpact: null,
      priority: "low",
      title: "Maintain the current plan",
    });
  }

  return recommendations.slice(0, 3);
};

const appendAuditComment = ({
  actor,
  content,
  householdState,
  proposalId,
  timestamp,
}: {
  actor: ProposalActorView;
  content: string;
  householdState: HouseholdState;
  proposalId: string;
  timestamp: string;
}): void => {
  const comment: ProposalCommentView = {
    author: actor,
    content,
    createdAt: timestamp,
    id: createId(),
    proposalId,
    userId: actor.id,
  };

  const existing = householdState.commentsByProposalId[proposalId] ?? [];
  householdState.commentsByProposalId[proposalId] = [...existing, comment];
};

const findProposal = (
  householdState: HouseholdState,
  proposalId: string,
): { index: number; proposal: ProposalView } | null => {
  const index = householdState.proposals.findIndex((proposal) => proposal.id === proposalId);
  if (index === -1) {
    return null;
  }

  const proposal = householdState.proposals[index];
  if (!proposal) {
    return null;
  }

  return { index, proposal };
};

const transitionError = (message: string): ApiClientError =>
  new ApiClientError("VALIDATION_ERROR", message);

const notFoundError = (message: string): ApiClientError =>
  new ApiClientError("NOT_FOUND", message);

export const listReviewsFallback = async (
  householdId: string,
): Promise<QuarterlyReviewView[]> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);
  const sorted = [...householdState.reviews].sort((left, right) =>
    right.periodEnd.localeCompare(left.periodEnd),
  );

  return clone(sorted);
};

export const getReviewFallback = async (
  householdId: string,
  reviewId: string,
): Promise<QuarterlyReviewView> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);
  const review = householdState.reviews.find((entry) => entry.id === reviewId);

  if (!review) {
    throw notFoundError("Quarterly review was not found");
  }

  return clone(review);
};

export const generateReviewFallback = async (
  householdId: string,
): Promise<ReviewGenerateView> => {
  await wait(API_DELAY_MS + 120);

  const now = new Date();
  const period = getCurrentQuarterPeriod(now);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);

  const existing = householdState.reviews.find(
    (review) =>
      review.periodStart === period.periodStart && review.periodEnd === period.periodEnd,
  );

  if (existing) {
    return {
      estimatedSeconds: 30,
      reviewId: existing.id,
      status: "generating",
    };
  }

  const seed = hashSeed(`${householdId}:${period.quarterLabel}`);
  const netWorthStart = 12_000_000 + (seed % 5_000_000);
  const netWorthChange = ((seed % 1_900_000) - 950_000);
  const netWorthEnd = netWorthStart + netWorthChange;
  const netSavingsAmount = Math.round(((seed % 600_000) - 250_000) / 100) * 100;
  const debtReductionAmount = Math.max(0, Math.round(((seed % 450_000) - 100_000) / 100) * 100);
  const feesDragAmount = Math.max(0, Math.round((seed % 180_000) / 100) * 100);
  const marketReturnsAmount =
    netWorthChange - netSavingsAmount - debtReductionAmount + feesDragAmount;

  const review: QuarterlyReviewView = {
    createdAt: now.toISOString(),
    debtReductionAmount,
    feesDragAmount,
    fitnessComponents: null,
    fitnessScore: null,
    generatedAt: now.toISOString(),
    householdId,
    id: createId(),
    marketReturnsAmount,
    narrative:
      `${period.quarterLabel} net worth changed by ${(Math.abs(netWorthChange) / 100).toLocaleString("sv-SE")} SEK. ` +
      `This quarterly review is generated from deterministic financial data and does not infer hidden values.`,
    netSavingsAmount,
    netWorthChange,
    netWorthEnd,
    netWorthStart,
    periodEnd: period.periodEnd,
    periodStart: period.periodStart,
    publishedAt: null,
    quarterLabel: period.quarterLabel,
    recommendations: buildFallbackRecommendations(
      netSavingsAmount,
      marketReturnsAmount,
      feesDragAmount,
    ),
    status: "draft",
    timelineEntryId: null,
    upcomingEvents: [],
    updatedAt: now.toISOString(),
  };

  const timelineEntry = await createTimelineEntryFallback({
    actor: {
      displayName: "Fyrk System",
      id: "fyrk-system",
    },
    category: "planning",
    description:
      `${period.quarterLabel} quarterly review was generated from deterministic data inputs.`,
    entryDate: toIsoDate(now),
    entryType: "review",
    householdId,
    title: `${period.quarterLabel} quarterly review generated`,
  });

  review.timelineEntryId = timelineEntry.id;

  householdState.reviews.unshift(review);
  writeState(state);

  return {
    estimatedSeconds: 30,
    reviewId: review.id,
    status: "generating",
  };
};

export const getReviewPdfFallback = async (
  householdId: string,
  reviewId: string,
): Promise<QuarterlyReviewPdfView> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);
  const review = householdState.reviews.find((entry) => entry.id === reviewId);

  if (!review) {
    throw notFoundError("Quarterly review was not found");
  }

  if (review.status !== "published") {
    throw new ApiClientError("REVIEW_PDF_NOT_READY", "Quarterly review PDF is not generated yet", {
      reviewId,
    });
  }

  const content = [
    `FYRK Quarterly Review ${review.quarterLabel}`,
    "",
    review.narrative ?? "Narrative unavailable.",
  ].join("\n");

  return {
    downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    fileName: `fyrk-quarterly-review-${review.quarterLabel.toLowerCase().replace(/\s+/g, "-")}.txt`,
    reviewId,
    status: "ready",
  };
};

export const listProposalsFallback = async (
  householdId: string,
  statuses: ProposalStatus[] = [],
): Promise<ProposalView[]> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);

  const proposals = statuses.length
    ? householdState.proposals.filter((proposal) => statuses.includes(proposal.status))
    : householdState.proposals;

  return clone(
    [...proposals].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  );
};

export const createProposalFallback = async (
  input: CreateProposalInput,
  actor: ProposalActorView,
): Promise<ProposalView> => {
  await wait(API_DELAY_MS + 100);

  const state = readState();
  const householdState = ensureHouseholdState(state, input.householdId);

  const nowIso = new Date().toISOString();
  const proposal: ProposalView = {
    approvedBy: [],
    category: input.category,
    commentsCount: 0,
    createdAt: nowIso,
    createdBy: actor,
    description: input.description,
    householdId: input.householdId,
    id: createId(),
    impactAnalysis: buildImpactAnalysis(input),
    rejectedBy: null,
    requiresApprovalFrom: resolveRequiredApprovers(input.householdId, actor.id),
    resolvedAt: null,
    status: "pending",
    timelineEntryId: null,
    title: input.title,
    updatedAt: nowIso,
  };

  householdState.proposals.unshift(proposal);
  householdState.commentsByProposalId[proposal.id] = [];
  writeState(state);

  return clone(proposal);
};

export const approveProposalFallback = async (
  householdId: string,
  proposalId: string,
  actor: ProposalActorView,
): Promise<ProposalView> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);
  const located = findProposal(householdState, proposalId);

  if (!located) {
    throw notFoundError("Proposal was not found");
  }

  const { index, proposal } = located;
  if (proposal.status === "approved") {
    return clone(proposal);
  }

  if (proposal.status === "rejected" || proposal.status === "withdrawn") {
    throw transitionError("Only pending proposals can be approved");
  }

  if (!canActorResolveProposal(proposal, actor.id)) {
    throw new ApiClientError("FORBIDDEN", "Actor is not allowed to approve this proposal");
  }

  const nextApprovedBy = proposal.approvedBy.includes(actor.id)
    ? proposal.approvedBy
    : [...proposal.approvedBy, actor.id];
  const nowIso = new Date().toISOString();
  const approvalRecorded = !proposal.approvedBy.includes(actor.id);

  if (approvalRecorded) {
    appendAuditComment({
      actor,
      content: `[Audit] ${actor.displayName} approved this proposal.`,
      householdState,
      proposalId,
      timestamp: nowIso,
    });
  }

  const fullyApproved = hasAllRequiredApprovals(proposal, nextApprovedBy);
  const timelineEntryId = fullyApproved
    ? (
        await createTimelineEntryFallback({
          actor,
          category: timelineCategoryByProposalCategory[proposal.category],
          description:
            `${proposal.title} was approved. All required household approvals were recorded.`,
          entryDate: toIsoDate(new Date(nowIso)),
          entryType: "decision",
          householdId,
          title: `Proposal approved: ${proposal.title}`,
        })
      ).id
    : proposal.timelineEntryId;
  const nextComments = householdState.commentsByProposalId[proposal.id] ?? [];

  const next: ProposalView = {
    ...proposal,
    approvedBy: nextApprovedBy,
    commentsCount: nextComments.length,
    rejectedBy: null,
    resolvedAt: fullyApproved ? proposal.resolvedAt ?? nowIso : null,
    status: fullyApproved ? "approved" : "pending",
    timelineEntryId,
    updatedAt: nowIso,
  };

  householdState.proposals[index] = next;
  writeState(state);

  return clone(next);
};

export const rejectProposalFallback = async (
  householdId: string,
  proposalId: string,
  reason: string,
  actor: ProposalActorView,
): Promise<ProposalView> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);
  const located = findProposal(householdState, proposalId);

  if (!located) {
    throw notFoundError("Proposal was not found");
  }

  const { index, proposal } = located;
  if (proposal.status === "rejected") {
    return clone(proposal);
  }

  if (proposal.status === "approved" || proposal.status === "withdrawn") {
    throw transitionError("Only pending proposals can be rejected");
  }

  if (!canActorResolveProposal(proposal, actor.id)) {
    throw new ApiClientError("FORBIDDEN", "Actor is not allowed to reject this proposal");
  }

  const nowIso = new Date().toISOString();
  const rejectionComment: ProposalCommentView = {
    author: actor,
    content: reason,
    createdAt: nowIso,
    id: createId(),
    proposalId,
    userId: actor.id,
  };

  const existingComments = householdState.commentsByProposalId[proposal.id] ?? [];
  const nextComments = [...existingComments, rejectionComment];
  householdState.commentsByProposalId[proposal.id] = nextComments;
  const timelineEntry = await createTimelineEntryFallback({
    actor,
    category: timelineCategoryByProposalCategory[proposal.category],
    description: `${proposal.title} was rejected. Reason: ${reason.trim()}`,
    entryDate: toIsoDate(new Date(nowIso)),
    entryType: "decision",
    householdId,
    title: `Proposal rejected: ${proposal.title}`,
  });

  const next: ProposalView = {
    ...proposal,
    commentsCount: nextComments.length,
    rejectedBy: actor.id,
    resolvedAt: proposal.resolvedAt ?? nowIso,
    status: "rejected",
    timelineEntryId: timelineEntry.id,
    updatedAt: nowIso,
  };

  householdState.proposals[index] = next;
  writeState(state);

  return clone(next);
};

export const listProposalCommentsFallback = async (
  householdId: string,
  proposalId: string,
): Promise<ProposalCommentView[]> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);

  const proposalExists = householdState.proposals.some((proposal) => proposal.id === proposalId);
  if (!proposalExists) {
    throw notFoundError("Proposal was not found");
  }

  const comments = householdState.commentsByProposalId[proposalId] ?? [];
  return clone(comments);
};

export const addProposalCommentFallback = async (
  householdId: string,
  proposalId: string,
  content: string,
  actor: ProposalActorView,
): Promise<ProposalCommentView> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId);
  const located = findProposal(householdState, proposalId);

  if (!located) {
    throw notFoundError("Proposal was not found");
  }

  const nowIso = new Date().toISOString();
  const comment: ProposalCommentView = {
    author: actor,
    content,
    createdAt: nowIso,
    id: createId(),
    proposalId,
    userId: actor.id,
  };

  const currentComments = householdState.commentsByProposalId[proposalId] ?? [];
  const nextComments = [...currentComments, comment];
  householdState.commentsByProposalId[proposalId] = nextComments;

  const proposal = located.proposal;
  const nextProposal: ProposalView = {
    ...proposal,
    commentsCount: nextComments.length,
    updatedAt: nowIso,
  };

  householdState.proposals[located.index] = nextProposal;
  writeState(state);

  return clone(comment);
};
