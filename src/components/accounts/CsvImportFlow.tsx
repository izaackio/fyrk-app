"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { ApiClientError, confirmCsvImport, listAccounts, parseCsvImport } from "./client";
import { IMPORT_FORMAT_OPTIONS } from "./constants";
import type {
  AccountSummary,
  CsvImportConfirmResponse,
  CsvImportPreviewResponse,
  ImportFormat,
} from "./contracts";
import { formatDate, formatMoney, formatNumber } from "./formatters";
import { useHouseholdContext } from "./useHouseholdContext";
import styles from "./accounts.module.css";

type ImportStage = "upload" | "preview" | "confirming" | "success";

const toErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Import request failed. Please try again.";
};

interface CsvImportFlowState {
  file: File | null;
  format: ImportFormat;
  selectedAccountId: string;
}

const INITIAL_STATE: CsvImportFlowState = {
  file: null,
  format: "avanza",
  selectedAccountId: "",
};

export function CsvImportFlow() {
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get("accountId");
  const { activeHouseholdId, error: householdError, loading: householdLoading } =
    useHouseholdContext();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [formState, setFormState] = useState<CsvImportFlowState>(INITIAL_STATE);
  const [stage, setStage] = useState<ImportStage>("upload");
  const [preview, setPreview] = useState<CsvImportPreviewResponse | null>(null);
  const [result, setResult] = useState<CsvImportConfirmResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!activeHouseholdId) {
      setAccounts([]);
      return;
    }

    setAccountsLoading(true);
    setAccountsError(null);

    try {
      const response = await listAccounts(activeHouseholdId);
      setAccounts(response.data);
    } catch (error) {
      setAccountsError(toErrorMessage(error));
    } finally {
      setAccountsLoading(false);
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    setFormState((current) => {
      if (current.selectedAccountId) {
        return current;
      }

      const defaultAccountId =
        (initialAccountId &&
          accounts.some((account) => account.id === initialAccountId) &&
          initialAccountId) ||
        accounts[0]?.id ||
        "";

      return {
        ...current,
        selectedAccountId: defaultAccountId,
      };
    });
  }, [accounts, initialAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === formState.selectedAccountId) ?? null,
    [accounts, formState.selectedAccountId],
  );

  const onParse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.selectedAccountId) {
      setFormError("Select an account before uploading CSV.");
      return;
    }

    if (!formState.file) {
      setFormError("Choose a CSV file to continue.");
      return;
    }

    if (!formState.file.name.toLowerCase().endsWith(".csv")) {
      setFormError("Only .csv files are supported for this flow.");
      return;
    }

    setWorking(true);

    try {
      const response = await parseCsvImport({
        accountId: formState.selectedAccountId,
        file: formState.file,
        format: formState.format,
      });

      setPreview(response.data);
      setStage("preview");
    } catch (error) {
      setFormError(toErrorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  const onConfirm = async () => {
    if (!preview) {
      return;
    }

    setWorking(true);
    setFormError(null);
    setStage("confirming");

    try {
      const response = await confirmCsvImport(preview.importId);
      setResult(response.data);
      setStage("success");
    } catch (error) {
      setFormError(toErrorMessage(error));
      setStage("preview");
    } finally {
      setWorking(false);
    }
  };

  const resetFlow = () => {
    setStage("upload");
    setPreview(null);
    setResult(null);
    setFormError(null);
    setWorking(false);
    setFormState((current) => ({
      ...INITIAL_STATE,
      format: current.format,
      selectedAccountId: current.selectedAccountId,
    }));
  };

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading import context">
        <p className={styles.stateMessage}>Checking household and account context…</p>
      </Card>
    );
  }

  if (householdError) {
    return (
      <Card className={styles.stateCard} title="Import unavailable">
        <p className={styles.errorText}>{householdError}</p>
      </Card>
    );
  }

  return (
    <section className={themeStyles.pageSection}>
      <Card className={styles.infoCard} title="CSV Import Rules">
        <p className={styles.stateMessage}>
          Imported values are displayed exactly as provider-reported. This workflow does
          not perform live repricing.
        </p>
        <p className={styles.stateMessage}>
          Supported formats: Avanza and Nordnet CSV exports.
        </p>
      </Card>

      {accountsLoading ? (
        <Card className={styles.stateCard} title="Loading accounts">
          <p className={styles.stateMessage}>Fetching account list for import target…</p>
        </Card>
      ) : null}

      {!accountsLoading && accountsError ? (
        <Card className={styles.stateCard} title="Could not load accounts">
          <p className={styles.errorText}>{accountsError}</p>
          <Button
            onClick={() => {
              void loadAccounts();
            }}
            variant="secondary"
          >
            Retry
          </Button>
        </Card>
      ) : null}

      {!accountsLoading && !accountsError && accounts.length === 0 ? (
        <Card className={styles.stateCard} title="No accounts available">
          <p className={styles.stateMessage}>
            Add an account first, then attach a CSV import to it.
          </p>
          <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/accounts/new">
            Add account
          </Link>
        </Card>
      ) : null}

      {!accountsLoading && !accountsError && accounts.length > 0 && stage === "upload" ? (
        <Card className={styles.tableCard} title="Upload CSV">
          <form className={styles.importForm} onSubmit={onParse}>
            <label className={themeStyles.inputStack} htmlFor="import-account">
              <span className={themeStyles.inputLabel}>Account</span>
              <select
                className={themeStyles.inputControl}
                id="import-account"
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    selectedAccountId: event.target.value,
                  }))
                }
                required
                value={formState.selectedAccountId}
              >
                <option value="" disabled>
                  Select account
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.providerName}
                  </option>
                ))}
              </select>
            </label>

            <label className={themeStyles.inputStack} htmlFor="import-format">
              <span className={themeStyles.inputLabel}>CSV format</span>
              <select
                className={themeStyles.inputControl}
                id="import-format"
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    format: event.target.value as ImportFormat,
                  }))
                }
                value={formState.format}
              >
                {IMPORT_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={themeStyles.inputStack} htmlFor="import-file">
              <span className={themeStyles.inputLabel}>CSV file</span>
              <input
                accept=".csv,text/csv"
                className={themeStyles.inputControl}
                id="import-file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setFormState((current) => ({
                    ...current,
                    file: nextFile,
                  }));
                }}
                required
                type="file"
              />
              <span className={themeStyles.inputHint}>
                Select provider export file. We parse locally for preview before confirm.
              </span>
            </label>

            {formError ? (
              <p aria-live="polite" className={styles.errorText}>
                {formError}
              </p>
            ) : null}

            <div className={styles.inlineActions}>
              <Button disabled={working} type="submit" variant="primary">
                {working ? "Parsing CSV…" : "Parse and preview"}
              </Button>
              <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/accounts">
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      ) : null}

      {preview && stage !== "upload" ? (
        <Card className={styles.tableCard} title="Import preview">
          {selectedAccount ? (
            <p className={styles.stateMessage}>
              Target account: <strong>{selectedAccount.name}</strong> ({selectedAccount.providerName})
            </p>
          ) : null}

          <div className={styles.importSummaryGrid}>
            <article className={styles.summaryMetric}>
              <p className={styles.summaryLabel}>Rows parsed</p>
              <p className={styles.summaryValue}>{formatNumber(preview.rowsParsed)}</p>
            </article>
            <article className={styles.summaryMetric}>
              <p className={styles.summaryLabel}>Holdings detected</p>
              <p className={styles.summaryValue}>{formatNumber(preview.holdingsDetected)}</p>
            </article>
            <article className={styles.summaryMetric}>
              <p className={styles.summaryLabel}>Transactions detected</p>
              <p className={styles.summaryValue}>{formatNumber(preview.transactionsDetected)}</p>
            </article>
          </div>

          {preview.instrumentsUnresolved > 0 ? (
            <p className={styles.warningText}>
              {preview.instrumentsUnresolved} instruments could not be resolved automatically.
              They will still import and can be corrected later.
            </p>
          ) : null}

          <p className={styles.stateMessage}>
            Holdings preview shows the first {preview.preview.holdings.length} rows.
          </p>
          {preview.preview.holdings.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">Instrument</th>
                    <th scope="col">ISIN</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Market value</th>
                    <th scope="col">As of</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.holdings.map((holding, index) => (
                    <tr key={`${holding.name}-${holding.isin ?? index}`}>
                      <td>{holding.name}</td>
                      <td>{holding.isin ?? "N/A"}</td>
                      <td>
                        {holding.quantity === null ? "N/A" : formatNumber(holding.quantity, 4)}
                      </td>
                      <td>
                        {holding.marketValue === null || !holding.valueCurrency
                          ? "N/A"
                          : formatMoney(holding.marketValue, holding.valueCurrency)}
                      </td>
                      <td>{holding.asOfDate ? formatDate(holding.asOfDate) : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.stateMessage}>No holdings rows in preview.</p>
          )}

          <p className={styles.stateMessage}>
            Transactions preview shows the first {preview.preview.transactions.length} rows.
          </p>
          {preview.preview.transactions.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Instrument</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.transactions.map((transaction, index) => (
                    <tr
                      key={`${transaction.transactionDate ?? "date"}-${transaction.instrumentName ?? index}`}
                    >
                      <td>
                        {transaction.transactionDate
                          ? formatDate(transaction.transactionDate)
                          : "N/A"}
                      </td>
                      <td>{transaction.type ?? "N/A"}</td>
                      <td>{transaction.instrumentName ?? transaction.isin ?? "N/A"}</td>
                      <td>
                        {transaction.amount === null || !transaction.currency
                          ? "N/A"
                          : formatMoney(transaction.amount, transaction.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.stateMessage}>No transaction rows in preview.</p>
          )}

          {formError ? (
            <p aria-live="polite" className={styles.errorText}>
              {formError}
            </p>
          ) : null}

          <div className={styles.inlineActions}>
            <Button disabled={working || stage === "confirming"} onClick={onConfirm} variant="primary">
              {stage === "confirming" ? "Confirming import…" : "Confirm import"}
            </Button>
            <Button disabled={working} onClick={resetFlow} variant="ghost">
              Start over
            </Button>
          </div>
        </Card>
      ) : null}

      {stage === "success" && result ? (
        <Card className={styles.tableCard} title="Import completed">
          <div className={styles.successBanner} role="status">
            Import succeeded. Account values now reflect the confirmed CSV data.
          </div>
          <div className={styles.importSummaryGrid}>
            <article className={styles.summaryMetric}>
              <p className={styles.summaryLabel}>Holdings created</p>
              <p className={styles.summaryValue}>{formatNumber(result.holdingsCreated)}</p>
            </article>
            <article className={styles.summaryMetric}>
              <p className={styles.summaryLabel}>Transactions created</p>
              <p className={styles.summaryValue}>{formatNumber(result.transactionsCreated)}</p>
            </article>
            <article className={styles.summaryMetric}>
              <p className={styles.summaryLabel}>Account updated</p>
              <p className={styles.summaryValue}>{result.accountUpdated ? "Yes" : "No"}</p>
            </article>
          </div>
          <div className={styles.inlineActions}>
            <Link
              className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
              href={selectedAccount ? `/accounts/${selectedAccount.id}` : "/accounts"}
            >
              View account
            </Link>
            <Button onClick={resetFlow} variant="secondary">
              Import another CSV
            </Button>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
