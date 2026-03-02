const ECB_FX_ENDPOINT =
  "https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?format=jsondata";

const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_STALE_AFTER_HOURS = 48;

interface ParsedEcbFxRates {
  baseCurrency: "EUR";
  asOfDate: string;
  rates: Record<string, number>;
}

interface CachedEcbFxSnapshot extends ParsedEcbFxRates {
  fetchedAt: string;
  fetchedAtMs: number;
}

export interface FxRatesSnapshot extends ParsedEcbFxRates {
  source: "ecb";
  fetchedAt: string;
  staleAfter: string;
  stale: boolean;
}

export interface FetchEcbFxSnapshotOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  now?: Date;
  forceRefresh?: boolean;
  cacheTtlMs?: number;
  staleAfterHours?: number;
}

export class FxRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FxRateError";
  }
}

let fxCache: CachedEcbFxSnapshot | null = null;

export async function fetchEcbFxSnapshot(
  options: FetchEcbFxSnapshotOptions = {},
): Promise<FxRatesSnapshot> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? ECB_FX_ENDPOINT;
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const staleAfterHours = options.staleAfterHours ?? DEFAULT_STALE_AFTER_HOURS;

  const hasFreshCache =
    !options.forceRefresh &&
    fxCache !== null &&
    nowMs - fxCache.fetchedAtMs <= cacheTtlMs;

  if (hasFreshCache && fxCache) {
    return buildPublicSnapshot(fxCache, now, staleAfterHours);
  }

  const response = await fetchImpl(endpoint, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new FxRateError(
      `ECB FX-förfrågan misslyckades med HTTP ${response.status} ${response.statusText}.`,
    );
  }

  const payload = (await response.json()) as unknown;
  const parsed = parseEcbFxResponse(payload);
  const snapshot: CachedEcbFxSnapshot = {
    ...parsed,
    fetchedAt: now.toISOString(),
    fetchedAtMs: nowMs,
  };

  fxCache = snapshot;
  return buildPublicSnapshot(snapshot, now, staleAfterHours);
}

export function parseEcbFxResponse(payload: unknown): ParsedEcbFxRates {
  const root = asRecord(payload, "ECB FX response");
  const dataSets = root["dataSets"];
  if (!Array.isArray(dataSets) || dataSets.length === 0) {
    throw new FxRateError("ECB FX response saknar dataSets.");
  }

  const firstDataSet = asRecord(dataSets[0], "ECB FX dataSets[0]");
  const seriesRecord = asRecord(firstDataSet["series"], "ECB FX series");
  const seriesEntries = Object.entries(seriesRecord);
  if (seriesEntries.length === 0) {
    throw new FxRateError("ECB FX response saknar valutaserier.");
  }

  const structure = asRecord(root["structure"], "ECB FX structure");
  const dimensions = asRecord(structure["dimensions"], "ECB FX dimensions");
  const seriesDimensions = readDimensions(dimensions["series"], "series");
  const observationDimensions = readDimensions(dimensions["observation"], "observation");

  if (observationDimensions.length === 0) {
    throw new FxRateError("ECB FX response saknar observationsdimension.");
  }

  const observationDimension = observationDimensions[0];
  if (!observationDimension) {
    throw new FxRateError("ECB FX response saknar observationsdimension.");
  }

  const observationDates = observationDimension.values;
  const currencyDimensionIndex = seriesDimensions.findIndex((dimension) => dimension.id === "CURRENCY");
  if (currencyDimensionIndex === -1) {
    throw new FxRateError("ECB FX response saknar CURRENCY-dimension.");
  }

  const currencyDimension = seriesDimensions[currencyDimensionIndex];
  if (!currencyDimension) {
    throw new FxRateError("ECB FX response saknar CURRENCY-dimension.");
  }

  const currencyValues = currencyDimension.values;
  const rates: Record<string, number> = {};
  let latestAsOfDate: string | null = null;

  for (const [seriesKey, seriesValue] of seriesEntries) {
    const keyParts = seriesKey.split(":");
    const currencyValueIndex = Number(keyParts[currencyDimensionIndex]);
    if (!Number.isInteger(currencyValueIndex)) {
      continue;
    }

    const currency = currencyValues[currencyValueIndex];
    if (!currency) {
      continue;
    }

    const seriesObject = asRecord(seriesValue, `ECB FX series ${seriesKey}`);
    const observations = asRecord(
      seriesObject["observations"],
      `ECB FX observations for series ${seriesKey}`,
    );

    const latestObservation = selectLatestObservation(observations, observationDates);
    if (!latestObservation) {
      continue;
    }

    rates[currency.toUpperCase()] = latestObservation.rate;
    if (!latestAsOfDate || latestObservation.date > latestAsOfDate) {
      latestAsOfDate = latestObservation.date;
    }
  }

  if (Object.keys(rates).length === 0 || !latestAsOfDate) {
    throw new FxRateError("ECB FX response innehåller inga giltiga växelkurser.");
  }

  rates["EUR"] = 1;

  return {
    baseCurrency: "EUR",
    asOfDate: latestAsOfDate,
    rates,
  };
}

export function clearEcbFxCache(): void {
  fxCache = null;
}

export function getFxConversionRate(
  snapshot: Pick<FxRatesSnapshot, "rates">,
  fromCurrency: string,
  toCurrency: string,
): number {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (from === to) {
    return 1;
  }

  const fromRate = from === "EUR" ? 1 : snapshot.rates[from];
  const toRate = to === "EUR" ? 1 : snapshot.rates[to];

  if (!fromRate || !toRate) {
    throw new FxRateError(`Saknar FX-kurs för konvertering ${from} -> ${to}.`);
  }

  return toRate / fromRate;
}

export function convertFxAmount(
  amount: number,
  snapshot: Pick<FxRatesSnapshot, "rates">,
  fromCurrency: string,
  toCurrency: string,
): number {
  return amount * getFxConversionRate(snapshot, fromCurrency, toCurrency);
}

export function isFxSnapshotStale(
  snapshot: Pick<FxRatesSnapshot, "asOfDate" | "staleAfter">,
  options: { now?: Date; staleAfterHours?: number } = {},
): boolean {
  const now = options.now ?? new Date();
  const staleAfterMs = Date.parse(snapshot.staleAfter);
  if (Number.isFinite(staleAfterMs)) {
    return now.getTime() > staleAfterMs;
  }

  const fallbackStaleAfter = computeStaleAfter(snapshot.asOfDate, options.staleAfterHours);
  return now.getTime() > Date.parse(fallbackStaleAfter);
}

function buildPublicSnapshot(
  snapshot: CachedEcbFxSnapshot,
  now: Date,
  staleAfterHours: number,
): FxRatesSnapshot {
  const staleAfter = computeStaleAfter(snapshot.asOfDate, staleAfterHours);
  return {
    source: "ecb",
    baseCurrency: snapshot.baseCurrency,
    asOfDate: snapshot.asOfDate,
    rates: { ...snapshot.rates },
    fetchedAt: snapshot.fetchedAt,
    staleAfter,
    stale: isFxSnapshotStale(
      {
        asOfDate: snapshot.asOfDate,
        staleAfter,
      },
      { now, staleAfterHours },
    ),
  };
}

function computeStaleAfter(asOfDate: string, staleAfterHours = DEFAULT_STALE_AFTER_HOURS): string {
  const asOfMs = Date.parse(`${asOfDate}T00:00:00.000Z`);
  if (!Number.isFinite(asOfMs)) {
    throw new FxRateError(`Ogiltigt asOfDate i FX-snapshot: "${asOfDate}".`);
  }

  return new Date(asOfMs + staleAfterHours * 60 * 60 * 1000).toISOString();
}

function selectLatestObservation(
  observations: Record<string, unknown>,
  observationDates: string[],
): { date: string; rate: number } | null {
  let selectedIndex = -1;
  let selectedRate = 0;
  let selectedDate = "";

  for (const [indexText, observation] of Object.entries(observations)) {
    const observationIndex = Number(indexText);
    if (!Number.isInteger(observationIndex) || observationIndex < 0) {
      continue;
    }

    const observationDate = observationDates[observationIndex];
    if (!observationDate || !/^\d{4}-\d{2}-\d{2}$/.test(observationDate)) {
      continue;
    }

    const rate = readObservationRate(observation);
    if (rate === null || rate <= 0) {
      continue;
    }

    if (observationIndex > selectedIndex) {
      selectedIndex = observationIndex;
      selectedRate = rate;
      selectedDate = observationDate;
    }
  }

  if (selectedIndex === -1) {
    return null;
  }

  return {
    date: selectedDate,
    rate: selectedRate,
  };
}

function readObservationRate(observation: unknown): number | null {
  if (!Array.isArray(observation) || observation.length === 0) {
    return null;
  }

  const value = observation[0];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readDimensions(raw: unknown, dimensionType: "series" | "observation"): Array<{
  id: string;
  values: string[];
}> {
  if (!Array.isArray(raw)) {
    throw new FxRateError(`ECB FX response saknar dimensions.${dimensionType}.`);
  }

  return raw.map((dimension, index) => {
    const record = asRecord(dimension, `ECB FX dimensions.${dimensionType}[${index}]`);
    const id = asString(record["id"], `ECB FX dimensions.${dimensionType}[${index}].id`);
    const rawValues = record["values"];
    if (!Array.isArray(rawValues)) {
      throw new FxRateError(
        `ECB FX dimensions.${dimensionType}[${index}] saknar values-array.`,
      );
    }

    const values = rawValues.map((entry, valueIndex) => {
      const valueRecord = asRecord(
        entry,
        `ECB FX dimensions.${dimensionType}[${index}].values[${valueIndex}]`,
      );
      return asString(
        valueRecord["id"],
        `ECB FX dimensions.${dimensionType}[${index}].values[${valueIndex}].id`,
      );
    });

    return { id, values };
  });
}

function normalizeCurrencyCode(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new FxRateError(`Ogiltig valutakod "${currency}".`);
  }
  return normalized;
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FxRateError(`${context} har ogiltigt format.`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FxRateError(`${context} saknas eller är tomt.`);
  }
  return value;
}
