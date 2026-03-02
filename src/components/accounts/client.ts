"use client";

import { PROVIDER_OPTIONS } from "./constants";
import type {
  AccountDetail,
  AccountHolding,
  AccountSummary,
  AccountTransaction,
  AccountTransactionsResponse,
  ApiEnvelope,
  ApiErrorEnvelope,
  CreateAccountRequest,
  CsvImportConfirmResponse,
  CsvImportPreviewResponse,
  ImportFormat,
  ImportPreviewHolding,
  ImportPreviewTransaction,
} from "./contracts";

const STORAGE_KEY = "fyrk:sprint2:accounts-state";
const API_DELAY_MS = 260;

interface ImportDraft {
  accountId: string;
  createdAt: string;
  format: ImportFormat;
  preview: CsvImportPreviewResponse["preview"];
  rowsParsed: number;
}

interface MockAccountsState {
  accounts: AccountDetail[];
  holdingsByAccountId: Record<string, AccountHolding[]>;
  importDrafts: Record<string, ImportDraft>;
  transactionsByAccountId: Record<string, AccountTransaction[]>;
}

const DEFAULT_STATE: MockAccountsState = {
  accounts: [],
  holdingsByAccountId: {},
  importDrafts: {},
  transactionsByAccountId: {},
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return randomId;
  }

  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const shouldUseFallbackByDefault = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const readState = (): MockAccountsState => {
  if (typeof window === "undefined") {
    return clone(DEFAULT_STATE);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return clone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MockAccountsState>;
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      holdingsByAccountId: parsed.holdingsByAccountId ?? {},
      importDrafts: parsed.importDrafts ?? {},
      transactionsByAccountId: parsed.transactionsByAccountId ?? {},
    };
  } catch {
    return clone(DEFAULT_STATE);
  }
};

const writeState = (state: MockAccountsState): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const normalizeHeader = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "")
    .replaceAll(/[._-]+/g, "");

const detectDelimiter = (headerLine: string): string => {
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;

  return semicolonCount > commaCount ? ";" : ",";
};

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const getColumnIndex = (headers: string[], candidates: string[]): number =>
  headers.findIndex((header) =>
    candidates.some((candidate) => header === normalizeHeader(candidate)),
  );

const parseDecimal = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replaceAll(/[^\d,.-]+/g, "");
  if (!compact) {
    return null;
  }

  const commaIndex = compact.lastIndexOf(",");
  const dotIndex = compact.lastIndexOf(".");

  let normalized = compact;
  if (commaIndex > dotIndex) {
    normalized = compact.replaceAll(".", "").replace(",", ".");
  } else if (dotIndex > commaIndex) {
    normalized = compact.replaceAll(",", "");
  } else {
    normalized = compact.replace(",", ".");
  }

  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

const parseIsoDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

const getValue = (cells: string[], index: number): string =>
  index >= 0 ? (cells[index] ?? "").trim() : "";

const parseCsvPreview = async (
  file: File,
  format: ImportFormat,
): Promise<CsvImportPreviewResponse> => {
  const csvText = await file.text();
  const cleaned = csvText.replace(/^\uFEFF/, "");
  const rawLines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length < 2) {
    throw new ApiClientError(
      "VALIDATION_ERROR",
      "The CSV file must include a header row and at least one data row.",
    );
  }

  const firstLine = rawLines[0];
  if (!firstLine) {
    throw new ApiClientError(
      "VALIDATION_ERROR",
      "The CSV file must include a header row.",
    );
  }

  const delimiter = detectDelimiter(firstLine);
  const rows = rawLines.map((line) => parseCsvLine(line, delimiter));
  const header = rows[0];
  if (!header) {
    throw new ApiClientError(
      "VALIDATION_ERROR",
      "The CSV file must include a header row.",
    );
  }
  const bodyRows = rows.slice(1);

  if (header.length < 2) {
    throw new ApiClientError(
      "VALIDATION_ERROR",
      "The CSV header is incomplete. Include at least two columns.",
    );
  }

  const normalizedHeader = header.map((cell) => normalizeHeader(cell));
  const dateIdx = getColumnIndex(normalizedHeader, [
    "date",
    "datum",
    "bokforingsdag",
    "affarsdag",
  ]);
  const typeIdx = getColumnIndex(normalizedHeader, [
    "type",
    "typ",
    "transaktionstyp",
    "transactiontype",
  ]);
  const instrumentIdx = getColumnIndex(normalizedHeader, [
    "instrument",
    "name",
    "namn",
    "vardepapper",
    "security",
  ]);
  const tickerIdx = getColumnIndex(normalizedHeader, ["ticker", "symbol", "kortnamn"]);
  const isinIdx = getColumnIndex(normalizedHeader, ["isin"]);
  const quantityIdx = getColumnIndex(normalizedHeader, ["quantity", "antal", "qty"]);
  const priceIdx = getColumnIndex(normalizedHeader, ["price", "kurs", "pris"]);
  const amountIdx = getColumnIndex(normalizedHeader, [
    "amount",
    "belopp",
    "summa",
    "total",
    "marknadsvarde",
    "varde",
  ]);
  const currencyIdx = getColumnIndex(normalizedHeader, ["currency", "valuta"]);

  const hasDetectedColumns =
    instrumentIdx >= 0 ||
    dateIdx >= 0 ||
    amountIdx >= 0 ||
    quantityIdx >= 0 ||
    typeIdx >= 0;

  if (!hasDetectedColumns) {
    throw new ApiClientError(
      "VALIDATION_ERROR",
      "CSV format not recognized. Supported exports are Avanza and Nordnet transaction/holding files.",
    );
  }

  const allHoldings: ImportPreviewHolding[] = [];
  const allTransactions: ImportPreviewTransaction[] = [];

  bodyRows.forEach((cells, rowIndex) => {
    const inferredName =
      getValue(cells, instrumentIdx) ||
      getValue(cells, tickerIdx) ||
      getValue(cells, isinIdx) ||
      `Row ${rowIndex + 1}`;
    const inferredIsin = getValue(cells, isinIdx) || null;
    const inferredTicker = getValue(cells, tickerIdx) || null;
    const parsedQuantity = parseDecimal(getValue(cells, quantityIdx));
    const parsedAmount = parseDecimal(getValue(cells, amountIdx));
    const parsedPrice = parseDecimal(getValue(cells, priceIdx));
    const parsedDate = parseIsoDate(getValue(cells, dateIdx));
    const parsedType = getValue(cells, typeIdx) || null;
    const currency = getValue(cells, currencyIdx) || null;

    if (parsedQuantity !== null || parsedAmount !== null) {
      allHoldings.push({
        asOfDate: parsedDate,
        isin: inferredIsin,
        marketValue:
          parsedAmount === null ? null : Math.round(Math.abs(parsedAmount) * 100),
        name: inferredName,
        quantity: parsedQuantity,
        ticker: inferredTicker,
        valueCurrency: currency,
      });
    }

    if (parsedDate || parsedType || parsedAmount !== null || inferredName) {
      allTransactions.push({
        amount: parsedAmount === null ? null : Math.round(parsedAmount * 100),
        currency,
        instrumentName: inferredName || null,
        isin: inferredIsin,
        price: parsedPrice === null ? null : Math.round(parsedPrice * 100),
        quantity: parsedQuantity,
        transactionDate: parsedDate,
        type: parsedType,
      });
    }
  });

  if (allHoldings.length === 0 && allTransactions.length === 0) {
    throw new ApiClientError(
      "VALIDATION_ERROR",
      "No parseable rows were found in this file. Verify the CSV export format and try again.",
    );
  }

  const holdingsPreview = allHoldings.slice(0, 5);
  const transactionsPreview = allTransactions.slice(0, 10);
  const instrumentsResolved = allHoldings.filter((holding) => Boolean(holding.isin)).length;
  const instrumentsUnresolved = Math.max(allHoldings.length - instrumentsResolved, 0);

  return {
    format,
    holdingsDetected: allHoldings.length,
    importId: createId(),
    instrumentsResolved,
    instrumentsUnresolved,
    preview: {
      holdings: holdingsPreview,
      transactions: transactionsPreview,
    },
    rowsParsed: bodyRows.length,
    status: "preview",
    transactionsDetected: allTransactions.length,
  };
};

const providerNameFromId = (providerId: string): string => {
  const found = PROVIDER_OPTIONS.find((option) => option.value === providerId);
  return found ? found.label : providerId;
};

const toHoldingFromPreview = (
  entry: ImportPreviewHolding,
  accountCurrency: string,
): AccountHolding => {
  const instrumentCurrency = entry.valueCurrency ?? accountCurrency;

  return {
    asOfDate: entry.asOfDate ?? new Date().toISOString().slice(0, 10),
    averageCost: null,
    id: createId(),
    instrument: {
      assetClass: "unknown",
      currency: instrumentCurrency,
      id: createId(),
      isin: entry.isin,
      name: entry.name,
      ticker: entry.ticker,
    },
    marketValue: entry.marketValue ?? 0,
    quantity: entry.quantity ?? 0,
    unrealizedPnl: null,
    unrealizedPnlPct: null,
    valueCurrency: instrumentCurrency,
  };
};

const toTransactionFromPreview = (
  entry: ImportPreviewTransaction,
  accountCurrency: string,
): AccountTransaction => ({
  amount: entry.amount ?? 0,
  currency: entry.currency ?? accountCurrency,
  id: createId(),
  instrumentName: entry.instrumentName,
  isin: entry.isin,
  price: entry.price,
  quantity: entry.quantity,
  transactionDate: entry.transactionDate ?? new Date().toISOString().slice(0, 10),
  type: entry.type ?? "transaction",
});

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;

    if (details) {
      this.details = details;
    }
  }
}

const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (!("error" in value)) {
    return false;
  }

  const error = (value as { error: unknown }).error;
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && "message" in error;
};

const toApiClientError = async (response: Response): Promise<ApiClientError> => {
  let parsedBody: unknown;

  try {
    parsedBody = (await response.json()) as unknown;
  } catch {
    parsedBody = null;
  }

  if (isApiErrorEnvelope(parsedBody)) {
    return new ApiClientError(
      parsedBody.error.code,
      parsedBody.error.message,
      parsedBody.error.details,
    );
  }

  return new ApiClientError(
    "INTERNAL_ERROR",
    `Request failed with status ${response.status}`,
  );
};

interface RequestWithFallbackOptions<T> {
  fallback: () => Promise<T>;
  init: RequestInit;
  path: string;
}

const requestWithFallback = async <T,>({
  fallback,
  init,
  path,
}: RequestWithFallbackOptions<T>): Promise<T> => {
  if (shouldUseFallbackByDefault() || typeof window === "undefined") {
    return fallback();
  }

  const hasFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: HeadersInit | undefined = hasFormDataBody
    ? init.headers
    : {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      };

  const requestInit: RequestInit = {
    ...init,
    ...(headers ? { headers } : {}),
  };

  try {
    const response = await fetch(path, requestInit);

    if (!response.ok) {
      throw await toApiClientError(response);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    return fallback();
  }
};

export const listAccounts = async (
  householdId: string,
): Promise<ApiEnvelope<AccountSummary[]>> =>
  requestWithFallback({
    fallback: async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      const accounts = state.accounts
        .filter((account) => account.householdId === householdId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      return { data: accounts };
    },
    init: {
      method: "GET",
    },
    path: `/api/accounts?householdId=${encodeURIComponent(householdId)}`,
  });

export const createAccount = async (
  payload: CreateAccountRequest,
): Promise<ApiEnvelope<AccountDetail>> =>
  requestWithFallback({
    fallback: async () => {
      await wait(API_DELAY_MS);

      const state = readState();
      const now = new Date().toISOString();
      const newAccount: AccountDetail = {
        accountType: payload.accountType,
        createdAt: now,
        currency: payload.currency,
        holdingsCount: 0,
        householdId: payload.householdId,
        id: createId(),
        isOwn: true,
        lastSynced: now,
        name: payload.name,
        ownerDisplayName: "You",
        providerId: payload.providerId,
        providerName: providerNameFromId(payload.providerId),
        syncSource: "manual",
        totalValue: 0,
        updatedAt: now,
        visibility: payload.visibility,
        wrapperType: payload.wrapperType,
      };

      state.accounts = [newAccount, ...state.accounts];
      state.holdingsByAccountId[newAccount.id] = [];
      state.transactionsByAccountId[newAccount.id] = [];
      writeState(state);

      return { data: newAccount };
    },
    init: {
      body: JSON.stringify(payload),
      method: "POST",
    },
    path: "/api/accounts",
  });

export const getAccountDetail = async (
  accountId: string,
): Promise<ApiEnvelope<AccountDetail>> =>
  requestWithFallback({
    fallback: async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      const account = state.accounts.find((candidate) => candidate.id === accountId);
      if (!account) {
        throw new ApiClientError("NOT_FOUND", "Account not found.");
      }

      return { data: account };
    },
    init: {
      method: "GET",
    },
    path: `/api/accounts/${encodeURIComponent(accountId)}`,
  });

export const getAccountHoldings = async (
  accountId: string,
): Promise<ApiEnvelope<AccountHolding[]>> =>
  requestWithFallback({
    fallback: async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      return {
        data: [...(state.holdingsByAccountId[accountId] ?? [])],
      };
    },
    init: {
      method: "GET",
    },
    path: `/api/accounts/${encodeURIComponent(accountId)}/holdings`,
  });

export const getAccountTransactions = async (
  accountId: string,
  limit = 50,
): Promise<AccountTransactionsResponse> =>
  requestWithFallback({
    fallback: async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      const transactions = [...(state.transactionsByAccountId[accountId] ?? [])];
      const sliced = transactions.slice(0, limit);

      return {
        data: sliced,
        meta: {
          cursor: sliced[sliced.length - 1]?.id ?? null,
          hasMore: transactions.length > sliced.length,
          total: transactions.length,
        },
      };
    },
    init: {
      method: "GET",
    },
    path: `/api/accounts/${encodeURIComponent(accountId)}/transactions?limit=${limit}`,
  });

export interface ParseCsvImportPayload {
  accountId: string;
  file: File;
  format: ImportFormat;
}

export const parseCsvImport = async ({
  accountId,
  file,
  format,
}: ParseCsvImportPayload): Promise<ApiEnvelope<CsvImportPreviewResponse>> =>
  requestWithFallback({
    fallback: async () => {
      await wait(API_DELAY_MS);
      const preview = await parseCsvPreview(file, format);
      const state = readState();

      state.importDrafts[preview.importId] = {
        accountId,
        createdAt: new Date().toISOString(),
        format,
        preview: preview.preview,
        rowsParsed: preview.rowsParsed,
      };
      writeState(state);

      return { data: preview };
    },
    init: (() => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("accountId", accountId);
      formData.append("format", format);

      return {
        body: formData,
        method: "POST",
      } satisfies RequestInit;
    })(),
    path: "/api/import/csv",
  });

export const confirmCsvImport = async (
  importId: string,
): Promise<ApiEnvelope<CsvImportConfirmResponse>> =>
  requestWithFallback({
    fallback: async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      const draft = state.importDrafts[importId];

      if (!draft) {
        throw new ApiClientError(
          "NOT_FOUND",
          "Import preview expired. Upload the CSV again.",
        );
      }

      const accountIndex = state.accounts.findIndex(
        (account) => account.id === draft.accountId,
      );
      if (accountIndex < 0) {
        throw new ApiClientError("NOT_FOUND", "Account for this import no longer exists.");
      }

      const account = state.accounts[accountIndex];
      if (!account) {
        throw new ApiClientError("NOT_FOUND", "Account for this import no longer exists.");
      }
      const normalizedHoldings = draft.preview.holdings.map((holding) =>
        toHoldingFromPreview(holding, account.currency),
      );
      const normalizedTransactions = draft.preview.transactions.map((transaction) =>
        toTransactionFromPreview(transaction, account.currency),
      );

      state.holdingsByAccountId[account.id] = normalizedHoldings;
      state.transactionsByAccountId[account.id] = normalizedTransactions;

      const totalValue = normalizedHoldings.reduce(
        (sum, holding) => sum + holding.marketValue,
        0,
      );
      const now = new Date().toISOString();

      state.accounts[accountIndex] = {
        ...account,
        holdingsCount: normalizedHoldings.length,
        lastSynced: now,
        syncSource: "csv",
        totalValue,
        updatedAt: now,
      };

      delete state.importDrafts[importId];
      writeState(state);

      return {
        data: {
          accountUpdated: true,
          holdingsCreated: normalizedHoldings.length,
          transactionsCreated: normalizedTransactions.length,
        },
      };
    },
    init: {
      body: JSON.stringify({ importId }),
      method: "POST",
    },
    path: `/api/import/${encodeURIComponent(importId)}/confirm`,
  });
