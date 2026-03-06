import { createHash } from "node:crypto";

export const demoVariants = ["standard", "fire", "fam_family", "friendly_family"] as const;
export type DemoVariant = (typeof demoVariants)[number];

type HouseholdType = "household" | "extended_family" | "circle";
type HouseholdRole = "owner" | "admin" | "member" | "viewer";
type AccountType = "investment" | "savings" | "pension" | "loan" | "mortgage" | "insurance";
type WrapperType = "ISK" | "KF" | "depa" | "PPM" | "tjanstepension" | "private_pension" | null;
type AccountVisibility = "full" | "amount_hidden" | "private";
type AccountSyncSource = "manual" | "csv";
type TransactionPattern = "investment" | "savings" | "pension" | "mortgage" | "insurance";
type TimelineEntryType = "life_event" | "decision" | "milestone" | "review" | "system" | "note";
type TimelineCategory = "housing" | "family" | "career" | "investment" | "retirement" | "other";
type LifeEventType =
  | "buying_apartment"
  | "having_child"
  | "changing_jobs"
  | "inheritance"
  | "retirement"
  | "marriage"
  | "divorce";
type LifeEventStatus = "active" | "completed" | "cancelled";
type PlaybookCategory = "financial" | "legal" | "insurance" | "tax" | "administrative";
type PlaybookPriority = "critical" | "high" | "medium" | "low";
type PlaybookStatus = "pending" | "in_progress" | "completed" | "skipped";
type ReviewStatus = "draft" | "published" | "archived";

type FitnessComponent = "buffer" | "growth" | "protection" | "efficiency" | "trajectory";

interface UserSpec {
  key: string;
  email: string;
  displayName: string;
}

interface MembershipSpec {
  userKey: string;
  role: HouseholdRole;
}

interface HoldingMixSpec {
  instrumentKey: string;
  weight: number;
}

interface AccountPlan {
  key: string;
  ownerKey: string;
  providerId: string;
  providerName: string;
  name: string;
  accountType: AccountType;
  wrapperType: WrapperType;
  visibility: AccountVisibility;
  syncSource: AccountSyncSource;
  baseValueMinor: number;
  monthlyDeltaMinor: number;
  volatilityMinor: number;
  minValueMinor: number;
  monthlyFlowMinor: number;
  transactionPattern: TransactionPattern;
  holdingMix: HoldingMixSpec[];
}

interface PlaybookActionPlan {
  title: string;
  description: string;
  category: PlaybookCategory;
  priority: PlaybookPriority;
  status: PlaybookStatus;
  assignedToKey: string | null;
}

interface LifeEventPlan {
  key: string;
  triggeredByKey: string;
  eventType: LifeEventType;
  title: string;
  category: TimelineCategory;
  status: LifeEventStatus;
  targetDate: string;
  impactSummary: string;
  impactData: Record<string, unknown>;
  inputs: Record<string, unknown>;
  actions: PlaybookActionPlan[];
}

interface HouseholdPlan {
  key: string;
  name: string;
  type: HouseholdType;
  variant: DemoVariant;
  createdByKey: string;
  members: MembershipSpec[];
  accounts: AccountPlan[];
  timelineCount: number;
  lifeEvents: LifeEventPlan[];
  fitnessBase: number;
  fitnessTrend: number;
}

interface InstrumentSpec {
  key: string;
  isin: string | null;
  ticker: string | null;
  name: string;
  assetClass: "equity" | "fixed_income" | "fund" | "etf" | "cash" | "real_estate" | "crypto" | "other";
  currency: "SEK";
  exchange: string | null;
  country: string | null;
  sector: string | null;
  lastPriceMinor: number;
  priceSource: "yahoo" | "manual" | "imported";
}

export interface DemoSeedUser {
  id: string;
  email: string;
  display_name: string;
}

export interface DemoAuthUserRow {
  id: string;
  aud: string;
  role: string;
  email: string;
  encrypted_password: string;
  email_confirmed_at: string;
  raw_app_meta_data: Record<string, unknown>;
  raw_user_meta_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DemoProfileRow {
  id: string;
  email: string;
  display_name: string;
  base_currency: string;
  locale: string;
  onboarding_completed: boolean;
  is_demo_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface DemoHouseholdRow {
  id: string;
  name: string;
  type: HouseholdType;
  base_currency: string;
  is_demo: boolean;
  demo_variant: DemoVariant;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DemoHouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: "active";
  invited_email: null;
  invited_at: null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface DemoInstrumentRow {
  id: string;
  isin: string | null;
  ticker: string | null;
  name: string;
  asset_class: string;
  currency: string;
  exchange: string | null;
  country: string | null;
  sector: string | null;
  last_price: number;
  last_price_at: string;
  price_source: string;
  created_at: string;
  updated_at: string;
}

export interface DemoAccountRow {
  id: string;
  household_id: string;
  owner_user_id: string;
  provider_id: string;
  provider_name: string;
  name: string;
  account_type: AccountType;
  wrapper_type: WrapperType;
  currency: string;
  visibility: AccountVisibility;
  external_id: string;
  last_synced: string;
  sync_source: AccountSyncSource;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DemoHoldingRow {
  id: string;
  account_id: string;
  instrument_id: string;
  quantity: string;
  average_cost: number;
  cost_currency: string;
  market_value: number;
  value_currency: string;
  as_of_date: string;
  source: "manual";
  created_at: string;
  updated_at: string;
}

export interface DemoTransactionRow {
  id: string;
  account_id: string;
  instrument_id: string | null;
  type: "buy" | "sell" | "dividend" | "deposit" | "withdrawal" | "fee" | "interest" | "transfer" | "tax";
  quantity: string | null;
  price: number | null;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_currency: string | null;
  fx_rate: string | null;
  fx_amount: number | null;
  fx_currency: string | null;
  transaction_date: string;
  settlement_date: string | null;
  description: string;
  external_ref: string;
  source: "manual" | "csv";
  created_at: string;
  updated_at: string;
}

export interface DemoAccountSnapshotRow {
  id: string;
  account_id: string;
  snapshot_date: string;
  total_value: number;
  cash_balance: number;
  currency: string;
  created_at: string;
}

export interface DemoHouseholdSnapshotRow {
  id: string;
  household_id: string;
  snapshot_date: string;
  total_net_worth: number;
  total_assets: number;
  total_liabilities: number;
  currency: string;
  created_at: string;
}

export interface DemoTimelineEntryRow {
  id: string;
  household_id: string;
  created_by: string;
  entry_type: TimelineEntryType;
  category: TimelineCategory | null;
  title: string;
  description: string;
  reasoning: string;
  expected_outcome: string;
  linked_account_ids: string[] | null;
  linked_proposal_id: null;
  linked_review_id: null;
  linked_event_id: null;
  entry_date: string;
  is_future: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DemoLifeEventRow {
  id: string;
  household_id: string;
  triggered_by: string;
  event_type: LifeEventType;
  title: string;
  status: LifeEventStatus;
  inputs: Record<string, unknown>;
  impact_summary: string;
  impact_data: Record<string, unknown>;
  target_date: string;
  completed_at: string | null;
  timeline_entry_id: string;
  created_at: string;
  updated_at: string;
}

export interface DemoPlaybookActionRow {
  id: string;
  life_event_id: string;
  title: string;
  description: string;
  category: PlaybookCategory;
  priority: PlaybookPriority;
  sort_order: number;
  assigned_to: string | null;
  status: PlaybookStatus;
  estimated_impact_amount: number;
  estimated_impact_description: string;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoFitnessScoreRow {
  id: string;
  household_id: string;
  total_score: number;
  buffer_score: number;
  growth_score: number;
  protection_score: number;
  efficiency_score: number;
  trajectory_score: number;
  component_details: Record<string, unknown>;
  explanation: string;
  suggested_actions: Array<Record<string, string>>;
  calculated_at: string;
  created_at: string;
}

export interface DemoQuarterlyReviewRow {
  id: string;
  household_id: string;
  period_start: string;
  period_end: string;
  quarter_label: string;
  net_worth_start: number;
  net_worth_end: number;
  net_worth_change: number;
  market_returns_amount: number;
  net_savings_amount: number;
  debt_reduction_amount: number;
  fees_drag_amount: number;
  narrative: string;
  recommendations: Array<Record<string, string>>;
  fitness_score: number;
  fitness_components: Record<string, number>;
  upcoming_events: Array<Record<string, string>>;
  status: ReviewStatus;
  generated_at: string;
  published_at: string;
  timeline_entry_id: null;
  created_at: string;
  updated_at: string;
}

export interface DemoVariantSummary {
  households: number;
  accounts: number;
  holdings: number;
  transactions: number;
  timelineEntries: number;
  lifeEvents: number;
  accountSnapshots: number;
  householdSnapshots: number;
  fitnessScores: number;
  quarterlyReviews: number;
}

export interface DemoSeedDataset {
  users: DemoSeedUser[];
  authUsers: DemoAuthUserRow[];
  profiles: DemoProfileRow[];
  households: DemoHouseholdRow[];
  householdMembers: DemoHouseholdMemberRow[];
  instruments: DemoInstrumentRow[];
  accounts: DemoAccountRow[];
  holdings: DemoHoldingRow[];
  transactions: DemoTransactionRow[];
  accountSnapshots: DemoAccountSnapshotRow[];
  householdSnapshots: DemoHouseholdSnapshotRow[];
  timelineEntries: DemoTimelineEntryRow[];
  lifeEvents: DemoLifeEventRow[];
  playbookActions: DemoPlaybookActionRow[];
  fitnessScores: DemoFitnessScoreRow[];
  quarterlyReviews: DemoQuarterlyReviewRow[];
  expectedByVariant: Record<DemoVariant, DemoVariantSummary>;
  totals: DemoVariantSummary;
}

const SNAPSHOT_END_DATE = "2026-02-28";
const SNAPSHOT_MONTHS = 24;
const FITNESS_MONTHS = 12;
const BASE_TIMESTAMP = "2026-03-01T08:00:00.000Z";

const timelineTemplatesByVariant: Record<
  DemoVariant,
  Array<{ entryType: TimelineEntryType; category: TimelineCategory; title: string; description: string }>
> = {
  standard: [
    {
      entryType: "milestone",
      category: "housing",
      title: "Apartment financing checkpoint",
      description: "Updated downpayment runway and mortgage sensitivity before refinancing window.",
    },
    {
      entryType: "decision",
      category: "family",
      title: "Adjusted child savings split",
      description: "Shifted monthly kids savings toward global equity funds and reduced cash drag.",
    },
    {
      entryType: "review",
      category: "investment",
      title: "Quarterly household allocation review",
      description: "Compared portfolio drift versus target and rebalanced tax-efficient wrappers.",
    },
    {
      entryType: "note",
      category: "other",
      title: "Expense baseline refreshed",
      description: "Re-estimated family baseline spending after insurance and childcare updates.",
    },
  ],
  fire: [
    {
      entryType: "decision",
      category: "retirement",
      title: "Raised FIRE savings rate",
      description: "Increased automated transfers to bridge account after compensation review.",
    },
    {
      entryType: "milestone",
      category: "investment",
      title: "12-month FI runway achieved",
      description: "Liquid reserve now covers over one year of modeled expenses.",
    },
    {
      entryType: "review",
      category: "investment",
      title: "Sequence risk drill",
      description: "Stress-tested a -30% equity drawdown and updated glide-path assumptions.",
    },
    {
      entryType: "system",
      category: "other",
      title: "Automation audit completed",
      description: "Validated monthly transfers, fee caps, and tax wrapper routing rules.",
    },
  ],
  fam_family: [
    {
      entryType: "decision",
      category: "family",
      title: "Intergenerational transfer scenario",
      description: "Modeled gifting schedule and liquidity buffers across both family households.",
    },
    {
      entryType: "review",
      category: "investment",
      title: "Family governance review",
      description: "Aligned risk levels and communication cadence between parents and adult children.",
    },
    {
      entryType: "milestone",
      category: "retirement",
      title: "Estate liquidity target reached",
      description: "Completed reserve target for expected legal and tax planning costs.",
    },
    {
      entryType: "note",
      category: "other",
      title: "Shared decision log updated",
      description: "Documented ownership boundaries and approval policy for major transactions.",
    },
  ],
  friendly_family: [
    {
      entryType: "review",
      category: "investment",
      title: "Circle benchmark sync",
      description: "Shared allocation percentages and compared dispersion without revealing absolute values.",
    },
    {
      entryType: "decision",
      category: "investment",
      title: "Theme basket rebalance",
      description: "Reduced overlap across global ETFs and rotated toward lower-fee exposures.",
    },
    {
      entryType: "milestone",
      category: "career",
      title: "Learning sprint completed",
      description: "Circle members completed monthly investment education and updated playbook notes.",
    },
    {
      entryType: "note",
      category: "other",
      title: "Anonymized sharing audit",
      description: "Validated privacy settings and amount-hidden defaults for circle collaboration.",
    },
  ],
};

const instrumentSpecs: InstrumentSpec[] = [
  {
    key: "cash-sek",
    isin: null,
    ticker: "SEKCASH",
    name: "SEK Cash Reserve",
    assetClass: "cash",
    currency: "SEK",
    exchange: null,
    country: "SE",
    sector: "cash",
    lastPriceMinor: 10_000,
    priceSource: "manual",
  },
  {
    key: "mortgage-ledger",
    isin: null,
    ticker: "MTGLEDGER",
    name: "Mortgage Principal Ledger",
    assetClass: "other",
    currency: "SEK",
    exchange: null,
    country: "SE",
    sector: "liability",
    lastPriceMinor: 10_000,
    priceSource: "manual",
  },
  {
    key: "insurance-reserve",
    isin: null,
    ticker: "INSRES",
    name: "Insurance Reserve Bucket",
    assetClass: "fixed_income",
    currency: "SEK",
    exchange: null,
    country: "SE",
    sector: "insurance",
    lastPriceMinor: 10_200,
    priceSource: "manual",
  },
  {
    key: "avanza-global",
    isin: "SE0011527613",
    ticker: "AVA-GLOB",
    name: "Avanza Global",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "global_equity",
    lastPriceMinor: 35_400,
    priceSource: "imported",
  },
  {
    key: "seb-sverige",
    isin: "SE0002593673",
    ticker: "SEB-SWE",
    name: "SEB Sverige Indexnara A",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "swedish_equity",
    lastPriceMinor: 44_100,
    priceSource: "imported",
  },
  {
    key: "spiltan",
    isin: "SE0004297929",
    ticker: "SPILTAN",
    name: "Spiltan Aktiefond Investmentbolag",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "swedish_equity",
    lastPriceMinor: 54_900,
    priceSource: "imported",
  },
  {
    key: "iwda",
    isin: "IE00B4L5Y983",
    ticker: "IWDA",
    name: "iShares Core MSCI World UCITS ETF",
    assetClass: "etf",
    currency: "SEK",
    exchange: "XSTO",
    country: "IE",
    sector: "global_equity",
    lastPriceMinor: 92_300,
    priceSource: "yahoo",
  },
  {
    key: "xact-omxs30",
    isin: "SE0000693293",
    ticker: "XACT30",
    name: "XACT OMXS30 UCITS ETF",
    assetClass: "etf",
    currency: "SEK",
    exchange: "XSTO",
    country: "SE",
    sector: "swedish_equity",
    lastPriceMinor: 47_800,
    priceSource: "yahoo",
  },
  {
    key: "volvo-b",
    isin: "SE0000115446",
    ticker: "VOLV-B",
    name: "Volvo B",
    assetClass: "equity",
    currency: "SEK",
    exchange: "XSTO",
    country: "SE",
    sector: "industrials",
    lastPriceMinor: 30_500,
    priceSource: "yahoo",
  },
  {
    key: "ap7-aktie",
    isin: "SE0003299999",
    ticker: "AP7AKT",
    name: "AP7 Aktiefond",
    assetClass: "fund",
    currency: "SEK",
    exchange: "PPM",
    country: "SE",
    sector: "global_equity",
    lastPriceMinor: 53_100,
    priceSource: "imported",
  },
  {
    key: "amf-rantefond",
    isin: "SE0001184965",
    ticker: "AMF-RAN",
    name: "AMF Rantefond Lang",
    assetClass: "fixed_income",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "fixed_income",
    lastPriceMinor: 13_600,
    priceSource: "imported",
  },
  {
    key: "spp-global",
    isin: "SE0000310336",
    ticker: "SPP-GLOB",
    name: "SPP Aktiefond Global",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "global_equity",
    lastPriceMinor: 32_900,
    priceSource: "imported",
  },
  {
    key: "handelsbanken-usa",
    isin: "SE0000355182",
    ticker: "HB-USA",
    name: "Handelsbanken USA Index Criteria",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "us_equity",
    lastPriceMinor: 41_300,
    priceSource: "imported",
  },
  {
    key: "plus-allabolag",
    isin: "SE0005932308",
    ticker: "PLUS-ALL",
    name: "PLUS Allabolag Sverige Index",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "swedish_equity",
    lastPriceMinor: 29_500,
    priceSource: "imported",
  },
  {
    key: "vanguard-allworld",
    isin: "IE00B3RBWM25",
    ticker: "VWRL",
    name: "Vanguard FTSE All-World UCITS ETF",
    assetClass: "etf",
    currency: "SEK",
    exchange: "XSTO",
    country: "IE",
    sector: "global_equity",
    lastPriceMinor: 126_400,
    priceSource: "yahoo",
  },
  {
    key: "nordnet-index-tech",
    isin: "SE0015709807",
    ticker: "NN-TECH",
    name: "Nordnet Teknik Index",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "technology",
    lastPriceMinor: 52_800,
    priceSource: "imported",
  },
  {
    key: "lansforsakringar-global",
    isin: "SE0005188836",
    ticker: "LF-GLOB",
    name: "Lansforsakringar Global Indexnara",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "global_equity",
    lastPriceMinor: 39_200,
    priceSource: "imported",
  },
  {
    key: "xact-norden",
    isin: "SE0001805445",
    ticker: "XACTNORD",
    name: "XACT Norden Hogutdelande",
    assetClass: "etf",
    currency: "SEK",
    exchange: "XSTO",
    country: "SE",
    sector: "dividend_equity",
    lastPriceMinor: 25_100,
    priceSource: "yahoo",
  },
  {
    key: "swedbank-robur-tech",
    isin: "SE0000538944",
    ticker: "ROBURTECH",
    name: "Swedbank Robur Technology A",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "technology",
    lastPriceMinor: 88_700,
    priceSource: "imported",
  },
  {
    key: "investor-b",
    isin: "SE0015811967",
    ticker: "INVE-B",
    name: "Investor B",
    assetClass: "equity",
    currency: "SEK",
    exchange: "XSTO",
    country: "SE",
    sector: "financials",
    lastPriceMinor: 27_300,
    priceSource: "yahoo",
  },
  {
    key: "latour-b",
    isin: "SE0010100958",
    ticker: "LATO-B",
    name: "Latour B",
    assetClass: "equity",
    currency: "SEK",
    exchange: "XSTO",
    country: "SE",
    sector: "industrials",
    lastPriceMinor: 30_900,
    priceSource: "yahoo",
  },
  {
    key: "didner-gerge",
    isin: "SE0000427361",
    ticker: "DIDNER",
    name: "Didner & Gerge Aktiefond",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "swedish_equity",
    lastPriceMinor: 34_200,
    priceSource: "imported",
  },
  {
    key: "nordnet-usa-index",
    isin: "SE0006091476",
    ticker: "NN-USA",
    name: "Nordnet Indexfond USA",
    assetClass: "fund",
    currency: "SEK",
    exchange: "NGM",
    country: "SE",
    sector: "us_equity",
    lastPriceMinor: 21_500,
    priceSource: "imported",
  },
  {
    key: "amundi-em",
    isin: "LU1681045370",
    ticker: "AEME",
    name: "Amundi MSCI Emerging Markets UCITS ETF",
    assetClass: "etf",
    currency: "SEK",
    exchange: "XSTO",
    country: "LU",
    sector: "emerging_markets",
    lastPriceMinor: 49_100,
    priceSource: "yahoo",
  },
];

const userSpecs: UserSpec[] = [
  { key: "standard_anna", email: "demo.anna.andersson@fyrk.local", displayName: "Anna Andersson" },
  { key: "standard_johan", email: "demo.johan.andersson@fyrk.local", displayName: "Johan Andersson" },
  { key: "fire_sara", email: "demo.sara.lindberg@fyrk.local", displayName: "Sara Lindberg" },
  { key: "fire_erik", email: "demo.erik.lindberg@fyrk.local", displayName: "Erik Lindberg" },
  { key: "fam_katarina", email: "demo.katarina.eriksson@fyrk.local", displayName: "Katarina Eriksson" },
  { key: "fam_lars", email: "demo.lars.eriksson@fyrk.local", displayName: "Lars Eriksson" },
  { key: "fam_emma", email: "demo.emma.eriksson@fyrk.local", displayName: "Emma Eriksson" },
  { key: "fam_oskar", email: "demo.oskar.eriksson@fyrk.local", displayName: "Oskar Eriksson" },
  { key: "circle_lina", email: "demo.lina.sjostrom@fyrk.local", displayName: "Lina Sjostrom" },
  { key: "circle_marcus", email: "demo.marcus.nordin@fyrk.local", displayName: "Marcus Nordin" },
  { key: "circle_farid", email: "demo.farid.rahimi@fyrk.local", displayName: "Farid Rahimi" },
];

const householdPlans: HouseholdPlan[] = [
  {
    key: "standard_andersson",
    name: "Andersson Family",
    type: "household",
    variant: "standard",
    createdByKey: "standard_anna",
    members: [
      { userKey: "standard_anna", role: "owner" },
      { userKey: "standard_johan", role: "owner" },
    ],
    timelineCount: 22,
    fitnessBase: 595,
    fitnessTrend: 4,
    lifeEvents: [
      {
        key: "apartment_purchase",
        triggeredByKey: "standard_anna",
        eventType: "buying_apartment",
        title: "Apartment purchase planning",
        category: "housing",
        status: "completed",
        targetDate: "2025-09-15",
        impactSummary: "Closed apartment purchase with conservative debt service ratio and 6-month buffer.",
        inputs: {
          purchasePriceSek: 4_850_000,
          downpaymentSek: 1_100_000,
          mortgageRatePct: 4.1,
        },
        impactData: {
          projectedMonthlyHousingCostSek: 18_900,
          maxDrawdownTolerancePct: 18,
        },
        actions: [
          {
            title: "Lock mortgage quote",
            description: "Confirm fixed-rate tranche for first 24 months.",
            category: "financial",
            priority: "high",
            status: "completed",
            assignedToKey: "standard_anna",
          },
          {
            title: "Update home insurance",
            description: "Align coverage levels with new property value.",
            category: "insurance",
            priority: "medium",
            status: "completed",
            assignedToKey: "standard_johan",
          },
          {
            title: "Rebuild emergency reserve",
            description: "Restore buffer after downpayment transfer.",
            category: "financial",
            priority: "high",
            status: "completed",
            assignedToKey: "standard_anna",
          },
          {
            title: "Archive legal documents",
            description: "Store purchase contract and mortgage terms in household vault.",
            category: "legal",
            priority: "medium",
            status: "completed",
            assignedToKey: "standard_johan",
          },
        ],
      },
      {
        key: "baby_expected",
        triggeredByKey: "standard_johan",
        eventType: "having_child",
        title: "Second child expected",
        category: "family",
        status: "active",
        targetDate: "2026-08-30",
        impactSummary: "Preparing cash-flow plan for parental leave and childcare expenses.",
        inputs: {
          expectedLeaveMonths: 12,
          expectedMonthlyChildcareSek: 3_500,
        },
        impactData: {
          projectedNetWorthImpactSek: -210_000,
          recommendedBufferMonths: 8,
        },
        actions: [
          {
            title: "Expand monthly buffer transfer",
            description: "Increase savings transfer by 2,000 SEK per month before due date.",
            category: "financial",
            priority: "high",
            status: "in_progress",
            assignedToKey: "standard_johan",
          },
          {
            title: "Review parental insurance",
            description: "Validate cover levels for sickness and disability periods.",
            category: "insurance",
            priority: "medium",
            status: "pending",
            assignedToKey: "standard_anna",
          },
          {
            title: "Document leave scenarios",
            description: "Model base, downside, and upside cash-flow scenarios.",
            category: "administrative",
            priority: "medium",
            status: "pending",
            assignedToKey: "standard_johan",
          },
        ],
      },
    ],
    accounts: [
      {
        key: "std_anna_isk",
        ownerKey: "standard_anna",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Anna ISK",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "full",
        syncSource: "csv",
        baseValueMinor: 34_000_000,
        monthlyDeltaMinor: 240_000,
        volatilityMinor: 750_000,
        minValueMinor: 25_000_000,
        monthlyFlowMinor: 14_500_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "avanza-global", weight: 45 },
          { instrumentKey: "seb-sverige", weight: 30 },
          { instrumentKey: "spiltan", weight: 25 },
        ],
      },
      {
        key: "std_johan_kf",
        ownerKey: "standard_johan",
        providerId: "nordnet",
        providerName: "Nordnet",
        name: "Johan KF",
        accountType: "investment",
        wrapperType: "KF",
        visibility: "full",
        syncSource: "csv",
        baseValueMinor: 30_500_000,
        monthlyDeltaMinor: 210_000,
        volatilityMinor: 690_000,
        minValueMinor: 22_000_000,
        monthlyFlowMinor: 13_200_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "iwda", weight: 40 },
          { instrumentKey: "xact-omxs30", weight: 35 },
          { instrumentKey: "volvo-b", weight: 25 },
        ],
      },
      {
        key: "std_family_savings",
        ownerKey: "standard_anna",
        providerId: "seb",
        providerName: "SEB",
        name: "Family Buffer Savings",
        accountType: "savings",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 14_800_000,
        monthlyDeltaMinor: 120_000,
        volatilityMinor: 90_000,
        minValueMinor: 9_500_000,
        monthlyFlowMinor: 6_500_00,
        transactionPattern: "savings",
        holdingMix: [{ instrumentKey: "cash-sek", weight: 100 }],
      },
      {
        key: "std_mortgage",
        ownerKey: "standard_johan",
        providerId: "swedbank",
        providerName: "Swedbank",
        name: "Apartment Mortgage",
        accountType: "mortgage",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 151_000_000,
        monthlyDeltaMinor: -340_000,
        volatilityMinor: 65_000,
        minValueMinor: 126_000_000,
        monthlyFlowMinor: 12_400_00,
        transactionPattern: "mortgage",
        holdingMix: [{ instrumentKey: "mortgage-ledger", weight: 100 }],
      },
      {
        key: "std_anna_ppm",
        ownerKey: "standard_anna",
        providerId: "minpension",
        providerName: "MinPension",
        name: "Anna PPM",
        accountType: "pension",
        wrapperType: "PPM",
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 21_500_000,
        monthlyDeltaMinor: 160_000,
        volatilityMinor: 280_000,
        minValueMinor: 16_000_000,
        monthlyFlowMinor: 4_300_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "ap7-aktie", weight: 70 },
          { instrumentKey: "amf-rantefond", weight: 30 },
        ],
      },
      {
        key: "std_johan_occ_pension",
        ownerKey: "standard_johan",
        providerId: "alecta",
        providerName: "Alecta",
        name: "Johan Occupational Pension",
        accountType: "pension",
        wrapperType: "tjanstepension",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 24_200_000,
        monthlyDeltaMinor: 170_000,
        volatilityMinor: 300_000,
        minValueMinor: 18_500_000,
        monthlyFlowMinor: 4_800_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "spp-global", weight: 62 },
          { instrumentKey: "amf-rantefond", weight: 38 },
        ],
      },
      {
        key: "std_insurance",
        ownerKey: "standard_anna",
        providerId: "if",
        providerName: "If Insurance",
        name: "Family Protection Policy",
        accountType: "insurance",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 8_500_000,
        monthlyDeltaMinor: 45_000,
        volatilityMinor: 55_000,
        minValueMinor: 6_500_000,
        monthlyFlowMinor: 2_100_00,
        transactionPattern: "insurance",
        holdingMix: [
          { instrumentKey: "insurance-reserve", weight: 65 },
          { instrumentKey: "amf-rantefond", weight: 35 },
        ],
      },
      {
        key: "std_kids_isk",
        ownerKey: "standard_johan",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Kids Future ISK",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "full",
        syncSource: "csv",
        baseValueMinor: 11_800_000,
        monthlyDeltaMinor: 110_000,
        volatilityMinor: 280_000,
        minValueMinor: 8_500_000,
        monthlyFlowMinor: 3_600_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "avanza-global", weight: 50 },
          { instrumentKey: "handelsbanken-usa", weight: 30 },
          { instrumentKey: "plus-allabolag", weight: 20 },
        ],
      },
    ],
  },
  {
    key: "fire_lindberg",
    name: "Lindberg FIRE Plan",
    type: "household",
    variant: "fire",
    createdByKey: "fire_sara",
    members: [
      { userKey: "fire_sara", role: "owner" },
      { userKey: "fire_erik", role: "owner" },
    ],
    timelineCount: 18,
    fitnessBase: 710,
    fitnessTrend: 5,
    lifeEvents: [
      {
        key: "fire_target_tracking",
        triggeredByKey: "fire_sara",
        eventType: "retirement",
        title: "FIRE milestone tracking",
        category: "retirement",
        status: "active",
        targetDate: "2038-06-30",
        impactSummary: "Tracking FI number progress with quarterly savings-rate and drawdown drills.",
        inputs: {
          targetNetWorthSek: 15_500_000,
          targetAge: 55,
          expectedSafeWithdrawalPct: 3.5,
        },
        impactData: {
          yearsToTarget: 12,
          requiredAnnualSavingsRatePct: 43,
        },
        actions: [
          {
            title: "Increase automatic index purchases",
            description: "Raise monthly auto-buy amount in ISK accounts by 10%.",
            category: "financial",
            priority: "high",
            status: "in_progress",
            assignedToKey: "fire_sara",
          },
          {
            title: "Run annual tax wrapper optimization",
            description: "Shift taxable positions toward ISK/KF where possible.",
            category: "tax",
            priority: "medium",
            status: "pending",
            assignedToKey: "fire_erik",
          },
          {
            title: "Sequence-risk contingency plan",
            description: "Document spending cuts under prolonged bear-market scenarios.",
            category: "administrative",
            priority: "medium",
            status: "pending",
            assignedToKey: "fire_sara",
          },
          {
            title: "Review income protection coverage",
            description: "Ensure disability and income insurance aligns with FI timeline.",
            category: "insurance",
            priority: "low",
            status: "pending",
            assignedToKey: "fire_erik",
          },
        ],
      },
    ],
    accounts: [
      {
        key: "fire_sara_isk_core",
        ownerKey: "fire_sara",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Sara ISK Core",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "full",
        syncSource: "csv",
        baseValueMinor: 56_000_000,
        monthlyDeltaMinor: 360_000,
        volatilityMinor: 940_000,
        minValueMinor: 40_000_000,
        monthlyFlowMinor: 22_000_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "avanza-global", weight: 27 },
          { instrumentKey: "iwda", weight: 22 },
          { instrumentKey: "vanguard-allworld", weight: 18 },
          { instrumentKey: "xact-norden", weight: 18 },
          { instrumentKey: "amundi-em", weight: 15 },
        ],
      },
      {
        key: "fire_erik_isk_growth",
        ownerKey: "fire_erik",
        providerId: "nordnet",
        providerName: "Nordnet",
        name: "Erik ISK Growth",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "full",
        syncSource: "csv",
        baseValueMinor: 48_000_000,
        monthlyDeltaMinor: 340_000,
        volatilityMinor: 910_000,
        minValueMinor: 33_500_000,
        monthlyFlowMinor: 20_500_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "lansforsakringar-global", weight: 28 },
          { instrumentKey: "nordnet-index-tech", weight: 20 },
          { instrumentKey: "swedbank-robur-tech", weight: 19 },
          { instrumentKey: "investor-b", weight: 18 },
          { instrumentKey: "xact-omxs30", weight: 15 },
        ],
      },
      {
        key: "fire_joint_depa",
        ownerKey: "fire_sara",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Joint Tactical Depa",
        accountType: "investment",
        wrapperType: "depa",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 39_500_000,
        monthlyDeltaMinor: 250_000,
        volatilityMinor: 820_000,
        minValueMinor: 28_000_000,
        monthlyFlowMinor: 14_800_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "volvo-b", weight: 20 },
          { instrumentKey: "latour-b", weight: 20 },
          { instrumentKey: "didner-gerge", weight: 20 },
          { instrumentKey: "nordnet-usa-index", weight: 20 },
          { instrumentKey: "amundi-em", weight: 20 },
        ],
      },
      {
        key: "fire_liquidity_buffer",
        ownerKey: "fire_erik",
        providerId: "seb",
        providerName: "SEB",
        name: "Liquidity Buffer",
        accountType: "savings",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 17_500_000,
        monthlyDeltaMinor: 120_000,
        volatilityMinor: 75_000,
        minValueMinor: 13_500_000,
        monthlyFlowMinor: 6_700_00,
        transactionPattern: "savings",
        holdingMix: [{ instrumentKey: "cash-sek", weight: 100 }],
      },
      {
        key: "fire_bridge_savings",
        ownerKey: "fire_sara",
        providerId: "nordea",
        providerName: "Nordea",
        name: "FIRE Bridge Savings",
        accountType: "savings",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 13_800_000,
        monthlyDeltaMinor: 95_000,
        volatilityMinor: 60_000,
        minValueMinor: 10_500_000,
        monthlyFlowMinor: 5_200_00,
        transactionPattern: "savings",
        holdingMix: [{ instrumentKey: "cash-sek", weight: 100 }],
      },
      {
        key: "fire_pension",
        ownerKey: "fire_erik",
        providerId: "minpension",
        providerName: "MinPension",
        name: "Occupational Pension",
        accountType: "pension",
        wrapperType: "tjanstepension",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 32_500_000,
        monthlyDeltaMinor: 210_000,
        volatilityMinor: 440_000,
        minValueMinor: 24_000_000,
        monthlyFlowMinor: 7_600_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "ap7-aktie", weight: 18 },
          { instrumentKey: "spp-global", weight: 18 },
          { instrumentKey: "iwda", weight: 14 },
          { instrumentKey: "xact-norden", weight: 12 },
          { instrumentKey: "amf-rantefond", weight: 12 },
          { instrumentKey: "nordnet-usa-index", weight: 10 },
          { instrumentKey: "amundi-em", weight: 8 },
          { instrumentKey: "cash-sek", weight: 8 },
        ],
      },
    ],
  },
  {
    key: "fam_parents",
    name: "Eriksson Parents",
    type: "household",
    variant: "fam_family",
    createdByKey: "fam_katarina",
    members: [
      { userKey: "fam_katarina", role: "owner" },
      { userKey: "fam_lars", role: "owner" },
      { userKey: "fam_emma", role: "admin" },
      { userKey: "fam_oskar", role: "viewer" },
    ],
    timelineCount: 14,
    fitnessBase: 655,
    fitnessTrend: 3,
    lifeEvents: [
      {
        key: "estate_planning",
        triggeredByKey: "fam_katarina",
        eventType: "inheritance",
        title: "Estate planning program",
        category: "family",
        status: "active",
        targetDate: "2027-01-31",
        impactSummary: "Coordinating legal documents, liquidity, and communication plan for inheritance transfer.",
        inputs: {
          anticipatedTransferSek: 3_200_000,
          legalAdvisor: "Soderberg Legal",
        },
        impactData: {
          requiredLiquiditySek: 450_000,
          expectedTaxRangePct: "0-30",
        },
        actions: [
          {
            title: "Draft family mandate",
            description: "Define decision rights and contingency steps across both households.",
            category: "legal",
            priority: "high",
            status: "in_progress",
            assignedToKey: "fam_katarina",
          },
          {
            title: "Rebalance low-volatility bucket",
            description: "Increase fixed-income allocation for near-term estate expenses.",
            category: "financial",
            priority: "high",
            status: "pending",
            assignedToKey: "fam_lars",
          },
          {
            title: "Align beneficiary forms",
            description: "Synchronize pension and insurance beneficiary registrations.",
            category: "administrative",
            priority: "medium",
            status: "pending",
            assignedToKey: "fam_emma",
          },
          {
            title: "Policy review with advisor",
            description: "Review gifting sequence under base and downside market scenarios.",
            category: "tax",
            priority: "medium",
            status: "pending",
            assignedToKey: "fam_katarina",
          },
          {
            title: "Communication timeline",
            description: "Schedule quarterly family finance review checkpoints.",
            category: "administrative",
            priority: "low",
            status: "pending",
            assignedToKey: "fam_oskar",
          },
        ],
      },
    ],
    accounts: [
      {
        key: "fam_parent_isk",
        ownerKey: "fam_katarina",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Parent ISK Core",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "full",
        syncSource: "csv",
        baseValueMinor: 41_000_000,
        monthlyDeltaMinor: 220_000,
        volatilityMinor: 620_000,
        minValueMinor: 30_000_000,
        monthlyFlowMinor: 11_800_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "avanza-global", weight: 20 },
          { instrumentKey: "lansforsakringar-global", weight: 18 },
          { instrumentKey: "xact-omxs30", weight: 17 },
          { instrumentKey: "didner-gerge", weight: 16 },
          { instrumentKey: "investor-b", weight: 15 },
          { instrumentKey: "amf-rantefond", weight: 14 },
        ],
      },
      {
        key: "fam_parent_savings",
        ownerKey: "fam_lars",
        providerId: "seb",
        providerName: "SEB",
        name: "Parent Liquidity Savings",
        accountType: "savings",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 18_600_000,
        monthlyDeltaMinor: 95_000,
        volatilityMinor: 70_000,
        minValueMinor: 13_200_000,
        monthlyFlowMinor: 5_200_00,
        transactionPattern: "savings",
        holdingMix: [
          { instrumentKey: "cash-sek", weight: 78 },
          { instrumentKey: "amf-rantefond", weight: 22 },
        ],
      },
      {
        key: "fam_parent_mortgage",
        ownerKey: "fam_lars",
        providerId: "handelsbanken",
        providerName: "Handelsbanken",
        name: "Parent House Mortgage",
        accountType: "mortgage",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 126_000_000,
        monthlyDeltaMinor: -280_000,
        volatilityMinor: 75_000,
        minValueMinor: 103_000_000,
        monthlyFlowMinor: 11_600_00,
        transactionPattern: "mortgage",
        holdingMix: [{ instrumentKey: "mortgage-ledger", weight: 100 }],
      },
      {
        key: "fam_parent_pension_lars",
        ownerKey: "fam_lars",
        providerId: "amf",
        providerName: "AMF",
        name: "Lars Pension",
        accountType: "pension",
        wrapperType: "tjanstepension",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 27_800_000,
        monthlyDeltaMinor: 165_000,
        volatilityMinor: 360_000,
        minValueMinor: 20_500_000,
        monthlyFlowMinor: 5_300_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "ap7-aktie", weight: 32 },
          { instrumentKey: "spp-global", weight: 26 },
          { instrumentKey: "amf-rantefond", weight: 24 },
          { instrumentKey: "xact-norden", weight: 18 },
        ],
      },
      {
        key: "fam_parent_pension_katarina",
        ownerKey: "fam_katarina",
        providerId: "spp",
        providerName: "SPP",
        name: "Katarina Pension",
        accountType: "pension",
        wrapperType: "private_pension",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 24_900_000,
        monthlyDeltaMinor: 158_000,
        volatilityMinor: 345_000,
        minValueMinor: 18_000_000,
        monthlyFlowMinor: 4_900_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "spp-global", weight: 30 },
          { instrumentKey: "nordnet-usa-index", weight: 22 },
          { instrumentKey: "amundi-em", weight: 20 },
          { instrumentKey: "amf-rantefond", weight: 28 },
        ],
      },
      {
        key: "fam_parent_insurance",
        ownerKey: "fam_katarina",
        providerId: "skandia",
        providerName: "Skandia",
        name: "Family Insurance Reserve",
        accountType: "insurance",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 10_500_000,
        monthlyDeltaMinor: 55_000,
        volatilityMinor: 60_000,
        minValueMinor: 7_800_000,
        monthlyFlowMinor: 2_400_00,
        transactionPattern: "insurance",
        holdingMix: [
          { instrumentKey: "insurance-reserve", weight: 45 },
          { instrumentKey: "amf-rantefond", weight: 30 },
          { instrumentKey: "cash-sek", weight: 25 },
        ],
      },
    ],
  },
  {
    key: "fam_nextgen",
    name: "Eriksson NextGen",
    type: "household",
    variant: "fam_family",
    createdByKey: "fam_emma",
    members: [
      { userKey: "fam_emma", role: "owner" },
      { userKey: "fam_oskar", role: "owner" },
      { userKey: "fam_katarina", role: "admin" },
      { userKey: "fam_lars", role: "viewer" },
    ],
    timelineCount: 14,
    fitnessBase: 625,
    fitnessTrend: 4,
    lifeEvents: [],
    accounts: [
      {
        key: "fam_nextgen_emma_isk",
        ownerKey: "fam_emma",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Emma ISK",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "full",
        syncSource: "csv",
        baseValueMinor: 32_800_000,
        monthlyDeltaMinor: 205_000,
        volatilityMinor: 560_000,
        minValueMinor: 24_000_000,
        monthlyFlowMinor: 10_500_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "avanza-global", weight: 22 },
          { instrumentKey: "iwda", weight: 18 },
          { instrumentKey: "xact-omxs30", weight: 17 },
          { instrumentKey: "nordnet-index-tech", weight: 15 },
          { instrumentKey: "amf-rantefond", weight: 13 },
          { instrumentKey: "cash-sek", weight: 15 },
        ],
      },
      {
        key: "fam_nextgen_oskar_depa",
        ownerKey: "fam_oskar",
        providerId: "nordnet",
        providerName: "Nordnet",
        name: "Oskar Depa",
        accountType: "investment",
        wrapperType: "depa",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 29_400_000,
        monthlyDeltaMinor: 188_000,
        volatilityMinor: 590_000,
        minValueMinor: 20_500_000,
        monthlyFlowMinor: 9_800_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "investor-b", weight: 30 },
          { instrumentKey: "latour-b", weight: 24 },
          { instrumentKey: "volvo-b", weight: 22 },
          { instrumentKey: "cash-sek", weight: 24 },
        ],
      },
      {
        key: "fam_nextgen_joint_savings",
        ownerKey: "fam_emma",
        providerId: "seb",
        providerName: "SEB",
        name: "Joint Safety Savings",
        accountType: "savings",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 13_900_000,
        monthlyDeltaMinor: 88_000,
        volatilityMinor: 55_000,
        minValueMinor: 9_800_000,
        monthlyFlowMinor: 4_700_00,
        transactionPattern: "savings",
        holdingMix: [
          { instrumentKey: "cash-sek", weight: 86 },
          { instrumentKey: "amf-rantefond", weight: 14 },
        ],
      },
      {
        key: "fam_nextgen_loan",
        ownerKey: "fam_oskar",
        providerId: "nordea",
        providerName: "Nordea",
        name: "Apartment Loan",
        accountType: "mortgage",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 96_000_000,
        monthlyDeltaMinor: -240_000,
        volatilityMinor: 50_000,
        minValueMinor: 79_000_000,
        monthlyFlowMinor: 9_900_00,
        transactionPattern: "mortgage",
        holdingMix: [{ instrumentKey: "mortgage-ledger", weight: 100 }],
      },
      {
        key: "fam_nextgen_pension",
        ownerKey: "fam_emma",
        providerId: "minpension",
        providerName: "MinPension",
        name: "Emma Pension",
        accountType: "pension",
        wrapperType: "PPM",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 16_500_000,
        monthlyDeltaMinor: 118_000,
        volatilityMinor: 220_000,
        minValueMinor: 11_800_000,
        monthlyFlowMinor: 3_900_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "ap7-aktie", weight: 33 },
          { instrumentKey: "spp-global", weight: 26 },
          { instrumentKey: "amf-rantefond", weight: 24 },
          { instrumentKey: "cash-sek", weight: 17 },
        ],
      },
      {
        key: "fam_nextgen_insurance",
        ownerKey: "fam_oskar",
        providerId: "if",
        providerName: "If Insurance",
        name: "Income Protection Reserve",
        accountType: "insurance",
        wrapperType: null,
        visibility: "full",
        syncSource: "manual",
        baseValueMinor: 9_100_000,
        monthlyDeltaMinor: 48_000,
        volatilityMinor: 58_000,
        minValueMinor: 6_900_000,
        monthlyFlowMinor: 2_000_00,
        transactionPattern: "insurance",
        holdingMix: [
          { instrumentKey: "insurance-reserve", weight: 50 },
          { instrumentKey: "amf-rantefond", weight: 20 },
          { instrumentKey: "cash-sek", weight: 30 },
        ],
      },
    ],
  },
  {
    key: "circle_investment",
    name: "The Investment Circle",
    type: "circle",
    variant: "friendly_family",
    createdByKey: "circle_lina",
    members: [
      { userKey: "circle_lina", role: "owner" },
      { userKey: "circle_marcus", role: "member" },
      { userKey: "circle_farid", role: "member" },
    ],
    timelineCount: 12,
    fitnessBase: 675,
    fitnessTrend: 2,
    lifeEvents: [],
    accounts: [
      {
        key: "circle_lina_isk",
        ownerKey: "circle_lina",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Lina ISK",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 24_000_000,
        monthlyDeltaMinor: 150_000,
        volatilityMinor: 460_000,
        minValueMinor: 18_000_000,
        monthlyFlowMinor: 7_000_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "lansforsakringar-global", weight: 35 },
          { instrumentKey: "xact-omxs30", weight: 25 },
          { instrumentKey: "amundi-em", weight: 20 },
          { instrumentKey: "cash-sek", weight: 20 },
        ],
      },
      {
        key: "circle_lina_savings",
        ownerKey: "circle_lina",
        providerId: "nordea",
        providerName: "Nordea",
        name: "Lina Savings",
        accountType: "savings",
        wrapperType: null,
        visibility: "private",
        syncSource: "manual",
        baseValueMinor: 8_500_000,
        monthlyDeltaMinor: 48_000,
        volatilityMinor: 35_000,
        minValueMinor: 6_200_000,
        monthlyFlowMinor: 2_400_00,
        transactionPattern: "savings",
        holdingMix: [{ instrumentKey: "cash-sek", weight: 100 }],
      },
      {
        key: "circle_lina_pension",
        ownerKey: "circle_lina",
        providerId: "minpension",
        providerName: "MinPension",
        name: "Lina Pension",
        accountType: "pension",
        wrapperType: "PPM",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 14_800_000,
        monthlyDeltaMinor: 98_000,
        volatilityMinor: 200_000,
        minValueMinor: 10_500_000,
        monthlyFlowMinor: 3_300_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "ap7-aktie", weight: 40 },
          { instrumentKey: "amf-rantefond", weight: 35 },
          { instrumentKey: "cash-sek", weight: 25 },
        ],
      },
      {
        key: "circle_lina_depa",
        ownerKey: "circle_lina",
        providerId: "nordnet",
        providerName: "Nordnet",
        name: "Lina Depa",
        accountType: "investment",
        wrapperType: "depa",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 18_600_000,
        monthlyDeltaMinor: 132_000,
        volatilityMinor: 390_000,
        minValueMinor: 13_200_000,
        monthlyFlowMinor: 5_200_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "investor-b", weight: 30 },
          { instrumentKey: "latour-b", weight: 24 },
          { instrumentKey: "didner-gerge", weight: 22 },
          { instrumentKey: "cash-sek", weight: 24 },
        ],
      },
      {
        key: "circle_marcus_isk",
        ownerKey: "circle_marcus",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Marcus ISK",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 23_400_000,
        monthlyDeltaMinor: 148_000,
        volatilityMinor: 445_000,
        minValueMinor: 17_500_000,
        monthlyFlowMinor: 6_700_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "avanza-global", weight: 32 },
          { instrumentKey: "nordnet-usa-index", weight: 24 },
          { instrumentKey: "xact-norden", weight: 22 },
          { instrumentKey: "cash-sek", weight: 22 },
        ],
      },
      {
        key: "circle_marcus_savings",
        ownerKey: "circle_marcus",
        providerId: "seb",
        providerName: "SEB",
        name: "Marcus Savings",
        accountType: "savings",
        wrapperType: null,
        visibility: "private",
        syncSource: "manual",
        baseValueMinor: 7_900_000,
        monthlyDeltaMinor: 46_000,
        volatilityMinor: 32_000,
        minValueMinor: 5_700_000,
        monthlyFlowMinor: 2_200_00,
        transactionPattern: "savings",
        holdingMix: [{ instrumentKey: "cash-sek", weight: 100 }],
      },
      {
        key: "circle_marcus_pension",
        ownerKey: "circle_marcus",
        providerId: "minpension",
        providerName: "MinPension",
        name: "Marcus Pension",
        accountType: "pension",
        wrapperType: "PPM",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 13_900_000,
        monthlyDeltaMinor: 92_000,
        volatilityMinor: 180_000,
        minValueMinor: 9_900_000,
        monthlyFlowMinor: 3_000_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "ap7-aktie", weight: 38 },
          { instrumentKey: "spp-global", weight: 34 },
          { instrumentKey: "cash-sek", weight: 28 },
        ],
      },
      {
        key: "circle_marcus_depa",
        ownerKey: "circle_marcus",
        providerId: "nordnet",
        providerName: "Nordnet",
        name: "Marcus Depa",
        accountType: "investment",
        wrapperType: "depa",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 17_500_000,
        monthlyDeltaMinor: 124_000,
        volatilityMinor: 360_000,
        minValueMinor: 12_500_000,
        monthlyFlowMinor: 4_900_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "swedbank-robur-tech", weight: 27 },
          { instrumentKey: "volvo-b", weight: 23 },
          { instrumentKey: "amundi-em", weight: 24 },
          { instrumentKey: "cash-sek", weight: 26 },
        ],
      },
      {
        key: "circle_farid_isk",
        ownerKey: "circle_farid",
        providerId: "avanza",
        providerName: "Avanza",
        name: "Farid ISK",
        accountType: "investment",
        wrapperType: "ISK",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 21_900_000,
        monthlyDeltaMinor: 142_000,
        volatilityMinor: 420_000,
        minValueMinor: 16_200_000,
        monthlyFlowMinor: 6_200_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "vanguard-allworld", weight: 30 },
          { instrumentKey: "xact-omxs30", weight: 26 },
          { instrumentKey: "amundi-em", weight: 20 },
          { instrumentKey: "cash-sek", weight: 24 },
        ],
      },
      {
        key: "circle_farid_savings",
        ownerKey: "circle_farid",
        providerId: "seb",
        providerName: "SEB",
        name: "Farid Savings",
        accountType: "savings",
        wrapperType: null,
        visibility: "private",
        syncSource: "manual",
        baseValueMinor: 7_200_000,
        monthlyDeltaMinor: 42_000,
        volatilityMinor: 30_000,
        minValueMinor: 5_100_000,
        monthlyFlowMinor: 2_000_00,
        transactionPattern: "savings",
        holdingMix: [{ instrumentKey: "cash-sek", weight: 100 }],
      },
      {
        key: "circle_farid_pension",
        ownerKey: "circle_farid",
        providerId: "minpension",
        providerName: "MinPension",
        name: "Farid Pension",
        accountType: "pension",
        wrapperType: "PPM",
        visibility: "amount_hidden",
        syncSource: "manual",
        baseValueMinor: 13_300_000,
        monthlyDeltaMinor: 88_000,
        volatilityMinor: 175_000,
        minValueMinor: 9_400_000,
        monthlyFlowMinor: 2_800_00,
        transactionPattern: "pension",
        holdingMix: [
          { instrumentKey: "ap7-aktie", weight: 34 },
          { instrumentKey: "amf-rantefond", weight: 36 },
          { instrumentKey: "cash-sek", weight: 30 },
        ],
      },
      {
        key: "circle_farid_depa",
        ownerKey: "circle_farid",
        providerId: "nordnet",
        providerName: "Nordnet",
        name: "Farid Depa",
        accountType: "investment",
        wrapperType: "depa",
        visibility: "amount_hidden",
        syncSource: "csv",
        baseValueMinor: 16_800_000,
        monthlyDeltaMinor: 118_000,
        volatilityMinor: 350_000,
        minValueMinor: 12_000_000,
        monthlyFlowMinor: 4_500_00,
        transactionPattern: "investment",
        holdingMix: [
          { instrumentKey: "nordnet-index-tech", weight: 25 },
          { instrumentKey: "investor-b", weight: 25 },
          { instrumentKey: "xact-norden", weight: 24 },
          { instrumentKey: "cash-sek", weight: 26 },
        ],
      },
    ],
  },
];

function deterministicUuid(input: string): string {
  const hash = createHash("sha1").update(input).digest("hex").slice(0, 32).split("");
  hash[12] = "4";
  const variantNibble = Number.parseInt(hash[16] ?? "8", 16);
  hash[16] = ((variantNibble & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8).join("")}-${hash.slice(8, 12).join("")}-${hash
    .slice(12, 16)
    .join("")}-${hash.slice(16, 20).join("")}-${hash.slice(20, 32).join("")}`;
}

function hashInt(input: string): number {
  const digest = createHash("sha1").update(input).digest();
  return digest.readUInt32BE(0);
}

function seededRandom(seed: string): () => number {
  let state = hashInt(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseIsoDate(date: string): Date {
  const parts = date.split("-");
  const year = Number.parseInt(parts[0] ?? "1970", 10);
  const month = Number.parseInt(parts[1] ?? "01", 10);
  const day = Number.parseInt(parts[2] ?? "01", 10);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toIsoTimestamp(date: Date, hour = 10): string {
  const copy = new Date(date.getTime());
  copy.setUTCHours(hour, 0, 0, 0);
  return copy.toISOString();
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function monthSeries(endDate: string, monthCount: number): string[] {
  const end = parseIsoDate(endDate);
  const dates: string[] = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const copy = new Date(end.getTime());
    copy.setUTCMonth(copy.getUTCMonth() - index);
    dates.push(toIsoDate(copy));
  }

  return dates;
}

function normalizeWeights(weights: number[]): number[] {
  const sanitized = weights.map((weight) => Math.max(0, weight));
  const total = sanitized.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    return sanitized.map(() => 1 / Math.max(1, sanitized.length));
  }

  return sanitized.map((weight) => weight / total);
}

function allocateByWeight(total: number, weights: number[]): number[] {
  if (total <= 0) {
    return weights.map(() => 0);
  }

  const normalized = normalizeWeights(weights);
  const base = normalized.map((weight) => Math.floor(total * weight));
  let remainder = total - base.reduce((sum, value) => sum + value, 0);

  if (remainder <= 0) {
    return base;
  }

  const priority = normalized
    .map((weight, index) => ({ index, weight }))
    .sort((left, right) => right.weight - left.weight)
    .map((entry) => entry.index);

  let pointer = 0;
  while (remainder > 0 && priority.length > 0) {
    const targetIndex = priority[pointer % priority.length];
    if (targetIndex === undefined) {
      break;
    }

    base[targetIndex] = (base[targetIndex] ?? 0) + 1;
    pointer += 1;
    remainder -= 1;
  }

  return base;
}

function moneyRound(value: number): number {
  return Math.round(value / 100) * 100;
}

function toSignedValue(totalValue: number, accountType: AccountType): number {
  if (accountType === "mortgage" || accountType === "loan") {
    return -Math.abs(totalValue);
  }

  return Math.abs(totalValue);
}

function createSummary(): DemoVariantSummary {
  return {
    households: 0,
    accounts: 0,
    holdings: 0,
    transactions: 0,
    timelineEntries: 0,
    lifeEvents: 0,
    accountSnapshots: 0,
    householdSnapshots: 0,
    fitnessScores: 0,
    quarterlyReviews: 0,
  };
}

function createSummaryByVariant(): Record<DemoVariant, DemoVariantSummary> {
  return {
    standard: createSummary(),
    fire: createSummary(),
    fam_family: createSummary(),
    friendly_family: createSummary(),
  };
}

function fitComponents(totalScore: number, seed: string): {
  buffer: number;
  growth: number;
  protection: number;
  efficiency: number;
  trajectory: number;
} {
  const random = seededRandom(seed);
  const weights = [0.22, 0.24, 0.18, 0.19, 0.17];
  const values = weights.map((weight) => {
    const jitter = Math.round((random() - 0.5) * 18);
    return clampInt(Math.round(totalScore * weight) + jitter, 0, 200);
  });

  let sum = values.reduce((accumulator, value) => accumulator + value, 0);
  let delta = totalScore - sum;

  while (delta !== 0) {
    let adjusted = false;
    for (let index = 0; index < values.length; index += 1) {
      const current = values[index];
      if (current === undefined) {
        continue;
      }

      if (delta > 0 && current < 200) {
        values[index] = current + 1;
        delta -= 1;
        adjusted = true;
      } else if (delta < 0 && current > 0) {
        values[index] = current - 1;
        delta += 1;
        adjusted = true;
      }

      if (delta === 0) {
        break;
      }
    }

    if (!adjusted) {
      break;
    }
  }

  sum = values.reduce((accumulator, value) => accumulator + value, 0);
  if (sum !== totalScore) {
    const correction = totalScore - sum;
    values[0] = clampInt((values[0] ?? 0) + correction, 0, 200);
  }

  return {
    buffer: values[0] ?? 0,
    growth: values[1] ?? 0,
    protection: values[2] ?? 0,
    efficiency: values[3] ?? 0,
    trajectory: values[4] ?? 0,
  };
}

function weakestFitnessComponents(scores: {
  buffer: number;
  growth: number;
  protection: number;
  efficiency: number;
  trajectory: number;
}): FitnessComponent[] {
  const entries: Array<{ component: FitnessComponent; score: number }> = [
    { component: "buffer", score: scores.buffer },
    { component: "growth", score: scores.growth },
    { component: "protection", score: scores.protection },
    { component: "efficiency", score: scores.efficiency },
    { component: "trajectory", score: scores.trajectory },
  ];

  return entries
    .sort((left, right) => left.score - right.score)
    .slice(0, 2)
    .map((entry) => entry.component);
}

function createSuggestedAction(component: FitnessComponent, variant: DemoVariant): Record<string, string> {
  switch (component) {
    case "buffer":
      return {
        component,
        title: "Increase buffer automation",
        impact: "Improves resilience score by reducing short-term liquidity risk.",
        description: `Add one extra monthly transfer to cash reserves for ${variant.replace("_", " ")} planning.`,
      };
    case "growth":
      return {
        component,
        title: "Raise equity contribution",
        impact: "Strengthens long-term compounding and expected growth trajectory.",
        description: "Route future contributions to low-fee global index exposures.",
      };
    case "protection":
      return {
        component,
        title: "Refresh insurance coverage",
        impact: "Reduces downside vulnerability for key household scenarios.",
        description: "Validate disability, life, and liability limits against current obligations.",
      };
    case "efficiency":
      return {
        component,
        title: "Cut fee drag",
        impact: "Improves retention of market returns after expenses and taxes.",
        description: "Consolidate overlapping funds and prioritize lower total expense ratios.",
      };
    case "trajectory":
      return {
        component,
        title: "Review monthly trend",
        impact: "Improves consistency between monthly behavior and long-term outcomes.",
        description: "Close execution gaps by automating transfers and quarterly rebalance checks.",
      };
    default:
      return {
        component: "trajectory",
        title: "Review plan cadence",
        impact: "Improves trend consistency.",
        description: "Schedule recurring finance check-ins.",
      };
  }
}

function buildLifeEventTimelineDate(targetDate: string, status: LifeEventStatus): string {
  const target = parseIsoDate(targetDate);
  if (status === "completed") {
    return toIsoDate(addDays(target, -210));
  }

  return toIsoDate(addDays(target, -120));
}

function nearestNetWorth(
  snapshots: DemoHouseholdSnapshotRow[],
  date: string,
  mode: "on_or_before" | "on_or_after",
): number {
  if (snapshots.length === 0) {
    return 0;
  }

  if (mode === "on_or_before") {
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      const row = snapshots[index];
      if (!row) {
        continue;
      }

      if (row.snapshot_date <= date) {
        return row.total_net_worth;
      }
    }

    return snapshots[0]?.total_net_worth ?? 0;
  }

  for (const row of snapshots) {
    if (row.snapshot_date >= date) {
      return row.total_net_worth;
    }
  }

  return snapshots[snapshots.length - 1]?.total_net_worth ?? 0;
}

function nearestFitnessScore(scores: DemoFitnessScoreRow[], date: string): number {
  if (scores.length === 0) {
    return 0;
  }

  for (let index = scores.length - 1; index >= 0; index -= 1) {
    const row = scores[index];
    if (!row) {
      continue;
    }

    if (row.calculated_at <= date) {
      return row.total_score;
    }
  }

  return scores[0]?.total_score ?? 0;
}

function ensureDateSeriesAvailable(series: string[]): string {
  const last = series[series.length - 1];
  if (!last) {
    throw new Error("Expected non-empty date series");
  }

  return last;
}

export function buildDemoSeedDataset(): DemoSeedDataset {
  const createdAtBase = new Date(BASE_TIMESTAMP);
  const snapshotDates = monthSeries(SNAPSHOT_END_DATE, SNAPSHOT_MONTHS);
  const fitnessDates = monthSeries(SNAPSHOT_END_DATE, FITNESS_MONTHS);
  const asOfDate = ensureDateSeriesAvailable(snapshotDates);
  const fallbackTemplate = timelineTemplatesByVariant.standard[0] ?? {
    entryType: "note" as const,
    category: "other" as const,
    title: "Seeded timeline entry",
    description: "Synthetic timeline placeholder entry.",
  };

  const users: DemoSeedUser[] = userSpecs.map((spec) => {
    return {
      id: deterministicUuid(`user:${spec.key}`),
      email: spec.email,
      display_name: spec.displayName,
    };
  });

  const userByKey = new Map<string, DemoSeedUser>();
  for (const user of users) {
    const key = userSpecs.find((spec) => spec.email === user.email)?.key;
    if (!key) {
      continue;
    }

    userByKey.set(key, user);
  }

  const authUsers: DemoAuthUserRow[] = [];
  const profiles: DemoProfileRow[] = [];

  for (const [index, spec] of userSpecs.entries()) {
    const user = userByKey.get(spec.key);
    if (!user) {
      throw new Error(`Missing user mapping for ${spec.key}`);
    }

    const createdAt = toIsoTimestamp(addDays(createdAtBase, -400 + index * 3), 9);

    authUsers.push({
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      encrypted_password: "",
      email_confirmed_at: createdAt,
      raw_app_meta_data: {
        provider: "email",
        providers: ["email"],
        seeded: true,
      },
      raw_user_meta_data: {
        display_name: user.display_name,
        seeded: true,
      },
      created_at: createdAt,
      updated_at: createdAt,
    });

    profiles.push({
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      base_currency: "SEK",
      locale: "en",
      onboarding_completed: true,
      is_demo_user: true,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  const households: DemoHouseholdRow[] = [];
  const householdMembers: DemoHouseholdMemberRow[] = [];
  const householdIdByKey = new Map<string, string>();

  for (const [index, plan] of householdPlans.entries()) {
    const createdBy = userByKey.get(plan.createdByKey);
    if (!createdBy) {
      throw new Error(`Missing createdBy user ${plan.createdByKey}`);
    }

    const createdAt = toIsoTimestamp(addDays(createdAtBase, -380 + index * 5), 10);
    const householdId = deterministicUuid(`household:${plan.key}`);
    householdIdByKey.set(plan.key, householdId);

    households.push({
      id: householdId,
      name: plan.name,
      type: plan.type,
      base_currency: "SEK",
      is_demo: true,
      demo_variant: plan.variant,
      created_by: createdBy.id,
      created_at: createdAt,
      updated_at: createdAt,
    });

    for (const membership of plan.members) {
      const member = userByKey.get(membership.userKey);
      if (!member) {
        throw new Error(`Missing member user ${membership.userKey}`);
      }

      const joinedAt = toIsoTimestamp(addDays(createdAtBase, -360 + index * 4), 11);
      householdMembers.push({
        id: deterministicUuid(`member:${plan.key}:${membership.userKey}`),
        household_id: householdId,
        user_id: member.id,
        role: membership.role,
        status: "active",
        invited_email: null,
        invited_at: null,
        joined_at: joinedAt,
        created_at: joinedAt,
        updated_at: joinedAt,
      });
    }
  }

  const instruments: DemoInstrumentRow[] = instrumentSpecs.map((spec, index) => {
    const priceAt = toIsoTimestamp(addDays(createdAtBase, -30 - index), 16);
    return {
      id: deterministicUuid(`instrument:${spec.key}`),
      isin: spec.isin,
      ticker: spec.ticker,
      name: spec.name,
      asset_class: spec.assetClass,
      currency: spec.currency,
      exchange: spec.exchange,
      country: spec.country,
      sector: spec.sector,
      last_price: spec.lastPriceMinor,
      last_price_at: priceAt,
      price_source: spec.priceSource,
      created_at: toIsoTimestamp(addDays(createdAtBase, -450 + index), 9),
      updated_at: priceAt,
    };
  });

  const instrumentByKey = new Map<string, DemoInstrumentRow>();
  for (const spec of instrumentSpecs) {
    const row = instruments.find((instrument) => instrument.id === deterministicUuid(`instrument:${spec.key}`));
    if (!row) {
      continue;
    }

    instrumentByKey.set(spec.key, row);
  }

  const accounts: DemoAccountRow[] = [];
  const accountPlanById = new Map<string, AccountPlan>();
  const accountToHousehold = new Map<string, string>();
  const accountCreationDate = new Map<string, string>();

  for (const plan of householdPlans) {
    const householdId = householdIdByKey.get(plan.key);
    if (!householdId) {
      throw new Error(`Missing household id for ${plan.key}`);
    }

    for (const [index, accountPlan] of plan.accounts.entries()) {
      const owner = userByKey.get(accountPlan.ownerKey);
      if (!owner) {
        throw new Error(`Missing account owner ${accountPlan.ownerKey}`);
      }

      const accountId = deterministicUuid(`account:${plan.key}:${accountPlan.key}`);
      const createdDate = addDays(parseIsoDate(snapshotDates[0] ?? SNAPSHOT_END_DATE), -20 + index);
      const createdAt = toIsoTimestamp(createdDate, 9);
      const syncAt = toIsoTimestamp(parseIsoDate(asOfDate), 7 + (index % 4));

      accounts.push({
        id: accountId,
        household_id: householdId,
        owner_user_id: owner.id,
        provider_id: accountPlan.providerId,
        provider_name: accountPlan.providerName,
        name: accountPlan.name,
        account_type: accountPlan.accountType,
        wrapper_type: accountPlan.wrapperType,
        currency: "SEK",
        visibility: accountPlan.visibility,
        external_id: `demo-${accountPlan.key}`,
        last_synced: syncAt,
        sync_source: accountPlan.syncSource,
        is_active: true,
        notes: `Demo seeded account for ${plan.variant}`,
        created_at: createdAt,
        updated_at: syncAt,
      });

      accountPlanById.set(accountId, accountPlan);
      accountToHousehold.set(accountId, householdId);
      accountCreationDate.set(accountId, createdAt);
    }
  }

  const accountSnapshots: DemoAccountSnapshotRow[] = [];
  const holdings: DemoHoldingRow[] = [];
  const transactions: DemoTransactionRow[] = [];

  const accountSnapshotValueMap = new Map<string, number[]>();

  for (const account of accounts) {
    const plan = accountPlanById.get(account.id);
    if (!plan) {
      throw new Error(`Missing account plan for ${account.id}`);
    }

    const random = seededRandom(`snapshot:${account.id}`);
    const values: number[] = [];

    for (const [index, snapshotDate] of snapshotDates.entries()) {
      const seasonality = Math.sin((index / 12) * Math.PI * 2) * plan.volatilityMinor * 0.35;
      const noise = (random() - 0.5) * plan.volatilityMinor;
      const projected = plan.baseValueMinor + plan.monthlyDeltaMinor * index + seasonality + noise;
      const value = Math.max(plan.minValueMinor, moneyRound(projected));
      values.push(value);

      accountSnapshots.push({
        id: deterministicUuid(`account-snapshot:${account.id}:${snapshotDate}`),
        account_id: account.id,
        snapshot_date: snapshotDate,
        total_value: value,
        cash_balance: 0,
        currency: "SEK",
        created_at: toIsoTimestamp(parseIsoDate(snapshotDate), 6),
      });
    }

    accountSnapshotValueMap.set(account.id, values);

    const latestValue = values[values.length - 1] ?? plan.minValueMinor;
    const mix = plan.holdingMix;
    const allocatedValues = allocateByWeight(
      Math.max(latestValue, mix.length),
      mix.map((entry) => entry.weight),
    );

    const holdingRows: DemoHoldingRow[] = [];

    for (const [index, mixEntry] of mix.entries()) {
      const instrument = instrumentByKey.get(mixEntry.instrumentKey);
      if (!instrument) {
        throw new Error(`Missing instrument ${mixEntry.instrumentKey}`);
      }

      const marketValue = allocatedValues[index] ?? 0;
      const price = Math.max(1, instrument.last_price);
      const quantity = (marketValue / price).toFixed(8);
      const costDrift = 0.88 + seededRandom(`holding-cost:${account.id}:${index}`)() * 0.2;
      const averageCost = Math.max(1, moneyRound(price * costDrift));

      const createdAt = accountCreationDate.get(account.id) ?? toIsoTimestamp(createdAtBase, 9);
      const holdingRow: DemoHoldingRow = {
        id: deterministicUuid(`holding:${account.id}:${instrument.id}`),
        account_id: account.id,
        instrument_id: instrument.id,
        quantity,
        average_cost: averageCost,
        cost_currency: "SEK",
        market_value: marketValue,
        value_currency: "SEK",
        as_of_date: asOfDate,
        source: "manual",
        created_at: createdAt,
        updated_at: toIsoTimestamp(parseIsoDate(asOfDate), 8),
      };

      holdings.push(holdingRow);
      holdingRows.push(holdingRow);
    }

    const primaryHolding = holdingRows[0] ?? null;
    const investableHoldings = holdingRows.filter((row) => {
      const instrument = instruments.find((entry) => entry.id === row.instrument_id);
      if (!instrument) {
        return false;
      }

      return instrument.asset_class !== "cash" && instrument.asset_class !== "other";
    });

    const transactionSource: "manual" | "csv" = account.sync_source === "csv" ? "csv" : "manual";

    for (const [monthIndex, monthDate] of snapshotDates.entries()) {
      const jitterRng = seededRandom(`txn:${account.id}:${monthDate}`);
      const flowJitter = (jitterRng() - 0.5) * 0.18;
      const flow = moneyRound(Math.max(5000, plan.monthlyFlowMinor * (1 + flowJitter)));

      const createTransaction = (
        localKey: string,
        type: DemoTransactionRow["type"],
        amount: number,
        instrumentId: string | null,
        description: string,
        quantity: string | null = null,
        price: number | null = null,
        settlementOffsetDays: number | null = null,
      ): DemoTransactionRow => {
        const transactionDate = toIsoDate(addDays(parseIsoDate(monthDate), 2 + (monthIndex % 3)));
        const createdAt = toIsoTimestamp(parseIsoDate(transactionDate), 12);
        const settlementDate =
          settlementOffsetDays === null ? null : toIsoDate(addDays(parseIsoDate(transactionDate), settlementOffsetDays));

        return {
          id: deterministicUuid(`transaction:${account.id}:${localKey}:${monthIndex}`),
          account_id: account.id,
          instrument_id: instrumentId,
          type,
          quantity,
          price,
          amount,
          currency: "SEK",
          fee_amount: 0,
          fee_currency: null,
          fx_rate: null,
          fx_amount: null,
          fx_currency: null,
          transaction_date: transactionDate,
          settlement_date: settlementDate,
          description,
          external_ref: `demo-${account.id}-${localKey}-${monthIndex}`,
          source: transactionSource,
          created_at: createdAt,
          updated_at: createdAt,
        };
      };

      if (plan.transactionPattern === "investment") {
        transactions.push(
          createTransaction("deposit", "deposit", Math.abs(flow), null, "Monthly transfer to investment account"),
        );

        const buyHolding = investableHoldings[monthIndex % Math.max(1, investableHoldings.length)] ?? primaryHolding;
        if (buyHolding) {
          const buyInstrument = instruments.find((instrument) => instrument.id === buyHolding.instrument_id);
          const buyPrice = buyInstrument?.last_price ?? 20_000;
          const buyAmount = -Math.abs(moneyRound(flow * 0.92));
          const buyQuantity = (Math.abs(buyAmount) / Math.max(1, buyPrice)).toFixed(8);

          transactions.push(
            createTransaction(
              "buy",
              "buy",
              buyAmount,
              buyHolding.instrument_id,
              "Automated monthly buy",
              buyQuantity,
              buyPrice,
              2,
            ),
          );
        }

        if (monthIndex % 3 === 0 && primaryHolding) {
          transactions.push(
            createTransaction(
              "dividend",
              "dividend",
              Math.abs(moneyRound(flow * 0.18)),
              primaryHolding.instrument_id,
              "Quarterly dividend distribution",
            ),
          );
        }

        if (monthIndex % 6 === 2 && primaryHolding) {
          const sellInstrument = instruments.find((instrument) => instrument.id === primaryHolding.instrument_id);
          const sellPrice = sellInstrument?.last_price ?? 20_000;
          const sellAmount = Math.abs(moneyRound(flow * 0.68));
          const sellQuantity = (sellAmount / Math.max(1, sellPrice)).toFixed(8);
          transactions.push(
            createTransaction(
              "sell",
              "sell",
              sellAmount,
              primaryHolding.instrument_id,
              "Partial profit-taking",
              sellQuantity,
              sellPrice,
              2,
            ),
          );
        }

        if (monthIndex % 6 === 4) {
          transactions.push(
            createTransaction(
              "fee",
              "fee",
              -Math.abs(moneyRound(flow * 0.05)),
              null,
              "Platform and fund fee",
            ),
          );
        }
      }

      if (plan.transactionPattern === "savings") {
        transactions.push(createTransaction("deposit", "deposit", Math.abs(flow), null, "Monthly savings transfer"));

        transactions.push(
          createTransaction(
            "interest",
            "interest",
            Math.abs(moneyRound(flow * 0.025)),
            null,
            "Monthly interest accrual",
          ),
        );

        if (monthIndex % 4 === 1) {
          transactions.push(
            createTransaction(
              "withdrawal",
              "withdrawal",
              -Math.abs(moneyRound(flow * 0.62)),
              null,
              "Planned household withdrawal",
            ),
          );
        }
      }

      if (plan.transactionPattern === "mortgage") {
        transactions.push(
          createTransaction(
            "withdrawal",
            "withdrawal",
            -Math.abs(moneyRound(flow * 0.95)),
            null,
            "Monthly amortization payment",
          ),
        );
        transactions.push(
          createTransaction(
            "interest",
            "interest",
            -Math.abs(moneyRound(flow * 0.58)),
            null,
            "Mortgage interest cost",
          ),
        );
      }

      if (plan.transactionPattern === "pension") {
        transactions.push(
          createTransaction("deposit", "deposit", Math.abs(flow), null, "Pension contribution"),
        );

        if (monthIndex % 2 === 0 && primaryHolding) {
          const buyInstrument = instruments.find((instrument) => instrument.id === primaryHolding.instrument_id);
          const buyPrice = buyInstrument?.last_price ?? 20_000;
          const buyAmount = -Math.abs(moneyRound(flow * 0.9));
          const buyQuantity = (Math.abs(buyAmount) / Math.max(1, buyPrice)).toFixed(8);

          transactions.push(
            createTransaction(
              "buy",
              "buy",
              buyAmount,
              primaryHolding.instrument_id,
              "Periodic pension fund purchase",
              buyQuantity,
              buyPrice,
              2,
            ),
          );
        }

        if (monthIndex % 6 === 5) {
          transactions.push(
            createTransaction(
              "fee",
              "fee",
              -Math.abs(moneyRound(flow * 0.07)),
              null,
              "Pension administration fee",
            ),
          );
        }
      }

      if (plan.transactionPattern === "insurance") {
        if (monthIndex % 2 === 0) {
          transactions.push(
            createTransaction(
              "deposit",
              "deposit",
              Math.abs(moneyRound(flow * 0.7)),
              null,
              "Insurance reserve contribution",
            ),
          );
        }

        transactions.push(
          createTransaction(
            "fee",
            "fee",
            -Math.abs(moneyRound(flow * 0.16)),
            null,
            "Insurance premium",
          ),
        );

        if (monthIndex % 12 === 11) {
          transactions.push(
            createTransaction(
              "tax",
              "tax",
              -Math.abs(moneyRound(flow * 0.22)),
              null,
              "Annual insurance tax adjustment",
            ),
          );
        }
      }
    }
  }

  const householdSnapshots: DemoHouseholdSnapshotRow[] = [];
  const householdSnapshotByHousehold = new Map<string, DemoHouseholdSnapshotRow[]>();

  for (const household of households) {
    const rows: DemoHouseholdSnapshotRow[] = [];
    const householdAccounts = accounts.filter((account) => account.household_id === household.id);

    for (const snapshotDate of snapshotDates) {
      let totalAssets = 0;
      let totalLiabilities = 0;

      for (const account of householdAccounts) {
        const accountPlan = accountPlanById.get(account.id);
        if (!accountPlan) {
          continue;
        }

        const valueSeries = accountSnapshotValueMap.get(account.id);
        if (!valueSeries) {
          continue;
        }

        const monthIndex = snapshotDates.indexOf(snapshotDate);
        const rawValue = valueSeries[monthIndex] ?? 0;
        const signed = toSignedValue(rawValue, accountPlan.accountType);

        if (signed >= 0) {
          totalAssets += signed;
        } else {
          totalLiabilities += Math.abs(signed);
        }
      }

      const totalNetWorth = totalAssets - totalLiabilities;
      const row: DemoHouseholdSnapshotRow = {
        id: deterministicUuid(`household-snapshot:${household.id}:${snapshotDate}`),
        household_id: household.id,
        snapshot_date: snapshotDate,
        total_net_worth: totalNetWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        currency: "SEK",
        created_at: toIsoTimestamp(parseIsoDate(snapshotDate), 6),
      };

      householdSnapshots.push(row);
      rows.push(row);
    }

    householdSnapshotByHousehold.set(household.id, rows);
  }

  const timelineEntries: DemoTimelineEntryRow[] = [];
  const lifeEvents: DemoLifeEventRow[] = [];
  const playbookActions: DemoPlaybookActionRow[] = [];

  for (const plan of householdPlans) {
    const householdId = householdIdByKey.get(plan.key);
    if (!householdId) {
      throw new Error(`Missing household id for ${plan.key}`);
    }

    const memberIds = householdMembers
      .filter((member) => member.household_id === householdId)
      .map((member) => member.user_id);
    const creatorId = userByKey.get(plan.createdByKey)?.id;

    if (!creatorId) {
      throw new Error(`Missing creator id for ${plan.key}`);
    }

    const householdAccountIds = accounts
      .filter((account) => account.household_id === householdId)
      .map((account) => account.id);

    const eventTimelineIds: string[] = [];

    for (const eventPlan of plan.lifeEvents) {
      const eventId = deterministicUuid(`life-event:${plan.key}:${eventPlan.key}`);
      const timelineId = deterministicUuid(`timeline:event:${plan.key}:${eventPlan.key}`);
      eventTimelineIds.push(timelineId);

      const timelineDate = buildLifeEventTimelineDate(eventPlan.targetDate, eventPlan.status);
      const timelineCreatedBy = userByKey.get(eventPlan.triggeredByKey)?.id ?? creatorId;
      const isFuture = eventPlan.targetDate > SNAPSHOT_END_DATE;

      timelineEntries.push({
        id: timelineId,
        household_id: householdId,
        created_by: timelineCreatedBy,
        entry_type: "life_event",
        category: eventPlan.category,
        title: eventPlan.title,
        description: eventPlan.impactSummary,
        reasoning: "Life-event driven planning item seeded for demo scenario coverage.",
        expected_outcome:
          eventPlan.status === "completed"
            ? "Life event outcomes captured and reflected in household plan."
            : "Action plan active with impact checkpoints and owners assigned.",
        linked_account_ids: householdAccountIds.slice(0, Math.min(2, householdAccountIds.length)),
        linked_proposal_id: null,
        linked_review_id: null,
        linked_event_id: null,
        entry_date: timelineDate,
        is_future: isFuture,
        metadata: {
          variant: plan.variant,
          eventType: eventPlan.eventType,
          seeded: true,
        },
        created_at: toIsoTimestamp(parseIsoDate(timelineDate), 10),
        updated_at: toIsoTimestamp(parseIsoDate(timelineDate), 10),
      });

      lifeEvents.push({
        id: eventId,
        household_id: householdId,
        triggered_by: timelineCreatedBy,
        event_type: eventPlan.eventType,
        title: eventPlan.title,
        status: eventPlan.status,
        inputs: eventPlan.inputs,
        impact_summary: eventPlan.impactSummary,
        impact_data: eventPlan.impactData,
        target_date: eventPlan.targetDate,
        completed_at: eventPlan.status === "completed" ? toIsoTimestamp(parseIsoDate(eventPlan.targetDate), 14) : null,
        timeline_entry_id: timelineId,
        created_at: toIsoTimestamp(parseIsoDate(timelineDate), 11),
        updated_at: toIsoTimestamp(parseIsoDate(timelineDate), 11),
      });

      for (const [actionIndex, actionPlan] of eventPlan.actions.entries()) {
        const assignedTo = actionPlan.assignedToKey ? userByKey.get(actionPlan.assignedToKey)?.id ?? null : null;
        const completedAt =
          actionPlan.status === "completed" ? toIsoTimestamp(parseIsoDate(timelineDate), 15) : null;

        playbookActions.push({
          id: deterministicUuid(`playbook:${plan.key}:${eventPlan.key}:${actionIndex}`),
          life_event_id: eventId,
          title: actionPlan.title,
          description: actionPlan.description,
          category: actionPlan.category,
          priority: actionPlan.priority,
          sort_order: actionIndex,
          assigned_to: assignedTo,
          status: actionPlan.status,
          estimated_impact_amount: moneyRound(45_000_00 + actionIndex * 12_000_00),
          estimated_impact_description: "Estimated positive long-term effect on risk-adjusted household net worth.",
          completed_at: completedAt,
          completion_notes: actionPlan.status === "completed" ? "Completed during seeded historical period." : null,
          created_at: toIsoTimestamp(parseIsoDate(timelineDate), 12),
          updated_at: toIsoTimestamp(parseIsoDate(timelineDate), 12),
        });
      }
    }

    const templates = timelineTemplatesByVariant[plan.variant] ?? timelineTemplatesByVariant.standard;
    const remainingTimelineEntries = Math.max(0, plan.timelineCount - eventTimelineIds.length);

    for (let index = 0; index < remainingTimelineEntries; index += 1) {
      const template = templates[index % Math.max(1, templates.length)] ?? fallbackTemplate;
      const dateIndex = Math.floor((index * Math.max(1, snapshotDates.length - 1)) / Math.max(1, remainingTimelineEntries));
      const entryDate = snapshotDates[Math.min(snapshotDates.length - 1, dateIndex)] ?? SNAPSHOT_END_DATE;

      const actor = memberIds[index % Math.max(1, memberIds.length)] ?? creatorId;
      const linkedIds = householdAccountIds.length === 0 || index % 3 !== 0 ? null : [householdAccountIds[index % householdAccountIds.length] ?? householdAccountIds[0]!];

      timelineEntries.push({
        id: deterministicUuid(`timeline:generic:${plan.key}:${index}`),
        household_id: householdId,
        created_by: actor,
        entry_type: template.entryType,
        category: template.category,
        title: `${template.title} (${index + 1})`,
        description: template.description,
        reasoning: "Seeded timeline narrative to provide realistic historical context.",
        expected_outcome: "Supports retrospective reviews and household decision traceability.",
        linked_account_ids: linkedIds,
        linked_proposal_id: null,
        linked_review_id: null,
        linked_event_id: null,
        entry_date: entryDate,
        is_future: false,
        metadata: {
          variant: plan.variant,
          seeded: true,
          sequence: index + 1,
        },
        created_at: toIsoTimestamp(parseIsoDate(entryDate), 10),
        updated_at: toIsoTimestamp(parseIsoDate(entryDate), 10),
      });
    }
  }

  const fitnessScores: DemoFitnessScoreRow[] = [];
  const fitnessByHousehold = new Map<string, DemoFitnessScoreRow[]>();

  for (const plan of householdPlans) {
    const householdId = householdIdByKey.get(plan.key);
    if (!householdId) {
      throw new Error(`Missing household id for fitness plan ${plan.key}`);
    }

    const rows: DemoFitnessScoreRow[] = [];
    const rng = seededRandom(`fitness:${householdId}`);

    for (const [index, calculatedAt] of fitnessDates.entries()) {
      const trend = plan.fitnessTrend * index;
      const noise = Math.round((rng() - 0.5) * 20);
      const totalScore = clampInt(plan.fitnessBase + trend + noise, 430, 900);
      const components = fitComponents(totalScore, `fitness-components:${householdId}:${calculatedAt}`);
      const weakComponents = weakestFitnessComponents(components);

      const row: DemoFitnessScoreRow = {
        id: deterministicUuid(`fitness:${householdId}:${calculatedAt}`),
        household_id: householdId,
        total_score: totalScore,
        buffer_score: components.buffer,
        growth_score: components.growth,
        protection_score: components.protection,
        efficiency_score: components.efficiency,
        trajectory_score: components.trajectory,
        component_details: {
          variant: plan.variant,
          trendDirection: plan.fitnessTrend >= 0 ? "improving" : "flat",
          monthlyExpensesEstimate: moneyRound(38_000_00 + rng() * 14_000_00),
          liquidMonths: Number((4 + rng() * 6).toFixed(1)),
          ai: {
            fitnessExplanationSource: "fallback",
          },
        },
        explanation: `Seeded ${plan.variant.replace("_", " ")} household fitness score with stable upward trajectory.`,
        suggested_actions: weakComponents.map((component) => createSuggestedAction(component, plan.variant)),
        calculated_at: calculatedAt,
        created_at: toIsoTimestamp(parseIsoDate(calculatedAt), 7),
      };

      fitnessScores.push(row);
      rows.push(row);
    }

    fitnessByHousehold.set(householdId, rows);
  }

  const quarterlyReviews: DemoQuarterlyReviewRow[] = [];

  const quarterDefinitions = [
    { label: "Q1 2025", start: "2025-01-01", end: "2025-03-31" },
    { label: "Q2 2025", start: "2025-04-01", end: "2025-06-30" },
    { label: "Q3 2025", start: "2025-07-01", end: "2025-09-30" },
    { label: "Q4 2025", start: "2025-10-01", end: "2025-12-31" },
  ];

  for (const plan of householdPlans) {
    const householdId = householdIdByKey.get(plan.key);
    if (!householdId) {
      throw new Error(`Missing household id for review plan ${plan.key}`);
    }

    const householdSnapshotRows = householdSnapshotByHousehold.get(householdId) ?? [];
    const householdFitnessRows = fitnessByHousehold.get(householdId) ?? [];

    for (const quarter of quarterDefinitions) {
      const netWorthStart = nearestNetWorth(householdSnapshotRows, quarter.start, "on_or_after");
      const netWorthEnd = nearestNetWorth(householdSnapshotRows, quarter.end, "on_or_before");
      const netWorthChange = netWorthEnd - netWorthStart;

      const marketReturnsAmount = moneyRound(netWorthChange * 0.52);
      const netSavingsAmount = moneyRound(netWorthChange * 0.34);
      const debtReductionAmount = Math.max(0, moneyRound(netWorthChange * 0.12));
      const feesDragAmount = Math.max(0, moneyRound(Math.abs(netWorthChange) * 0.03));
      const fitnessScore = nearestFitnessScore(householdFitnessRows, quarter.end);
      const components = fitComponents(fitnessScore, `review-components:${householdId}:${quarter.label}`);

      const eventRows = lifeEvents
        .filter((event) => event.household_id === householdId && event.target_date > quarter.end)
        .slice(0, 2)
        .map((event) => ({
          type: event.event_type,
          title: event.title,
          targetDate: event.target_date,
        }));

      quarterlyReviews.push({
        id: deterministicUuid(`review:${householdId}:${quarter.label}`),
        household_id: householdId,
        period_start: quarter.start,
        period_end: quarter.end,
        quarter_label: quarter.label,
        net_worth_start: netWorthStart,
        net_worth_end: netWorthEnd,
        net_worth_change: netWorthChange,
        market_returns_amount: marketReturnsAmount,
        net_savings_amount: netSavingsAmount,
        debt_reduction_amount: debtReductionAmount,
        fees_drag_amount: feesDragAmount,
        narrative: `Seeded quarterly review for ${plan.name} covering ${quarter.label} with realistic attribution splits.`,
        recommendations: [
          {
            title: "Automate contribution cadence",
            impact: "Improves consistency of net savings contributions",
          },
          {
            title: "Tighten fee budget",
            impact: "Reduces drag on compounded return",
          },
          {
            title: "Review downside scenarios",
            impact: "Strengthens resilience under market stress",
          },
        ],
        fitness_score: fitnessScore,
        fitness_components: {
          buffer: components.buffer,
          growth: components.growth,
          protection: components.protection,
          efficiency: components.efficiency,
          trajectory: components.trajectory,
        },
        upcoming_events: eventRows,
        status: "published",
        generated_at: toIsoTimestamp(addDays(parseIsoDate(quarter.end), 7), 9),
        published_at: toIsoTimestamp(addDays(parseIsoDate(quarter.end), 8), 9),
        timeline_entry_id: null,
        created_at: toIsoTimestamp(addDays(parseIsoDate(quarter.end), 7), 9),
        updated_at: toIsoTimestamp(addDays(parseIsoDate(quarter.end), 8), 9),
      });
    }
  }

  const expectedByVariant = createSummaryByVariant();
  const totals = createSummary();

  const variantByHouseholdId = new Map<string, DemoVariant>();
  for (const household of households) {
    variantByHouseholdId.set(household.id, household.demo_variant);
  }

  const variantByAccountId = new Map<string, DemoVariant>();
  for (const account of accounts) {
    const variant = variantByHouseholdId.get(account.household_id);
    if (!variant) {
      continue;
    }

    variantByAccountId.set(account.id, variant);
  }

  for (const household of households) {
    const summary = expectedByVariant[household.demo_variant];
    summary.households += 1;
  }

  for (const account of accounts) {
    const variant = variantByAccountId.get(account.id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].accounts += 1;
  }

  for (const holding of holdings) {
    const variant = variantByAccountId.get(holding.account_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].holdings += 1;
  }

  for (const transaction of transactions) {
    const variant = variantByAccountId.get(transaction.account_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].transactions += 1;
  }

  for (const snapshot of accountSnapshots) {
    const variant = variantByAccountId.get(snapshot.account_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].accountSnapshots += 1;
  }

  for (const snapshot of householdSnapshots) {
    const variant = variantByHouseholdId.get(snapshot.household_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].householdSnapshots += 1;
  }

  for (const entry of timelineEntries) {
    const variant = variantByHouseholdId.get(entry.household_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].timelineEntries += 1;
  }

  for (const event of lifeEvents) {
    const variant = variantByHouseholdId.get(event.household_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].lifeEvents += 1;
  }

  for (const row of fitnessScores) {
    const variant = variantByHouseholdId.get(row.household_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].fitnessScores += 1;
  }

  for (const row of quarterlyReviews) {
    const variant = variantByHouseholdId.get(row.household_id);
    if (!variant) {
      continue;
    }

    expectedByVariant[variant].quarterlyReviews += 1;
  }

  for (const variant of demoVariants) {
    const summary = expectedByVariant[variant];
    totals.households += summary.households;
    totals.accounts += summary.accounts;
    totals.holdings += summary.holdings;
    totals.transactions += summary.transactions;
    totals.timelineEntries += summary.timelineEntries;
    totals.lifeEvents += summary.lifeEvents;
    totals.accountSnapshots += summary.accountSnapshots;
    totals.householdSnapshots += summary.householdSnapshots;
    totals.fitnessScores += summary.fitnessScores;
    totals.quarterlyReviews += summary.quarterlyReviews;
  }

  return {
    users,
    authUsers,
    profiles,
    households,
    householdMembers,
    instruments,
    accounts,
    holdings,
    transactions,
    accountSnapshots,
    householdSnapshots,
    timelineEntries,
    lifeEvents,
    playbookActions,
    fitnessScores,
    quarterlyReviews,
    expectedByVariant,
    totals,
  };
}
