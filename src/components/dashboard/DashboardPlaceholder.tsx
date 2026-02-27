"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSession } from "../api/mockClient";
import type { SessionResponseData } from "../api/contracts";
import styles from "../theme/theme.module.css";
import { Card } from "../ui/Card";

export function DashboardPlaceholder() {
  const [session, setSession] = useState<SessionResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void getSession()
      .then((response) => {
        if (!cancelled) {
          setSession(response.data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className={styles.placeholder} title="Preparing your dashboard">
        <p>Loading household context…</p>
      </Card>
    );
  }

  if (!session || session.households.length === 0) {
    return (
      <Card className={styles.emptyState} title="Your Household Balance Sheet">
        <p className={styles.emptyBody}>
          Add your first household to unlock shared visibility, partner invites, and
          the dashboard shell.
        </p>
        <Link className={[styles.button, styles.buttonPrimary].join(" ")} href="/onboarding">
          Start household setup
        </Link>
      </Card>
    );
  }

  const householdName = session.households[0]?.name ?? "Your household";

  return (
    <div className={styles.pageSection}>
      <div className={styles.dashboardGrid}>
        <Card className={styles.metricCard}>
          <span className={styles.metricLabel}>Net Worth</span>
          <strong className={styles.metricValue}>2 430 000 SEK</strong>
          <span className={styles.metricMeta}>
            <span className={styles.trendPositive}>▲ +12 400 SEK this week</span>
          </span>
        </Card>

        <Card className={styles.metricCard}>
          <span className={styles.metricLabel}>Financial Fitness</span>
          <strong className={styles.metricValue}>720</strong>
          <span className={styles.metricMeta}>▲ +20 since last month</span>
        </Card>
      </div>

      <Card className={styles.narrativeCard}>
        <h2 className={styles.narrativeTitle}>What Changed This Week</h2>
        <p className={styles.narrativeBody}>
          {householdName} ended the week stronger. Your long-term holdings offset
          short-term volatility, and you now have a clear baseline for upcoming account
          and import setup in Sprint 2.
        </p>
        <ul className={styles.list}>
          <li className={styles.listItem}>ISK portfolio trend remains positive.</li>
          <li className={styles.listItem}>Household onboarding status: complete.</li>
          <li className={styles.listItem}>Next milestone: add first account.</li>
        </ul>
      </Card>

      <div className={styles.statusGrid}>
        <Card className={styles.statusCard}>
          <span className={styles.statusLabel}>Active Life Events</span>
          <strong className={styles.statusValue}>1 active</strong>
          <span className={styles.statusMeta}>Placeholder only in Sprint 1</span>
        </Card>
        <Card className={styles.statusCard}>
          <span className={styles.statusLabel}>Pending Proposals</span>
          <strong className={styles.statusValue}>2 pending</strong>
          <span className={styles.statusMeta}>Routing available in app shell</span>
        </Card>
        <Card className={styles.statusCard}>
          <span className={styles.statusLabel}>Quarterly Review</span>
          <strong className={styles.statusValue}>Q1 in 18 days</strong>
          <span className={styles.statusMeta}>Review module is placeholder</span>
        </Card>
      </div>
    </div>
  );
}
