import type { ApiEnvelope } from "../accounts/contracts";
import { requestWithFallback } from "../sprint4/http";
import type {
  CreateProposalInput,
  ProposalActorView,
  ProposalCommentView,
  ProposalStatus,
  ProposalView,
  QuarterlyReviewPdfView,
  QuarterlyReviewView,
  ReviewGenerateView,
} from "./contracts";
import {
  addProposalCommentFallback,
  approveProposalFallback,
  createProposalFallback,
  generateReviewFallback,
  getReviewFallback,
  getReviewPdfFallback,
  listProposalCommentsFallback,
  listProposalsFallback,
  listReviewsFallback,
  rejectProposalFallback,
} from "./fallback";

export const listReviews = async (
  householdId: string,
): Promise<ApiEnvelope<QuarterlyReviewView[]>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await listReviewsFallback(householdId),
    }),
    init: {
      method: "GET",
    },
    path: `/api/reviews?householdId=${encodeURIComponent(householdId)}`,
  });

export const getReview = async (
  householdId: string,
  reviewId: string,
): Promise<ApiEnvelope<QuarterlyReviewView>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await getReviewFallback(householdId, reviewId),
    }),
    init: {
      method: "GET",
    },
    path: `/api/reviews/${encodeURIComponent(reviewId)}`,
  });

export const generateReview = async (
  householdId: string,
): Promise<ApiEnvelope<ReviewGenerateView>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await generateReviewFallback(householdId),
    }),
    init: {
      body: JSON.stringify({ householdId }),
      method: "POST",
    },
    path: "/api/reviews/generate",
  });

export const getReviewPdf = async (
  householdId: string,
  reviewId: string,
): Promise<ApiEnvelope<QuarterlyReviewPdfView>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await getReviewPdfFallback(householdId, reviewId),
    }),
    init: {
      method: "GET",
    },
    path: `/api/reviews/${encodeURIComponent(reviewId)}/pdf`,
  });

interface ListProposalsInput {
  householdId: string;
  statuses?: ProposalStatus[];
}

export const listProposals = async ({
  householdId,
  statuses = [],
}: ListProposalsInput): Promise<ApiEnvelope<ProposalView[]>> => {
  const statusQuery = statuses.length > 0 ? `&status=${encodeURIComponent(statuses.join(","))}` : "";

  return requestWithFallback({
    fallback: async () => ({
      data: await listProposalsFallback(householdId, statuses),
    }),
    init: {
      method: "GET",
    },
    path: `/api/proposals?householdId=${encodeURIComponent(householdId)}${statusQuery}`,
  });
};

export const createProposal = async (
  input: CreateProposalInput,
  actor: ProposalActorView,
): Promise<ApiEnvelope<ProposalView>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await createProposalFallback(input, actor),
    }),
    init: {
      body: JSON.stringify(input),
      method: "POST",
    },
    path: "/api/proposals",
  });

export const approveProposal = async (
  householdId: string,
  proposalId: string,
  actor: ProposalActorView,
): Promise<ApiEnvelope<ProposalView>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await approveProposalFallback(householdId, proposalId, actor),
    }),
    init: {
      method: "POST",
    },
    path: `/api/proposals/${encodeURIComponent(proposalId)}/approve`,
  });

export const rejectProposal = async (
  householdId: string,
  proposalId: string,
  reason: string,
  actor: ProposalActorView,
): Promise<ApiEnvelope<ProposalView>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await rejectProposalFallback(householdId, proposalId, reason, actor),
    }),
    init: {
      body: JSON.stringify({ reason }),
      method: "POST",
    },
    path: `/api/proposals/${encodeURIComponent(proposalId)}/reject`,
  });

export const listProposalComments = async (
  householdId: string,
  proposalId: string,
): Promise<ApiEnvelope<ProposalCommentView[]>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await listProposalCommentsFallback(householdId, proposalId),
    }),
    init: {
      method: "GET",
    },
    path: `/api/proposals/${encodeURIComponent(proposalId)}/comments`,
  });

export const addProposalComment = async (
  householdId: string,
  proposalId: string,
  content: string,
  actor: ProposalActorView,
): Promise<ApiEnvelope<ProposalCommentView>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await addProposalCommentFallback(householdId, proposalId, content, actor),
    }),
    init: {
      body: JSON.stringify({ content }),
      method: "POST",
    },
    path: `/api/proposals/${encodeURIComponent(proposalId)}/comments`,
  });
