# FYRK — Data Model
## Database Schema & Entity Relationships

> **Version:** 0.1
> **Source:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [PRD.md](./PRD.md)
> **ORM:** Drizzle ORM → PostgreSQL 16 (Supabase)
> **Consumed by:** All agents (schema is the single source of truth)

---

## 1. Design Principles

- **All amounts** stored as integers in minor currency units (1 SEK = 100 öre)
- **All dates/times** stored as `timestamptz` (UTC)
- **Soft deletes** via `deleted_at` on mutable user-facing entities; append-only/history tables may be immutable by design
- **Audit columns** on all tables: `created_at`, `updated_at`
- **UUIDs** for all primary keys (Supabase default)
- **snake_case** for all database columns; camelCase in TypeScript types
- **Row-Level Security (RLS)** enforced on all tables — see [SECURITY.md](./SECURITY.md)
- **Multi-tenancy** via `household_id` foreign key (NOT separate schemas)

---

## 2. Entity-Relationship Diagram

```
┌──────────┐     ┌───────────────────┐     ┌──────────────┐
│   User   │────▸│ HouseholdMember   │◂────│  Household   │
└──────────┘  N  └───────────────────┘  N  └──────────────┘
     │                    │                       │
     │                    │              ┌────────┼──────────┐
     │                    │              │        │          │
     │            ┌───────┴──────┐   ┌───┴───┐ ┌─┴────┐ ┌───┴──────┐
     │            │   Account    │   │Review │ │Fitness│ │ Proposal │
     │            └──────┬───────┘   └───────┘ └──────┘ └──────────┘
     │                   │
     │        ┌──────────┼──────────┐
     │        │          │          │
     │   ┌────┴───┐ ┌────┴─────┐ ┌─┴──────────┐
     │   │Holding │ │Transaction│ │AccountSnap │
     │   └────────┘ └──────────┘ └────────────┘
     │
     │   ┌──────────────┐     ┌──────────────┐
     └──▸│TimelineEntry │     │  Instrument  │
         └──────────────┘     └──────────────┘
              │
         ┌────┴─────┐
         │LifeEvent │──▸ PlaybookAction
         └──────────┘

Additional: FamilyLink, Circle, CircleMember
```

---

## 3. Table Definitions

### 3.1 Users & Authentication

```sql
-- Extends Supabase auth.users
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  base_currency TEXT NOT NULL DEFAULT 'SEK',   -- ISO 4217
  locale        TEXT NOT NULL DEFAULT 'en',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  is_demo_user  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
```

### 3.2 Households

```sql
CREATE TABLE public.households (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                 -- "Andersson Family"
  type          TEXT NOT NULL DEFAULT 'household',  -- household | extended_family | circle
  base_currency TEXT NOT NULL DEFAULT 'SEK',
  is_demo       BOOLEAN DEFAULT FALSE,
  demo_variant  TEXT,                          -- standard | fire | fam_family | friendly_family
  created_by    UUID NOT NULL REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE public.household_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member', -- owner | admin | member | viewer
  status        TEXT NOT NULL DEFAULT 'active', -- active | invited | removed
  invited_email TEXT,                           -- for pending invitations
  invited_at    TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_hm_household ON public.household_members(household_id);
CREATE INDEX idx_hm_user ON public.household_members(user_id);
```

### 3.3 Family Links & Circles

```sql
CREATE TABLE public.family_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_household_id UUID NOT NULL REFERENCES public.households(id),
  child_household_id  UUID NOT NULL REFERENCES public.households(id),
  relationship_type   TEXT NOT NULL,           -- parent_child | sibling | extended
  status              TEXT NOT NULL DEFAULT 'pending', -- pending | active | revoked
  sharing_config      JSONB NOT NULL DEFAULT '{}',  -- per-account sharing permissions
  requested_by        UUID NOT NULL REFERENCES public.profiles(id),
  approved_by         UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Circles use the same household table with type='circle'
-- CircleMembers use household_members with additional privacy config
CREATE TABLE public.circle_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES public.households(id),  -- circle ID
  member_user_id  UUID NOT NULL REFERENCES public.profiles(id),
  share_allocation BOOLEAN DEFAULT TRUE,
  share_fitness    BOOLEAN DEFAULT TRUE,
  share_returns    BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(household_id, member_user_id)
);
```

### 3.4 Accounts

```sql
CREATE TABLE public.accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Provider info
  provider_id   TEXT NOT NULL,                 -- avanza | nordnet | seb | nordea | etc.
  provider_name TEXT NOT NULL,                 -- "Avanza"
  
  -- Account details
  name          TEXT NOT NULL,                 -- "ISK Avanza" (user-facing label)
  account_type  TEXT NOT NULL,                 -- investment | savings | pension | loan | mortgage | insurance
  wrapper_type  TEXT,                          -- ISK | KF | depa | PPM | tjanstepension | private_pension | null
  currency      TEXT NOT NULL DEFAULT 'SEK',   -- ISO 4217
  
  -- Privacy
  visibility    TEXT NOT NULL DEFAULT 'full',  -- full | amount_hidden | private
  
  -- Metadata
  external_id   TEXT,                          -- ID in source system (CSV reference, etc.)
  last_synced   TIMESTAMPTZ,
  sync_source   TEXT DEFAULT 'manual',         -- manual | csv | psd2 | fida
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_accounts_household ON public.accounts(household_id);
CREATE INDEX idx_accounts_owner ON public.accounts(owner_user_id);
```

### 3.5 Instruments

```sql
CREATE TABLE public.instruments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isin          TEXT UNIQUE,                   -- International Securities Identification Number
  ticker        TEXT,
  name          TEXT NOT NULL,
  asset_class   TEXT NOT NULL,                 -- equity | fixed_income | fund | etf | cash | real_estate | crypto | other
  currency      TEXT NOT NULL,                 -- ISO 4217
  exchange      TEXT,                          -- XSTO | XHEL | NYSE | etc.
  country       TEXT,                          -- ISO 3166-1 alpha-2
  sector        TEXT,                          -- GICS sector
  
  -- Pricing
  last_price    INTEGER,                       -- minor units of instrument currency
  last_price_at TIMESTAMPTZ,
  price_source  TEXT,                          -- yahoo | manual | imported
  
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instruments_isin ON public.instruments(isin);
CREATE INDEX idx_instruments_ticker ON public.instruments(ticker);
```

### 3.6 Holdings

```sql
CREATE TABLE public.holdings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  instrument_id   UUID NOT NULL REFERENCES public.instruments(id),
  
  quantity        DECIMAL(18, 8) NOT NULL,     -- number of shares/units
  average_cost    INTEGER,                     -- average cost per unit in minor currency units
  cost_currency   TEXT,                        -- currency of avg cost
  market_value    INTEGER,                     -- calculated: quantity × last_price (minor units)
  value_currency  TEXT,                        -- currency of market value
  
  as_of_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  source          TEXT DEFAULT 'manual',       -- manual | csv | api
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_holdings_account ON public.holdings(account_id);
CREATE INDEX idx_holdings_instrument ON public.holdings(instrument_id);
```

### 3.7 Transactions

```sql
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  instrument_id   UUID REFERENCES public.instruments(id),   -- NULL for cash transactions
  
  type            TEXT NOT NULL,               -- buy | sell | dividend | deposit | withdrawal | fee | interest | transfer | tax
  quantity        DECIMAL(18, 8),
  price           INTEGER,                     -- per unit, minor currency units
  amount          INTEGER NOT NULL,            -- total amount, minor currency units
  currency        TEXT NOT NULL,
  
  fee_amount      INTEGER DEFAULT 0,           -- minor currency units
  fee_currency    TEXT,
  
  fx_rate         DECIMAL(12, 6),              -- if cross-currency
  fx_amount       INTEGER,                     -- converted amount
  fx_currency     TEXT,
  
  transaction_date DATE NOT NULL,
  settlement_date  DATE,
  description     TEXT,
  external_ref    TEXT,                         -- reference from source system
  source          TEXT DEFAULT 'manual',        -- manual | csv | api
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_txn_account ON public.transactions(account_id);
CREATE INDEX idx_txn_date ON public.transactions(transaction_date);
CREATE INDEX idx_txn_instrument ON public.transactions(instrument_id);
```

### 3.8 Account Snapshots (for time-series tracking)

```sql
CREATE TABLE public.account_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  
  total_value     INTEGER NOT NULL,            -- total market value, minor units
  cash_balance    INTEGER DEFAULT 0,
  currency        TEXT NOT NULL,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(account_id, snapshot_date)
);

CREATE INDEX idx_snap_account_date ON public.account_snapshots(account_id, snapshot_date);
```

### 3.9 Financial Timeline

```sql
CREATE TABLE public.timeline_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  
  entry_type      TEXT NOT NULL,               -- life_event | decision | milestone | review | system | note
  category        TEXT,                        -- housing | family | career | investment | retirement | other
  title           TEXT NOT NULL,
  description     TEXT,
  
  -- For decisions
  reasoning       TEXT,                        -- why this decision was made
  expected_outcome TEXT,                       -- what the user expects to happen
  
  -- Links
  linked_account_ids  UUID[],                  -- related accounts
  linked_proposal_id  UUID,                    -- if created from a proposal
  linked_review_id    UUID,                    -- if created from a quarterly review
  linked_event_id     UUID,                    -- if part of a life event
  
  entry_date      DATE NOT NULL,
  is_future        BOOLEAN DEFAULT FALSE,       -- for goals/planned events
  
  -- Media
  metadata        JSONB DEFAULT '{}',          -- flexible additional data
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_timeline_household ON public.timeline_entries(household_id);
CREATE INDEX idx_timeline_date ON public.timeline_entries(entry_date);
CREATE INDEX idx_timeline_type ON public.timeline_entries(entry_type);
```

### 3.10 Life Events & Playbooks

```sql
CREATE TABLE public.life_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  triggered_by    UUID NOT NULL REFERENCES public.profiles(id),
  
  event_type      TEXT NOT NULL,               -- buying_apartment | having_child | changing_jobs | inheritance | retirement | marriage | divorce
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active', -- active | completed | cancelled
  
  -- Event-specific inputs (JSON for flexibility)
  inputs          JSONB NOT NULL DEFAULT '{}', -- e.g., { budget: 3500000, city: "Stockholm", timeline: "2026-Q3" }
  
  -- AI-generated content
  impact_summary  TEXT,                        -- AI-generated impact analysis
  impact_data     JSONB,                       -- structured impact metrics
  
  target_date     DATE,
  completed_at    TIMESTAMPTZ,
  
  timeline_entry_id UUID REFERENCES public.timeline_entries(id),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE public.playbook_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  life_event_id   UUID NOT NULL REFERENCES public.life_events(id) ON DELETE CASCADE,
  
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,               -- financial | legal | insurance | tax | administrative
  priority        TEXT NOT NULL DEFAULT 'medium', -- critical | high | medium | low
  sort_order      INTEGER NOT NULL DEFAULT 0,
  
  assigned_to     UUID REFERENCES public.profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | completed | skipped
  
  -- Impact estimate
  estimated_impact_amount INTEGER,             -- minor units
  estimated_impact_description TEXT,
  
  -- Completion
  completed_at    TIMESTAMPTZ,
  completion_notes TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playbook_event ON public.playbook_actions(life_event_id);
```

### 3.11 Quarterly Reviews

```sql
CREATE TABLE public.quarterly_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  quarter_label   TEXT NOT NULL,               -- "Q1 2026"
  
  -- Snapshot data at time of generation
  net_worth_start INTEGER NOT NULL,            -- minor units
  net_worth_end   INTEGER NOT NULL,
  net_worth_change INTEGER NOT NULL,
  
  -- Attribution
  market_returns_amount  INTEGER DEFAULT 0,
  net_savings_amount     INTEGER DEFAULT 0,
  debt_reduction_amount  INTEGER DEFAULT 0,
  fees_drag_amount       INTEGER DEFAULT 0,
  
  -- AI-generated content
  narrative       TEXT,                        -- full review narrative
  recommendations JSONB DEFAULT '[]',          -- structured recommendations array
  
  -- Fitness at time of review
  fitness_score   INTEGER,
  fitness_components JSONB,
  
  -- Upcoming events
  upcoming_events JSONB DEFAULT '[]',
  
  status          TEXT NOT NULL DEFAULT 'draft', -- draft | published | archived
  generated_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  
  timeline_entry_id UUID REFERENCES public.timeline_entries(id),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_household ON public.quarterly_reviews(household_id);
```

### 3.12 Financial Fitness

```sql
CREATE TABLE public.fitness_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  
  total_score     INTEGER NOT NULL,            -- 0–1000
  
  -- Component scores (0–200 each, sum = total)
  buffer_score       INTEGER NOT NULL,         -- months of expenses covered
  growth_score       INTEGER NOT NULL,         -- investment allocation vs benchmark
  protection_score   INTEGER NOT NULL,         -- insurance coverage vs liability
  efficiency_score   INTEGER NOT NULL,         -- fee drag, tax optimization
  trajectory_score   INTEGER NOT NULL,         -- improving over time?
  
  -- Component details (for explanation UI)
  component_details  JSONB NOT NULL DEFAULT '{}',
  
  -- AI-generated explanation
  explanation     TEXT,
  
  -- Micro-actions
  suggested_actions JSONB DEFAULT '[]',        -- AI-generated improvement steps
  
  calculated_at   DATE NOT NULL,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fitness_household ON public.fitness_scores(household_id);
CREATE INDEX idx_fitness_date ON public.fitness_scores(calculated_at);
```

### 3.13 Proposals & Governance

```sql
CREATE TABLE public.proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL,               -- investment | insurance | debt | savings | other
  
  -- Auto-computed context
  impact_analysis JSONB DEFAULT '{}',          -- allocation change, risk change, fitness impact  
  
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | withdrawn
  
  -- Approval tracking
  requires_approval_from UUID[],               -- user IDs who must approve
  approved_by     UUID[],
  rejected_by     UUID,
  
  resolved_at     TIMESTAMPTZ,
  timeline_entry_id UUID REFERENCES public.timeline_entries(id),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE public.proposal_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_household ON public.proposals(household_id);
CREATE INDEX idx_comments_proposal ON public.proposal_comments(proposal_id);
```

### 3.14 Audit Log

```sql
CREATE TABLE public.audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES public.households(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  
  action          TEXT NOT NULL,               -- account.created | holding.updated | proposal.approved | etc.
  entity_type     TEXT NOT NULL,               -- account | holding | proposal | etc.
  entity_id       UUID NOT NULL,
  
  changes         JSONB,                       -- { field: { old: x, new: y } }
  metadata        JSONB DEFAULT '{}',
  
  ip_address      INET,
  user_agent      TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_household ON public.audit_log(household_id);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_date ON public.audit_log(created_at);
```

---

### 3.15 Data Consents & Provider Connections

```sql
CREATE TABLE public.data_consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  provider_id     TEXT NOT NULL,               -- avanza | nordnet | tink | insurely | minpension | etc.
  consent_type    TEXT NOT NULL,               -- manual | csv | psd2 | fida
  data_types      TEXT[] NOT NULL DEFAULT '{}', -- accounts | holdings | transactions | pension | insurance | loans

  consented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,

  metadata        JSONB NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_consents_user ON public.data_consents(user_id);
CREATE INDEX idx_data_consents_provider ON public.data_consents(provider_id);

CREATE TABLE public.provider_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id       TEXT NOT NULL,             -- tink | insurely | minpension | etc.
  status            TEXT NOT NULL DEFAULT 'active', -- active | expired | error | disconnected

  consent_expires_at TIMESTAMPTZ,
  last_sync_at      TIMESTAMPTZ,
  error_message     TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_connections_user ON public.provider_connections(user_id);
CREATE INDEX idx_provider_connections_provider ON public.provider_connections(provider_id);
```

---

## 4. Seed Data Requirements

Each demo household is a complete dataset:

| Household | Accounts | Holdings | Transactions | Timeline entries | Life events |
|---|---|---|---|---|---|
| **Andersson** (Standard) | 8 (ISK, KF, Savings, Mortgage, 2×Pension, Insurance×2) | 15–20 | 100+ (24 months) | 20+ | 2 (apartment purchase, baby expected) |
| **Lindberg** (FIRE) | 6 (ISK×2, Depå, Savings×2, Pension) | 25–30 | 150+ (24 months) | 15+ | 1 (FIRE target tracking) |
| **Eriksson** (FamFamily) | 12 across 2 households | 20+ per HH | 80+ per HH | 25+ | 1 (estate planning) |
| **Circle** (FriendlyFamily) | 4–6 per member (3 members) | 10+ per member | 50+ per member | 10+ | 0 |

Seed data must be **realistic Swedish financial data**: actual ISINs for common Swedish funds/ETFs, realistic price histories, typical fee structures.
