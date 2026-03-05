"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { formatDateTime } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import { ApiClientError } from "../sprint4/http";
import {
  addProposalComment,
  approveProposal,
  createProposal,
  listProposalComments,
  listProposals,
  rejectProposal,
} from "../sprint5/client";
import {
  proposalCategories,
  type ProposalCategory,
  type ProposalCommentView,
  type ProposalStatus,
  type ProposalView,
} from "../sprint5/contracts";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import styles from "./proposal.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not complete this proposal action. Please retry.";
};

type ProposalStatusFilter = "all" | ProposalStatus;

const statusFilters: Array<{
  label: string;
  value: ProposalStatusFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Withdrawn", value: "withdrawn" },
];

const categoryLabels: Record<ProposalCategory, string> = {
  debt: "Debt",
  insurance: "Insurance",
  investment: "Investment",
  other: "Other",
  savings: "Savings",
};

const toImpactValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "n/a";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
};

const toStatusTone = (status: ProposalStatus): string => {
  if (status === "approved") {
    return styles.statusApproved ?? "";
  }

  if (status === "rejected") {
    return styles.statusRejected ?? "";
  }

  if (status === "withdrawn") {
    return styles.statusMuted ?? "";
  }

  return styles.statusPending ?? "";
};

export function ProposalExperience() {
  const {
    activeHouseholdId,
    error: householdError,
    loading: householdLoading,
    session,
  } = useHouseholdContext();

  const actor = useMemo(
    () =>
      session
        ? {
            displayName: session.user.displayName || "You",
            id: session.user.id,
          }
        : null,
    [session],
  );

  const searchParams = useSearchParams();
  const hasAppliedPrefillRef = useRef(false);

  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>("all");

  const [proposals, setProposals] = useState<ProposalView[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const selectedProposal = useMemo(
    () => proposals.find((proposal) => proposal.id === selectedProposalId) ?? null,
    [proposals, selectedProposalId],
  );

  const [comments, setComments] = useState<ProposalCommentView[]>([]);

  const [loadingProposals, setLoadingProposals] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalCategory, setProposalCategory] = useState<ProposalCategory>("other");

  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const loadProposals = useCallback(
    async (options?: { preferredProposalId?: string; statuses?: ProposalStatus[] }) => {
      if (!activeHouseholdId) {
        setProposals([]);
        setSelectedProposalId(null);
        return;
      }

      const statuses =
        options?.statuses ?? (statusFilter === "all" ? [] : ([statusFilter] as ProposalStatus[]));

      setLoadingProposals(true);
      setProposalsError(null);

      try {
        const response = await listProposals({
          householdId: activeHouseholdId,
          statuses,
        });
        const nextProposals = response.data;
        setProposals(nextProposals);

        setSelectedProposalId((current) => {
          if (
            options?.preferredProposalId &&
            nextProposals.some((proposal) => proposal.id === options.preferredProposalId)
          ) {
            return options.preferredProposalId;
          }

          if (current && nextProposals.some((proposal) => proposal.id === current)) {
            return current;
          }

          return nextProposals[0]?.id ?? null;
        });
      } catch (error) {
        setProposalsError(describeError(error));
      } finally {
        setLoadingProposals(false);
      }
    },
    [activeHouseholdId, statusFilter],
  );

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  useEffect(() => {
    const prefStatus = searchParams.get("status")?.trim() ?? "";
    if (!prefStatus) {
      return;
    }

    if (statusFilters.some((filter) => filter.value === prefStatus)) {
      setStatusFilter(prefStatus as ProposalStatusFilter);
    }
  }, [searchParams]);

  useEffect(() => {
    if (hasAppliedPrefillRef.current) {
      return;
    }

    const prefTitle = searchParams.get("title")?.trim() ?? "";
    const prefDescription = searchParams.get("description")?.trim() ?? "";
    const prefCategory = searchParams.get("category")?.trim() ?? "";

    const nextCategory = proposalCategories.includes(prefCategory as ProposalCategory)
      ? (prefCategory as ProposalCategory)
      : null;

    if (!prefTitle && !prefDescription && !nextCategory) {
      return;
    }

    hasAppliedPrefillRef.current = true;
    setShowCreateForm(true);

    if (prefTitle) {
      setProposalTitle(prefTitle);
    }

    if (prefDescription) {
      setProposalDescription(prefDescription);
    }

    if (nextCategory) {
      setProposalCategory(nextCategory);
    }
  }, [searchParams]);

  const loadComments = useCallback(async () => {
    if (!activeHouseholdId || !selectedProposalId) {
      setComments([]);
      return;
    }

    setLoadingComments(true);
    setCommentsError(null);

    try {
      const response = await listProposalComments(activeHouseholdId, selectedProposalId);
      setComments(response.data);
    } catch (error) {
      setCommentsError(describeError(error));
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [activeHouseholdId, selectedProposalId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleCreateProposal = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!activeHouseholdId || !actor) {
        return;
      }

      const title = proposalTitle.trim();
      const description = proposalDescription.trim();

      if (!title || !description) {
        setCreateError("Title and description are required.");
        return;
      }

      setCreatingProposal(true);
      setCreateError(null);
      setTransitionError(null);
      setTransitionMessage(null);

      try {
        const response = await createProposal(
          {
            category: proposalCategory,
            description,
            householdId: activeHouseholdId,
            title,
          },
          actor,
        );

        setProposalTitle("");
        setProposalDescription("");
        setProposalCategory("other");
        setShowCreateForm(false);
        setStatusFilter("pending");
        setSelectedProposalId(response.data.id);
        setTransitionMessage("Proposal created and moved to pending approval.");

        await loadProposals({
          preferredProposalId: response.data.id,
          statuses: ["pending"],
        });
      } catch (error) {
        setCreateError(describeError(error));
      } finally {
        setCreatingProposal(false);
      }
    },
    [
      activeHouseholdId,
      actor,
      loadProposals,
      proposalCategory,
      proposalDescription,
      proposalTitle,
    ],
  );

  const handleAddComment = useCallback(async () => {
    if (!activeHouseholdId || !selectedProposalId || !actor) {
      return;
    }

    const content = commentDraft.trim();
    if (!content) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const response = await addProposalComment(
        activeHouseholdId,
        selectedProposalId,
        content,
        actor,
      );

      setComments((current) => [...current, response.data]);
      setProposals((current) =>
        current.map((proposal) =>
          proposal.id === selectedProposalId
            ? {
                ...proposal,
                commentsCount: proposal.commentsCount + 1,
                updatedAt: response.data.createdAt,
              }
            : proposal,
        ),
      );
      setCommentDraft("");
    } catch (error) {
      setCommentError(describeError(error));
    } finally {
      setSubmittingComment(false);
    }
  }, [activeHouseholdId, actor, commentDraft, selectedProposalId]);

  const handleApprove = useCallback(async () => {
    if (!activeHouseholdId || !selectedProposal || !actor) {
      return;
    }

    setApproving(true);
    setTransitionMessage(null);
    setTransitionError(null);

    try {
      const response = await approveProposal(activeHouseholdId, selectedProposal.id, actor);
      if (response.data.status === "approved") {
        setTransitionMessage(`Proposal approved at ${formatDateTime(response.data.updatedAt)}.`);
      } else {
        const required = Math.max(response.data.requiresApprovalFrom.length, 1);
        setTransitionMessage(
          `Approval recorded. ${response.data.approvedBy.length}/${required} approvals complete.`,
        );
      }
      setShowRejectForm(false);
      setRejectReason("");

      await loadProposals({ preferredProposalId: response.data.id });
    } catch (error) {
      setTransitionError(describeError(error));
    } finally {
      setApproving(false);
    }
  }, [activeHouseholdId, actor, loadProposals, selectedProposal]);

  const handleReject = useCallback(async () => {
    if (!activeHouseholdId || !selectedProposal || !actor) {
      return;
    }

    const reason = rejectReason.trim();
    if (!reason) {
      setTransitionError("Rejection reason is required.");
      return;
    }

    setRejecting(true);
    setTransitionMessage(null);
    setTransitionError(null);

    try {
      const response = await rejectProposal(activeHouseholdId, selectedProposal.id, reason, actor);
      setTransitionMessage(`Proposal rejected at ${formatDateTime(response.data.updatedAt)}.`);
      setShowRejectForm(false);
      setRejectReason("");

      await loadProposals({ preferredProposalId: response.data.id });
      await loadComments();
    } catch (error) {
      setTransitionError(describeError(error));
    } finally {
      setRejecting(false);
    }
  }, [
    activeHouseholdId,
    actor,
    loadComments,
    loadProposals,
    rejectReason,
    selectedProposal,
  ]);

  const approvalProgress = useMemo(() => {
    if (!selectedProposal || selectedProposal.status !== "pending") {
      return null;
    }

    const required = Math.max(selectedProposal.requiresApprovalFrom.length, 1);
    const approved = selectedProposal.approvedBy.length;

    return `${approved}/${required} approvals complete`;
  }, [selectedProposal]);

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading proposals">
        <p className={styles.stateMessage}>Fetching household governance workspace...</p>
      </Card>
    );
  }

  if (householdError) {
    return (
      <Card className={styles.stateCard} title="Could not load household">
        <p className={styles.errorText}>{householdError}</p>
      </Card>
    );
  }

  if (!activeHouseholdId || !actor) {
    return (
      <Card className={styles.stateCard} title="No household yet">
        <p className={styles.stateMessage}>
          Complete household setup to create and discuss governance proposals.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  return (
    <section className={styles.stack}>
      <Card className={styles.toolbarCard}>
        <div className={styles.toolbarRow}>
          <div className={styles.toolbarBody}>
            <h3 className={styles.toolbarTitle}>Proposal governance</h3>
            <p className={styles.toolbarText}>
              Create, discuss, and resolve proposals with explicit approval or rejection state transitions.
            </p>
          </div>

          <div className={styles.toolbarControls}>
            <label className={styles.filterLabel} htmlFor="proposal-status-filter">
              Status
            </label>
            <select
              className={styles.filterSelect}
              id="proposal-status-filter"
              onChange={(event) => {
                setStatusFilter(event.target.value as ProposalStatusFilter);
              }}
              value={statusFilter}
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            <button
              className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
              onClick={() => {
                setShowCreateForm((current) => !current);
              }}
              type="button"
            >
              {showCreateForm ? "Close create form" : "Create proposal"}
            </button>
          </div>
        </div>

        {transitionMessage ? (
          <p aria-live="polite" className={styles.successText}>
            {transitionMessage}
          </p>
        ) : null}

        {transitionError ? <p className={styles.errorText}>{transitionError}</p> : null}

        {proposalsError && proposals.length > 0 ? <p className={styles.errorText}>{proposalsError}</p> : null}
      </Card>

      {showCreateForm ? (
        <Card className={styles.createCard} title="Create proposal">
          <form className={styles.createForm} onSubmit={handleCreateProposal}>
            <div className={styles.formField}>
              <label htmlFor="proposal-title">Title</label>
              <input
                className={styles.inputControl}
                id="proposal-title"
                maxLength={160}
                onChange={(event) => {
                  setProposalTitle(event.target.value);
                }}
                placeholder="Example: Rebalance equity allocation by 5%"
                required
                value={proposalTitle}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="proposal-category">Category</label>
              <select
                className={styles.inputControl}
                id="proposal-category"
                onChange={(event) => {
                  setProposalCategory(event.target.value as ProposalCategory);
                }}
                value={proposalCategory}
              >
                {proposalCategories.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label htmlFor="proposal-description">Description</label>
              <textarea
                className={styles.textAreaControl}
                id="proposal-description"
                maxLength={4000}
                onChange={(event) => {
                  setProposalDescription(event.target.value);
                }}
                placeholder="Explain rationale, constraints, and expected outcome."
                required
                value={proposalDescription}
              />
            </div>

            {createError ? <p className={styles.errorText}>{createError}</p> : null}

            <div className={styles.createActions}>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  setShowCreateForm(false);
                }}
                type="button"
              >
                Cancel
              </button>
              <button className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} type="submit">
                {creatingProposal ? "Creating..." : "Submit proposal"}
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className={styles.layoutGrid}>
        <Card className={styles.listCard} title="Proposal list">
          {loadingProposals && proposals.length === 0 ? (
            <p className={styles.stateMessage}>Loading proposals...</p>
          ) : null}

          {proposalsError && proposals.length === 0 ? (
            <div className={styles.stateActions}>
              <p className={styles.errorText}>{proposalsError}</p>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  void loadProposals();
                }}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!loadingProposals && !proposalsError && proposals.length === 0 ? (
            <div className={styles.stateActions}>
              <p className={styles.stateMessage}>
                No proposals in this status yet. Create one to begin the decision flow.
              </p>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  setShowCreateForm(true);
                }}
                type="button"
              >
                Open create flow
              </button>
            </div>
          ) : null}

          {proposals.length > 0 ? (
            <ul className={styles.proposalList}>
              {proposals.map((proposal) => {
                const isSelected = selectedProposalId === proposal.id;

                return (
                  <li key={proposal.id}>
                    <button
                      aria-pressed={isSelected}
                      className={[styles.proposalListItem, isSelected ? styles.proposalListItemActive : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setSelectedProposalId(proposal.id);
                      }}
                      type="button"
                    >
                      <div className={styles.proposalListBody}>
                        <p className={styles.proposalListTitle}>{proposal.title}</p>
                        <p className={styles.proposalListMeta}>
                          {categoryLabels[proposal.category]} · {proposal.commentsCount} comments
                        </p>
                      </div>

                      <span className={[styles.statusBadge, toStatusTone(proposal.status)].join(" ")}>
                        {proposal.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Card>

        <Card className={styles.detailCard} title={selectedProposal ? selectedProposal.title : "Proposal detail"}>
          {!selectedProposal ? (
            <p className={styles.stateMessage}>Select a proposal to review discussion and approval controls.</p>
          ) : (
            <>
              <header className={styles.detailHeader}>
                <div>
                  <p className={styles.detailMeta}>
                    Created by {selectedProposal.createdBy.displayName} on {formatDateTime(selectedProposal.createdAt)}
                  </p>
                  <p className={styles.detailMeta}>{categoryLabels[selectedProposal.category]} category</p>
                </div>

                <span className={[styles.statusBadge, toStatusTone(selectedProposal.status)].join(" ")}>
                  {selectedProposal.status}
                </span>
              </header>

              <p className={styles.descriptionText}>{selectedProposal.description}</p>

              <details className={styles.impactDetails}>
                <summary>Impact analysis</summary>

                <dl className={styles.impactGrid}>
                  {Object.entries(selectedProposal.impactAnalysis).length === 0 ? (
                    <div className={styles.impactRow}>
                      <dt>No deterministic impact values were generated.</dt>
                    </div>
                  ) : (
                    Object.entries(selectedProposal.impactAnalysis).map(([key, value]) => (
                      <div className={styles.impactRow} key={key}>
                        <dt>{key}</dt>
                        <dd>{toImpactValue(value)}</dd>
                      </div>
                    ))
                  )}
                </dl>
              </details>

              <section className={styles.controlSection}>
                <h4 className={styles.sectionTitle}>Approval controls</h4>

                {approvalProgress ? <p className={styles.stateMessage}>{approvalProgress}</p> : null}

                {selectedProposal.status === "pending" ? (
                  <div className={styles.controlRow}>
                    <button
                      className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
                      disabled={approving || rejecting}
                      onClick={() => {
                        void handleApprove();
                      }}
                      type="button"
                    >
                      {approving ? "Approving..." : "Approve"}
                    </button>

                    <button
                      className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                      disabled={approving || rejecting}
                      onClick={() => {
                        setShowRejectForm((current) => !current);
                      }}
                      type="button"
                    >
                      {showRejectForm ? "Cancel rejection" : "Reject"}
                    </button>
                  </div>
                ) : (
                  <p className={styles.stateMessage}>
                    Resolution recorded {selectedProposal.resolvedAt ? formatDateTime(selectedProposal.resolvedAt) : "n/a"}.
                  </p>
                )}

                {showRejectForm ? (
                  <div className={styles.rejectForm}>
                    <label htmlFor="proposal-reject-reason">Rejection reason</label>
                    <textarea
                      className={styles.textAreaControl}
                      id="proposal-reject-reason"
                      maxLength={2000}
                      onChange={(event) => {
                        setRejectReason(event.target.value);
                      }}
                      placeholder="Explain why this proposal is being rejected."
                      required
                      value={rejectReason}
                    />
                    <button
                      className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                      disabled={rejecting}
                      onClick={() => {
                        void handleReject();
                      }}
                      type="button"
                    >
                      {rejecting ? "Rejecting..." : "Confirm rejection"}
                    </button>
                  </div>
                ) : null}
              </section>

              <section className={styles.commentsSection}>
                <h4 className={styles.sectionTitle}>Discussion</h4>

                {loadingComments ? <p className={styles.stateMessage}>Loading discussion thread...</p> : null}

                {commentsError ? <p className={styles.errorText}>{commentsError}</p> : null}

                {!loadingComments && !commentsError && comments.length === 0 ? (
                  <p className={styles.stateMessage}>No comments yet. Add context before final approval.</p>
                ) : null}

                {comments.length > 0 ? (
                  <ul className={styles.commentList}>
                    {comments.map((comment) => (
                      <li className={styles.commentItem} key={comment.id}>
                        <div className={styles.commentMeta}>
                          <strong>{comment.author.displayName}</strong>
                          <span>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <p className={styles.commentBody}>{comment.content}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className={styles.commentComposer}>
                  <label htmlFor="proposal-comment">Add comment</label>
                  <textarea
                    className={styles.textAreaControl}
                    id="proposal-comment"
                    maxLength={4000}
                    onChange={(event) => {
                      setCommentDraft(event.target.value);
                    }}
                    placeholder="Share context, concerns, or implementation notes."
                    value={commentDraft}
                  />

                  {commentError ? <p className={styles.errorText}>{commentError}</p> : null}

                  <button
                    className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                    disabled={submittingComment}
                    onClick={() => {
                      void handleAddComment();
                    }}
                    type="button"
                  >
                    {submittingComment ? "Posting..." : "Post comment"}
                  </button>
                </div>
              </section>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
