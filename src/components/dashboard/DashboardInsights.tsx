"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { formatDateTime, formatMoney, formatPercent } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import {
  loadDashboardInsights,
  type DashboardInsights as DashboardInsightsData,
} from "../balance-sheet/insights";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import styles from "./dashboard-insights.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load dashboard insights. Please retry.";
};

const formatDeltaLabel = (
  amount: number | null,
  pct: number | null,
  currency: string,
): { className: string | undefined; text: string } => {
  if (amount === null) {
    return {
      className: styles.trendMuted,
      text: "Weekly trend unavailable until history snapshots are available.",
    };
  }

  if (amount === 0) {
    return {
      className: styles.trendMuted,
      text: "No material net worth change in the latest weekly window.",
    };
  }

  const direction = amount > 0 ? "+" : "-";
  const absAmount = formatMoney(Math.abs(amount), currency);
  const pctLabel = pct === null ? "" : ` (${formatPercent(Math.abs(pct))})`;

  return {
    className: amount > 0 ? styles.trendPositive : styles.trendNegative,
    text: `${direction}${absAmount}${pctLabel} vs previous weekly snapshot`,
  };
};

const highlightToneClass: Record<
  DashboardInsightsData["weeklyNarrative"]["highlights"][number]["type"],
  string | undefined
> = {
  action: styles.highlightAction,
  neutral: styles.highlightNeutral,
  positive: styles.highlightPositive,
};

export function DashboardInsights() {
  const { activeHouseholdId, error: householdError, loading: householdLoading } =
    useHouseholdContext();
  const [insights, setInsights] = useState<DashboardInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeHouseholdId) {
      setInsights(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loadDashboardInsights(activeHouseholdId);
      setInsights(response);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading dashboard insights">
        <p className={styles.stateMessage}>Fetching household context and insight cards...</p>
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
          Complete household setup to unlock shared net worth and narrative insights.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  if (loading && !insights) {
    return (
      <section className={styles.stack}>
        <div className={styles.grid}>
          <Card className={styles.stateCard} title="Loading net worth">
            <p className={styles.stateMessage}>Compiling household balances...</p>
          </Card>
          <Card className={styles.stateCard} title="Loading weekly narrative">
            <p className={styles.stateMessage}>Preparing weekly insight summary...</p>
          </Card>
        </div>
      </section>
    );
  }

  if (!loading && error && !insights) {
    return (
      <Card className={styles.stateCard} title="Could not load dashboard insights">
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
    );
  }

  if (!insights || insights.snapshot.accountsCount === 0) {
    return (
      <Card className={styles.stateCard} title="No insight data yet">
        <p className={styles.stateMessage}>
          Add your first account to populate net worth and weekly narrative cards.
        </p>
        <div className={styles.inlineActions}>
          <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/accounts/new">
            Add account
          </Link>
          <Link className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")} href="/import">
            Import CSV
          </Link>
        </div>
      </Card>
    );
  }

  const { snapshot, weeklyDelta, weeklyNarrative } = insights;
  const deltaSummary = formatDeltaLabel(
    weeklyDelta.amount,
    weeklyDelta.pct,
    snapshot.currency,
  );

  return (
    <section className={styles.stack}>
      <div className={styles.grid}>
        <Card className={styles.netWorthCard}>
          <span className={styles.metricLabel}>Household net worth</span>
          <strong className={styles.metricValue}>
            {formatMoney(snapshot.totalNetWorth, snapshot.currency)}
          </strong>
          <span className={styles.metricMeta}>
            Assets {formatMoney(snapshot.totalAssets, snapshot.currency)} · Liabilities{" "}
            {formatMoney(snapshot.totalLiabilities, snapshot.currency)}
          </span>
          <div className={styles.trendRow}>
            <span className={[styles.trendText, deltaSummary.className].join(" ")}>
              {deltaSummary.text}
            </span>
          </div>
          <p className={styles.freshnessText}>{snapshot.freshness.message}</p>
        </Card>

        <Card className={styles.narrativeCard}>
          <div className={styles.narrativeHeader}>
            <h3 className={styles.narrativeTitle}>This week</h3>
            <span
              className={[
                styles.sourceBadge,
                weeklyNarrative.source === "ai"
                  ? styles.sourceAi
                  : styles.sourceFallback,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {weeklyNarrative.source === "ai" ? "Generated" : "Rule-based"}
            </span>
          </div>

          <p className={styles.narrativeBody}>{weeklyNarrative.narrative}</p>
          <p className={styles.sourceMessage}>{weeklyNarrative.sourceMessage}</p>

          {weeklyNarrative.highlights.length > 0 ? (
            <ul className={styles.highlightList}>
              {weeklyNarrative.highlights.map((highlight, index) => (
                <li
                  className={[
                    styles.highlightItem,
                    highlightToneClass[highlight.type],
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={`${highlight.type}-${index}`}
                >
                  {highlight.text}
                </li>
              ))}
            </ul>
          ) : null}

          <p className={styles.generatedAt}>
            Updated {formatDateTime(weeklyNarrative.generatedAt)}
          </p>
        </Card>
      </div>

      {error ? (
        <Card className={styles.stateCard} title="Partial refresh issue">
          <p className={styles.errorText}>{error}</p>
          <button
            className={[themeStyles.button, themeStyles.buttonGhost].join(" ")}
            onClick={() => {
              void loadData();
            }}
            type="button"
          >
            Retry refresh
          </button>
        </Card>
      ) : null}
    </section>
  );
}
