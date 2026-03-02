export type CsvErrorCode = "CSV_FORMAT" | "CSV_HEADER" | "CSV_ROW";

export class CsvParserError extends Error {
  readonly code: CsvErrorCode;

  constructor(code: CsvErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CsvParserError";
  }
}

export class CsvFormatError extends CsvParserError {
  constructor(message: string) {
    super("CSV_FORMAT", message);
    this.name = "CsvFormatError";
  }
}

export class CsvHeaderError extends CsvParserError {
  constructor(message: string) {
    super("CSV_HEADER", message);
    this.name = "CsvHeaderError";
  }
}

export class CsvRowError extends CsvParserError {
  constructor(message: string) {
    super("CSV_ROW", message);
    this.name = "CsvRowError";
  }
}
