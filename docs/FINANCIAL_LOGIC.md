# FYRK — Financial Logic Specification
## Calculation Engine, Scoring Formulas, Forecasting & Scenario Analysis

> **Version:** 0.1
> **Source:** [DATA_MODEL.md](./DATA_MODEL.md) · [LLM_INTEGRATION.md](./LLM_INTEGRATION.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)
> **Consumed by:** Backend Agent, AI Agent
> **Location:** `src/lib/calculations/`

---

## 0. Core Principle: The Math Layer Rule

> **The LLM never does math. Deterministic code does math, then the LLM interprets the results.**

Every financial number the user sees must be produced by a deterministic, testable calculation function. The AI layer receives these numbers as structured input and generates narrative, recommendations, and explanations — but never computes amounts, scores, or projections itself.

```
USER SEES ←── LLM Narrative ←── Structured Results ←── Calculation Engine ←── Data Layer
                  ↑                                             ↑
            "Your net worth                            compound_growth()
             would recover                             amortization_schedule()
             within 14 months..."                      fitness_score()
```

### Design rules

1. **Every calculation is a pure function** — same inputs → same outputs, no side effects
2. **Every assumption is an explicit parameter** — never hardcoded growth rates
3. **Every output includes metadata** — data quality indicator, assumptions used, calculation timestamp
4. **All monetary amounts in minor units** (öre) — consistent with DATA_MODEL.md
5. **All calculations are currency-aware** — FX conversion when aggregating cross-currency holdings

---

## 1. Module Index

```
src/lib/calculations/
├── net-worth.ts         # Balance sheet aggregation
├── allocation.ts        # Asset allocation breakdown + drift analysis
├── performance.ts       # Return calculations (TWR, MWR, attribution)
├── fitness.ts           # Financial Fitness Score (5 components)
├── forecast.ts          # Net worth projections + trajectory
├── mortgage.ts          # Amortization schedules + Swedish mortgage rules
├── tax-wrappers.ts      # ISK/KF/depå tax treatment comparison
├── scenario.ts          # What-if engine (runs deltas against base case)
├── fees.ts              # Fee drag analysis + total cost estimation
├── fx.ts                # Currency conversion utilities
├── assumptions.ts       # Default assumption sets + user override handling
└── types.ts             # Shared types for all calculation modules
```

---

## 2. Net Worth Aggregation (`net-worth.ts`)

### Function: `calculateNetWorth`

```typescript
interface NetWorthInput {
  accounts: Array<{
    id: string
    type: 'investment' | 'savings' | 'pension' | 'loan' | 'mortgage' | 'insurance'
    wrapperType: string | null
    currency: string
    holdings: Array<{
      instrumentId: string
      quantity: number        // decimal
      lastPrice: number       // minor units, instrument currency
      priceCurrency: string
      assetClass: string
      country: string
      sector: string | null
    }>
    cashBalance: number       // minor units
    loanBalance: number       // minor units (for liabilities)
  }>
  baseCurrency: string        // household base currency
  fxRates: Record<string, number>  // e.g., { 'USD/SEK': 10.45 }
}

interface NetWorthResult {
  totalNetWorth: number       // minor units, base currency
  totalAssets: number
  totalLiabilities: number
  byMember: Record<string, { assets: number; liabilities: number; netWorth: number }>
  byAccountType: Record<string, number>
  byWrapperType: Record<string, number>
  liquidAssets: number        // savings + ISK/KF/depå (non-pension, non-locked)
  illiquidAssets: number      // pension + insurance + locked holdings
  dataQuality: DataQualityIndicator
  calculatedAt: string        // ISO 8601
}

interface DataQualityIndicator {
  score: 'high' | 'medium' | 'low'
  staleAccounts: string[]     // accounts with prices older than 7 days
  missingPrices: string[]     // holdings with no price data
  estimatedValues: string[]   // holdings using estimated/stale prices
  coveragePercent: number     // % of total value with fresh prices
}
```

### Rules
- Assets = sum of all holdings × price + cash balances (positive accounts)
- Liabilities = sum of loan/mortgage balances (negative value)
- Net worth = assets − liabilities
- Cross-currency holdings converted to `baseCurrency` using provided FX rates
- Holdings with missing prices: use last known price, flag in `dataQuality`
- Accounts with `visibility: 'private'` excluded from partner's view but included in household aggregate

---

## 3. Allocation Analysis (`allocation.ts`)

### Function: `calculateAllocation`

Produces 4 allocation breakdowns from the same holding data:

| Breakdown | Dimension | Source field |
|---|---|---|
| Asset class | equity, fixed_income, fund, etf, cash, real_estate, crypto, other | `instrument.asset_class` |
| Geography | Country ISO codes | `instrument.country` |
| Currency | Exposure currency | `holding.value_currency` |
| Sector | GICS sector | `instrument.sector` |

```typescript
interface AllocationResult {
  byAssetClass: AllocationBreakdown[]
  byGeography: AllocationBreakdown[]
  byCurrency: AllocationBreakdown[]
  bySector: AllocationBreakdown[]
  concentrationRisks: ConcentrationRisk[]  // any single position > 15% of portfolio
}

interface AllocationBreakdown {
  category: string
  value: number           // minor units
  percentage: number      // 0–100, 2 decimal places
  memberBreakdown?: Record<string, number>  // per-member split
}

interface ConcentrationRisk {
  type: 'single_holding' | 'single_sector' | 'single_currency' | 'single_country'
  name: string
  percentage: number
  severity: 'info' | 'warning' | 'critical'  // >15% info, >30% warning, >50% critical
}
```

### Drift analysis function: `calculateAllocationDrift`

```typescript
interface DriftInput {
  current: AllocationBreakdown[]
  target: AllocationBreakdown[]   // user-defined target allocation (optional)
}

interface DriftResult {
  drifts: Array<{
    category: string
    currentPct: number
    targetPct: number
    driftPct: number          // current − target
    rebalanceAmount: number   // minor units to move to reach target
  }>
  maxDrift: number
  needsRebalancing: boolean   // true if any drift > 5 percentage points
}
```

---

## 4. Performance Calculation (`performance.ts`)

### Time-Weighted Return (TWR)

Standard for comparing investment performance independent of cash flows.

```typescript
function calculateTWR(
  snapshots: Array<{ date: string; value: number }>,
  cashFlows: Array<{ date: string; amount: number; type: 'inflow' | 'outflow' }>
): { totalReturn: number; annualizedReturn: number; periods: PeriodReturn[] }
```

**Method:** Modified Dietz for sub-periods between cash flows, then chain-link periods.

### Performance Attribution (Quarterly)

Decomposes net worth change into explainable components:

```typescript
interface PerformanceAttribution {
  periodStart: string
  periodEnd: string
  startNetWorth: number
  endNetWorth: number
  totalChange: number
  
  // Attribution components (should sum to totalChange)
  marketReturns: number       // price changes on existing holdings
  netSavings: number          // deposits − withdrawals
  debtReduction: number       // mortgage/loan principal payments
  dividendsReceived: number   // dividend income
  feesDrag: number            // fees paid (negative number)
  fxImpact: number            // currency movement effect
  other: number               // residual / unattributed
  
  // Verification
  attributionSum: number
  residual: number            // totalChange − attributionSum (should be ~0)
}
```

**Rules:**
- Market returns = Σ (holding quantity × price change) for all holdings held throughout the period
- Net savings = Σ deposits − Σ withdrawals (transaction types: deposit, withdrawal, transfer)
- Debt reduction = principal portion of mortgage/loan payments
- Dividends = Σ dividend transactions
- Fees = Σ fee transactions (always negative)
- FX impact = change in converted value due to exchange rate movement alone
- Residual should be < 1% of total change; if larger, flag data quality issue

---

## 5. Financial Fitness Score (`fitness.ts`)

### Overview

Composite score 0–1000, sum of 5 components (each 0–200). Deterministic — every point is traceable to a data point and a rule.

### Component 1: Buffer (0–200)

**Measures:** Months of expenses covered by liquid savings.

```typescript
function calculateBufferScore(input: {
  liquidSavings: number         // savings accounts + accessible ISK cash
  estimatedMonthlyExpenses: number  // derived from outflow transactions, or user-input
}): { score: number; months: number; details: string }
```

| Months covered | Score range | Label |
|---|---|---|
| < 1 month | 0–40 | Critical |
| 1–2 months | 40–80 | Insufficient |
| 2–3 months | 80–120 | Basic |
| 3–6 months | 120–160 | Good |
| 6–9 months | 160–185 | Strong |
| 9+ months | 185–200 | Excellent |

**Scoring formula:**
```
score = min(200, months_covered × 22.2)  // linear scale, capped at 200
```

**Data sources:**
- `liquidSavings`: accounts where `type = 'savings'` + cash balances in ISK/KF/depå accounts
- `estimatedMonthlyExpenses`: average of last 6 months' outflow transactions (withdrawal + fee + tax types), OR user-provided override

> [!WARNING]
> **Gap: Expense detection.** In prototype (CSV-only), we only see *investment* transactions, not bank spending. `estimatedMonthlyExpenses` will need to be user-provided until PSD2/FiDA integration provides bank transaction data. Default assumption: use Swedish median household expenses by household size as fallback.

**Fallback table (Swedish median monthly expenses, 2025 estimates, SCB data):**

| Household type | Monthly expenses (SEK) |
|---|---|
| Single, no children | 22,000 |
| Couple, no children | 35,000 |
| Couple, 1 child | 42,000 |
| Couple, 2 children | 48,000 |
| Single parent, 1 child | 28,000 |

### Component 2: Growth (0–200)

**Measures:** Investment allocation effectiveness relative to an age-appropriate benchmark.

```typescript
function calculateGrowthScore(input: {
  equityAllocationPct: number    // % of investable assets in equities/funds/ETFs
  averageAge: number             // average age of household members
  totalInvestableAssets: number  // non-pension, non-locked investment accounts
  totalNetWorth: number
  investmentReturnYTD: number   // TWR for investment accounts, year-to-date
}): { score: number; details: string }
```

**Age-appropriate equity allocation benchmark (classic rule-of-thumb):**
```
targetEquityPct = max(20, min(90, 110 - averageAge))
// Age 30 → 80% equity target
// Age 45 → 65% equity target
// Age 60 → 50% equity target
```

**Scoring dimensions (each contributes up to 100):**

1. **Allocation alignment (0–100):** How close is actual equity allocation to target?
```
allocationDrift = abs(actualEquityPct - targetEquityPct)
allocationScore = max(0, 100 - (allocationDrift × 2.5))
// 0% drift = 100, 10% drift = 75, 40%+ drift = 0
```

2. **Investment rate (0–100):** Ratio of investable assets to net worth.
```
investmentRatio = totalInvestableAssets / totalNetWorth
investmentScore = min(100, investmentRatio × 200)
// 50%+ of net worth invested = 100
```

> [!NOTE]
> **Simplification for prototype.** The growth score does NOT factor in fund quality, diversification depth, or fee levels — those are covered by the Efficiency component. Growth purely measures *how much* and *what allocation* you have invested.

### Component 3: Protection (0–200)

**Measures:** Insurance coverage and emergency preparedness.

```typescript
function calculateProtectionScore(input: {
  hasHomeInsurance: boolean | null
  hasLifeInsurance: boolean | null
  hasIncomeProtection: boolean | null   // sjukförsäkring, inkomstförsäkring
  hasWill: boolean | null               // testamente
  hasSamboavtal: boolean | null         // cohabitation agreement
  totalLiabilities: number
  totalLifeInsuranceCoverage: number | null
  householdIncome: number | null        // annual gross, user-provided
}): { score: number; gaps: string[]; details: string }
```

| Coverage item | Points | Condition |
|---|---|---|
| Home/contents insurance | 40 | `hasHomeInsurance === true` |
| Life insurance | 50 | `hasLifeInsurance === true` AND coverage ≥ 2× annual income |
| Income protection | 40 | `hasIncomeProtection === true` |
| Legal documents (will/samboavtal) | 30 | Both present |
| Liability coverage ratio | 40 | Life insurance ≥ total liabilities |

**Missing data handling:** If a field is `null` (user hasn't entered it):
- Score for that item = 0
- Flag as "Unknown — add your insurance details to improve your score"
- Do NOT penalize tone — frame as "opportunity to improve"

> [!WARNING]
> **Gap: Insurance data.** Prototype relies on manual entry of insurance status (boolean + coverage amounts). No structured insurance policies in the data model — only boolean flags and optional coverage amounts. For v1, Insurely integration would provide real policy data.

### Component 4: Efficiency (0–200)

**Measures:** Minimizing fee drag and tax inefficiency.

```typescript
function calculateEfficiencyScore(input: {
  accounts: Array<{
    wrapperType: string | null
    type: string
    totalValue: number
    holdings: Array<{
      value: number
      estimatedFeeRate: number | null  // annual TER/fee as decimal (e.g., 0.004 = 0.4%)
    }>
  }>
  totalPortfolioValue: number
}): { score: number; totalFeeDrag: number; taxEfficiencyScore: number; details: string }
```

**Scoring dimensions:**

1. **Fee drag (0–100):**
```
weightedAvgFee = Σ(holding.value × holding.feeRate) / totalPortfolioValue
feeScore = 100 if weightedAvgFee ≤ 0.002 (0.2%)
feeScore = max(0, 100 - ((weightedAvgFee - 0.002) × 10000))
// 0.2% fees = 100, 0.5% = 70, 1.0% = 20, 1.2%+ = 0
```

2. **Tax wrapper efficiency (0–100):**
```
Score based on how well holdings are placed in tax-efficient wrappers:
- Equity holdings in ISK → optimal (ISK's flat tax benefits equities most)
- Fixed income in ISK → good but less optimal 
- Equity in depå → suboptimal (capital gains taxed at 30%)
- Any investments in savings accounts → poor
```

| Placement | Points per % of portfolio |
|---|---|
| Equities/funds in ISK | 1.0 per % |
| Fixed income in ISK/KF | 0.8 per % |
| Equities in KF | 0.7 per % |
| Any in depå | 0.3 per % |
| Investments in savings accounts | 0.0 per % |

> [!WARNING]
> **Gap: Fund fee data.** The prototype instruments table has no `fee_rate` / `ter` field. Fund TER (Total Expense Ratio) data requires either: (a) manual entry per instrument, (b) lookup from a fund data provider (Morningstar, Financial Times), or (c) reasonable defaults by instrument type. **Recommended for prototype:** use defaults by asset class:

| Asset class | Default fee assumption |
|---|---|
| Index fund / ETF | 0.20% |
| Active equity fund | 0.80% |
| Fixed income fund | 0.40% |
| Pension fund (PPM) | 0.30% |
| Tjänstepension fund | 0.50% |
| Direct equity | 0.00% (no ongoing fee) |
| Cash / savings | 0.00% |

### Component 5: Trajectory (0–200)

**Measures:** Is the household's financial position improving over time?

```typescript
function calculateTrajectoryScore(input: {
  netWorthHistory: Array<{ date: string; value: number }>  // monthly snapshots, 6+ months
  savingsRate: number | null     // net savings / income, if available
  fitnessScoreHistory: Array<{ date: string; score: number }>  // previous fitness scores
}): { score: number; trend: 'improving' | 'stable' | 'declining'; details: string }
```

**Scoring formula:**

1. **Net worth trend (0–100):** Linear regression slope of monthly net worth snapshots
```
slope = linear_regression_slope(netWorthHistory)
normalizedSlope = slope / averageNetWorth  // as percentage growth per month
trendScore = clamp(0, 100, 50 + (normalizedSlope × 1200))
// 0% monthly growth = 50, +1% monthly = 62, -1% = 38
// Strong positive = 100, strong negative = 0
```

2. **Momentum (0–100):** Are other fitness components improving?
```
If 3+ months of fitness history:
  componentTrend = average change across Buffer/Growth/Protection/Efficiency
  momentumScore = clamp(0, 100, 50 + (componentTrend × 2))
Else:
  momentumScore = 50  // neutral, insufficient data
```

> [!NOTE]
> **Cold start:** In the first 3 months, Trajectory defaults to 100 (neutral midpoint) and displays "Building your trend data — check back next quarter for trajectory insights."

---

## 6. Forecasting Engine (`forecast.ts`)

### Net Worth Projection

Projects net worth forward over time given assumptions.

```typescript
interface ForecastInput {
  currentNetWorth: number
  currentAllocation: AllocationBreakdown[]   // by asset class
  monthlySavingsRate: number                 // net monthly addition in minor units
  monthlyDebtPayment: number                 // mortgage/loan payments
  outstandingDebt: number
  debtInterestRate: number                   // annual, as decimal
  assumptions: ForecastAssumptions
  horizonMonths: number                      // how far to project
}

interface ForecastAssumptions {
  equityReturnAnnual: number      // default: 0.07 (7% nominal)
  fixedIncomeReturnAnnual: number // default: 0.03 (3% nominal)
  cashReturnAnnual: number        // default: 0.02 (2% nominal)
  inflationAnnual: number         // default: 0.02 (2%)
  salaryGrowthAnnual: number      // default: 0.025 (2.5%)
  source: 'default' | 'user' | 'historical'  // where assumptions came from
}

interface ForecastResult {
  projections: ForecastPoint[]    // monthly data points
  milestones: ForecastMilestone[]
  scenarios: {
    base: ForecastPoint[]
    optimistic: ForecastPoint[]   // assumptions × 1.3
    pessimistic: ForecastPoint[]  // assumptions × 0.5
  }
  assumptions: ForecastAssumptions  // echo back for transparency
}

interface ForecastPoint {
  month: number
  date: string             // projected date
  netWorth: number
  assets: number
  liabilities: number
  cumulativeSavings: number
  cumulativeReturns: number
}

interface ForecastMilestone {
  label: string            // "Debt free", "1M SEK net worth", "FIRE target"
  projectedDate: string | null
  monthsFromNow: number | null
  achievable: boolean
}
```

### Calculation method

```
For each month m in [1..horizonMonths]:
  investment_assets[m] = investment_assets[m-1] × (1 + weighted_monthly_return) + monthly_savings
  debt[m] = amortization_balance(debt[m-1], annual_rate, monthly_payment)
  net_worth[m] = investment_assets[m] + cash[m] - debt[m]
```

Where `weighted_monthly_return` is derived from the current allocation:
```
weighted_annual = Σ(assetClass.pct × assetClass.assumedReturn)
weighted_monthly = (1 + weighted_annual)^(1/12) - 1
```

### Default Assumptions

| Parameter | Default value | Source |
|---|---|---|
| Equity nominal return | 7.0% per year | Long-term MSCI World average |
| Fixed income return | 3.0% per year | Approximate Swedish government bond yield |
| Cash/savings return | 2.0% per year | Approximate Swedish savings rate |
| Inflation | 2.0% per year | Riksbanken target |
| Salary growth | 2.5% per year | Swedish average wage growth |

> [!IMPORTANT]
> **All projections must display:** "Based on [source] assumptions. Actual results will vary. Past performance does not predict future returns." Every projection screen must show the assumptions used and allow the user to modify them.

---

## 7. Mortgage & Debt Calculator (`mortgage.ts`)

### Amortization Schedule

Swedish mortgages follow specific rules (Finansinspektionen amortization requirements):

```typescript
interface MortgageInput {
  principal: number           // minor units
  annualInterestRate: number  // as decimal (0.0395 = 3.95%)
  termYears: number
  amortizationType: 'linear' | 'annuity' | 'swedish_requirement'
  propertyValue: number       // for LTV calculation
  householdGrossIncome: number // annual, for debt-to-income
}

interface MortgageResult {
  monthlyPayment: number      // total (interest + amortization)
  monthlyAmortization: number
  monthlyInterest: number     // at current rate
  totalInterestOverTerm: number
  payoffDate: string
  schedule: AmortizationPeriod[]
  ltvRatio: number            // loan-to-value
  dtiRatio: number            // debt-to-income
  fiRequirement: FIAmortizationRequirement
}
```

### Swedish Amortization Rules (Finansinspektionen)

```
IF LTV > 70%:
  minimum amortization = 2% of loan per year
ELSE IF LTV > 50%:
  minimum amortization = 1% of loan per year
ELSE:
  no mandatory amortization

IF debt-to-income ratio > 4.5×:
  additional 1% amortization per year on top of above
```

### Interest Deduction

Swedish tax deduction for interest expenses:
```
deductible_interest = interest_paid × 0.30  (for first 100,000 SEK interest/year)
deductible_interest_above = interest_paid_above_100k × 0.21
effective_rate = nominal_rate × (1 - tax_relief_rate)
```

---

## 8. Tax Wrapper Comparison (`tax-wrappers.ts`)

### ISK Schablonintäkt Calculation

```typescript
function calculateISKTax(input: {
  quarterlyValues: number[]   // account value at start of each quarter (4 values)
  depositsDuringYear: number  // total deposits
  governmentBorrowingRate: number  // Statslåneräntan, set by Riksgälden
}): {
  taxBase: number             // kapitalunderlag
  schablonIncome: number      // schablonintäkt
  taxAmount: number           // actual tax owed
  effectiveTaxRate: number    // as % of average account value
}

// Formula:
// kapitalunderlag = (Q1_value + Q2_value + Q3_value + Q4_value) / 4 + deposits
// schablonränta = max(governmentBorrowingRate + 1%, floor_rate)
// schablonintäkt = kapitalunderlag × schablonränta
// tax = schablonintäkt × 0.30 (capital income tax rate)
```

### Wrapper Comparison Function

```typescript
function compareWrapperEfficiency(input: {
  holdingValue: number
  expectedReturn: number       // annual
  holdingPeriodYears: number
  governmentBorrowingRate: number
}): {
  isk: { totalTax: number; afterTaxValue: number; effectiveRate: number }
  kf: { totalTax: number; afterTaxValue: number; effectiveRate: number }
  depa: { totalTax: number; afterTaxValue: number; effectiveRate: number }
  recommendation: string       // which wrapper is most tax-efficient
}
```

> [!NOTE]
> **The "break-even" insight.** ISK is more tax-efficient when returns exceed the schablonränta. If markets underperform (or are negative), ISK still taxes on the imputed value. The comparison function should highlight this nuance.

> [!WARNING]
> **Gap: Government borrowing rate.** The `statslåneränta` (SLR) changes annually (set November 30 for the following year). The system needs either: (a) a manually updated config value, or (b) a scraper/API for Riksgälden's published rate. **Recommended for prototype:** store as a config constant in `assumptions.ts`, updated manually per year.

---

## 9. Scenario Engine (`scenario.ts`)

### Architecture

The scenario engine takes a **base case** (current state + default projections) and applies **parameter overrides** to produce a **comparison**.

```typescript
interface ScenarioDefinition {
  id: string
  name: string
  description: string
  type: 'life_event' | 'market' | 'income' | 'debt' | 'custom'
  
  // Parameter overrides (only specify what changes)
  overrides: {
    oneTimeExpense?: number           // e.g., apartment down payment
    oneTimeIncome?: number            // e.g., inheritance
    monthlyExpenseChange?: number     // e.g., +5000 SEK/month mortgage
    monthlySavingsChange?: number     // e.g., -3000 SEK/month after baby
    portfolioValueChange?: number     // e.g., -20% market crash
    newDebt?: { principal: number; rate: number; termYears: number }
    removedDebt?: string[]            // debt account IDs paid off
    returnAssumptionOverride?: Partial<ForecastAssumptions>
  }
}

interface ScenarioResult {
  scenario: ScenarioDefinition
  baseCase: ForecastResult
  scenarioCase: ForecastResult
  
  comparison: {
    netWorthDeltaAtYear1: number
    netWorthDeltaAtYear5: number
    netWorthDeltaAtYear10: number
    monthlyPaymentDelta: number
    fitnessScoreImpact: number        // estimated change to fitness score
    breakEvenMonths: number | null    // when scenario catches up to base case (if applicable)
    keyTradeoffs: string[]            // deterministic text, not AI-generated
  }
}
```

### Pre-built Scenario Templates

| Template | Overrides applied | Used for |
|---|---|---|
| **Buy apartment** | oneTimeExpense (down payment), newDebt (mortgage), monthlyExpenseChange (+mortgage payment), monthlySavingsChange (reduced) | Life event: buying apartment |
| **Market crash** | portfolioValueChange (−20%, −30%, −40%) | Stress testing |
| **Job loss** | monthlySavingsChange (= −current savings rate), for 6 months | Protection score context |
| **Interest rate change** | Recalculate mortgage payments at new rate | What-if analysis |
| **Extra amortization** | Increased monthly debt payment, reduced savings | Debt vs invest comparison |
| **Having a child** | monthlyExpenseChange (+8,000 SEK), monthlySavingsChange (reduced) | Life event: having a child |
| **FIRE target** | Calculate required savings rate to reach target net worth by target date | FIRE household scenario |

### Scenario + LLM Handoff

The scenario engine produces the `ScenarioResult` with all numbers. The LLM then receives this structured data and generates:

1. A narrative summary of the scenario impact
2. Prioritized action items
3. Risk callouts

The LLM prompt receives the comparison numbers, never calculates them.

---

## 10. Fee Drag Analysis (`fees.ts`)

```typescript
interface FeeDragResult {
  totalAnnualFees: number       // minor units
  weightedAvgFeeRate: number    // as decimal
  feesByAccount: Array<{
    accountId: string
    accountName: string
    annualFees: number
    avgFeeRate: number
    highFeeHoldings: Array<{ name: string; feeRate: number; annualCost: number }>
  }>
  savingsOpportunity: number    // if all high-fee funds switched to index equivalents
  projectedFeeDrag10Year: number  // total fees over 10 years at current rates + assumed growth
}
```

### Fee Drag Projection

```
10-year fee drag = Σ (year 1..10) of:
  portfolio_value[year] × weighted_avg_fee_rate
  where portfolio_value grows at assumed return rate
```

This demonstrates the compounding cost of fees — a powerful motivator for optimization.

---

## 11. Currency Handling (`fx.ts`)

```typescript
interface FxRates {
  baseCurrency: string
  rates: Record<string, number>  // e.g., { 'USD': 10.45, 'EUR': 11.20, 'NOK': 0.98 }
  source: string                 // 'ecb' | 'manual'
  fetchedAt: string
}

function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates
): { converted: number; rate: number; rateSource: string }
```

**Rules:**
- All FX conversions go through the base currency (avoid triangulation errors)
- Rates sourced from ECB daily reference rates (see EXTERNAL_DATA.md)
- If rate is stale (> 48 hours), flag in data quality indicator
- Store converted amounts alongside original for audit trail

---

## 12. Assumption Management (`assumptions.ts`)

### Three tiers of assumptions

```typescript
type AssumptionSource = 'system_default' | 'user_override' | 'historical_derived'

interface AssumptionSet {
  equityReturn: { value: number; source: AssumptionSource }
  fixedIncomeReturn: { value: number; source: AssumptionSource }
  cashReturn: { value: number; source: AssumptionSource }
  inflation: { value: number; source: AssumptionSource }
  salaryGrowth: { value: number; source: AssumptionSource }
  monthlyExpenses: { value: number; source: AssumptionSource }
  governmentBorrowingRate: { value: number; source: AssumptionSource }
}
```

**Priority order:** User override > Historical derived > System default

- **System defaults** are the table from Section 6
- **Historical derived** = calculated from user's actual data (e.g., average savings rate from last 12 months of transactions)
- **User override** = explicitly set by the user in settings

> [!IMPORTANT]
> **Every forecast and scenario must display which assumption tier was used.** If using defaults, prompt: "These projections use standard assumptions. Add your actual income and expenses in Settings for personalized projections."

---

## 13. Calculation → LLM Integration Protocol

When the AI Agent (via `LLM_INTEGRATION.md`) needs financial data for narrative generation, it calls the calculation engine — never raw database queries.

### Context Enrichment Flow

```typescript
// In context assembler (src/lib/ai/context.ts)
// BEFORE: only raw financial data
// AFTER: enriched with calculation results

interface EnrichedHouseholdContext extends HouseholdContext {
  calculations: {
    netWorth: NetWorthResult
    allocation: AllocationResult
    fitness: FitnessScore
    forecast: ForecastResult           // 12-month base case
    performanceAttribution: PerformanceAttribution  // last quarter
    feeDrag: FeeDragResult
    concentrationRisks: ConcentrationRisk[]
  }
}
```

The LLM receives pre-computed numbers and generates narrative. It should never be asked to:
- Calculate returns or growth rates
- Compute amortization schedules
- Derive fitness scores
- Run scenario math

---

## 14. Data Dependencies & Third-Party Integration Gaps

### Required for prototype (no external dependency)

| Capability | Source | Status |
|---|---|---|
| Net worth aggregation | Holdings × prices from DB | ✅ Fully self-contained |
| Allocation analysis | Instrument metadata from DB | ✅ Fully self-contained |
| Fitness: Buffer | Savings balances from DB + user-input expenses | ⚠️ Expenses need user input |
| Fitness: Growth | Allocation % + member ages | ✅ Fully self-contained |
| Fitness: Trajectory | Account snapshots over time | ✅ Fully self-contained (after 3 months) |
| Mortgage amortization | User-input loan details | ✅ Fully self-contained |
| Scenario engine | Calculation engine + user parameters | ✅ Fully self-contained |

### Requires user input (no API available in prototype)

| Data point | Used by | Workaround |
|---|---|---|
| Monthly household expenses | Buffer score, forecasting | Swedish median defaults by household size; user can override |
| Insurance coverage | Protection score | Boolean flags (yes/no/unknown); manual coverage amounts |
| Household gross income | Debt-to-income, mortgage rules | User-provided in onboarding or settings |
| Fund TER / fee rates | Efficiency score, fee drag | Default by asset class (see table in Component 4) |

### Requires external data source

| Data point | Source | Used by | Prototype approach | v1 approach |
|---|---|---|---|---|
| Market prices | Yahoo Finance / market data API | Net worth, performance | Daily cron (EXTERNAL_DATA.md) | Real-time via FiDA |
| FX rates | ECB reference rates | Cross-currency aggregation | Daily cron (EXTERNAL_DATA.md) | Same, more frequent |
| Government borrowing rate | Riksgälden | ISK tax calculation | Annual manual config update | Scraper or API |
| Fund fee data (TER) | Morningstar / FT / Avanza | Efficiency score | Defaults by asset class | Fund data API integration |
| Bank transactions | PSD2 (Tink/Finshark) | Expense detection, savings rate | Not available — user input | PSD2 integration |
| Insurance policies | Insurely | Protection score | Manual boolean entry | Insurely API |
| Pension data | MinPension | Growth score, net worth completeness | Manual account entry | MinPension integration |

---

## 15. Testing Strategy

Every calculation module must have comprehensive unit tests:

```
tests/unit/calculations/
├── net-worth.test.ts
├── allocation.test.ts
├── performance.test.ts
├── fitness.test.ts
├── forecast.test.ts
├── mortgage.test.ts
├── tax-wrappers.test.ts
├── scenario.test.ts
├── fees.test.ts
└── fx.test.ts
```

### Test categories per module

1. **Happy path** — standard inputs, verify output
2. **Edge cases** — zero values, single holding, negative net worth
3. **Missing data** — null prices, no history, partial accounts
4. **Currency mixing** — multi-currency portfolio aggregation
5. **Snapshot tests** — deterministic outputs for demo household data (regression guard)
6. **Swedish-specific** — ISK tax calculation with known Riksgälden rates, FI amortization rules
