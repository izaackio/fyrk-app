"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  formatDateTime,
  formatMoney,
  formatPercent,
  getFreshnessSummary,
} from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import {
  ALLOCATION_DIMENSIONS,
  loadBalanceSheetSnapshot,
  selectBalanceSheetView,
  type AllocationDimension,
  type AllocationSlice,
  type BalanceSheetSnapshot,
  type BalanceSheetViewSelection,
} from "./insights";
import styles from "./balance-sheet.module.css";

const MAX_VISIBLE_ALLOCATION_ROWS = 6;

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

const FRESHNESS_LABEL: Record<BalanceSheetSnapshot["freshness"]["level"], string> = {
  aged: "Watch",
  fresh: "Fresh",
  stale: "Stale",
  unknown: "Unknown",
};

const SOURCE_LABELS = {
  csv: "CSV import",
  manual: "Manual entry",
  provider: "Provider sync",
} as const;

const VISIBILITY_LABELS = {
  full: "Shared",
  hidden: "Hidden",
  private: "Private",
} as const;

const formatSignedMoney = (value: number, currency: string): string => {
  if (value === 0) {
    return formatMoney(0, currency);
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatMoney(Math.abs(value), currency)}`;
};

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const summarizeAllocationRows = (rows: AllocationSlice[]): AllocationSlice[] => {
  if (rows.length <= MAX_VISIBLE_ALLOCATION_ROWS) {
    return rows;
  }

  const visibleRows = rows.slice(0, MAX_VISIBLE_ALLOCATION_ROWS - 1);
  const remainder = rows.slice(MAX_VISIBLE_ALLOCATION_ROWS - 1);
  const remainderValue = remainder.reduce((sum, slice) => sum + slice.value, 0);
  const remainderPct = remainder.reduce((sum, slice) => sum + slice.pct, 0);

  return [
    ...visibleRows,
    {
      key: `remainder-${rows.length}`,
      label: `${pluralize(remainder.length, "smaller exposure")}`,
      pct: remainderPct,
      value: remainderValue,
    },
  ];
};

const getHoldingsCoveragePct = (view: BalanceSheetViewSelection): number => {
  if (view.totalAssets <= 0) {
    return 0;
  }

  return Math.min(100, (view.quality.holdingsBackedValue / view.totalAssets) * 100);
};

const getScopeSummary = (
  snapshot: BalanceSheetSnapshot,
  view: BalanceSheetViewSelection,
): string => {
  if (view.id === "household") {
    const memberText = pluralize(snapshot.members.length, "member");
    return `${memberText} · ${pluralize(view.accountsCount, "account")} in scope`;
  }

  return `${pluralize(view.accountsCount, "account")} assigned to ${view.label}`;
};

const getTrustLead = (view: BalanceSheetViewSelection): string => {
  if (view.freshness.level === "stale") {
    return "This workspace is showing at least one stale balance. Review old accounts before treating the totals as current.";
  }

  if (view.quality.estimatedAllocationAccounts > 0) {
    const accountCount = view.quality.estimatedAllocationAccounts;
    return `${pluralize(accountCount, "asset account")} ${accountCount === 1 ? "still relies" : "still rely"} on account-level classification because holdings detail was not available.`;
  }

  if (view.quality.accountsMissingSync > 0) {
    const accountCount = view.quality.accountsMissingSync;
    return `${pluralize(accountCount, "account")} ${accountCount === 1 ? "is" : "are"} missing a reliable sync timestamp, so freshness should be read with care.`;
  }

  return "Balances, exposures, and freshness are aligned enough here to use this as the working view for household capital decisions.";
};

const getAllocationExplanation = (
  view: BalanceSheetViewSelection,
  currency: string,
): string => {
  if (view.totalAssets <= 0) {
    return "Allocation lenses appear once the selected scope holds asset balances. Liabilities still flow through net worth and the register below.";
  }

  if (view.quality.estimatedAllocationAccounts > 0) {
    const accountCount = view.quality.estimatedAllocationAccounts;
    return `${pluralize(accountCount, "account")} totaling ${formatMoney(view.quality.estimatedAllocationValue, currency)} ${accountCount === 1 ? "is" : "are"} classified from account-level balances rather than holdings.`;
  }

  return "Allocation is backed by holdings-level balances across the current asset base.";
};

const formatUpdateTimestamp = (value: string | null): string =>
  value ? formatDateTime(value) : "No timestamp";

function LoadingWorkspace() {
  return (
    <section className={styles.stack}>
      <Card className={styles.workspaceCard} padding="relaxed">
        <div className={styles.workspaceHeader}>
          <div className={styles.valueBlock}>
            <div className={[styles.skeletonLine, styles.skeletonEyebrow].join(" ")} />
            <div className={[styles.skeletonLine, styles.skeletonValue].join(" ")} />
            <div className={[styles.skeletonLine, styles.skeletonMeta].join(" ")} />
          </div>
          <div className={styles.headerAside}>
            <div className={[styles.skeletonLine, styles.skeletonBadge].join(" ")} />
            <div className={styles.asideGrid}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div className={styles.asideMetric} key={index}>
                  <div className={[styles.skeletonLine, styles.skeletonLabel].join(" ")} />
                  <div className={[styles.skeletonLine, styles.skeletonMetric].join(" ")} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.controlRail}>
          {Array.from({ length: 2 }).map((_, index) => (
            <div className={styles.controlGroup} key={index}>
              <div className={[styles.skeletonLine, styles.skeletonLabel].join(" ")} />
              <div className={styles.segmentedControl}>
                {Array.from({ length: 3 }).map((_, buttonIndex) => (
                  <div
                    className={[styles.skeletonLine, styles.skeletonButton].join(" ")}
                    key={buttonIndex}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.metricStrip}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div className={styles.metricCell} key={index}>
              <div className={[styles.skeletonLine, styles.skeletonLabel].join(" ")} />
              <div className={[styles.skeletonLine, styles.skeletonMetric].join(" ")} />
              <div className={[styles.skeletonLine, styles.skeletonMeta].join(" ")} />
            </div>
          ))}
        </div>
      </Card>

      <div className={styles.workspaceGrid}>
        {Array.from({ length: 2 }).map((_, index) => (
          <Card className={styles.panelCard} key={index}>
            <div className={[styles.skeletonLine, styles.skeletonPanelTitle].join(" ")} />
            <div className={[styles.skeletonLine, styles.skeletonMeta].join(" ")} />
            <div className={styles.skeletonStack}>
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <div className={[styles.skeletonLine, styles.skeletonRow].join(" ")} key={rowIndex} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function EmptyWorkspace() {
  return (
    <Card className={styles.emptyCard} padding="relaxed">
      <div className={styles.emptyGrid}>
        <div className={styles.emptyPrimary}>
          <p className={styles.kicker}>Balance sheet</p>
          <h3 className={styles.emptyTitle}>Ready for the first household balance source</h3>
          <p className={styles.stateMessage}>
            Add an account or import holdings to turn this page into a working balance sheet
            with scope controls, allocation lenses, and data-confidence signals.
          </p>
          <div className={styles.inlineActions}>
            <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/accounts/new">
              Add account
            </Link>
            <Link className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")} href="/import">
              Import CSV
            </Link>
          </div>
        </div>
        <div className={styles.emptyPreview}>
          <h4 className={styles.emptyPreviewTitle}>What appears here</h4>
          <ul className={styles.emptyList}>
            <li>Net worth, assets, liabilities, and freshness for the selected household scope.</li>
            <li>Allocation views by asset class, geography, currency, and sector.</li>
            <li>Account-level breakdown with source, timestamp, and trust context.</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

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
    return <LoadingWorkspace />;
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
          Create your household first to unlock the shared balance sheet, member scope,
          and balance quality controls.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  if (loading && !snapshot) {
    return <LoadingWorkspace />;
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
    return <EmptyWorkspace />;
  }

  const selectedDimensionLabel =
    ALLOCATION_DIMENSIONS.find((dimension) => dimension.id === selectedDimension)?.label ??
    "Allocation";
  const rawAllocationRows = activeView.allocation[selectedDimension];
  const allocationRows = summarizeAllocationRows(rawAllocationRows);
  const leadingAllocation = rawAllocationRows[0] ?? null;
  const holdingsCoveragePct = getHoldingsCoveragePct(activeView);
  const reviewCount =
    activeView.freshness.staleAccounts + activeView.quality.accountsMissingSync;
  const scopeSummary = getScopeSummary(snapshot, activeView);
  const trustLead = getTrustLead(activeView);
  const allocationExplanation = getAllocationExplanation(activeView, snapshot.currency);
  const scopeExplanation =
    activeView.id === "household"
      ? "Household scope consolidates all accounts assigned to members in this household."
      : `${activeView.label} scope only includes balances assigned to that member.`;

  return (
    <section className={styles.stack}>
      <Card className={styles.workspaceCard} padding="relaxed">
        <div className={styles.workspaceHeader}>
          <div className={styles.valueBlock}>
            <p className={styles.kicker}>{activeView.label} balance sheet</p>
            <h3 className={styles.valueHeadline}>
              {formatMoney(activeView.netWorth, snapshot.currency)}
            </h3>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                As of {formatUpdateTimestamp(activeView.freshness.lastFullUpdate)}
              </span>
              <span className={styles.metaItem}>{scopeSummary}</span>
            </div>
            <p className={styles.workspaceLead}>{trustLead}</p>
          </div>

          <div className={styles.headerAside}>
            <div className={styles.badgeRow}>
              <span
                className={[
                  styles.freshnessBadge,
                  FRESHNESS_TONE_CLASS[activeView.freshness.level],
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {FRESHNESS_LABEL[activeView.freshness.level]}
              </span>
              {loading ? <span className={styles.refreshingState}>Refreshing snapshot...</span> : null}
            </div>
            <div className={styles.asideGrid}>
              <article className={styles.asideMetric}>
                <span className={styles.asideLabel}>Last full update</span>
                <strong className={styles.asideValue}>
                  {formatUpdateTimestamp(activeView.freshness.lastFullUpdate)}
                </strong>
              </article>
              <article className={styles.asideMetric}>
                <span className={styles.asideLabel}>Primary source</span>
                <strong className={styles.asideValue}>
                  {SOURCE_LABELS[activeView.freshness.primarySyncSource]}
                </strong>
              </article>
              <article className={styles.asideMetric}>
                <span className={styles.asideLabel}>Freshness note</span>
                <strong className={styles.asideValue}>{activeView.freshness.message}</strong>
              </article>
            </div>
          </div>
        </div>

        <div className={styles.controlRail}>
          <section className={styles.controlGroup} aria-label="Member scope controls">
            <div className={styles.controlHeading}>
              <p className={styles.controlLabel}>Member scope</p>
              <p className={styles.controlMeta}>Switch between household and individual balance sheets.</p>
            </div>
            <div className={styles.segmentedControl} role="tablist" aria-label="Member scope">
              <button
                aria-pressed={selectedMemberId === "household"}
                className={[
                  styles.segmentButton,
                  selectedMemberId === "household" ? styles.segmentButtonActive : "",
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
                    styles.segmentButton,
                    selectedMemberId === member.id ? styles.segmentButtonActive : "",
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
          </section>

          <section className={styles.controlGroup} aria-label="Allocation view controls">
            <div className={styles.controlHeading}>
              <p className={styles.controlLabel}>Allocation lens</p>
              <p className={styles.controlMeta}>Compare the selected scope by the exposure lens that matters now.</p>
            </div>
            <div className={styles.segmentedControl} role="tablist" aria-label="Allocation view">
              {ALLOCATION_DIMENSIONS.map((dimension) => (
                <button
                  aria-pressed={selectedDimension === dimension.id}
                  className={[
                    styles.segmentButton,
                    selectedDimension === dimension.id ? styles.segmentButtonActive : "",
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
          </section>
        </div>

        <div className={styles.metricStrip}>
          <article className={styles.metricCell}>
            <span className={styles.metricLabel}>Net worth</span>
            <strong
              className={[
                styles.metricValue,
                activeView.netWorth < 0 ? styles.metricNegative : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {formatMoney(activeView.netWorth, snapshot.currency)}
            </strong>
            <span className={styles.metricMeta}>Assets less liabilities in this scope.</span>
          </article>

          <article className={styles.metricCell}>
            <span className={styles.metricLabel}>Assets</span>
            <strong className={[styles.metricValue, styles.metricPositive].join(" ")}>
              {formatMoney(activeView.totalAssets, snapshot.currency)}
            </strong>
            <span className={styles.metricMeta}>Positive balances included in allocation views.</span>
          </article>

          <article className={styles.metricCell}>
            <span className={styles.metricLabel}>Liabilities</span>
            <strong className={[styles.metricValue, styles.metricNegative].join(" ")}>
              {formatMoney(activeView.totalLiabilities, snapshot.currency)}
            </strong>
            <span className={styles.metricMeta}>Debt balances reducing net worth.</span>
          </article>

          <article className={styles.metricCell}>
            <span className={styles.metricLabel}>Holdings detail</span>
            <strong className={styles.metricValue}>{formatPercent(holdingsCoveragePct)}</strong>
            <span className={styles.metricMeta}>
              Of assets backed by holdings-level positions.
            </span>
          </article>
        </div>
      </Card>

      {error ? (
        <div className={styles.noticeBanner} role="status">
          <div className={styles.noticeBody}>
            <p className={styles.noticeTitle}>Live refresh interrupted</p>
            <p className={styles.noticeCopy}>
              {error} Showing the last completed balance-sheet snapshot while we retry.
            </p>
          </div>
          <button
            className={[themeStyles.button, themeStyles.buttonGhost].join(" ")}
            onClick={() => {
              void loadSnapshot();
            }}
            type="button"
          >
            Retry refresh
          </button>
        </div>
      ) : null}

      <div className={styles.workspaceGrid}>
        <Card
          className={styles.panelCard}
          title={`${selectedDimensionLabel} allocation`}
          description={`${activeView.label} assets ranked by ${selectedDimensionLabel.toLowerCase()}. Allocation is calculated on assets only.`}
        >
          <div className={styles.panelSummary}>
            <article className={styles.summaryMetric}>
              <span className={styles.summaryLabel}>Largest exposure</span>
              <strong className={styles.summaryValue}>
                {leadingAllocation
                  ? `${leadingAllocation.label} · ${formatPercent(leadingAllocation.pct)}`
                  : "No asset exposure yet"}
              </strong>
              <span className={styles.summaryMeta}>
                {leadingAllocation
                  ? formatMoney(leadingAllocation.value, snapshot.currency)
                  : "Allocation will appear once assets are in scope."}
              </span>
            </article>
            <article className={styles.summaryMetric}>
              <span className={styles.summaryLabel}>Asset base</span>
              <strong className={styles.summaryValue}>
                {formatMoney(activeView.totalAssets, snapshot.currency)}
              </strong>
              <span className={styles.summaryMeta}>{allocationExplanation}</span>
            </article>
          </div>

          {allocationRows.length === 0 ? (
            <p className={styles.emptyNote}>
              No allocation data is available for this scope yet. Add assets or import
              holdings to unlock a more precise exposure view.
            </p>
          ) : (
            <ol className={styles.allocationList}>
              {allocationRows.map((slice, index) => (
                <li className={styles.allocationRow} key={slice.key}>
                  <div className={styles.allocationMain}>
                    <span className={styles.allocationRank}>{String(index + 1).padStart(2, "0")}</span>
                    <div className={styles.allocationLabelBlock}>
                      <div className={styles.allocationHead}>
                        <p className={styles.allocationLabel}>{slice.label}</p>
                        <p className={styles.allocationValue}>
                          {formatMoney(slice.value, snapshot.currency)}
                        </p>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${Math.max(slice.pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className={styles.allocationShare}>{formatPercent(slice.pct)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card
          className={styles.panelCard}
          title={`${activeView.label} account register`}
          description="Latest known balances with ownership, structure, source, and freshness context."
        >
          {activeView.accounts.length === 0 ? (
            <p className={styles.emptyNote}>No account breakdown is available for this scope yet.</p>
          ) : (
            <div className={styles.tableScroller}>
              <table className={styles.accountTable}>
                <caption className={themeStyles.srOnly}>
                  Account register for the selected balance-sheet scope.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Owner</th>
                    <th scope="col">Profile</th>
                    <th scope="col">Updated</th>
                    <th scope="col" className={styles.numericCell}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeView.accounts.map((account) => {
                    const freshness = getFreshnessSummary(account.lastSynced, account.syncSource);

                    return (
                      <tr key={account.id}>
                        <td>
                          <div className={styles.tablePrimary}>
                            <strong className={styles.tableTitle}>{account.name}</strong>
                            <span className={styles.tableMeta}>{account.providerName}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.tableTitle}>{account.ownerDisplayName}</span>
                            <span className={styles.tableMeta}>
                              {VISIBILITY_LABELS[account.visibility]}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.tablePrimary}>
                            <span className={styles.tableTitle}>
                              {account.wrapperType} · {account.accountType}
                            </span>
                            <span className={styles.tableMeta}>
                              {pluralize(account.holdingsCount, "holding")}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.statusCell}>
                            <span
                              className={[
                                styles.rowStatusBadge,
                                FRESHNESS_TONE_CLASS[freshness.level],
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {FRESHNESS_LABEL[freshness.level]}
                            </span>
                            <span className={styles.tableMeta}>
                              {freshness.sourceLabel} · {formatUpdateTimestamp(account.lastSynced)}
                            </span>
                          </div>
                        </td>
                        <td className={styles.numericCell}>
                          <strong
                            className={[
                              styles.tableValue,
                              account.netValue < 0 ? styles.metricNegative : styles.metricPositive,
                            ].join(" ")}
                          >
                            {formatSignedMoney(account.netValue, account.currency)}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card
        className={styles.trustCard}
        title="Data quality and trust"
        description="How this balance sheet was assembled, where precision is strongest, and where to review gaps."
      >
        <div className={styles.qualityGrid}>
          <article className={styles.qualityMetric}>
            <span className={styles.qualityLabel}>Snapshot coverage</span>
            <strong className={styles.qualityValue}>
              {formatPercent(activeView.freshness.coveragePct)}
            </strong>
            <span className={styles.qualityMeta}>
              {pluralize(activeView.accountsCount, "tracked account")} contribute to this scope.
            </span>
          </article>
          <article className={styles.qualityMetric}>
            <span className={styles.qualityLabel}>Holdings detail</span>
            <strong className={styles.qualityValue}>{formatPercent(holdingsCoveragePct)}</strong>
            <span className={styles.qualityMeta}>
              {formatMoney(activeView.quality.holdingsBackedValue, snapshot.currency)} backed by
              positions.
            </span>
          </article>
          <article className={styles.qualityMetric}>
            <span className={styles.qualityLabel}>Accounts to review</span>
            <strong className={styles.qualityValue}>{reviewCount}</strong>
            <span className={styles.qualityMeta}>
              {activeView.freshness.staleAccounts} stale · {activeView.quality.accountsMissingSync} missing timestamps
            </span>
          </article>
          <article className={styles.qualityMetric}>
            <span className={styles.qualityLabel}>Primary source</span>
            <strong className={styles.qualityValue}>
              {SOURCE_LABELS[activeView.freshness.primarySyncSource]}
            </strong>
            <span className={styles.qualityMeta}>
              {pluralize(activeView.quality.providerAccounts, "provider-synced account")},{" "}
              {pluralize(activeView.quality.csvAccounts, "CSV account")},{" "}
              {pluralize(activeView.quality.manualAccounts, "manual account")}
            </span>
          </article>
        </div>

        <div className={styles.trustGrid}>
          <article className={styles.trustBlock}>
            <h4 className={styles.trustTitle}>Freshness</h4>
            <p className={styles.trustCopy}>{activeView.freshness.message}</p>
            <p className={styles.trustCopy}>
              Last full update: {formatUpdateTimestamp(activeView.freshness.lastFullUpdate)}
            </p>
          </article>

          <article className={styles.trustBlock}>
            <h4 className={styles.trustTitle}>Allocation basis</h4>
            <p className={styles.trustCopy}>{allocationExplanation}</p>
            <p className={styles.trustCopy}>
              Liabilities remain in net worth and the account register, but allocation lenses
              only describe asset balances.
            </p>
          </article>

          <article className={styles.trustBlock}>
            <h4 className={styles.trustTitle}>Scope</h4>
            <p className={styles.trustCopy}>{scopeExplanation}</p>
            <p className={styles.trustCopy}>
              Use member scope to isolate ownership; return to household scope for the full
              capital picture.
            </p>
          </article>
        </div>
      </Card>
    </section>
  );
}
