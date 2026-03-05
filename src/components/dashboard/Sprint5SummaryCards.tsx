"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateTime } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import { listProposals, listReviews } from "../sprint5/client";
import type { ProposalView, QuarterlyReviewView } from "../sprint5/contracts";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import styles from "./sprint5-summary.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load Sprint 5 governance summaries.";
};

const reviewStatusTone = (status: QuarterlyReviewView["status"]): string => {
  if (status === "published") {
    return styles.reviewPublished ?? "";
  }

  if (status === "archived") {
    return styles.reviewArchived ?? "";
  }

  return styles.reviewDraft ?? "";
};

export function Sprint5SummaryCards() {
  const { activeHouseholdId, error: householdError, loading: householdLoading } =
    useHouseholdContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProposals, setPendingProposals] = useState<ProposalView[]>([]);
  const [reviews, setReviews] = useState<QuarterlyReviewView[]>([]);

  const loadData = useCallback(async () => {
    if (!activeHouseholdId) {
      setPendingProposals([]);
      setReviews([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [pendingResponse, reviewResponse] = await Promise.all([
        listProposals({
          householdId: activeHouseholdId,
          statuses: ["pending"],
        }),
        listReviews(activeHouseholdId),
      ]);

      setPendingProposals(pendingResponse.data);
      setReviews(reviewResponse.data);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const latestReview = useMemo(() => reviews[0] ?? null, [reviews]);
  const draftReviewsCount = useMemo(
    () => reviews.filter((review) => review.status === "draft").length,
    [reviews],
  );

  if (householdLoading) {
    return (
      <div className={styles.grid}>
        <Card className={styles.summaryCard} title="Pending proposals">
          <p className={styles.stateMessage}>Loading governance summary...</p>
        </Card>
        <Card className={styles.summaryCard} title="Review status">
          <p className={styles.stateMessage}>Loading review summary...</p>
        </Card>
      </div>
    );
  }

  if (householdError || !activeHouseholdId) {
    return (
      <Card className={styles.stateCard} title="Sprint 5 governance summary unavailable">
        <p className={styles.errorText}>{householdError ?? "No household selected."}</p>
      </Card>
    );
  }

  return (
    <section className={styles.stack}>
      <div className={styles.grid}>
        <Card className={styles.summaryCard}>
          <span className={styles.metricLabel}>Pending proposals</span>
          <strong className={styles.metricValue}>{pendingProposals.length}</strong>
          <p className={styles.metricMeta}>
            {pendingProposals.length === 0
              ? "No approvals are waiting right now."
              : `${pendingProposals.length} proposal(s) need a decision.`}
          </p>
          <Link className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")} href="/proposals?status=pending">
            Open proposals
          </Link>
        </Card>

        <Card className={styles.summaryCard}>
          <span className={styles.metricLabel}>Latest quarterly review</span>
          {latestReview ? (
            <>
              <strong className={styles.metricValue}>{latestReview.quarterLabel}</strong>
              <p className={styles.metricMeta}>
                <span className={[styles.reviewStatus, reviewStatusTone(latestReview.status)].join(" ")}>
                  {latestReview.status}
                </span>
                {latestReview.generatedAt
                  ? ` Updated ${formatDateTime(latestReview.generatedAt)}`
                  : " Not generated"}
              </p>
            </>
          ) : (
            <>
              <strong className={styles.metricValue}>No review yet</strong>
              <p className={styles.metricMeta}>
                Generate the current quarter review to activate governance tracking.
              </p>
            </>
          )}
          <Link className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")} href="/review">
            Open quarterly review
          </Link>
        </Card>

        <Card className={styles.summaryCard}>
          <span className={styles.metricLabel}>Draft reviews</span>
          <strong className={styles.metricValue}>{draftReviewsCount}</strong>
          <p className={styles.metricMeta}>
            {draftReviewsCount === 0
              ? "All generated reviews are published or archived."
              : `${draftReviewsCount} draft review(s) are pending publication.`}
          </p>
          <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/review">
            Review drafts
          </Link>
        </Card>
      </div>

      {loading ? <p className={styles.stateMessage}>Refreshing governance summary...</p> : null}

      {error ? (
        <Card className={styles.stateCard} title="Governance summary refresh issue">
          <p className={styles.errorText}>{error}</p>
          <button
            className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
            onClick={() => {
              void loadData();
            }}
            type="button"
          >
            Retry
          </button>
        </Card>
      ) : null}
    </section>
  );
}
