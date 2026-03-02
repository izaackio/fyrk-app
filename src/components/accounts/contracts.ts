export type AccountVisibility = "full" | "hidden" | "private";

export type AccountType =
  | "investment"
  | "savings"
  | "pension"
  | "mortgage"
  | "loan"
  | "cash";

export type WrapperType =
  | "ISK"
  | "KF"
  | "Depa"
  | "Savings"
  | "Pension"
  | "Mortgage"
  | "Loan"
  | "Checking";

export type AccountSyncSource = "manual" | "csv" | "provider";

export type ImportFormat = "avanza" | "nordnet";

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface AccountSummary {
  id: string;
  householdId: string;
  name: string;
  providerId: string;
  providerName: string;
  accountType: AccountType;
  wrapperType: WrapperType;
  currency: string;
  visibility: AccountVisibility;
  ownerDisplayName: string;
  isOwn: boolean;
  totalValue: number;
  holdingsCount: number;
  lastSynced: string;
  syncSource: AccountSyncSource;
}

export interface AccountDetail extends AccountSummary {
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  householdId: string;
  name: string;
  providerId: string;
  accountType: AccountType;
  wrapperType: WrapperType;
  currency: string;
  visibility: AccountVisibility;
}

export interface AccountHolding {
  id: string;
  instrument: {
    id: string;
    isin: string | null;
    ticker: string | null;
    name: string;
    assetClass: string;
    currency: string;
  };
  quantity: number;
  averageCost: number | null;
  marketValue: number;
  valueCurrency: string;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  asOfDate: string;
}

export interface AccountTransaction {
  id: string;
  transactionDate: string;
  type: string;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  currency: string;
}

export interface AccountTransactionsResponse {
  data: AccountTransaction[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface ImportPreviewHolding {
  name: string;
  ticker: string | null;
  isin: string | null;
  quantity: number | null;
  marketValue: number | null;
  valueCurrency: string | null;
  asOfDate: string | null;
}

export interface ImportPreviewTransaction {
  transactionDate: string | null;
  type: string | null;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  currency: string | null;
}

export interface CsvImportPreviewResponse {
  importId: string;
  format: ImportFormat;
  rowsParsed: number;
  holdingsDetected: number;
  transactionsDetected: number;
  instrumentsResolved: number;
  instrumentsUnresolved: number;
  preview: {
    holdings: ImportPreviewHolding[];
    transactions: ImportPreviewTransaction[];
  };
  status: "preview";
}

export interface CsvImportConfirmResponse {
  holdingsCreated: number;
  transactionsCreated: number;
  accountUpdated: boolean;
}
