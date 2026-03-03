import assert from "node:assert/strict";
import test from "node:test";

import { convertAmount, convertMinorUnits, getFxRate, isFxRatesStale } from "@/lib/calculations/fx";
import type { FxRates } from "@/lib/calculations/types";

const rates: FxRates = {
  baseCurrency: "EUR",
  rates: {
    EUR: 1,
    USD: 1.2,
    SEK: 12,
  },
  source: "ecb",
  fetchedAt: "2026-03-02T08:00:00.000Z",
  staleAfter: "2026-03-04T08:00:00.000Z",
};

test("getFxRate converts through base currency deterministically", () => {
  const usdToSek = getFxRate(rates, "USD", "SEK");
  assert.equal(usdToSek, 10);
});

test("convertAmount and convertMinorUnits preserve source metadata", () => {
  const converted = convertAmount(100_000, "USD", "SEK", rates, {
    now: new Date("2026-03-03T10:00:00.000Z"),
  });
  const convertedMinor = convertMinorUnits(100_000, "USD", "SEK", rates, {
    now: new Date("2026-03-03T10:00:00.000Z"),
  });

  assert.equal(converted.converted, 1_000_000);
  assert.equal(converted.rate, 10);
  assert.equal(converted.rateSource, "ecb");
  assert.equal(converted.stale, false);
  assert.equal(convertedMinor.converted, 1_000_000);
});

test("isFxRatesStale falls back to fetchedAt when staleAfter is missing", () => {
  const stale = isFxRatesStale(
    {
      fetchedAt: "2026-03-01T00:00:00.000Z",
    },
    24,
    new Date("2026-03-03T01:00:00.000Z"),
  );

  assert.equal(stale, true);
});
