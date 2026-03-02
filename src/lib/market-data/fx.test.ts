import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  clearEcbFxCache,
  fetchEcbFxSnapshot,
  getFxConversionRate,
  isFxSnapshotStale,
  parseEcbFxResponse,
} from "./fx";

const FX_FIXTURE_ROOT = resolve(process.cwd(), "tests/fixtures/fx");

function readFixture(fileName: string): string {
  return readFileSync(resolve(FX_FIXTURE_ROOT, fileName), "utf8");
}

test("parseEcbFxResponse extracts rates and as-of date", () => {
  const payload = JSON.parse(readFixture("ecb-exr-sample.json")) as unknown;
  const parsed = parseEcbFxResponse(payload);

  assert.equal(parsed.baseCurrency, "EUR");
  assert.equal(parsed.asOfDate, "2025-02-28");
  assert.equal(parsed.rates.EUR, 1);
  assert.equal(parsed.rates.SEK, 11.1567);
  assert.equal(parsed.rates.USD, 1.0912);
});

test("fetchEcbFxSnapshot reuses cache within TTL and returns metadata", async () => {
  clearEcbFxCache();
  const payload = readFixture("ecb-exr-sample.json");
  let fetchCalls = 0;

  const mockFetch: typeof fetch = async (_input, _init) => {
    fetchCalls += 1;
    return new Response(payload, {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  };

  const first = await fetchEcbFxSnapshot({
    fetchImpl: mockFetch,
    cacheTtlMs: 60_000,
    staleAfterHours: 48,
    now: new Date("2025-03-01T10:00:00.000Z"),
  });
  const second = await fetchEcbFxSnapshot({
    fetchImpl: mockFetch,
    cacheTtlMs: 60_000,
    staleAfterHours: 48,
    now: new Date("2025-03-01T10:00:30.000Z"),
  });

  assert.equal(fetchCalls, 1);
  assert.equal(first.stale, false);
  assert.equal(second.stale, false);
  assert.equal(second.asOfDate, "2025-02-28");
  assert.equal(second.fetchedAt, first.fetchedAt);
});

test("fetchEcbFxSnapshot marks old snapshots as stale and supports cross-rate conversion", async () => {
  clearEcbFxCache();
  const payload = readFixture("ecb-exr-sample.json");
  const mockFetch: typeof fetch = async (_input, _init) =>
    new Response(payload, {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });

  const snapshot = await fetchEcbFxSnapshot({
    fetchImpl: mockFetch,
    now: new Date("2025-03-05T10:00:00.000Z"),
    staleAfterHours: 24,
  });

  assert.equal(snapshot.stale, true);
  assert.equal(
    isFxSnapshotStale(snapshot, {
      now: new Date("2025-03-05T10:00:00.000Z"),
      staleAfterHours: 24,
    }),
    true,
  );

  const usdToSek = getFxConversionRate(snapshot, "USD", "SEK");
  const expected = 11.1567 / 1.0912;
  assert.ok(Math.abs(usdToSek - expected) < 1e-12);
});
