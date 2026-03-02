import type {
  AvanzaPortfolioCsvRow,
  AvanzaTransactionCsvRow,
  CanonicalPortfolioSnapshotImportRow,
  CanonicalTransactionImportRow,
  CanonicalTransactionKind,
  NordnetTransactionCsvRow,
} from "./types";

const AVANZA_TRANSACTION_KIND_MAP: Record<string, CanonicalTransactionKind> = {
  kop: "buy",
  salj: "sell",
  utdelning: "dividend",
  insattning: "deposit",
  uttag: "withdrawal",
  ranta: "interest",
  courtage: "fee",
  avgift: "fee",
  skatt: "tax",
};

const NORDNET_TRANSACTION_KIND_MAP: Record<string, CanonicalTransactionKind> = {
  kopt: "buy",
  salt: "sell",
  utdelning: "dividend",
  insattning: "deposit",
  uttag: "withdrawal",
  ranta: "interest",
  avgift: "fee",
  skatt: "tax",
};

export function normalizeAvanzaTransactionRow(
  row: AvanzaTransactionCsvRow,
): CanonicalTransactionImportRow {
  return {
    kind: "transaction",
    provider: "avanza",
    source: "transactions",
    rowNumber: row.rowNumber,
    asOfDate: row.date,
    accountName: row.account,
    currency: row.currency,
    transactionKind: mapTransactionKind(row.transactionType, AVANZA_TRANSACTION_KIND_MAP),
    providerTransactionType: row.transactionType,
    instrumentName: row.instrumentName,
    isin: row.isin,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    grossAmount: row.amount,
    feeAmount: row.fee,
    netAmount: row.amount,
    tradeDate: row.date,
    settleDate: null,
    bookingDate: row.date,
    raw: row.raw,
  };
}

export function normalizeAvanzaPortfolioRow(
  row: AvanzaPortfolioCsvRow,
): CanonicalPortfolioSnapshotImportRow {
  return {
    kind: "portfolioSnapshot",
    provider: "avanza",
    source: "portfolioSnapshots",
    rowNumber: row.rowNumber,
    asOfDate: row.snapshotDate,
    accountName: row.account,
    currency: row.currency,
    instrumentName: row.instrumentName,
    isin: row.isin,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    marketValue: row.marketValue,
    snapshotDate: row.snapshotDate,
    raw: row.raw,
  };
}

export function normalizeNordnetTransactionRow(
  row: NordnetTransactionCsvRow,
): CanonicalTransactionImportRow {
  return {
    kind: "transaction",
    provider: "nordnet",
    source: "transactions",
    rowNumber: row.rowNumber,
    asOfDate: row.bookingDate,
    accountName: row.account,
    currency: row.currency,
    transactionKind: mapTransactionKind(row.transactionType, NORDNET_TRANSACTION_KIND_MAP),
    providerTransactionType: row.transactionType,
    instrumentName: row.instrumentName,
    isin: row.isin,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    grossAmount: row.amount,
    feeAmount: row.fee,
    netAmount: row.amount,
    tradeDate: row.tradeDate,
    settleDate: row.settleDate,
    bookingDate: row.bookingDate,
    raw: row.raw,
  };
}

function mapTransactionKind(
  providerTransactionType: string,
  mapping: Record<string, CanonicalTransactionKind>,
): CanonicalTransactionKind {
  const normalized = normalizeProviderToken(providerTransactionType);
  return mapping[normalized] ?? "other";
}

function normalizeProviderToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
