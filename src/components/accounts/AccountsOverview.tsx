"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { ApiClientError, listAccounts } from "./client";
import type { AccountSummary } from "./contracts";
import { AccountCard } from "./AccountCard";
import { useHouseholdContext } from "./useHouseholdContext";
import styles from "./accounts.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "We could not load accounts. Try again.";
};

export function AccountsOverview() {
  const { activeHouseholdId, error: householdError, loading: householdLoading } =
    useHouseholdContext();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!activeHouseholdId) {
      setAccounts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await listAccounts(activeHouseholdId);
      setAccounts(response.data);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading household accounts">
        <p className={styles.stateMessage}>Fetching household context and account list…</p>
      </Card>
    );
  }

  if (householdError) {
    return (
      <Card className={styles.stateCard} title="Could not load household">
        <p className={styles.stateMessage}>{householdError}</p>
      </Card>
    );
  }

  if (!activeHouseholdId) {
    return (
      <Card className={styles.stateCard} title="No household yet">
        <p className={styles.stateMessage}>
          Create your household first. Account and import flows activate once a household
          exists.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  return (
    <section className={themeStyles.pageSection}>
      <Card className={styles.infoCard} title="Account Data Handling">
        <p className={styles.stateMessage}>
          Values shown here are displayed exactly as reported by providers or CSV files.
          This view does not run live repricing.
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

      {loading ? (
        <Card className={styles.stateCard} title="Loading accounts">
          <p className={styles.stateMessage}>Retrieving account data…</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card className={styles.stateCard} title="Could not load accounts">
          <p className={styles.errorText}>{error}</p>
          <button
            className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
            onClick={() => {
              void loadAccounts();
            }}
            type="button"
          >
            Retry
          </button>
        </Card>
      ) : null}

      {!loading && !error && accounts.length === 0 ? (
        <Card className={styles.stateCard} title="Add your first account">
          <p className={styles.stateMessage}>
            Start with manual account setup, then import provider CSV data for holdings
            and transactions.
          </p>
          <div className={styles.inlineActions}>
            <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/accounts/new">
              Add account
            </Link>
            <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/import">
              Import from CSV
            </Link>
          </div>
        </Card>
      ) : null}

      {!loading && !error && accounts.length > 0 ? (
        <div className={styles.accountGrid}>
          {accounts.map((account) => (
            <AccountCard account={account} key={account.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
