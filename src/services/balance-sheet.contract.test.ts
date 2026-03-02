import assert from "node:assert/strict";
import test from "node:test";

import {
  addSignedValueToTotals,
  resolveHistoryStartDate,
  toSignedAccountValue,
} from "../lib/calculations/balance-sheet";
import {
  balanceSheetHistoryQuerySchema,
  balanceSheetQuerySchema,
} from "../lib/validations/balance-sheet";

test("balance sheet query schema requires a valid household id", () => {
  const valid = balanceSheetQuerySchema.safeParse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
  });
  const invalid = balanceSheetQuerySchema.safeParse({
    householdId: "not-a-uuid",
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("history query schema defaults period to 12m", () => {
  const parsed = balanceSheetHistoryQuerySchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
  });

  assert.equal(parsed.period, "12m");
});

test("signed account values flip loan and mortgage totals to liabilities", () => {
  assert.equal(toSignedAccountValue(120_000_00, "loan"), -120_000_00);
  assert.equal(toSignedAccountValue(-120_000_00, "mortgage"), -120_000_00);
  assert.equal(toSignedAccountValue(95_000_00, "investment"), 95_000_00);
});

test("net worth totals split positive assets and negative liabilities", () => {
  const totals = {
    totalAssets: 0,
    totalLiabilities: 0,
    totalNetWorth: 0,
  };

  addSignedValueToTotals(totals, 200_000_00);
  addSignedValueToTotals(totals, -80_000_00);

  assert.equal(totals.totalAssets, 200_000_00);
  assert.equal(totals.totalLiabilities, 80_000_00);
  assert.equal(totals.totalNetWorth, 120_000_00);
});

test("history period helper supports all as unbounded", () => {
  assert.equal(resolveHistoryStartDate("all"), null);
});
