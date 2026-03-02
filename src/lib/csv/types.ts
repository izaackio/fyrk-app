export type CsvProvider = "avanza" | "nordnet";
export type CsvImportSource = "transactions" | "portfolioSnapshots";

export type CanonicalTransactionKind =
  | "buy"
  | "sell"
  | "dividend"
  | "deposit"
  | "withdrawal"
  | "interest"
  | "fee"
  | "tax"
  | "other";

export interface CanonicalImportRowBase {
  provider: CsvProvider;
  source: CsvImportSource;
  rowNumber: number;
  asOfDate: string;
  accountName: string;
  currency: string;
  raw: Record<string, string>;
}

export interface CanonicalTransactionImportRow extends CanonicalImportRowBase {
  kind: "transaction";
  transactionKind: CanonicalTransactionKind;
  providerTransactionType: string;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  unitPrice: number | null;
  grossAmount: number | null;
  feeAmount: number | null;
  netAmount: number | null;
  tradeDate: string | null;
  settleDate: string | null;
  bookingDate: string | null;
}

export interface CanonicalPortfolioSnapshotImportRow extends CanonicalImportRowBase {
  kind: "portfolioSnapshot";
  instrumentName: string;
  isin: string | null;
  quantity: number;
  unitPrice: number | null;
  marketValue: number | null;
  snapshotDate: string;
}

export type CanonicalImportRow = CanonicalTransactionImportRow | CanonicalPortfolioSnapshotImportRow;

export interface ParsedProviderCsv<
  T extends CanonicalImportRow,
  S extends CsvImportSource = CsvImportSource,
> {
  provider: CsvProvider;
  source: S;
  headers: string[];
  rows: T[];
}

export interface AvanzaTransactionCsvRow {
  rowNumber: number;
  date: string;
  account: string;
  transactionType: string;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  fee: number | null;
  currency: string;
  raw: Record<string, string>;
}

export interface AvanzaPortfolioCsvRow {
  rowNumber: number;
  snapshotDate: string;
  account: string;
  instrumentName: string;
  isin: string | null;
  quantity: number;
  unitPrice: number | null;
  marketValue: number | null;
  currency: string;
  raw: Record<string, string>;
}

export interface NordnetTransactionCsvRow {
  rowNumber: number;
  bookingDate: string;
  tradeDate: string | null;
  settleDate: string | null;
  account: string;
  transactionType: string;
  instrumentName: string | null;
  isin: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  fee: number | null;
  currency: string;
  raw: Record<string, string>;
}
