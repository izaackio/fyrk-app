"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDate, formatDateTime, formatMoney } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import { ApiClientError } from "../sprint4/http";
import {
  generateReview,
  getReview,
  getReviewPdf,
  listReviews,
} from "../sprint5/client";
import type {
  QuarterlyReviewRecommendationView,
  QuarterlyReviewView,
  ReviewGenerateView,
} from "../sprint5/contracts";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import styles from "./review.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not complete this review request. Please retry.";
};

const recommendationPriorityLabels: Record<QuarterlyReviewRecommendationView["priority"], string> = {
  critical: "Critical",
  high: "High",
  low: "Low",
  medium: "Medium",
};

const recommendationActionMeta: Record<
  QuarterlyReviewRecommendationView["actionType"],
  {
    href: string;
    label: string;
  }
> = {
  discuss: {
    href: "/household",
    label: "Open household",
  },
  monitor: {
    href: "/timeline",
    label: "Open timeline",
  },
  proposal: {
    href: "/proposals",
    label: "Create proposal",
  },
  research: {
    href: "/balance-sheet",
    label: "Open balance sheet",
  },
};

const buildProposalPrefillHref = (
  recommendation: QuarterlyReviewRecommendationView,
): string => {
  const params = new URLSearchParams({
    category: "other",
    description: recommendation.description,
    title: recommendation.title,
  });

  return `/proposals?${params.toString()}`;
};

const toSignedMoneyClassName = (amount: number): string => {
  if (amount > 0) {
    return styles.amountPositive ?? "";
  }

  if (amount < 0) {
    return styles.amountNegative ?? "";
  }

  return styles.amountNeutral ?? "";
};

export function ReviewExperience() {
  const { activeHouseholdId, error: householdError, loading: householdLoading } =
    useHouseholdContext();

  const [reviews, setReviews] = useState<QuarterlyReviewView[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<QuarterlyReviewView | null>(null);

  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [generationState, setGenerationState] = useState<ReviewGenerateView | null>(null);
  const [generating, setGenerating] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [openingPdf, setOpeningPdf] = useState(false);

  const loadReviews = useCallback(
    async (preferredReviewId?: string) => {
      if (!activeHouseholdId) {
        setReviews([]);
        setSelectedReviewId(null);
        setSelectedReview(null);
        return;
      }

      setLoadingReviews(true);
      setReviewsError(null);

      try {
        const response = await listReviews(activeHouseholdId);
        const nextReviews = response.data;
        setReviews(nextReviews);

        setSelectedReviewId((current) => {
          if (preferredReviewId && nextReviews.some((review) => review.id === preferredReviewId)) {
            return preferredReviewId;
          }

          if (current && nextReviews.some((review) => review.id === current)) {
            return current;
          }

          return nextReviews[0]?.id ?? null;
        });
      } catch (error) {
        setReviewsError(describeError(error));
      } finally {
        setLoadingReviews(false);
      }
    },
    [activeHouseholdId],
  );

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const loadReviewDetail = useCallback(async () => {
    if (!activeHouseholdId || !selectedReviewId) {
      setSelectedReview(null);
      return;
    }

    setLoadingDetail(true);
    setDetailError(null);

    try {
      const response = await getReview(activeHouseholdId, selectedReviewId);
      setSelectedReview(response.data);
    } catch (error) {
      setDetailError(describeError(error));
      setSelectedReview(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [activeHouseholdId, selectedReviewId]);

  useEffect(() => {
    void loadReviewDetail();
  }, [loadReviewDetail]);

  const isGeneratingSelectedReview = useMemo(() => {
    if (!generationState || !selectedReviewId) {
      return false;
    }

    return generationState.reviewId === selectedReviewId;
  }, [generationState, selectedReviewId]);

  const handleGenerate = useCallback(async () => {
    if (!activeHouseholdId) {
      return;
    }

    setGenerating(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await generateReview(activeHouseholdId);
      setGenerationState(response.data);
      setActionMessage(
        `Preparing quarterly review from deterministic financial data. Estimated ${response.data.estimatedSeconds} seconds.`,
      );
      await loadReviews(response.data.reviewId);
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setGenerating(false);
    }
  }, [activeHouseholdId, loadReviews]);

  const handleOpenPdf = useCallback(async () => {
    if (!activeHouseholdId || !selectedReview) {
      return;
    }

    setOpeningPdf(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await getReviewPdf(activeHouseholdId, selectedReview.id);
      const downloadLink = document.createElement("a");
      downloadLink.href = response.data.downloadUrl;
      downloadLink.download = response.data.fileName;
      downloadLink.rel = "noopener noreferrer";
      downloadLink.target = "_blank";
      downloadLink.click();

      setActionMessage(
        `Review export ready. Download link expires ${formatDateTime(response.data.expiresAt)}.`,
      );
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "REVIEW_PDF_NOT_READY") {
        setActionError("PDF export is available only after a review is published.");
      } else {
        setActionError(describeError(error));
      }
    } finally {
      setOpeningPdf(false);
    }
  }, [activeHouseholdId, selectedReview]);

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading quarterly reviews">
        <p className={styles.stateMessage}>Fetching household review workspace...</p>
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

  if (!activeHouseholdId) {
    return (
      <Card className={styles.stateCard} title="No household yet">
        <p className={styles.stateMessage}>
          Create your household first to generate and track quarterly reviews.
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
            <h3 className={styles.toolbarTitle}>Quarterly review governance</h3>
            <p className={styles.toolbarText}>
              Generate review drafts and track recommendation actions from deterministic household data.
            </p>
          </div>
          <button
            className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
            onClick={() => {
              void handleGenerate();
            }}
            type="button"
          >
            {generating ? "Generating..." : "Generate this quarter"}
          </button>
        </div>

        {isGeneratingSelectedReview || generating ? (
          <p aria-live="polite" className={styles.generatingNotice}>
            Writing your quarterly review from deterministic financial data...
          </p>
        ) : null}

        {actionMessage ? (
          <p aria-live="polite" className={styles.successText}>
            {actionMessage}
          </p>
        ) : null}

        {actionError ? <p className={styles.errorText}>{actionError}</p> : null}
      </Card>

      <div className={styles.layoutGrid}>
        <Card className={styles.listCard} title="Review list">
          {loadingReviews && reviews.length === 0 ? (
            <p className={styles.stateMessage}>Loading quarterly review history...</p>
          ) : null}

          {reviewsError && reviews.length === 0 ? (
            <div className={styles.stateActions}>
              <p className={styles.errorText}>{reviewsError}</p>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  void loadReviews();
                }}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!loadingReviews && !reviewsError && reviews.length === 0 ? (
            <div className={styles.stateActions}>
              <p className={styles.stateMessage}>
                No quarterly review exists yet. Generate your first draft to begin.
              </p>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  void handleGenerate();
                }}
                type="button"
              >
                Generate now
              </button>
            </div>
          ) : null}

          {reviews.length > 0 ? (
            <ul className={styles.reviewList}>
              {reviews.map((review) => {
                const isSelected = selectedReviewId === review.id;

                return (
                  <li key={review.id}>
                    <button
                      aria-pressed={isSelected}
                      className={[styles.reviewListItem, isSelected ? styles.reviewListItemActive : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setSelectedReviewId(review.id);
                      }}
                      type="button"
                    >
                      <div>
                        <p className={styles.reviewQuarter}>{review.quarterLabel}</p>
                        <p className={styles.reviewDateRange}>
                          {formatDate(review.periodStart)} to {formatDate(review.periodEnd)}
                        </p>
                      </div>
                      <span className={styles.reviewStatus}>{review.status}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Card>

        <Card className={styles.detailCard} title={selectedReview ? selectedReview.quarterLabel : "Review detail"}>
          {loadingDetail && !selectedReview ? (
            <p className={styles.stateMessage}>Loading selected review detail...</p>
          ) : null}

          {detailError && !selectedReview ? (
            <div className={styles.stateActions}>
              <p className={styles.errorText}>{detailError}</p>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  void loadReviewDetail();
                }}
                type="button"
              >
                Retry detail
              </button>
            </div>
          ) : null}

          {!selectedReview && !loadingDetail && !detailError ? (
            <p className={styles.stateMessage}>Select a review to see narrative and recommendation detail.</p>
          ) : null}

          {selectedReview ? (
            <>
              <div className={styles.detailHeaderRow}>
                <div>
                  <p className={styles.detailMeta}>
                    Period {formatDate(selectedReview.periodStart)} to {formatDate(selectedReview.periodEnd)}
                  </p>
                  <p className={styles.detailMeta}>
                    Generated {selectedReview.generatedAt ? formatDateTime(selectedReview.generatedAt) : "Not generated"}
                  </p>
                </div>
                <button
                  className={[themeStyles.button, themeStyles.buttonGhost].join(" ")}
                  disabled={openingPdf || selectedReview.status !== "published"}
                  onClick={() => {
                    void handleOpenPdf();
                  }}
                  type="button"
                >
                  {openingPdf ? "Preparing export..." : "Export PDF"}
                </button>
              </div>

              <div className={styles.metricGrid}>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Net worth start</span>
                  <strong className={styles.metricValue}>{formatMoney(selectedReview.netWorthStart, "SEK")}</strong>
                </article>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Net worth end</span>
                  <strong className={styles.metricValue}>{formatMoney(selectedReview.netWorthEnd, "SEK")}</strong>
                </article>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Net change</span>
                  <strong
                    className={[styles.metricValue, toSignedMoneyClassName(selectedReview.netWorthChange)]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {formatMoney(selectedReview.netWorthChange, "SEK")}
                  </strong>
                </article>
                <article className={styles.metricCard}>
                  <span className={styles.metricLabel}>Fees drag</span>
                  <strong className={[styles.metricValue, styles.amountNegative].join(" ")}>
                    {formatMoney(selectedReview.feesDragAmount, "SEK")}
                  </strong>
                </article>
              </div>

              <section className={styles.narrativeBlock}>
                <h4 className={styles.sectionTitle}>Narrative summary</h4>
                <p className={styles.narrativeText}>
                  {selectedReview.narrative ??
                    "Narrative summary is not available yet. Regenerate if the issue persists."}
                </p>
              </section>

              <section className={styles.recommendationsBlock}>
                <h4 className={styles.sectionTitle}>Recommendations</h4>

                {selectedReview.recommendations.length === 0 ? (
                  <p className={styles.stateMessage}>No recommendations were generated for this review.</p>
                ) : (
                  <ul className={styles.recommendationList}>
                    {selectedReview.recommendations.map((recommendation, index) => {
                      const actionMeta = recommendationActionMeta[recommendation.actionType];
                      const actionHref =
                        recommendation.actionType === "proposal"
                          ? buildProposalPrefillHref(recommendation)
                          : actionMeta.href;

                      return (
                        <li className={styles.recommendationItem} key={`${recommendation.title}-${index}`}>
                          <div className={styles.recommendationHeader}>
                            <h5 className={styles.recommendationTitle}>{recommendation.title}</h5>
                            <span className={styles.recommendationPriority}>
                              {recommendationPriorityLabels[recommendation.priority]}
                            </span>
                          </div>

                          <p className={styles.recommendationDescription}>{recommendation.description}</p>

                          {recommendation.estimatedImpact ? (
                            <p className={styles.recommendationImpact}>{recommendation.estimatedImpact}</p>
                          ) : null}

                          <div className={styles.recommendationActions}>
                            <span className={styles.recommendationType}>{recommendation.actionType}</span>
                            <Link
                              className={[themeStyles.button, themeStyles.buttonSecondary, themeStyles.buttonSm].join(
                                " ",
                              )}
                              href={actionHref}
                            >
                              {actionMeta.label}
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {detailError ? <p className={styles.errorText}>{detailError}</p> : null}
            </>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
