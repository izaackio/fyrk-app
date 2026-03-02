import { CsvFormatError, CsvHeaderError, CsvRowError } from "./errors";

export interface CsvRecordRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ParsedCsvTable {
  delimiter: string;
  headers: string[];
  rows: CsvRecordRow[];
}

export type ColumnAliases = Record<string, readonly string[]>;

const CANDIDATE_DELIMITERS = [";", "\t", ","];

export function parseCsvTable(csv: string): ParsedCsvTable {
  const normalized = normalizeCsvText(csv);
  const lineEntries = normalized
    .split("\n")
    .map((line, index) => ({ lineNumber: index + 1, line }))
    .filter(({ line }) => line.trim().length > 0);

  if (lineEntries.length === 0) {
    throw new CsvFormatError("CSV-filen är tom. Exportera filen igen och försök på nytt.");
  }

  const firstEntry = lineEntries[0];
  if (!firstEntry) {
    throw new CsvFormatError("CSV-filen är tom. Exportera filen igen och försök på nytt.");
  }

  const delimiter = detectDelimiter(firstEntry.line);
  const headers = parseCsvLine(firstEntry.line, delimiter, firstEntry.lineNumber).map((value) =>
    value.trim(),
  );

  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    throw new CsvHeaderError("Kunde inte läsa rubriker i CSV-filen.");
  }

  if (headers.some((header) => header.length === 0)) {
    throw new CsvHeaderError(
      `Rubrikraden innehåller tomma kolumnnamn (rad ${firstEntry.lineNumber}).`,
    );
  }

  const rows: CsvRecordRow[] = [];
  for (const entry of lineEntries.slice(1)) {
    const cells = parseCsvLine(entry.line, delimiter, entry.lineNumber);
    if (cells.length !== headers.length) {
      throw new CsvRowError(
        `Rad ${entry.lineNumber} har ${cells.length} kolumner men rubriken har ${headers.length}. Kontrollera delimiter och citattecken.`,
      );
    }

    const values = Object.fromEntries(
      headers.map((header, columnIndex) => [header, cells[columnIndex]?.trim() ?? ""]),
    );
    rows.push({ rowNumber: entry.lineNumber, values });
  }

  return { delimiter, headers, rows };
}

export function normalizeHeaderName(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/_/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveRequiredColumns<T extends ColumnAliases>(
  headers: string[],
  aliases: T,
  contextMessage: string,
): { [K in keyof T]: string };
export function resolveRequiredColumns<T extends ColumnAliases>(
  headers: string[],
  aliases: T,
  contextMessage: string,
): { [K in keyof T]: string } {
  const resolved = {} as { [K in keyof T]: string };
  const missing: string[] = [];

  for (const fieldName of Object.keys(aliases) as Array<keyof T>) {
    const aliasList = aliases[fieldName];
    if (!aliasList) {
      missing.push(String(fieldName));
      continue;
    }

    const header = findHeader(headers, aliasList);
    if (!header) {
      missing.push(aliasList[0] ?? String(fieldName));
      continue;
    }
    resolved[fieldName] = header;
  }

  if (missing.length > 0) {
    throw new CsvHeaderError(
      `${contextMessage} Saknade kolumner: ${missing.join(", ")}. Hittade: ${headers.join(", ")}.`,
    );
  }

  return resolved;
}

export function resolveOptionalColumn(headers: string[], aliasList: readonly string[]): string | null {
  return findHeader(headers, aliasList);
}

export function getCell(row: CsvRecordRow, header: string): string {
  return row.values[header] ?? "";
}

export function requireString(value: string, rowNumber: number, columnName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new CsvRowError(`Rad ${rowNumber}: kolumn "${columnName}" saknar värde.`);
  }
  return trimmed;
}

export function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseRequiredDate(value: string, rowNumber: number, columnName: string): string {
  return parseDateToIso(requireString(value, rowNumber, columnName), rowNumber, columnName);
}

export function parseOptionalDate(value: string, rowNumber: number, columnName: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return parseDateToIso(trimmed, rowNumber, columnName);
}

export function parseRequiredCurrency(value: string, rowNumber: number, columnName: string): string {
  return normalizeCurrencyCode(requireString(value, rowNumber, columnName), rowNumber, columnName);
}

export function parseOptionalSwedishNumber(
  value: string,
  rowNumber: number,
  columnName: string,
): number | null {
  const trimmed = value.replace(/\u00a0/g, " ").trim();
  if (trimmed.length === 0) {
    return null;
  }

  const compact = trimmed.replace(/\s+/g, "").replace(/'/g, "");
  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");

  let normalized = compact;
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) {
    throw new CsvRowError(
      `Rad ${rowNumber}: kolumn "${columnName}" har ogiltigt talvärde "${value}".`,
    );
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new CsvRowError(
      `Rad ${rowNumber}: kolumn "${columnName}" kunde inte tolkas som ett tal.`,
    );
  }

  return parsed;
}

function normalizeCsvText(csv: string): string {
  if (csv.length === 0) {
    return "";
  }

  return csv
    .replace(/^\ufeff/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function detectDelimiter(headerLine: string): string {
  let selectedDelimiter = ";";
  let selectedCount = -1;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const count = countDelimiter(headerLine, delimiter);
    if (count > selectedCount) {
      selectedCount = count;
      selectedDelimiter = delimiter;
    }
  }

  return selectedDelimiter;
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function parseCsvLine(line: string, delimiter: string, rowNumber: number): string[] {
  const cells: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes) {
        if (line[index + 1] === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else if (currentCell.length === 0) {
        inQuotes = true;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      cells.push(currentCell);
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    throw new CsvFormatError(
      `Rad ${rowNumber} har obalanserade citattecken. Kontrollera att textfält är korrekt citerade.`,
    );
  }

  cells.push(currentCell);
  return cells;
}

function findHeader(headers: string[], aliases: readonly string[]): string | null {
  const normalizedAliasSet = new Set(aliases.map(normalizeHeaderName));

  for (const header of headers) {
    if (normalizedAliasSet.has(normalizeHeaderName(header))) {
      return header;
    }
  }

  return null;
}

function parseDateToIso(value: string, rowNumber: number, columnName: string): string {
  const isoMatch = value.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (isoMatch) {
    const [, yearText, monthText, dayText] = isoMatch;
    if (yearText && monthText && dayText) {
      return validateAndBuildIsoDate(yearText, monthText, dayText, rowNumber, columnName, value);
    }
  }

  const dayFirstMatch = value.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (dayFirstMatch) {
    const [, dayText, monthText, yearText] = dayFirstMatch;
    if (dayText && monthText && yearText) {
      return validateAndBuildIsoDate(yearText, monthText, dayText, rowNumber, columnName, value);
    }
  }

  throw new CsvRowError(
    `Rad ${rowNumber}: kolumn "${columnName}" har ogiltigt datumformat "${value}". Använd YYYY-MM-DD eller DD.MM.YYYY.`,
  );
}

function validateAndBuildIsoDate(
  yearText: string,
  monthText: string,
  dayText: string,
  rowNumber: number,
  columnName: string,
  originalValue: string,
): string {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw new CsvRowError(
      `Rad ${rowNumber}: kolumn "${columnName}" har ogiltigt datum "${originalValue}".`,
    );
  }

  return `${yearText.padStart(4, "0")}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")}`;
}

function normalizeCurrencyCode(value: string, rowNumber: number, columnName: string): string {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new CsvRowError(
      `Rad ${rowNumber}: kolumn "${columnName}" har ogiltig valutakod "${value}".`,
    );
  }
  return currency;
}
