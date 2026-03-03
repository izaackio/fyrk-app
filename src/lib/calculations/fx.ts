import type { FxConversionResult, FxRates } from "@/lib/calculations/types";
import type { FxRatesSnapshot } from "@/lib/market-data/fx";

export class FxConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FxConversionError";
  }
}

export function normalizeCurrencyCode(currency: string | null | undefined, fallback = "SEK"): string {
  const normalized = currency?.trim().toUpperCase();
  if (normalized && /^[A-Z]{3}$/u.test(normalized)) {
    return normalized;
  }

  return fallback.trim().toUpperCase();
}

export function fxRatesFromSnapshot(snapshot: FxRatesSnapshot): FxRates {
  return {
    baseCurrency: normalizeCurrencyCode(snapshot.baseCurrency, "EUR"),
    rates: { ...snapshot.rates },
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    staleAfter: snapshot.staleAfter,
  };
}

export function getFxRate(
  rates: Pick<FxRates, "baseCurrency" | "rates">,
  fromCurrency: string,
  toCurrency: string,
): number {
  const from = normalizeCurrencyCode(fromCurrency, rates.baseCurrency);
  const to = normalizeCurrencyCode(toCurrency, rates.baseCurrency);
  const base = normalizeCurrencyCode(rates.baseCurrency, "EUR");

  if (from === to) {
    return 1;
  }

  const fromRate = from === base ? 1 : rates.rates[from];
  const toRate = to === base ? 1 : rates.rates[to];

  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    throw new FxConversionError(`Missing FX rate for ${from}->${to}`);
  }

  return toRate / fromRate;
}

export function isFxRatesStale(
  rates: Pick<FxRates, "fetchedAt" | "staleAfter">,
  staleAfterHours = 48,
  now = new Date(),
): boolean {
  if (rates.staleAfter) {
    const staleAfterMs = Date.parse(rates.staleAfter);
    if (Number.isFinite(staleAfterMs)) {
      return now.getTime() > staleAfterMs;
    }
  }

  const fetchedAtMs = Date.parse(rates.fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) {
    return true;
  }

  const staleAfterMs = fetchedAtMs + staleAfterHours * 60 * 60 * 1000;
  return now.getTime() > staleAfterMs;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates,
  options: { now?: Date; staleAfterHours?: number } = {},
): FxConversionResult {
  const from = normalizeCurrencyCode(fromCurrency, rates.baseCurrency);
  const to = normalizeCurrencyCode(toCurrency, rates.baseCurrency);

  if (from === to) {
    return {
      converted: amount,
      rate: 1,
      rateSource: rates.source,
      stale: isFxRatesStale(rates, options.staleAfterHours, options.now),
    };
  }

  const rate = getFxRate(rates, from, to);
  return {
    converted: amount * rate,
    rate,
    rateSource: rates.source,
    stale: isFxRatesStale(rates, options.staleAfterHours, options.now),
  };
}

export function convertMinorUnits(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates,
  options: { now?: Date; staleAfterHours?: number } = {},
): FxConversionResult {
  const conversion = convertAmount(amountMinor, fromCurrency, toCurrency, rates, options);
  return {
    ...conversion,
    converted: Math.round(conversion.converted),
  };
}
