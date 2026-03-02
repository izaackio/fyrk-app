import { CsvHeaderError, CsvRowError } from "./errors";
import {
  getCell,
  optionalString,
  parseCsvTable,
  parseOptionalSwedishNumber,
  parseRequiredCurrency,
  parseRequiredDate,
  requireString,
  resolveOptionalColumn,
  resolveRequiredColumns,
  type ParsedCsvTable,
} from "./csv-utils";
import { normalizeAvanzaPortfolioRow, normalizeAvanzaTransactionRow } from "./normalize";
import type {
  AvanzaPortfolioCsvRow,
  AvanzaTransactionCsvRow,
  CanonicalPortfolioSnapshotImportRow,
  CanonicalTransactionImportRow,
  ParsedProviderCsv,
} from "./types";

const AVANZA_TRANSACTION_REQUIRED = {
  date: ["Datum"],
  account: ["Konto"],
  transactionType: ["Typ av transaktion", "Typ_av_transaktion", "Transaktionstyp"],
  amount: ["Belopp"],
  currency: ["Valuta"],
} as const;

const AVANZA_PORTFOLIO_REQUIRED = {
  snapshotDate: ["Datum", "Per datum"],
  account: ["Konto"],
  instrumentName: ["Värdepapper", "Instrument"],
  quantity: ["Antal"],
  currency: ["Valuta"],
} as const;

interface AvanzaTransactionColumns {
  date: string;
  account: string;
  transactionType: string;
  instrumentName: string | null;
  isin: string | null;
  quantity: string | null;
  unitPrice: string | null;
  amount: string;
  fee: string | null;
  currency: string;
}

interface AvanzaPortfolioColumns {
  snapshotDate: string;
  account: string;
  instrumentName: string;
  isin: string | null;
  quantity: string;
  unitPrice: string | null;
  marketValue: string | null;
  currency: string;
}

export type ParsedAvanzaCsv =
  | ParsedProviderCsv<CanonicalTransactionImportRow, "transactions">
  | ParsedProviderCsv<CanonicalPortfolioSnapshotImportRow, "portfolioSnapshots">;

export function parseAvanzaCsv(csv: string): ParsedAvanzaCsv {
  const table = parseCsvTable(csv);
  const transactionColumns = maybeResolveAvanzaTransactionColumns(table);
  const portfolioColumns = maybeResolveAvanzaPortfolioColumns(table);

  if (transactionColumns) {
    const rows = parseAvanzaTransactionRows(table, transactionColumns).map(normalizeAvanzaTransactionRow);
    return {
      provider: "avanza",
      source: "transactions",
      headers: table.headers,
      rows,
    };
  }

  if (portfolioColumns) {
    const rows = parseAvanzaPortfolioRows(table, portfolioColumns).map(normalizeAvanzaPortfolioRow);
    return {
      provider: "avanza",
      source: "portfolioSnapshots",
      headers: table.headers,
      rows,
    };
  }

  throw new CsvHeaderError(
    `Kunde inte identifiera Avanza-format. Förväntade transaktionskolumner som "Datum, Konto, Typ av transaktion, Belopp, Valuta" eller portföljkolumner som "Datum, Konto, Värdepapper, Antal, Valuta". Hittade: ${table.headers.join(", ")}.`,
  );
}

function maybeResolveAvanzaTransactionColumns(table: ParsedCsvTable): AvanzaTransactionColumns | null {
  try {
    const required = resolveRequiredColumns(
      table.headers,
      AVANZA_TRANSACTION_REQUIRED,
      "Avanza transaktionsfil kunde inte tolkas.",
    );

    return {
      date: required.date,
      account: required.account,
      transactionType: required.transactionType,
      amount: required.amount,
      currency: required.currency,
      instrumentName: resolveOptionalColumn(table.headers, ["Värdepapper", "Instrument"]),
      isin: resolveOptionalColumn(table.headers, ["ISIN"]),
      quantity: resolveOptionalColumn(table.headers, ["Antal"]),
      unitPrice: resolveOptionalColumn(table.headers, ["Kurs", "Senast betalt"]),
      fee: resolveOptionalColumn(table.headers, ["Courtage", "Avgifter", "Avgift"]),
    };
  } catch (error: unknown) {
    if (error instanceof CsvHeaderError) {
      return null;
    }
    throw error;
  }
}

function maybeResolveAvanzaPortfolioColumns(table: ParsedCsvTable): AvanzaPortfolioColumns | null {
  try {
    const required = resolveRequiredColumns(
      table.headers,
      AVANZA_PORTFOLIO_REQUIRED,
      "Avanza portföljfil kunde inte tolkas.",
    );

    return {
      snapshotDate: required.snapshotDate,
      account: required.account,
      instrumentName: required.instrumentName,
      quantity: required.quantity,
      currency: required.currency,
      isin: resolveOptionalColumn(table.headers, ["ISIN"]),
      unitPrice: resolveOptionalColumn(table.headers, ["Kurs", "Senast betalt"]),
      marketValue: resolveOptionalColumn(table.headers, ["Marknadsvärde", "Värde", "Totalvärde"]),
    };
  } catch (error: unknown) {
    if (error instanceof CsvHeaderError) {
      return null;
    }
    throw error;
  }
}

function parseAvanzaTransactionRows(
  table: ParsedCsvTable,
  columns: AvanzaTransactionColumns,
): AvanzaTransactionCsvRow[] {
  return table.rows.map((row) => {
    const date = parseRequiredDate(getCell(row, columns.date), row.rowNumber, columns.date);
    const account = requireString(getCell(row, columns.account), row.rowNumber, columns.account);
    const transactionType = requireString(
      getCell(row, columns.transactionType),
      row.rowNumber,
      columns.transactionType,
    );
    const currency = parseRequiredCurrency(
      getCell(row, columns.currency),
      row.rowNumber,
      columns.currency,
    );
    const amount = parseRequiredNumber(getCell(row, columns.amount), row.rowNumber, columns.amount);
    const fee = parseOptionalFromColumn(row, columns.fee, parseOptionalSwedishNumber);

    return {
      rowNumber: row.rowNumber,
      date,
      account,
      transactionType,
      instrumentName: parseOptionalFromColumn(row, columns.instrumentName, (_value) => optionalString(_value)),
      isin: parseOptionalFromColumn(row, columns.isin, (_value) => optionalString(_value)),
      quantity: parseOptionalFromColumn(row, columns.quantity, parseOptionalSwedishNumber),
      unitPrice: parseOptionalFromColumn(row, columns.unitPrice, parseOptionalSwedishNumber),
      amount,
      fee,
      currency,
      raw: { ...row.values },
    };
  });
}

function parseAvanzaPortfolioRows(
  table: ParsedCsvTable,
  columns: AvanzaPortfolioColumns,
): AvanzaPortfolioCsvRow[] {
  return table.rows.map((row) => {
    const snapshotDate = parseRequiredDate(
      getCell(row, columns.snapshotDate),
      row.rowNumber,
      columns.snapshotDate,
    );
    const account = requireString(getCell(row, columns.account), row.rowNumber, columns.account);
    const instrumentName = requireString(
      getCell(row, columns.instrumentName),
      row.rowNumber,
      columns.instrumentName,
    );
    const quantity = parseRequiredNumber(getCell(row, columns.quantity), row.rowNumber, columns.quantity);
    const currency = parseRequiredCurrency(
      getCell(row, columns.currency),
      row.rowNumber,
      columns.currency,
    );

    return {
      rowNumber: row.rowNumber,
      snapshotDate,
      account,
      instrumentName,
      isin: parseOptionalFromColumn(row, columns.isin, (_value) => optionalString(_value)),
      quantity,
      unitPrice: parseOptionalFromColumn(row, columns.unitPrice, parseOptionalSwedishNumber),
      marketValue: parseOptionalFromColumn(row, columns.marketValue, parseOptionalSwedishNumber),
      currency,
      raw: { ...row.values },
    };
  });
}

function parseRequiredNumber(value: string, rowNumber: number, columnName: string): number {
  const parsed = parseOptionalSwedishNumber(value, rowNumber, columnName);
  if (parsed === null) {
    throw new CsvRowError(`Rad ${rowNumber}: kolumn "${columnName}" saknar värde.`);
  }
  return parsed;
}

function parseOptionalFromColumn<T>(
  row: { rowNumber: number; values: Record<string, string> },
  columnName: string | null,
  parser: (value: string, rowNumber: number, columnName: string) => T,
): T | null {
  if (!columnName) {
    return null;
  }
  return parser(getCell(row, columnName), row.rowNumber, columnName);
}
