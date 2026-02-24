# FYRK — External Data Sourcing
## Data Acquisition Strategy & Integration Architecture

> **Version:** 0.1
> **Source:** [DATA_MODEL.md](./DATA_MODEL.md) · [API_SPEC.md](./API_SPEC.md)
> **Consumed by:** Data agent, Backend agent

---

## 1. Data Source Inventory

### Prototype (manual + static + free APIs)

| Data type | Source | Access | Cost | Freshness |
|---|---|---|---|---|
| **Investment accounts** | Manual entry / CSV import | User uploads Avanza/Nordnet exports | Free | On upload |
| **Bank accounts** | Manual entry | User enters balances | Free | On entry |
| **Pension data** | Manual entry | User enters PPM + tjänstepension balances | Free | On entry |
| **Insurance data** | Manual entry | User enters policy details | Free | On entry |
| **Loan/mortgage data** | Manual entry | User enters terms & balance | Free | On entry |
| **Instrument prices** | Yahoo Finance (unofficial) or Nasdaq Nordic | API | Free | Daily |
| **FX rates** | European Central Bank (ECB) | API | Free | Daily |
| **Swedish fund data** | Morningstar basic / Fondbolagens förening | Web scrape / API | Free | Daily |
| **Broker fee schedules** | Static JSON (manually curated) | Internal config | Free | Updated manually |

### v1 (commercial integrations — require agreements)

| Data type | Provider | Access | Estimated cost | Status |
|---|---|---|---|---|
| **Bank accounts (live)** | Tink (Visa) | PSD2 AISP API | €0.10–0.50/user/month | Requires agreement + SLA |
| **Bank accounts (alt)** | Finshark | PSD2 AISP API | Similar | Swedish-focused option |
| **Insurance + loans** | Insurely | API | Per-request or monthly | Requires agreement + SLA |
| **Pension aggregation** | MinPension | API (limited) | Unknown | Requires partnership |
| **Investment data** | Direct broker APIs | Proprietary | Per-request | Requires individual agreements with Avanza, Nordnet |
| **Property values** | Booli / Hemnet | API | Per-request | Requires agreement |

> [!IMPORTANT]
> **All commercial data providers require signed agreements with SLAs and incur ongoing costs.** These are deferred to v1 with sufficient funding. The prototype must deliver full value using manual/CSV/free data.

---

## 2. CSV Import Architecture

### Supported formats (prototype)

#### Avanza CSV format
Avanza allows export of transactions and portfolio snapshots.

```typescript
// src/lib/csv/avanza.parser.ts

interface AvanzaTransactionRow {
  Datum: string           // "2025-12-15"
  Konto: string           // "ISK 12345"
  Typ_av_transaktion: string  // "Köp" | "Sälj" | "Utdelning" | "Insättning" | "Uttag"
  Värdepapper: string     // "Avanza Zero"
  ISIN: string            // "SE0011527845"
  Antal: string           // "100"
  Kurs: string            // "130,50"
  Belopp: string          // "-13050,00"
  Courtage: string        // "0"
  Valuta: string          // "SEK"
}

export function parseAvanzaTransactions(csv: string): ParsedTransaction[] {
  // 1. Detect delimiter (tab or semicolon)
  // 2. Parse headers (Swedish column names)
  // 3. Map to canonical Transaction format
  // 4. Resolve instruments by ISIN
  // 5. Return validated array
}
```

#### Nordnet CSV format
Nordnet has a similar but different column structure.

```typescript
// src/lib/csv/nordnet.parser.ts

interface NordnetTransactionRow {
  Bokföringsdag: string
  Affärsdag: string
  Likviddag: string
  Depå: string
  Transaktionstyp: string  // "KÖPT" | "SÅLT" | "UTDELNING" | "INSÄTTNING"
  Värdepapper: string
  ISIN: string
  Antal: string
  Kurs: string
  Belopp: string
  Avgifter: string
  Valuta: string
}
```

### CSV import flow

```
1. User uploads CSV file
2. System detects format (Avanza vs Nordnet) by header analysis
3. Parse rows into canonical format
4. Resolve instruments by ISIN → lookup in instruments table → create if new
5. Generate preview for user: "Found 148 transactions + 8 holdings"
6. User confirms → persist to database
7. Update account totals, recalculate balance sheet
8. Create timeline entry: "Imported X transactions from Y"
```

### Instrument resolution

```typescript
// src/lib/csv/instrument-resolver.ts

async function resolveInstrument(isin: string, name: string): Promise<Instrument> {
  // 1. Lookup by ISIN in instruments table
  const existing = await db.query.instruments.findFirst({
    where: eq(instruments.isin, isin)
  })
  if (existing) return existing

  // 2. If not found, try to fetch from market data API
  const fromApi = await fetchInstrumentByIsin(isin)
  if (fromApi) {
    return await db.insert(instruments).values(fromApi).returning()
  }

  // 3. If still not found, create placeholder
  return await db.insert(instruments).values({
    isin,
    name,
    assetClass: 'other',  // user can correct
    currency: 'SEK',      // default assumption
    priceSource: 'manual',
  }).returning()
}
```

---

## 3. Market Data Integration

### Instrument pricing (prototype)

```typescript
// src/lib/market-data/pricing.ts

// Primary: Yahoo Finance (unofficial API via yahoo-finance2 npm package)
// Fallback: manual price entry

import yahooFinance from 'yahoo-finance2'

export async function fetchPrice(ticker: string): Promise<{
  price: number      // minor units
  currency: string
  timestamp: Date
} | null> {
  try {
    const quote = await yahooFinance.quote(ticker)
    return {
      price: Math.round(quote.regularMarketPrice * 100),
      currency: quote.currency,
      timestamp: new Date(quote.regularMarketTime),
    }
  } catch {
    return null  // instrument not found or API error
  }
}

// Batch pricing for daily refresh
export async function refreshAllPrices(): Promise<{
  updated: number
  failed: number
  skipped: number
}> {
  const allInstruments = await db.query.instruments.findMany({
    where: isNotNull(instruments.ticker),
  })
  
  // Batch in groups of 20 with rate limiting
  for (const batch of chunk(allInstruments, 20)) {
    await Promise.all(batch.map(async (inst) => {
      const price = await fetchPrice(inst.ticker!)
      if (price) {
        await db.update(instruments)
          .set({ lastPrice: price.price, lastPriceAt: price.timestamp })
          .where(eq(instruments.id, inst.id))
      }
    }))
    await sleep(1000)  // rate limit
  }
}
```

### FX Rates

```typescript
// src/lib/market-data/fx.ts

// European Central Bank provides free daily FX rates
const ECB_API = 'https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A'

export async function fetchFxRates(): Promise<Map<string, number>> {
  // Returns EUR-based rates; convert to SEK-based for Swedish users
  // Cache for 24 hours
}
```

---

## 4. Swedish Broker Fee Schedules (Static Config)

```typescript
// src/config/providers.ts

export const PROVIDERS = {
  avanza: {
    id: 'avanza',
    name: 'Avanza',
    type: 'broker',
    country: 'SE',
    supportedWrappers: ['ISK', 'KF', 'depa'],
    fees: {
      courtage: {
        online: { minFee: 100, pctFee: 0.0025 },  // 1 SEK min, 0.25%
        miniCourtage: { maxAmount: 5000000, fee: 100 },  // 1 SEK flat under 50K
      },
      fundFees: 'pass-through',  // Avanza passes through fund TER
      fxMarkup: 0.0025,          // 0.25% on FX
      iskTax: 'schablonintäkt',  // government rate
    },
    csvFormats: ['avanza_transactions', 'avanza_portfolio'],
    logoUrl: '/images/providers/avanza.svg',
  },
  nordnet: {
    id: 'nordnet',
    name: 'Nordnet',
    type: 'broker',
    country: 'SE',
    supportedWrappers: ['ISK', 'KF', 'depa'],
    fees: {
      courtage: {
        online: { tiers: [
          { maxAmount: 10000000, fee: 3900 },   // 39 SEK under 100K
          { maxAmount: 50000000, pctFee: 0.003 }, // 0.03% 100K-500K
          { maxAmount: null, pctFee: 0.002 },    // 0.02% above 500K
        ]},
      },
      fxMarkup: 0.0025,
    },
    csvFormats: ['nordnet_transactions'],
    logoUrl: '/images/providers/nordnet.svg',
  },
  seb: {
    id: 'seb',
    name: 'SEB',
    type: 'bank',
    country: 'SE',
    supportedWrappers: ['ISK', 'savings', 'mortgage', 'pension'],
    logoUrl: '/images/providers/seb.svg',
  },
  // ... nordea, handelsbanken, swedbank, skandia, amf, alecta, spp, lansforsakringar
} as const
```

---

## 5. FiDA-Ready Abstraction Layer

The architecture anticipates FiDA integration via a provider adapter pattern:

```typescript
// src/lib/providers/adapter.ts

export interface DataProviderAdapter {
  readonly providerId: string
  readonly providerName: string
  readonly supportedDataTypes: ('accounts' | 'holdings' | 'transactions' | 'pension' | 'insurance' | 'loans')[]

  // Connection lifecycle
  connect(userId: string): Promise<ProviderConnection>
  refreshConnection(connectionId: string): Promise<void>
  disconnect(connectionId: string): Promise<void>

  // Data fetching
  fetchAccounts(connectionId: string): Promise<NormalizedAccount[]>
  fetchHoldings(accountId: string): Promise<NormalizedHolding[]>
  fetchTransactions(accountId: string, since: Date): Promise<NormalizedTransaction[]>
}

// Prototype implementations
export class ManualEntryAdapter implements DataProviderAdapter { ... }
export class CsvImportAdapter implements DataProviderAdapter { ... }

// v1 implementations (require commercial agreements)
export class TinkAdapter implements DataProviderAdapter { ... }     // PSD2 bank accounts
export class InsurelyAdapter implements DataProviderAdapter { ... } // Insurance + loans
export class MinPensionAdapter implements DataProviderAdapter { ... } // Pension data
```

### Provider connection registry

```typescript
// Database table for tracking active connections
// Stored in: provider_connections table (defined in DATA_MODEL.md)

interface ProviderConnection {
  id: string
  userId: string
  providerId: string           // "tink" | "insurely" | "minpension"
  status: 'active' | 'expired' | 'error'
  consentExpiresAt: Date       // FiDA requires time-limited consent
  lastSyncAt: Date
  errorMessage?: string
  metadata: Record<string, unknown>
}
```

---

## 6. Data Freshness & Quality

### Staleness indicators

| Data source | Expected freshness | Stale threshold | UI indicator |
|---|---|---|---|
| Manual entry | At user's discretion | 30 days | "Last updated X days ago" warning |
| CSV import | At upload | 14 days | "Data from [date] — import newer export?" |
| Market prices | Daily | 3 days | "Price may be outdated" badge |
| FX rates | Daily | 3 days | "FX rate from [date]" |
| PSD2 (future) | Real-time to daily | 3 days | Auto-refresh |

### Data quality scoring

```typescript
// src/lib/calculations/data-quality.ts

export function calculateDataQuality(household: HouseholdWithAccounts): {
  coveragePct: number     // 0-100: what % of likely accounts are tracked?
  freshnessPct: number    // 0-100: how current is the data?
  staleAccounts: string[] // account IDs not updated in 14+ days
  missingCategories: string[]  // e.g., "No pension accounts tracked"
} {
  // Heuristic scoring based on:
  // - Number of accounts vs expected for household profile
  // - Last update date per account
  // - Coverage across asset types (investment, pension, insurance, etc.)
}
```
