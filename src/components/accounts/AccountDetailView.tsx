"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import {
  ApiClientError,
  getAccountDetail,
  getAccountHoldings,
  getAccountTransactions,
} from "./client";
import type {
  AccountDetail,
  AccountHolding,
  AccountTransaction,
  AccountTransactionsResponse,
} from "./contracts";
import { DataFreshnessMessage } from "./DataFreshnessMessage";
import { formatDate, formatMoney, formatNumber, formatPercent } from "./formatters";
import styles from "./accounts.module.css";

type AccountTab = "holdings" | "transactions";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Request failed. Please retry.";
};

interface AccountDetailViewProps {
  accountId: string;
}

export function AccountDetailView({ accountId }: AccountDetailViewProps) {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [holdings, setHoldings] = useState<AccountHolding[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [transactionsMeta, setTransactionsMeta] =
    useState<AccountTransactionsResponse["meta"] | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AccountTab>("holdings");

  const fetchAccount = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(null);

    try {
      const response = await getAccountDetail(accountId);
      setAccount(response.data);
    } catch (error) {
      setAccountError(toErrorMessage(error));
    } finally {
      setAccountLoading(false);
    }
  }, [accountId]);

  const fetchHoldings = useCallback(async () => {
    setHoldingsLoading(true);
    setHoldingsError(null);

    try {
      const response = await getAccountHoldings(accountId);
      setHoldings(response.data);
    } catch (error) {
      setHoldingsError(toErrorMessage(error));
    } finally {
      setHoldingsLoading(false);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const response = await getAccountTransactions(accountId, 50);
      setTransactions(response.data);
      setTransactionsMeta(response.meta);
    } catch (error) {
      setTransactionsError(toErrorMessage(error));
      setTransactionsMeta(null);
    } finally {
      setTransactionsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void fetchAccount();
    void fetchHoldings();
    void fetchTransactions();
  }, [fetchAccount, fetchHoldings, fetchTransactions]);

  const latestHoldingAsOf = useMemo(() => {
    if (holdings.length === 0) {
      return null;
    }

    return holdings.reduce<string>((latest, holding) => {
      if (!latest || holding.asOfDate > latest) {
        return holding.asOfDate;
      }

      return latest;
    }, "");
  }, [holdings]);

  if (accountLoading && !account) {
    return (
      <Card className={styles.stateCard} title="Loading account">
        <p className={styles.stateMessage}>Fetching account details…</p>
      </Card>
    );
  }

  if (!account && accountError) {
    return (
      <Card className={styles.stateCard} title="Account unavailable">
        <p className={styles.errorText}>{accountError}</p>
        <Link className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")} href="/accounts">
          Back to accounts
        </Link>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card className={styles.stateCard} title="Account unavailable">
        <p className={styles.stateMessage}>Account data is missing.</p>
      </Card>
    );
  }

  return (
    <section className={themeStyles.pageSection}>
      {searchParams.get("created") === "1" ? (
        <Card className={styles.infoCard} title="Account created">
          <p className={styles.stateMessage}>
            Continue with CSV import to populate holdings and transactions.
          </p>
          <Link
            className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
            href={`/import?accountId=${encodeURIComponent(account.id)}`}
          >
            Import CSV for this account
          </Link>
        </Card>
      ) : null}

      <Card className={styles.accountHeaderCard}>
        <div className={styles.accountHeaderGrid}>
          <div>
            <h2 className={styles.detailTitle}>{account.name}</h2>
            <p className={styles.accountMeta}>
              {account.providerName} · {account.accountType} · {account.wrapperType} ·{" "}
              {account.currency}
            </p>
            <p className={styles.accountValueNumber}>
              {formatMoney(account.totalValue, account.currency)}
            </p>
            <p className={styles.stateMessage}>Visibility: {account.visibility}</p>
          </div>
          <div className={styles.detailActions}>
            <Link
              className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
              href={`/import?accountId=${encodeURIComponent(account.id)}`}
            >
              Import CSV
            </Link>
            <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/accounts">
              All accounts
            </Link>
          </div>
        </div>
        <DataFreshnessMessage lastSynced={account.lastSynced} syncSource={account.syncSource} />
        {latestHoldingAsOf ? (
          <p className={styles.stateMessage}>
            Holdings view is shown as of {formatDate(latestHoldingAsOf)}.
          </p>
        ) : null}
        <p className={styles.stateMessage}>
          Provider-reported values are displayed as-is. No live repricing is applied.
        </p>
      </Card>

      <div aria-label="Account views" className={styles.tabGroup} role="tablist">
        <button
          aria-selected={activeTab === "holdings"}
          className={[
            styles.tabButton,
            activeTab === "holdings" ? styles.tabButtonActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setActiveTab("holdings")}
          role="tab"
          type="button"
        >
          Holdings
        </button>
        <button
          aria-selected={activeTab === "transactions"}
          className={[
            styles.tabButton,
            activeTab === "transactions" ? styles.tabButtonActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setActiveTab("transactions")}
          role="tab"
          type="button"
        >
          Transactions
        </button>
      </div>

      {activeTab === "holdings" ? (
        <Card className={styles.tableCard} title="Holdings">
          {holdingsLoading ? (
            <p className={styles.stateMessage}>Loading holdings…</p>
          ) : null}
          {!holdingsLoading && holdingsError ? (
            <div className={styles.stack}>
              <p className={styles.errorText}>{holdingsError}</p>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  void fetchHoldings();
                }}
                type="button"
              >
                Retry holdings
              </button>
            </div>
          ) : null}
          {!holdingsLoading && !holdingsError && holdings.length === 0 ? (
            <div className={styles.stack}>
              <p className={styles.stateMessage}>No holdings found for this account yet.</p>
              <Link
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                href={`/import?accountId=${encodeURIComponent(account.id)}`}
              >
                Import holdings from CSV
              </Link>
            </div>
          ) : null}
          {!holdingsLoading && !holdingsError && holdings.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">Instrument</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Market value</th>
                    <th scope="col">Unrealized P/L</th>
                    <th scope="col">As of</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.id}>
                      <td>
                        <strong>{holding.instrument.name}</strong>
                        <span className={styles.cellMeta}>
                          {holding.instrument.ticker ?? holding.instrument.isin ?? "N/A"}
                        </span>
                      </td>
                      <td>{formatNumber(holding.quantity, 4)}</td>
                      <td>{formatMoney(holding.marketValue, holding.valueCurrency)}</td>
                      <td>
                        {holding.unrealizedPnl === null
                          ? "N/A"
                          : `${formatMoney(holding.unrealizedPnl, holding.valueCurrency)} (${holding.unrealizedPnlPct === null ? "N/A" : formatPercent(holding.unrealizedPnlPct)})`}
                      </td>
                      <td>{formatDate(holding.asOfDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : null}

      {activeTab === "transactions" ? (
        <Card className={styles.tableCard} title="Transactions">
          {transactionsLoading ? (
            <p className={styles.stateMessage}>Loading transactions…</p>
          ) : null}
          {!transactionsLoading && transactionsError ? (
            <div className={styles.stack}>
              <p className={styles.errorText}>{transactionsError}</p>
              <button
                className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
                onClick={() => {
                  void fetchTransactions();
                }}
                type="button"
              >
                Retry transactions
              </button>
            </div>
          ) : null}
          {!transactionsLoading && !transactionsError && transactions.length === 0 ? (
            <p className={styles.stateMessage}>
              No transactions available yet. Import a CSV file to populate history.
            </p>
          ) : null}
          {!transactionsLoading && !transactionsError && transactions.length > 0 ? (
            <>
              <p className={styles.stateMessage}>
                Showing provider-reported transaction values. Total loaded:{" "}
                {transactionsMeta?.total ?? transactions.length}.
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Type</th>
                      <th scope="col">Instrument</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.transactionDate)}</td>
                        <td>{transaction.type}</td>
                        <td>{transaction.instrumentName ?? transaction.isin ?? "N/A"}</td>
                        <td>
                          {transaction.quantity === null
                            ? "N/A"
                            : formatNumber(transaction.quantity, 4)}
                        </td>
                        <td>{formatMoney(transaction.amount, transaction.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </Card>
      ) : null}
    </section>
  );
}
