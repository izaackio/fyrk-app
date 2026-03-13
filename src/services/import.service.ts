import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { assertHouseholdWritable } from "@/lib/demo";
import {
  CsvParserError,
  parseAvanzaCsv,
  parseNordnetTransactionsCsv,
  type CanonicalPortfolioSnapshotImportRow,
  type CanonicalTransactionImportRow,
} from "@/lib/csv";
import { isUniqueViolationError, ServiceError } from "@/services/errors";
import type {
  AccountTransactionType,
  CsvImportConfirmView,
  CsvImportPreviewView,
  ImportPreviewHoldingView,
  ImportPreviewTransactionView,
} from "@/types/domain";

interface ImportJobRow {
  id: string;
  account_id: string;
  created_by: string;
  format: string;
  status: string;
  rows_parsed: number;
  holdings_detected: number;
  transactions_detected: number;
  instruments_resolved: number;
  instruments_unresolved: number;
  preview: unknown;
  expires_at: string | null;
  file_checksum: string | null;
}

interface AccountRow {
  id: string;
  household_id: string;
  owner_user_id: string;
  currency: string;
  deleted_at: string | null;
  is_active: boolean;
}

interface ImportRowRecord {
  id: string;
  row_kind: string;
  normalized_data: unknown;
  validation_errors: unknown;
  resolution_status: string;
  dedupe_key: string | null;
  applied: boolean;
}

interface InstrumentRow {
  id: string;
  isin: string | null;
}

interface StoredPreviewPayload {
  holdings: ImportPreviewHoldingView[];
  transactions: ImportPreviewTransactionView[];
  confirmSummary?: CsvImportConfirmView;
}

interface HoldingNormalizedData {
  transactionDate: null;
  asOfDate: string;
  instrumentName: string;
  isin: string | null;
  quantity: number;
  averageCost: number | null;
  marketValue: number | null;
  valueCurrency: string;
}

interface TransactionNormalizedData {
  transactionDate: string;
  settlementDate: string | null;
  transactionType: AccountTransactionType;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  feeAmount: number;
  currency: string;
}

interface PreviewCsvInput {
  accountId: string;
  format: "avanza" | "nordnet";
  fileName: string;
  csvText: string;
}

interface ParsedCsvResult {
  holdings: CanonicalPortfolioSnapshotImportRow[];
  transactions: CanonicalTransactionImportRow[];
  rowsParsed: number;
}

const PREVIEW_EXPIRY_HOURS = 24;

export class ImportService {
  async previewCsv(authContext: AuthContext, input: PreviewCsvInput): Promise<CsvImportPreviewView> {
    const { supabase, user } = authContext;
    const account = await this.requireOwnedAccount(supabase, input.accountId, user.id);

    const checksum = this.computeChecksum(input.csvText);
    const existingDuplicate = await this.findReusableDuplicatePreview(
      supabase,
      input.accountId,
      user.id,
      input.format,
      checksum,
    );

    if (existingDuplicate) {
      return this.toPreviewResponse(existingDuplicate);
    }

    let parsed: ParsedCsvResult;

    try {
      parsed = this.parseCsvByFormat(input.format, input.csvText);
    } catch (error) {
      if (error instanceof CsvParserError) {
        throw ServiceError.validation("CSV parsing failed", {
          parserCode: error.code,
          parserMessage: error.message,
        });
      }

      throw error;
    }

    const previewPayload: StoredPreviewPayload = {
      holdings: this.toPreviewHoldings(parsed.holdings),
      transactions: this.toPreviewTransactions(parsed.transactions),
    };

    const instrumentsResolved = parsed.holdings.filter((row) => Boolean(row.isin)).length;
    const instrumentsUnresolved = Math.max(parsed.holdings.length - instrumentsResolved, 0);

    const expiresAt = new Date(Date.now() + PREVIEW_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { data: importJobData, error: importJobError } = await supabase
      .from("import_jobs")
      .insert({
        account_id: account.id,
        created_by: user.id,
        format: input.format,
        status: "preview",
        rows_parsed: parsed.rowsParsed,
        holdings_detected: parsed.holdings.length,
        transactions_detected: parsed.transactions.length,
        instruments_resolved: instrumentsResolved,
        instruments_unresolved: instrumentsUnresolved,
        file_name: input.fileName,
        file_checksum: checksum,
        preview: previewPayload,
        expires_at: expiresAt,
      })
      .select(
        "id, account_id, created_by, format, status, rows_parsed, holdings_detected, transactions_detected, instruments_resolved, instruments_unresolved, preview, expires_at, file_checksum",
      )
      .single();

    if (importJobError) {
      throw importJobError;
    }

    const importJob = importJobData as ImportJobRow;

    const importRowsPayload = [
      ...parsed.holdings.map((holding) => {
        const normalizedData = this.normalizeHoldingRow(holding);

        return {
          import_job_id: importJob.id,
          row_index: holding.rowNumber,
          row_kind: "holding",
          raw_data: holding.raw,
          normalized_data: normalizedData,
          validation_errors: [],
          resolution_status: "valid",
          dedupe_key: this.computeDedupeKey(input.accountId, "holding", normalizedData),
          applied: false,
        };
      }),
      ...parsed.transactions.map((transaction) => {
        const normalizedData = this.normalizeTransactionRow(transaction);

        return {
          import_job_id: importJob.id,
          row_index: transaction.rowNumber,
          row_kind: "transaction",
          raw_data: transaction.raw,
          normalized_data: normalizedData,
          validation_errors: [],
          resolution_status: "valid",
          dedupe_key: this.computeDedupeKey(input.accountId, "transaction", normalizedData),
          applied: false,
        };
      }),
    ];

    if (importRowsPayload.length > 0) {
      const { error: importRowsError } = await supabase.from("import_rows").insert(importRowsPayload);

      if (importRowsError) {
        throw importRowsError;
      }
    }

    return this.toPreviewResponse(importJob);
  }

  async confirmImport(authContext: AuthContext, importId: string): Promise<CsvImportConfirmView> {
    const { supabase, user } = authContext;
    const importJob = await this.getImportJobById(supabase, importId);

    if (!importJob) {
      throw new ServiceError("NOT_FOUND", "Import preview was not found");
    }

    const account = await this.requireOwnedAccount(supabase, importJob.account_id, user.id);

    if (importJob.created_by !== user.id && account.owner_user_id !== user.id) {
      throw new ServiceError("FORBIDDEN", "You are not allowed to confirm this import");
    }

    if (importJob.status === "confirmed") {
      const previewPayload = this.readStoredPreview(importJob.preview);
      if (previewPayload.confirmSummary) {
        return previewPayload.confirmSummary;
      }

      return this.readAppliedSummary(supabase, importJob.id);
    }

    if (importJob.status !== "preview") {
      throw ServiceError.validation("Only preview imports can be confirmed", {
        status: importJob.status,
      });
    }

    if (this.isExpired(importJob.expires_at)) {
      await supabase
        .from("import_jobs")
        .update({ status: "expired" })
        .eq("id", importJob.id)
        .eq("status", "preview");

      throw ServiceError.validation("Import preview expired. Upload the CSV again.");
    }

    const { data: importRowsData, error: importRowsError } = await supabase
      .from("import_rows")
      .select("id, row_kind, normalized_data, validation_errors, resolution_status, dedupe_key, applied")
      .eq("import_job_id", importJob.id)
      .is("deleted_at", null)
      .order("row_index", { ascending: true });

    if (importRowsError) {
      throw importRowsError;
    }

    const importRows = (importRowsData ?? []) as ImportRowRecord[];
    const instrumentCache = new Map<string, string>();

    let holdingsCreated = 0;
    let transactionsCreated = 0;

    for (const row of importRows) {
      if (row.applied) {
        continue;
      }

      if (row.row_kind === "holding") {
        const normalized = this.asHoldingNormalized(row.normalized_data);

        if (!normalized) {
          await this.markImportRowInvalid(supabase, row.id, "Invalid holding row payload");
          continue;
        }

        const instrumentId = await this.resolveInstrumentId(
          supabase,
          instrumentCache,
          normalized.instrumentName,
          normalized.isin,
          normalized.valueCurrency,
        );

        await this.upsertHolding(supabase, account.id, instrumentId, normalized);
        await this.markImportRowApplied(supabase, row.id, "resolved");

        holdingsCreated += 1;
        continue;
      }

      if (row.row_kind === "transaction") {
        const normalized = this.asTransactionNormalized(row.normalized_data);

        if (!normalized) {
          await this.markImportRowInvalid(supabase, row.id, "Invalid transaction row payload");
          continue;
        }

        const alreadyExists = await this.transactionExists(
          supabase,
          account.id,
          row.dedupe_key,
        );

        if (alreadyExists) {
          await this.markImportRowApplied(supabase, row.id, "ignored");
          continue;
        }

        const instrumentId = normalized.instrumentName || normalized.isin
          ? await this.resolveInstrumentId(
              supabase,
              instrumentCache,
              normalized.instrumentName,
              normalized.isin,
              normalized.currency,
            )
          : null;

        const { error: insertTransactionError } = await supabase.from("transactions").insert({
          account_id: account.id,
          instrument_id: instrumentId,
          type: normalized.transactionType,
          quantity: normalized.quantity,
          price: normalized.price,
          amount: normalized.amount,
          currency: normalized.currency,
          fee_amount: normalized.feeAmount,
          fee_currency: normalized.feeAmount > 0 ? normalized.currency : null,
          transaction_date: normalized.transactionDate,
          settlement_date: normalized.settlementDate,
          external_ref: row.dedupe_key,
          source: "csv",
        });

        if (insertTransactionError) {
          if (isUniqueViolationError(insertTransactionError) && row.dedupe_key) {
            await this.markImportRowApplied(supabase, row.id, "ignored");
            continue;
          }

          throw insertTransactionError;
        }

        await this.markImportRowApplied(supabase, row.id, "resolved");

        transactionsCreated += 1;
      }
    }

    const nowIso = new Date().toISOString();

    const { error: accountUpdateError } = await supabase
      .from("accounts")
      .update({
        last_synced: nowIso,
        sync_source: "csv",
      })
      .eq("id", account.id)
      .eq("owner_user_id", user.id);

    if (accountUpdateError) {
      throw accountUpdateError;
    }

    const summary: CsvImportConfirmView = {
      holdingsCreated,
      transactionsCreated,
      accountUpdated: true,
    };

    const existingPreview = this.readStoredPreview(importJob.preview);
    const nextPreview: StoredPreviewPayload = {
      ...existingPreview,
      confirmSummary: summary,
    };

    const { error: updateImportJobError } = await supabase
      .from("import_jobs")
      .update({
        status: "confirmed",
        confirmed_at: nowIso,
        expires_at: null,
        preview: nextPreview,
      })
      .eq("id", importJob.id)
      .eq("status", "preview");

    if (updateImportJobError) {
      throw updateImportJobError;
    }

    return summary;
  }

  private parseCsvByFormat(format: "avanza" | "nordnet", csvText: string): ParsedCsvResult {
    if (format === "avanza") {
      const parsed = parseAvanzaCsv(csvText);

      return parsed.source === "portfolioSnapshots"
        ? {
            holdings: parsed.rows,
            transactions: [],
            rowsParsed: parsed.rows.length,
          }
        : {
            holdings: [],
            transactions: parsed.rows,
            rowsParsed: parsed.rows.length,
          };
    }

    const parsed = parseNordnetTransactionsCsv(csvText);

    return {
      holdings: [],
      transactions: parsed.rows,
      rowsParsed: parsed.rows.length,
    };
  }

  private normalizeHoldingRow(row: CanonicalPortfolioSnapshotImportRow): HoldingNormalizedData {
    return {
      transactionDate: null,
      asOfDate: row.snapshotDate,
      instrumentName: row.instrumentName,
      isin: row.isin,
      quantity: row.quantity,
      averageCost: this.toMinorUnits(row.unitPrice),
      marketValue: this.toMinorUnits(row.marketValue),
      valueCurrency: row.currency.toUpperCase(),
    };
  }

  private normalizeTransactionRow(row: CanonicalTransactionImportRow): TransactionNormalizedData {
    const amount = this.toMinorUnits(row.netAmount ?? row.grossAmount);

    if (amount === null) {
      throw ServiceError.validation("CSV transaction row is missing amount", {
        rowNumber: row.rowNumber,
      });
    }

    return {
      transactionDate: row.bookingDate ?? row.tradeDate ?? row.asOfDate,
      settlementDate: row.settleDate,
      transactionType: this.toDbTransactionType(row.transactionKind),
      instrumentName: row.instrumentName,
      isin: row.isin,
      quantity: row.quantity,
      price: this.toMinorUnits(row.unitPrice),
      amount,
      feeAmount: this.toMinorUnits(row.feeAmount) ?? 0,
      currency: row.currency.toUpperCase(),
    };
  }

  private toDbTransactionType(type: CanonicalTransactionImportRow["transactionKind"]): AccountTransactionType {
    if (
      type === "buy" ||
      type === "sell" ||
      type === "dividend" ||
      type === "deposit" ||
      type === "withdrawal" ||
      type === "fee" ||
      type === "interest" ||
      type === "tax"
    ) {
      return type;
    }

    return "transfer";
  }

  private toPreviewHoldings(rows: CanonicalPortfolioSnapshotImportRow[]): ImportPreviewHoldingView[] {
    return rows.slice(0, 5).map((row) => ({
      name: row.instrumentName,
      ticker: null,
      isin: row.isin,
      quantity: row.quantity,
      marketValue: this.toMinorUnits(row.marketValue),
      valueCurrency: row.currency,
      asOfDate: row.snapshotDate,
    }));
  }

  private toPreviewTransactions(rows: CanonicalTransactionImportRow[]): ImportPreviewTransactionView[] {
    return rows.slice(0, 10).map((row) => ({
      transactionDate: row.bookingDate ?? row.tradeDate ?? row.asOfDate,
      type: row.transactionKind,
      instrumentName: row.instrumentName,
      isin: row.isin,
      quantity: row.quantity,
      price: this.toMinorUnits(row.unitPrice),
      amount: this.toMinorUnits(row.netAmount ?? row.grossAmount),
      currency: row.currency,
    }));
  }

  private async findReusableDuplicatePreview(
    supabase: SupabaseClient,
    accountId: string,
    userId: string,
    format: "avanza" | "nordnet",
    checksum: string,
  ): Promise<ImportJobRow | null> {
    const { data, error } = await supabase
      .from("import_jobs")
      .select(
        "id, account_id, created_by, format, status, rows_parsed, holdings_detected, transactions_detected, instruments_resolved, instruments_unresolved, preview, expires_at, file_checksum",
      )
      .eq("account_id", accountId)
      .eq("created_by", userId)
      .eq("format", format)
      .eq("file_checksum", checksum)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    const candidate = ((data ?? [])[0] as ImportJobRow | undefined) ?? null;
    if (!candidate) {
      return null;
    }

    if (candidate.status === "preview" && this.isExpired(candidate.expires_at)) {
      await supabase
        .from("import_jobs")
        .update({ status: "expired" })
        .eq("id", candidate.id)
        .eq("status", "preview");

      return null;
    }

    if (candidate.status === "preview" || candidate.status === "confirmed") {
      return candidate;
    }

    return null;
  }

  private toPreviewResponse(importJob: ImportJobRow): CsvImportPreviewView {
    const preview = this.readStoredPreview(importJob.preview);

    return {
      importId: importJob.id,
      format: this.normalizeImportFormat(importJob.format),
      rowsParsed: importJob.rows_parsed,
      holdingsDetected: importJob.holdings_detected,
      transactionsDetected: importJob.transactions_detected,
      instrumentsResolved: importJob.instruments_resolved,
      instrumentsUnresolved: importJob.instruments_unresolved,
      preview: {
        holdings: preview.holdings,
        transactions: preview.transactions,
      },
      status: "preview",
    };
  }

  private async getImportJobById(supabase: SupabaseClient, importId: string): Promise<ImportJobRow | null> {
    const { data, error } = await supabase
      .from("import_jobs")
      .select(
        "id, account_id, created_by, format, status, rows_parsed, holdings_detected, transactions_detected, instruments_resolved, instruments_unresolved, preview, expires_at, file_checksum",
      )
      .eq("id", importId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as ImportJobRow | null) ?? null;
  }

  private async requireOwnedAccount(
    supabase: SupabaseClient,
    accountId: string,
    userId: string,
  ): Promise<AccountRow> {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, household_id, owner_user_id, currency, deleted_at, is_active")
      .eq("id", accountId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.deleted_at || !data.is_active) {
      throw new ServiceError("NOT_FOUND", "Account was not found");
    }

    const account = data as AccountRow;

    if (account.owner_user_id !== userId) {
      throw new ServiceError("FORBIDDEN", "Only account owners can import data");
    }

    await assertHouseholdWritable(supabase, account.household_id);

    return account;
  }

  private async readAppliedSummary(
    supabase: SupabaseClient,
    importJobId: string,
  ): Promise<CsvImportConfirmView> {
    const { data, error } = await supabase
      .from("import_rows")
      .select("row_kind, applied, resolution_status")
      .eq("import_job_id", importJobId)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<{ row_kind: string; applied: boolean; resolution_status: string }>;
    const holdingsCreated = rows.filter(
      (row) => row.row_kind === "holding" && row.applied && row.resolution_status === "resolved",
    ).length;
    const transactionsCreated = rows.filter(
      (row) => row.row_kind === "transaction" && row.applied && row.resolution_status === "resolved",
    ).length;

    return {
      holdingsCreated,
      transactionsCreated,
      accountUpdated: true,
    };
  }

  private async transactionExists(
    supabase: SupabaseClient,
    accountId: string,
    dedupeKey: string | null,
  ): Promise<boolean> {
    if (!dedupeKey) {
      return false;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id")
      .eq("account_id", accountId)
      .eq("external_ref", dedupeKey)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  private async upsertHolding(
    supabase: SupabaseClient,
    accountId: string,
    instrumentId: string,
    row: HoldingNormalizedData,
  ): Promise<void> {
    const existingHoldingId = await this.findActiveHoldingId(
      supabase,
      accountId,
      instrumentId,
      row.asOfDate,
    );

    if (existingHoldingId) {
      await this.updateHolding(supabase, existingHoldingId, row);
      return;
    }

    const { error: insertError } = await supabase.from("holdings").insert({
      account_id: accountId,
      instrument_id: instrumentId,
      quantity: row.quantity,
      average_cost: row.averageCost,
      market_value: row.marketValue,
      value_currency: row.valueCurrency,
      as_of_date: row.asOfDate,
      source: "csv",
    });

    if (insertError) {
      if (isUniqueViolationError(insertError)) {
        const concurrentHoldingId = await this.findActiveHoldingId(
          supabase,
          accountId,
          instrumentId,
          row.asOfDate,
        );

        if (concurrentHoldingId) {
          await this.updateHolding(supabase, concurrentHoldingId, row);
          return;
        }
      }

      throw insertError;
    }
  }

  private async findActiveHoldingId(
    supabase: SupabaseClient,
    accountId: string,
    instrumentId: string,
    asOfDate: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("holdings")
      .select("id")
      .eq("account_id", accountId)
      .eq("instrument_id", instrumentId)
      .eq("as_of_date", asOfDate)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || typeof data.id !== "string") {
      return null;
    }

    return data.id;
  }

  private async updateHolding(
    supabase: SupabaseClient,
    holdingId: string,
    row: HoldingNormalizedData,
  ): Promise<void> {
    const { error } = await supabase
      .from("holdings")
      .update({
        quantity: row.quantity,
        average_cost: row.averageCost,
        market_value: row.marketValue,
        value_currency: row.valueCurrency,
        source: "csv",
      })
      .eq("id", holdingId);

    if (error) {
      throw error;
    }
  }

  private async resolveInstrumentId(
    supabase: SupabaseClient,
    cache: Map<string, string>,
    instrumentName: string | null,
    isin: string | null,
    currency: string,
  ): Promise<string> {
    const cacheKey = this.instrumentCacheKey(instrumentName, isin, currency);
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    let matchedInstrument: InstrumentRow | null = null;

    if (isin) {
      const { data, error } = await supabase
        .from("instruments")
        .select("id, isin")
        .eq("isin", isin)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      matchedInstrument = (data as InstrumentRow | null) ?? null;
    }

    if (!matchedInstrument && instrumentName) {
      const { data, error } = await supabase
        .from("instruments")
        .select("id, isin")
        .eq("name", instrumentName)
        .eq("currency", currency)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      matchedInstrument = (data as InstrumentRow | null) ?? null;
    }

    if (!matchedInstrument) {
      const insertPayload = {
        isin,
        ticker: null,
        name: instrumentName ?? isin ?? "Unknown instrument",
        asset_class: "other",
        currency,
        price_source: "imported",
      };

      const { data: insertedInstrument, error: insertError } = await supabase
        .from("instruments")
        .insert(insertPayload)
        .select("id, isin")
        .single();

      if (insertError) {
        if (insertError.code === "23505" && isin) {
          const { data: conflictedInstrument, error: conflictedError } = await supabase
            .from("instruments")
            .select("id, isin")
            .eq("isin", isin)
            .limit(1)
            .single();

          if (conflictedError) {
            throw conflictedError;
          }

          matchedInstrument = conflictedInstrument as InstrumentRow;
        } else {
          throw insertError;
        }
      } else {
        matchedInstrument = insertedInstrument as InstrumentRow;
      }
    }

    if (!matchedInstrument) {
      throw new ServiceError("INTERNAL_ERROR", "Failed to resolve instrument");
    }

    cache.set(cacheKey, matchedInstrument.id);
    return matchedInstrument.id;
  }

  private async markImportRowApplied(
    supabase: SupabaseClient,
    rowId: string,
    resolutionStatus: "resolved" | "ignored",
  ): Promise<void> {
    const { error } = await supabase
      .from("import_rows")
      .update({
        applied: true,
        resolution_status: resolutionStatus,
      })
      .eq("id", rowId);

    if (error) {
      throw error;
    }
  }

  private async markImportRowInvalid(
    supabase: SupabaseClient,
    rowId: string,
    errorMessage: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("import_rows")
      .update({
        resolution_status: "invalid",
        validation_errors: [errorMessage],
      })
      .eq("id", rowId);

    if (error) {
      throw error;
    }
  }

  private asHoldingNormalized(value: unknown): HoldingNormalizedData | null {
    const record = this.asRecord(value);

    if (!record) {
      return null;
    }

    if (
      typeof record.asOfDate !== "string" ||
      typeof record.instrumentName !== "string" ||
      typeof record.quantity !== "number" ||
      typeof record.valueCurrency !== "string"
    ) {
      return null;
    }

    return {
      transactionDate: null,
      asOfDate: record.asOfDate,
      instrumentName: record.instrumentName,
      isin: typeof record.isin === "string" ? record.isin : null,
      quantity: record.quantity,
      averageCost: typeof record.averageCost === "number" ? record.averageCost : null,
      marketValue: typeof record.marketValue === "number" ? record.marketValue : null,
      valueCurrency: record.valueCurrency,
    };
  }

  private asTransactionNormalized(value: unknown): TransactionNormalizedData | null {
    const record = this.asRecord(value);

    if (!record) {
      return null;
    }

    if (
      typeof record.transactionDate !== "string" ||
      typeof record.transactionType !== "string" ||
      typeof record.amount !== "number" ||
      typeof record.feeAmount !== "number" ||
      typeof record.currency !== "string"
    ) {
      return null;
    }

    const transactionType = this.safeTransactionType(record.transactionType);

    if (!transactionType) {
      return null;
    }

    return {
      transactionDate: record.transactionDate,
      settlementDate: typeof record.settlementDate === "string" ? record.settlementDate : null,
      transactionType,
      instrumentName: typeof record.instrumentName === "string" ? record.instrumentName : null,
      isin: typeof record.isin === "string" ? record.isin : null,
      quantity: typeof record.quantity === "number" ? record.quantity : null,
      price: typeof record.price === "number" ? record.price : null,
      amount: record.amount,
      feeAmount: record.feeAmount,
      currency: record.currency,
    };
  }

  private safeTransactionType(value: string): AccountTransactionType | null {
    if (
      value === "buy" ||
      value === "sell" ||
      value === "dividend" ||
      value === "deposit" ||
      value === "withdrawal" ||
      value === "fee" ||
      value === "interest" ||
      value === "transfer" ||
      value === "tax"
    ) {
      return value;
    }

    return null;
  }

  private readStoredPreview(value: unknown): StoredPreviewPayload {
    const record = this.asRecord(value);

    if (!record) {
      return {
        holdings: [],
        transactions: [],
      };
    }

    const holdings = Array.isArray(record.holdings)
      ? record.holdings.filter((entry): entry is ImportPreviewHoldingView => this.isPreviewHolding(entry))
      : [];

    const transactions = Array.isArray(record.transactions)
      ? record.transactions.filter(
          (entry): entry is ImportPreviewTransactionView => this.isPreviewTransaction(entry),
        )
      : [];

    const confirmSummary = this.isConfirmSummary(record.confirmSummary)
      ? record.confirmSummary
      : undefined;

    return {
      holdings,
      transactions,
      ...(confirmSummary ? { confirmSummary } : {}),
    };
  }

  private isPreviewHolding(value: unknown): value is ImportPreviewHoldingView {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;

    return (
      typeof record.name === "string" &&
      (typeof record.ticker === "string" || record.ticker === null) &&
      (typeof record.isin === "string" || record.isin === null) &&
      (typeof record.quantity === "number" || record.quantity === null) &&
      (typeof record.marketValue === "number" || record.marketValue === null) &&
      (typeof record.valueCurrency === "string" || record.valueCurrency === null) &&
      (typeof record.asOfDate === "string" || record.asOfDate === null)
    );
  }

  private isPreviewTransaction(value: unknown): value is ImportPreviewTransactionView {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;

    return (
      (typeof record.transactionDate === "string" || record.transactionDate === null) &&
      (typeof record.type === "string" || record.type === null) &&
      (typeof record.instrumentName === "string" || record.instrumentName === null) &&
      (typeof record.isin === "string" || record.isin === null) &&
      (typeof record.quantity === "number" || record.quantity === null) &&
      (typeof record.price === "number" || record.price === null) &&
      (typeof record.amount === "number" || record.amount === null) &&
      (typeof record.currency === "string" || record.currency === null)
    );
  }

  private isConfirmSummary(value: unknown): value is CsvImportConfirmView {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;

    return (
      typeof record.holdingsCreated === "number" &&
      typeof record.transactionsCreated === "number" &&
      typeof record.accountUpdated === "boolean"
    );
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) {
      return false;
    }

    const timestamp = Date.parse(expiresAt);
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    return Date.now() > timestamp;
  }

  private computeChecksum(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private computeDedupeKey(
    accountId: string,
    rowKind: "holding" | "transaction",
    normalizedData: HoldingNormalizedData | TransactionNormalizedData,
  ): string {
    return createHash("sha256")
      .update(`${accountId}|${rowKind}|${JSON.stringify(normalizedData)}`)
      .digest("hex");
  }

  private toMinorUnits(value: number | null | undefined): number | null {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return null;
    }

    return Math.round(value * 100);
  }

  private normalizeImportFormat(value: string): "avanza" | "nordnet" {
    return value === "nordnet" ? "nordnet" : "avanza";
  }

  private instrumentCacheKey(
    instrumentName: string | null,
    isin: string | null,
    currency: string,
  ): string {
    return `${isin ?? ""}|${instrumentName ?? ""}|${currency}`;
  }
}

export const importService = new ImportService();
