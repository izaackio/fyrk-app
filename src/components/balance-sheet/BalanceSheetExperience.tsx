"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateTime, formatMoney, formatPercent } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import {
  ALLOCATION_DIMENSIONS,
  loadBalanceSheetSnapshot,
  selectBalanceSheetView,
  type AllocationDimension,
  type BalanceSheetSnapshot,
} from "./insights";
import styles from "./balance-sheet.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load the balance sheet. Please retry.";
};

const FRESHNESS_TONE_CLASS: Record<
  BalanceSheetSnapshot["freshness"]["level"],
  string | undefined
> = {
  aged: styles.freshnessAged,
  fresh: styles.freshnessFresh,
  stale: styles.freshnessStale,
  unknown: styles.freshnessUnknown,
};

const formatSignedMoney = (value: number, currency: string): string => {
  if (value === 0) {
    return formatMoney(0, currency);
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatMoney(Math.abs(value), currency)}`;
};

export function BalanceSheetExperience() {
  const { activeHouseholdId, error: householdError, loading: householdLoading } =
    useHouseholdContext();
  const [snapshot, setSnapshot] = useState<BalanceSheetSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("household");
  const [selectedDimension, setSelectedDimension] =
    useState<AllocationDimension>("assetClass");

  const loadSnapshot = useCallback(async () => {
    if (!activeHouseholdId) {
      setSnapshot(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loadBalanceSheetSnapshot(activeHouseholdId);
      setSnapshot(response);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!snapshot) {
      setSelectedMemberId("household");
      return;
    }

    if (selectedMemberId === "household") {
      return;
    }

    const memberExists = snapshot.members.some(
      (member) => member.id === selectedMemberId,
    );

    if (!memberExists) {
      setSelectedMemberId("household");
    }
  }, [selectedMemberId, snapshot]);

  const activeView = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    return selectBalanceSheetView(snapshot, selectedMemberId);
  }, [selectedMemberId, snapshot]);

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading household balance sheet">
        <p className={styles.stateMessage}>Fetching household context and account balances...</p>
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
          Create your household first to unlock the shared balance-sheet view.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  if (loading && !snapshot) {
    return (
      <section className={styles.stack}>
        <Card className={styles.stateCard} title="Preparing balance sheet">
          <p className={styles.stateMessage}>Loading net worth, allocation, and data quality insights...</p>
        </Card>
        <div className={styles.metricGrid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card className={styles.metricCard} key={index}>
              <span className={styles.metricLabel}>Loading metric</span>
              <span className={styles.metricValue}>...</span>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!loading && error && !snapshot) {
    return (
      <Card className={styles.stateCard} title="Could not load balance sheet">
        <p className={styles.errorText}>{error}</p>
        <button
          className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
          onClick={() => {
            void loadSnapshot();
          }}
          type="button"
        >
          Retry
        </button>
      </Card>
    );
  }

  if (!snapshot || !activeView || snapshot.accountsCount === 0) {
    return (
      <Card className={styles.stateCard} title="No balance-sheet data yet">
        <p className={styles.stateMessage}>
          Add your first account or import holdings to start tracking net worth and
          allocation.
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

  const allocationRows = activeView.allocation[selectedDimension];

  return (
    <section className={styles.stack}>
      <Card className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>{activeView.label} net worth</p>
            <h2 className={styles.heroValue}>
              {formatMoney(activeView.netWorth, snapshot.currency)}
            </h2>
            <p className={styles.heroMeta}>
              As of {snapshot.asOfDate ? formatDateTime(snapshot.asOfDate) : "latest sync"}
            </p>
          </div>
          <span
            className={[
              styles.freshnessBadge,
              FRESHNESS_TONE_CLASS[snapshot.freshness.level],
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {snapshot.freshness.level}
          </span>
        </div>

        <div className={styles.memberToggle} role="tablist" aria-label="Member scope">
          <button
            aria-pressed={selectedMemberId === "household"}
            className={[
              styles.memberButton,
              selectedMemberId === "household" ? styles.memberButtonActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setSelectedMemberId("household")}
            type="button"
          >
            Household
          </button>
          {snapshot.members.map((member) => (
            <button
              aria-pressed={selectedMemberId === member.id}
              className={[
                styles.memberButton,
                selectedMemberId === member.id ? styles.memberButtonActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              type="button"
            >
              {member.displayName}
            </button>
          ))}
        </div>

        <p className={styles.stateMessage}>{snapshot.freshness.message}</p>
      </Card>

      {error ? (
        <Card className={styles.stateCard} title="Partial refresh issue">
          <p className={styles.errorText}>{error}</p>
          <button
            className={[themeStyles.button, themeStyles.buttonGhost].join(" ")}
            onClick={() => {
              void loadSnapshot();
            }}
            type="button"
          >
            Retry refresh
          </button>
        </Card>
      ) : null}

      <div className={styles.metricGrid}>
        <Card className={styles.metricCard}>
          <span className={styles.metricLabel}>Net worth</span>
          <strong className={styles.metricValue}>
            {formatMoney(activeView.netWorth, snapshot.currency)}
          </strong>
          <span className={styles.metricMeta}>{activeView.accountsCount} account(s)</span>
        </Card>

        <Card className={styles.metricCard}>
          <span className={styles.metricLabel}>Total assets</span>
          <strong className={[styles.metricValue, styles.metricPositive].join(" ")}>
            {formatMoney(activeView.totalAssets, snapshot.currency)}
          </strong>
          <span className={styles.metricMeta}>Provider-reported holdings and cash</span>
        </Card>

        <Card className={styles.metricCard}>
          <span className={styles.metricLabel}>Total liabilities</span>
          <strong className={[styles.metricValue, styles.metricNegative].join(" ")}>
            {formatMoney(activeView.totalLiabilities, snapshot.currency)}
          </strong>
          <span className={styles.metricMeta}>Mortgage and loan balances</span>
        </Card>
      </div>

      <Card
        className={styles.sectionCard}
        title="Allocation views"
        description="Exposure by selected lens. Values are provider-reported and not repriced in real time."
      >
        <div className={styles.allocationTabs} role="tablist" aria-label="Allocation view">
          {ALLOCATION_DIMENSIONS.map((dimension) => (
            <button
              aria-pressed={selectedDimension === dimension.id}
              className={[
                styles.allocationTab,
                selectedDimension === dimension.id ? styles.allocationTabActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={dimension.id}
              onClick={() => setSelectedDimension(dimension.id)}
              type="button"
            >
              {dimension.label}
            </button>
          ))}
        </div>

        {allocationRows.length === 0 ? (
          <p className={styles.emptyNote}>
            No allocation data available yet for this view. Import holdings to unlock a
            richer breakdown.
          </p>
        ) : (
          <ul className={styles.allocationList}>
            {allocationRows.map((slice) => (
              <li className={styles.allocationRow} key={slice.key}>
                <div className={styles.allocationHead}>
                  <p className={styles.allocationLabel}>{slice.label}</p>
                  <p className={styles.allocationValue}>
                    {formatPercent(slice.pct)} · {formatMoney(slice.value, snapshot.currency)}
                  </p>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${Math.max(slice.pct, 1)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className={styles.splitGrid}>
        <Card
          className={styles.sectionCard}
          title={`${activeView.label} account mix`}
          description="Net values by account type. Liabilities are shown as negative values."
        >
          {activeView.byAccountType.length === 0 ? (
            <p className={styles.emptyNote}>No account-type breakdown available yet.</p>
          ) : (
            <ul className={styles.mixList}>
              {activeView.byAccountType.map((entry) => (
                <li className={styles.mixRow} key={entry.key}>
                  <span className={styles.mixLabel}>{entry.label}</span>
                  <span
                    className={[
                      styles.mixValue,
                      entry.value < 0 ? styles.mixNegative : styles.mixPositive,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {formatSignedMoney(entry.value, snapshot.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className={styles.sectionCard}
          title="Data quality"
          description="Coverage and freshness status for the current household snapshot."
        >
          <div className={styles.qualityGrid}>
            <article className={styles.qualityMetric}>
              <span className={styles.qualityLabel}>Coverage</span>
              <strong className={styles.qualityValue}>
                {formatPercent(snapshot.freshness.coveragePct)}
              </strong>
            </article>
            <article className={styles.qualityMetric}>
              <span className={styles.qualityLabel}>Stale accounts</span>
              <strong className={styles.qualityValue}>{snapshot.freshness.staleAccounts}</strong>
            </article>
            <article className={styles.qualityMetric}>
              <span className={styles.qualityLabel}>Primary source</span>
              <strong className={styles.qualityValue}>
                {snapshot.freshness.primarySyncSource}
              </strong>
            </article>
          </div>
          <p className={styles.subtleMeta}>{snapshot.freshness.message}</p>
          <p className={styles.subtleMeta}>
            Last full update:{" "}
            {snapshot.freshness.lastFullUpdate
              ? formatDateTime(snapshot.freshness.lastFullUpdate)
              : "No timestamp yet"}
          </p>
        </Card>
      </div>
    </section>
  );
}
