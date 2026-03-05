"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

import { formatDate, formatNumber } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import type {
  FitnessComponent,
  FitnessHistoryPoint,
  FitnessPayload,
} from "../sprint4/contracts";
import { ApiClientError } from "../sprint4/http";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { loadFitness } from "./client";
import styles from "./fitness.module.css";

const componentMeta: Record<
  FitnessComponent,
  {
    description: string;
    label: string;
  }
> = {
  buffer: {
    description: "Liquidity depth and short-term resilience.",
    label: "Buffer",
  },
  efficiency: {
    description: "Data freshness and spending quality signals.",
    label: "Efficiency",
  },
  growth: {
    description: "Long-term capital compounding setup.",
    label: "Growth",
  },
  protection: {
    description: "Coverage and risk mitigation readiness.",
    label: "Protection",
  },
  trajectory: {
    description: "Momentum of score and execution trends.",
    label: "Trajectory",
  },
};

const describeError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load the fitness score. Try again.";
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const buildLinePath = (points: FitnessHistoryPoint[]): string => {
  if (points.length === 0) {
    return "";
  }

  const width = 260;
  const height = 110;
  const minScore = Math.min(...points.map((point) => point.score));
  const maxScore = Math.max(...points.map((point) => point.score));
  const span = Math.max(1, maxScore - minScore);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.score - minScore) / span) * height;

      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

const getGaugeStyle = (score: number): CSSProperties => ({
  "--gauge-value": `${clamp((score / 1000) * 100, 0, 100)}%`,
}) as CSSProperties;

export function FitnessExperience() {
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

  const [fitness, setFitness] = useState<FitnessPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeHouseholdId) {
      setFitness(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loadFitness({
        actor,
        householdId: activeHouseholdId,
      });

      setFitness(response.data);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId, actor]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const componentRows = useMemo(() => {
    if (!fitness) {
      return [];
    }

    return [
      {
        component: "buffer" as const,
        score: fitness.current.bufferScore,
      },
      {
        component: "growth" as const,
        score: fitness.current.growthScore,
      },
      {
        component: "protection" as const,
        score: fitness.current.protectionScore,
      },
      {
        component: "efficiency" as const,
        score: fitness.current.efficiencyScore,
      },
      {
        component: "trajectory" as const,
        score: fitness.current.trajectoryScore,
      },
    ];
  }, [fitness]);

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading fitness score">
        <p className={styles.stateMessage}>Fetching household context and score components...</p>
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
          Financial fitness scoring starts after you create your household and add accounts.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  if (loading && !fitness) {
    return (
      <Card className={styles.stateCard} title="Loading fitness score">
        <p className={styles.stateMessage}>Computing score and trend history...</p>
      </Card>
    );
  }

  if (error && !fitness) {
    return (
      <Card className={styles.stateCard} title="Could not load fitness score">
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

  if (!fitness) {
    return (
      <Card className={styles.stateCard} title="No fitness data yet">
        <p className={styles.stateMessage}>Add accounts and event activity to generate score components.</p>
      </Card>
    );
  }

  const trendPath = buildLinePath(fitness.history);

  return (
    <section className={styles.stack}>
      <Card className={styles.heroCard}>
        <div className={styles.heroGrid}>
          <div className={styles.gaugeWrap}>
            <div className={styles.gauge} style={getGaugeStyle(fitness.current.totalScore)}>
              <div className={styles.gaugeInner}>
                <span className={styles.scoreLabel}>Financial Fitness</span>
                <strong className={styles.scoreValue}>{formatNumber(fitness.current.totalScore, 0)}</strong>
                <span className={styles.scoreScale}>of 1000</span>
              </div>
            </div>
          </div>

          <div className={styles.heroBody}>
            <p className={styles.explanation}>{fitness.current.explanation}</p>
            <p className={styles.calculatedAt}>Calculated {formatDate(fitness.current.calculatedAt)}</p>
            <div className={styles.heroActions}>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  void loadData();
                }}
                type="button"
              >
                {loading ? "Refreshing..." : "Recalculate"}
              </button>
              <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/events">
                Open playbooks
              </Link>
              <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/timeline">
                Open timeline
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className={styles.stateCard} title="Refresh issue">
          <p className={styles.errorText}>{error}</p>
        </Card>
      ) : null}

      <Card className={styles.stateCard} title="Component breakdown" description="Each component contributes up to 200 points.">
        <div className={styles.componentGrid}>
          {componentRows.map((row) => {
            const meta = componentMeta[row.component];
            const width = `${clamp((row.score / 200) * 100, 0, 100)}%`;

            return (
              <article className={styles.componentCard} key={row.component}>
                <header className={styles.componentHeader}>
                  <div>
                    <h3 className={styles.componentTitle}>{meta.label}</h3>
                    <p className={styles.componentDescription}>{meta.description}</p>
                  </div>
                  <span className={styles.componentScore}>{formatNumber(row.score, 0)}/200</span>
                </header>

                <div aria-hidden className={styles.componentBar}>
                  <span className={styles.componentFill} style={{ width }} />
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      <div className={styles.analyticsGrid}>
        <Card className={styles.stateCard} title="Score trend">
          {fitness.history.length < 2 ? (
            <p className={styles.stateMessage}>Trend appears after at least two calculated score points.</p>
          ) : (
            <>
              <svg className={styles.trendChart} viewBox="0 0 260 120">
                <path className={styles.trendLine} d={trendPath} />
              </svg>
              <div className={styles.historyList}>
                {fitness.history.slice(-6).map((point) => (
                  <div className={styles.historyRow} key={point.date}>
                    <span>{formatDate(point.date)}</span>
                    <span>{formatNumber(point.score, 0)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className={styles.stateCard} title="Suggested actions" description="Prioritized by weakest components.">
          {fitness.current.suggestedActions.length === 0 ? (
            <p className={styles.stateMessage}>No suggested actions yet. Recalculate after timeline and event updates.</p>
          ) : (
            <ul className={styles.actionList}>
              {fitness.current.suggestedActions.map((action) => (
                <li className={styles.actionItem} key={`${action.component}-${action.title}`}>
                  <header className={styles.actionHeader}>
                    <span className={[themeStyles.chip, themeStyles.chipMuted].join(" ")}>{action.component}</span>
                    <strong className={styles.actionImpact}>{action.impact}</strong>
                  </header>
                  <p className={styles.actionTitle}>{action.title}</p>
                  <p className={styles.actionDescription}>{action.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
