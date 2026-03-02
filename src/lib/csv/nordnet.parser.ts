import { CsvHeaderError, CsvRowError } from "./errors";
import {
  getCell,
  optionalString,
  parseCsvTable,
  parseOptionalDate,
  parseOptionalSwedishNumber,
  parseRequiredCurrency,
  parseRequiredDate,
  requireString,
  resolveOptionalColumn,
  resolveRequiredColumns,
  type ParsedCsvTable,
} from "./csv-utils";
import { normalizeNordnetTransactionRow } from "./normalize";
import type { CanonicalTransactionImportRow, NordnetTransactionCsvRow, ParsedProviderCsv } from "./types";

const NORDNET_REQUIRED_COLUMNS = {
  bookingDate: ["Bokföringsdag"],
  account: ["Depå", "Depa", "Konto"],
  transactionType: ["Transaktionstyp", "Typ av transaktion"],
  amount: ["Belopp"],
  currency: ["Valuta"],
} as const;

interface NordnetColumns {
  bookingDate: string;
  tradeDate: string | null;
  settleDate: string | null;
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

export type ParsedNordnetCsv = ParsedProviderCsv<CanonicalTransactionImportRow, "transactions">;

export function parseNordnetTransactionsCsv(csv: string): ParsedNordnetCsv {
  const table = parseCsvTable(csv);
  const columns = resolveNordnetColumns(table);
  const rows = parseNordnetRows(table, columns).map(normalizeNordnetTransactionRow);

  return {
    provider: "nordnet",
    source: "transactions",
    headers: table.headers,
    rows,
  };
}

function resolveNordnetColumns(table: ParsedCsvTable): NordnetColumns {
  const required = resolveRequiredColumns(
    table.headers,
    NORDNET_REQUIRED_COLUMNS,
    "Nordnet transaktionsfil kunde inte tolkas.",
  );

  if (!resolveOptionalColumn(table.headers, ["Affärsdag", "Affarsdag"])) {
    throw new CsvHeaderError(
      `Nordnet transaktionsfil saknar kolumnen "Affärsdag". Hittade: ${table.headers.join(", ")}.`,
    );
  }

  if (!resolveOptionalColumn(table.headers, ["Likviddag"])) {
    throw new CsvHeaderError(
      `Nordnet transaktionsfil saknar kolumnen "Likviddag". Hittade: ${table.headers.join(", ")}.`,
    );
  }

  return {
    bookingDate: required.bookingDate,
    account: required.account,
    transactionType: required.transactionType,
    amount: required.amount,
    currency: required.currency,
    tradeDate: resolveOptionalColumn(table.headers, ["Affärsdag", "Affarsdag"]),
    settleDate: resolveOptionalColumn(table.headers, ["Likviddag"]),
    instrumentName: resolveOptionalColumn(table.headers, ["Värdepapper", "Instrument"]),
    isin: resolveOptionalColumn(table.headers, ["ISIN"]),
    quantity: resolveOptionalColumn(table.headers, ["Antal"]),
    unitPrice: resolveOptionalColumn(table.headers, ["Kurs"]),
    fee: resolveOptionalColumn(table.headers, ["Avgifter", "Avgift", "Courtage"]),
  };
}

function parseNordnetRows(table: ParsedCsvTable, columns: NordnetColumns): NordnetTransactionCsvRow[] {
  return table.rows.map((row) => {
    const bookingDate = parseRequiredDate(
      getCell(row, columns.bookingDate),
      row.rowNumber,
      columns.bookingDate,
    );
    const account = requireString(getCell(row, columns.account), row.rowNumber, columns.account);
    const transactionType = requireString(
      getCell(row, columns.transactionType),
      row.rowNumber,
      columns.transactionType,
    );
    const amount = parseRequiredNumber(getCell(row, columns.amount), row.rowNumber, columns.amount);
    const currency = parseRequiredCurrency(
      getCell(row, columns.currency),
      row.rowNumber,
      columns.currency,
    );

    return {
      rowNumber: row.rowNumber,
      bookingDate,
      tradeDate: parseRequiredOptionalDateFromColumn(row, columns.tradeDate),
      settleDate: parseRequiredOptionalDateFromColumn(row, columns.settleDate),
      account,
      transactionType,
      instrumentName: parseOptionalFromColumn(row, columns.instrumentName, (_value) => optionalString(_value)),
      isin: parseOptionalFromColumn(row, columns.isin, (_value) => optionalString(_value)),
      quantity: parseOptionalFromColumn(row, columns.quantity, parseOptionalSwedishNumber),
      unitPrice: parseOptionalFromColumn(row, columns.unitPrice, parseOptionalSwedishNumber),
      amount,
      fee: parseOptionalFromColumn(row, columns.fee, parseOptionalSwedishNumber),
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

function parseRequiredOptionalDateFromColumn(
  row: { rowNumber: number; values: Record<string, string> },
  columnName: string | null,
): string | null {
  if (!columnName) {
    return null;
  }
  return parseOptionalDate(getCell(row, columnName), row.rowNumber, columnName);
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
