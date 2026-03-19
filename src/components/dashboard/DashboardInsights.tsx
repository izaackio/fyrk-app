"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { formatDateTime } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import {
  loadDashboardInsights,
  type DashboardInsights as DashboardInsightsData,
} from "../balance-sheet/insights";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import {
  buildDashboardViewModel,
  type DashboardAction,
  type DashboardIntent,
  type DashboardMetric,
  type DashboardMilestone,
  type DashboardTimelineEntry,
} from "./dashboard-view-model";
import styles from "./dashboard-insights.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The home could not refresh just now.";
};

const intentClassByTone: Record<DashboardIntent, string> = {
  info: styles.toneInfo ?? "",
  neutral: styles.toneNeutral ?? "",
  positive: styles.tonePositive ?? "",
  warning: styles.toneWarning ?? "",
};

function renderActionCta(
  action: DashboardAction,
  onRefresh: () => void,
  isPrimary = false,
): ReactNode {
  const buttonClasses = [
    themeStyles.button,
    isPrimary ? themeStyles.buttonPrimary : themeStyles.buttonSecondary,
  ].join(" ");

  if (action.kind === "refresh") {
    return (
      <button className={buttonClasses} onClick={onRefresh} type="button">
        {action.ctaLabel}
      </button>
    );
  }

  return (
    <Link className={buttonClasses} href={action.href ?? "/dashboard"}>
      {action.ctaLabel}
    </Link>
  );
}

function MetricList({
  items,
}: {
  items: DashboardMetric[];
}) {
  return (
    <div className={styles.metricList}>
      {items.map((item) => {
        return (
          <div key={item.label} className={styles.metricRow}>
            <div className={styles.metricCopy}>
              <span className={styles.metricLabel}>{item.label}</span>
              <strong className={styles.metricValue}>{item.value}</strong>
            </div>
            <p className={`${styles.metricDetail} ${intentClassByTone[item.intent]}`}>{item.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function ActionCards({
  actions,
  onRefresh,
}: {
  actions: DashboardAction[];
  onRefresh: () => void;
}) {
  return (
    <div className={styles.actionGrid}>
      {actions.map((action, index) => {
        return (
          <Card
            className={`${styles.actionCard} ${styles.intentSurface} ${intentClassByTone[action.intent]}`}
            key={`${action.eyebrow}-${action.title}`}
            padding="relaxed"
          >
            <div className={styles.actionCardBody}>
              <div className={styles.actionHeading}>
                <span className={styles.sectionEyebrow}>{action.eyebrow}</span>
                <h2 className={styles.actionTitle}>{action.title}</h2>
              </div>
              <p className={styles.actionDescription}>{action.description}</p>
              <div className={styles.actionFooter}>{renderActionCta(action, onRefresh, index === 0)}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StatusCards({
  items,
}: {
  items: DashboardMetric[];
}) {
  return (
    <div className={styles.statusGrid}>
      {items.map((item) => {
        return (
          <Card
            className={`${styles.statusCard} ${styles.intentSurface} ${intentClassByTone[item.intent]}`}
            key={item.label}
            padding="compact"
            tone="subtle"
          >
            <div className={styles.statusValue}>{item.value}</div>
            <div className={styles.statusLabel}>{item.label}</div>
            <p className={styles.statusDetail}>{item.detail}</p>
          </Card>
        );
      })}
    </div>
  );
}

function TimelineList({
  items,
}: {
  items: DashboardTimelineEntry[];
}) {
  return (
    <ol className={styles.timelineList}>
      {items.map((item) => {
        return (
          <li className={styles.timelineItem} key={`${item.label}-${item.title}`}>
            <div className={styles.timelineMarker} aria-hidden="true" />
            <div className={styles.timelineContent}>
              <p className={styles.timelineLabel}>{item.label}</p>
              <h3 className={styles.timelineTitle}>{item.title}</h3>
              <p className={`${styles.timelineDetail} ${intentClassByTone[item.intent]}`}>{item.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Milestones({
  items,
}: {
  items: DashboardMilestone[];
}) {
  return (
    <div className={styles.milestoneStack}>
      {items.map((item) => {
        return (
          <div
            className={`${styles.milestoneCard} ${styles.intentSurface} ${intentClassByTone[item.intent]}`}
            key={item.title}
          >
            <h3 className={styles.milestoneTitle}>{item.title}</h3>
            <p className={styles.milestoneDetail}>{item.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <section aria-busy="true" className={styles.dashboardSurface}>
      <div className={styles.heroGrid}>
        <Card className={styles.heroCard} padding="relaxed">
          <div className={styles.loadingBlock}>
            <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonBody}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonBodyWide}`} />
          </div>
        </Card>
        <Card className={styles.metricCard} padding="relaxed">
          <div className={styles.loadingMetricList}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div className={styles.loadingMetricRow} key={index}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonMetric}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonDetail}`} />
              </div>
            ))}
          </div>
        </Card>
        <Card className={styles.trustCard} padding="relaxed">
          <div className={styles.loadingBlock}>
            <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonSubtitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonBody}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonBodyWide}`} />
          </div>
        </Card>
      </div>

      <Card className={styles.narrativeCard} padding="relaxed">
        <div className={styles.loadingBlock}>
          <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonNarrative}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonNarrativeWide}`} />
          <div className={`${styles.skeletonLine} ${styles.skeletonBody}`} />
        </div>
      </Card>

      <div className={styles.sectionGrid}>
        <div className={styles.actionGrid}>
          {Array.from({ length: 2 }).map((_, index) => (
            <Card className={styles.actionCard} key={index} padding="relaxed">
              <div className={styles.loadingBlock}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonSubtitle}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonBodyWide}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonButton}`} />
              </div>
            </Card>
          ))}
        </div>
        <div className={styles.statusGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Card className={styles.statusCard} key={index} padding="compact" tone="subtle">
              <div className={styles.loadingBlock}>
                <div className={`${styles.skeletonLine} ${styles.skeletonMetric}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonDetail}`} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardStateSurface({
  action,
  secondaryAction,
  title,
  description,
  eyebrow,
  previewCards,
}: {
  action: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
  description: string;
  eyebrow: string;
  previewCards: Array<{ title: string; description: string }>;
}) {
  return (
    <section className={styles.dashboardSurface}>
      <div className={styles.heroGrid}>
        <Card className={styles.heroCard} padding="relaxed">
          <div className={styles.heroContent}>
            <span className={styles.sectionEyebrow}>{eyebrow}</span>
            <h2 className={styles.heroValue}>{title}</h2>
            <p className={styles.heroSummary}>{description}</p>
            <div className={styles.heroActions}>
              {action}
              {secondaryAction}
            </div>
          </div>
        </Card>

        <Card
          className={styles.metricCard}
          description="What this page becomes once the household picture is active."
          eyebrow="Flagship home"
          padding="relaxed"
          title="The weekly center"
        >
          <div className={styles.previewStack}>
            {previewCards.slice(0, 2).map((card) => (
              <div className={styles.previewCard} key={card.title}>
                <h3 className={styles.previewTitle}>{card.title}</h3>
                <p className={styles.previewDescription}>{card.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card
          className={styles.trustCard}
          description="Trust stays visible even before the first live brief."
          eyebrow="Trust and freshness"
          padding="relaxed"
          title="Built around confidence"
        >
          <div className={styles.previewStack}>
            {previewCards.slice(2).map((card) => (
              <div className={styles.previewCard} key={card.title}>
                <h3 className={styles.previewTitle}>{card.title}</h3>
                <p className={styles.previewDescription}>{card.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function DashboardErrorState({
  description,
  onRetry,
  title,
}: {
  description: string;
  onRetry: () => void;
  title: string;
}) {
  return (
    <DashboardStateSurface
      action={
        <button className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} onClick={onRetry} type="button">
          Reload workspace
        </button>
      }
      description={description}
      eyebrow="Home unavailable"
      previewCards={[
        {
          title: "Shared net worth",
          description: "A single household headline with assets, liabilities, and the latest weekly movement.",
        },
        {
          title: "Weekly narrative",
          description: "A readable brief that explains what changed and how much confidence to place in it.",
        },
        {
          title: "Freshness signals",
          description: "Trust cues stay close to the numbers so data quality never hides in the margins.",
        },
        {
          title: "Next actions",
          description: "The home should always suggest the next move to keep the household picture trustworthy.",
        },
      ]}
      title={title}
    />
  );
}

function DashboardPopulatedState({
  error,
  insights,
  onRefresh,
}: {
  error: string | null;
  insights: DashboardInsightsData;
  onRefresh: () => void;
}) {
  const model = buildDashboardViewModel(insights);
  const narrativeSourceClass =
    insights.weeklyNarrative.source === "ai" ? styles.toneInfo : styles.toneNeutral;

  return (
    <section className={styles.dashboardSurface}>
      {error ? (
        <div className={styles.refreshNotice}>
          <div>
            <p className={styles.refreshNoticeTitle}>Showing the last successful household brief.</p>
            <p className={styles.refreshNoticeBody}>{error}</p>
          </div>
          <button className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} onClick={onRefresh} type="button">
            Retry now
          </button>
        </div>
      ) : null}

      <div className={styles.heroGrid}>
        <Card className={styles.heroCard} padding="relaxed">
          <div className={styles.heroContent}>
            <span className={styles.sectionEyebrow}>Household net worth</span>
            <strong className={styles.heroValue}>{model.hero.value}</strong>
            <p className={`${styles.heroTrend} ${intentClassByTone[model.hero.trendIntent]}`}>{model.hero.trendLabel}</p>
            <p className={styles.heroSummary}>{model.hero.summary}</p>
            <p className={styles.heroDetail}>{model.hero.detail}</p>
            <p className={styles.heroFooter}>{model.hero.footer}</p>

            <div className={styles.terminalOnly}>
              <div className={styles.compactHeroGrid}>
                {model.heroMetrics.map((item) => (
                  <div className={styles.compactHeroItem} key={item.label}>
                    <span className={styles.compactHeroLabel}>{item.label}</span>
                    <strong className={styles.compactHeroValue}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card
          className={styles.metricCard}
          description="The key structural measures that shape this home."
          eyebrow="Hero summary row"
          padding="relaxed"
          title="Household frame"
        >
          <MetricList items={model.heroMetrics} />
        </Card>

        <Card
          className={`${styles.trustCard} ${styles.intentSurface} ${intentClassByTone[model.trust.intent]}`}
          description="Trust and freshness stay visible beside the headline."
          eyebrow="Trust and freshness"
          padding="relaxed"
          title={model.trust.badge}
        >
          <div className={styles.trustStack}>
            <p className={styles.trustSummary}>{model.trust.summary}</p>
            <p className={styles.trustDetail}>{model.trust.detail}</p>
            <div className={styles.badgeRow}>
              <span className={`${styles.surfaceBadge} ${intentClassByTone[model.trust.intent]}`}>
                {model.trust.badge}
              </span>
              <span className={`${styles.surfaceBadge} ${narrativeSourceClass}`}>
                {model.narrative.modeLabel}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className={styles.narrativeCard} padding="relaxed">
        <div className={styles.narrativeHeader}>
          <div className={styles.narrativeTitleBlock}>
            <span className={styles.sectionEyebrow}>Weekly narrative</span>
            <h2 className={styles.narrativeTitle}>What changed</h2>
          </div>
          <div className={styles.badgeRow}>
            <span className={`${styles.surfaceBadge} ${narrativeSourceClass}`}>{model.narrative.modeLabel}</span>
            <span className={`${styles.surfaceBadge} ${intentClassByTone[model.trust.intent]}`}>{model.trust.badge}</span>
          </div>
        </div>

        <div className={styles.narrativeGrid}>
          <div className={styles.narrativeMain}>
            <p className={styles.narrativeBody}>{insights.weeklyNarrative.narrative}</p>
            <p className={styles.narrativeTrustNote}>{model.narrative.trustNote}</p>
          </div>

          <div className={styles.narrativeAside}>
            {insights.weeklyNarrative.highlights.length > 0 ? (
              <ul className={styles.highlightList}>
                {insights.weeklyNarrative.highlights.map((highlight, index) => {
                  return (
                    <li
                      className={`${styles.highlightItem} ${styles.intentSurface} ${intentClassByTone[
                        highlight.type === "positive"
                          ? "positive"
                          : highlight.type === "action"
                            ? "warning"
                            : "neutral"
                      ]}`}
                      key={`${highlight.type}-${index}`}
                    >
                      {highlight.text}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div className={styles.narrativeMeta}>
              <p className={styles.narrativeSource}>{insights.weeklyNarrative.sourceMessage}</p>
              <p className={styles.narrativeGenerated}>Updated {formatDateTime(insights.weeklyNarrative.generatedAt)}</p>
            </div>
          </div>
        </div>
      </Card>

      <section className={styles.sectionStack}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionEyebrow}>Next actions</span>
          <h2 className={styles.sectionTitle}>Move the household picture forward without leaving the home.</h2>
        </div>
        <div className={styles.sectionGrid}>
          <ActionCards actions={model.actions} onRefresh={onRefresh} />
          <div className={styles.statusColumn}>
            <div className={styles.sectionHeadingCompact}>
              <span className={styles.sectionEyebrow}>Household status</span>
              <h3 className={styles.sectionSubtitle}>The structural signals worth holding in view.</h3>
            </div>
            <StatusCards items={model.statuses} />
          </div>
        </div>
      </section>

      <div className={styles.timelineGrid}>
        <Card
          className={styles.timelineCard}
          description="The recent markers that explain how this home arrived at the current brief."
          eyebrow="Recent timeline"
          padding="relaxed"
          title="Recent markers"
        >
          <TimelineList items={model.timeline} />
        </Card>

        <Card
          className={styles.timelineCard}
          description="The next confidence-building milestones Fyrk is watching for."
          eyebrow="Next milestones"
          padding="relaxed"
          title="What the home is aiming toward next"
        >
          <Milestones items={model.milestones} />
        </Card>
      </div>
    </section>
  );
}

export function DashboardInsights() {
  const { activeHouseholdId, error: householdError, loading: householdLoading } = useHouseholdContext();
  const [insights, setInsights] = useState<DashboardInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeHouseholdId) {
      setInsights(null);
      setError(null);
      setLoading(false);
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
    return <DashboardLoadingState />;
  }

  if (householdError) {
    return (
      <DashboardErrorState
        description={householdError}
        onRetry={() => {
          window.location.reload();
        }}
        title="We could not open the household home."
      />
    );
  }

  if (!activeHouseholdId) {
    return (
      <DashboardStateSurface
        action={
          <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
            Continue onboarding
          </Link>
        }
        description="Create the household so Fyrk can turn this page into a shared financial home with net worth, weekly movement, trust-aware freshness, and next actions."
        eyebrow="Household home"
        previewCards={[
          {
            title: "Shared net worth",
            description: "One headline for assets, liabilities, and the latest weekly move across the household.",
          },
          {
            title: "Weekly brief",
            description: "A calm narrative that explains what changed and what deserves attention next.",
          },
          {
            title: "Trust-aware freshness",
            description: "Freshness and coverage stay close to the numbers so confidence is never hidden.",
          },
          {
            title: "Next milestones",
            description: "The home keeps the next useful action and the next confidence step visible in the same place.",
          },
        ]}
        title="Start with the household, not the account list."
      />
    );
  }

  if (loading && !insights) {
    return <DashboardLoadingState />;
  }

  if (!loading && error && !insights) {
    return (
      <DashboardErrorState
        description={error}
        onRetry={() => {
          void loadData();
        }}
        title="The household home could not refresh."
      />
    );
  }

  if (!insights || insights.snapshot.accountsCount === 0) {
    return (
      <DashboardStateSurface
        action={
          <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/accounts/new">
            Add first account
          </Link>
        }
        description="Add or import the first account to establish a live household picture. Once balances land, this page becomes the weekly center for net worth, movement, trust, and next actions."
        eyebrow="Household home"
        previewCards={[
          {
            title: "Headline net worth",
            description: "Fyrk will anchor the page around a single household number with assets and liabilities in view.",
          },
          {
            title: "Weekly narrative",
            description: "The home turns raw movement into a readable brief instead of a pile of disconnected balances.",
          },
          {
            title: "Recent markers",
            description: "Every sync, weekly comparison, and brief generation leaves a visible trail.",
          },
          {
            title: "Trust signals",
            description: "Freshness, coverage, and fallback states remain integrated so the page stays credible.",
          },
        ]}
        secondaryAction={
          <Link className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")} href="/import">
            Import CSV
          </Link>
        }
        title="The home is ready for its first balances."
      />
    );
  }

  return (
    <DashboardPopulatedState
      error={error}
      insights={insights}
      onRefresh={() => {
        void loadData();
      }}
    />
  );
}
