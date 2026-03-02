import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { parseAvanzaCsv } from "./avanza.parser";
import { CsvHeaderError, CsvRowError } from "./errors";
import { parseNordnetTransactionsCsv } from "./nordnet.parser";

const PARSER_FIXTURE_ROOT = resolve(process.cwd(), "tests/fixtures/parsers");

function readFixture(fileName: string): string {
  return readFileSync(resolve(PARSER_FIXTURE_ROOT, fileName), "utf8");
}

test("parseAvanzaCsv parses transaction exports deterministically", () => {
  const parsed = parseAvanzaCsv(readFixture("avanza-transactions.csv"));
  if (parsed.source !== "transactions") {
    assert.fail(`Expected transactions source, got ${parsed.source}`);
  }

  assert.equal(parsed.rows.length, 3);

  const first = parsed.rows[0];
  assert.ok(first);
  assert.deepEqual(first, {
    kind: "transaction",
    provider: "avanza",
    source: "transactions",
    rowNumber: 2,
    asOfDate: "2025-01-10",
    accountName: "ISK 1234567",
    currency: "SEK",
    transactionKind: "buy",
    providerTransactionType: "Köp",
    instrumentName: "Avanza Zero",
    isin: "SE0011527613",
    quantity: 10,
    unitPrice: 278.45,
    grossAmount: -2784.5,
    feeAmount: 0,
    netAmount: -2784.5,
    tradeDate: "2025-01-10",
    settleDate: null,
    bookingDate: "2025-01-10",
    raw: {
      Datum: "2025-01-10",
      Konto: "ISK 1234567",
      "Typ av transaktion": "Köp",
      Värdepapper: "Avanza Zero",
      ISIN: "SE0011527613",
      Antal: "10",
      Kurs: "278,45",
      Belopp: "-2784,50",
      Courtage: "0,00",
      Valuta: "SEK",
    },
  });

  const second = parsed.rows[1];
  assert.ok(second);
  assert.equal(second.transactionKind, "dividend");
  assert.equal(second.quantity, null);
  assert.equal(second.unitPrice, null);
  assert.equal(second.grossAmount, 125);
});

test("parseAvanzaCsv parses portfolio snapshot exports", () => {
  const parsed = parseAvanzaCsv(readFixture("avanza-portfolio.csv"));
  if (parsed.source !== "portfolioSnapshots") {
    assert.fail(`Expected portfolioSnapshots source, got ${parsed.source}`);
  }

  assert.equal(parsed.rows.length, 2);

  const first = parsed.rows[0];
  assert.ok(first);
  assert.deepEqual(first, {
    kind: "portfolioSnapshot",
    provider: "avanza",
    source: "portfolioSnapshots",
    rowNumber: 2,
    asOfDate: "2025-02-28",
    accountName: "ISK 1234567",
    currency: "SEK",
    instrumentName: "Avanza Zero",
    isin: "SE0011527613",
    quantity: 150,
    unitPrice: 283.3,
    marketValue: 42495,
    snapshotDate: "2025-02-28",
    raw: {
      Datum: "2025-02-28",
      Konto: "ISK 1234567",
      Värdepapper: "Avanza Zero",
      ISIN: "SE0011527613",
      Antal: "150",
      "Senast betalt": "283,30",
      Valuta: "SEK",
      Marknadsvärde: "42 495,00",
    },
  });
});

test("parseNordnetTransactionsCsv parses Nordnet transaction exports", () => {
  const parsed = parseNordnetTransactionsCsv(readFixture("nordnet-transactions.csv"));
  assert.equal(parsed.source, "transactions");
  assert.equal(parsed.rows.length, 3);

  const first = parsed.rows[0];
  assert.ok(first);
  assert.deepEqual(first, {
    kind: "transaction",
    provider: "nordnet",
    source: "transactions",
    rowNumber: 2,
    asOfDate: "2025-01-14",
    accountName: "AF 998877",
    currency: "SEK",
    transactionKind: "buy",
    providerTransactionType: "KÖPT",
    instrumentName: "Länsförsäkringar Global Index",
    isin: "SE0005188836",
    quantity: 12,
    unitPrice: 402.1,
    grossAmount: -4825.2,
    feeAmount: 5,
    netAmount: -4825.2,
    tradeDate: "2025-01-13",
    settleDate: "2025-01-15",
    bookingDate: "2025-01-14",
    raw: {
      Bokföringsdag: "2025-01-14",
      Affärsdag: "2025-01-13",
      Likviddag: "2025-01-15",
      Depå: "AF 998877",
      Transaktionstyp: "KÖPT",
      Värdepapper: "Länsförsäkringar Global Index",
      ISIN: "SE0005188836",
      Antal: "12",
      Kurs: "402,10",
      Belopp: "-4 825,20",
      Avgifter: "5,00",
      Valuta: "SEK",
    },
  });

  const second = parsed.rows[1];
  const third = parsed.rows[2];
  assert.ok(second);
  assert.ok(third);
  assert.equal(second.transactionKind, "dividend");
  assert.equal(third.transactionKind, "sell");
});

test("parseAvanzaCsv returns actionable header errors on unknown format", () => {
  const unknownHeaderCsv = "Foo;Bar\n1;2";

  assert.throws(
    () => parseAvanzaCsv(unknownHeaderCsv),
    (error: unknown) =>
      error instanceof CsvHeaderError &&
      error.message.includes("Kunde inte identifiera Avanza-format"),
  );
});

test("parseAvanzaCsv returns actionable row errors on malformed column counts", () => {
  const malformedCsv = "Datum;Konto;Typ av transaktion;Belopp;Valuta\n2025-01-10;ISK 123;Köp;-50,00";

  assert.throws(
    () => parseAvanzaCsv(malformedCsv),
    (error: unknown) =>
      error instanceof CsvRowError &&
      error.message.includes("Rad 2 har 4 kolumner men rubriken har 5"),
  );
});
