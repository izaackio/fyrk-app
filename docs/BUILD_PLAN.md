# FYRK — Build Plan
## Sprint-by-Sprint Execution Roadmap + Multi-Agent Development Patterns

> **Version:** 0.1
> **Source:** All documents in `/docs/`
> **Timeline:** 12 weeks (6 × two-week sprints)
> **Output:** Demo-ready prototype deployable to fyrk.com
> **Consumed by:** All agents, human developers, project management

---

## 1. Multi-Agent Development Pattern

This project is designed for parallel AI-assisted development. Multiple AI coding agents work concurrently on isolated domains, coordinated by shared contracts.

### Agent assignments

| Agent | Domain | Primary docs | Output |
|---|---|---|---|
| **Architect** | Project scaffolding, infra, CI/CD | CONTEXT, ARCHITECTURE | Project setup, config, deployment |
| **DB Agent** | Schema, migrations, seed data, RLS | DATA_MODEL, SECURITY | Drizzle schema, migrations, seed scripts |
| **Backend Agent** | API routes, services, validation | API_SPEC, DATA_MODEL, SECURITY | Route handlers, services, middleware |
| **Frontend Agent** | UI components, pages, interactions | BRAND_GUIDELINES, PRD, API_SPEC | React components, pages, styles |
| **AI Agent** | LLM pipelines, prompts, generation | LLM_INTEGRATION, DATA_MODEL | AI service, prompt templates, output schemas |
| **Data Agent** | CSV parsers, market data, providers | EXTERNAL_DATA, DATA_MODEL | Import service, provider adapters, pricing |

### Coordination contracts

Agents must never step on each other's files. Boundaries are enforced by directory structure:

```
src/
  app/           → Frontend Agent (pages)
  app/api/       → Backend Agent (routes)
  components/    → Frontend Agent
  services/      → Backend Agent
  db/schema/     → DB Agent (exclusive — NO other agent touches these)
  db/seed/       → DB Agent + Data Agent  
  db/migrations/ → DB Agent (generated only)
  lib/ai/        → AI Agent (exclusive)
  lib/csv/       → Data Agent (exclusive)
  lib/market-data/ → Data Agent (exclusive)
  lib/calculations/ → Backend Agent + AI Agent (coordinate via types)
  lib/auth/      → Backend Agent
  lib/validations/ → Backend Agent (Zod schemas shared with Frontend)
  types/         → Any agent can READ; Backend Agent OWNS
  config/        → Architect (initial); Backend Agent (provider configs)
```

### Shared contracts (DO NOT BREAK)

1. **`src/types/domain.ts`** — canonical TypeScript types for all entities. DB Agent generates these from Drizzle schema. All agents import from here.
2. **`src/lib/validations/`** — Zod schemas for API input/output. Backend Agent owns. Frontend Agent imports for form validation.
3. **`src/db/schema/index.ts`** — Drizzle schema re-exports. Only DB Agent modifies; all agents can import for type inference.

### Development flow

```
1. Architect bootstraps project → commit
2. DB Agent creates schema + migrations → commit  
3. Backend + Frontend start in parallel:
   Backend: API routes (mocked data initially) → commit
   Frontend: UI components + pages (mocked API) → commit
4. Integration: connect Frontend to real Backend → commit
5. AI Agent builds LLM pipelines (can start in parallel with 3)
6. Data Agent builds importers (can start in parallel with 3)
7. Integration: connect AI + Data to Backend → commit
8. DB Agent builds seed data → commit
9. End-to-end testing → commit
```

---

## 2. Sprint Plan

### Pre-Sprint: Environment Setup (Day 0–1)

```
TASKS:
□ Create GitHub repository (private)
□ npx create-next-app@latest ./ --ts --tailwind --app --src-dir --eslint
□ Install core dependencies:
  - @supabase/supabase-js, @supabase/ssr
  - drizzle-orm, drizzle-kit, postgres
  - openai
  - zod, react-hook-form, @hookform/resolvers
  - recharts
  - next-intl
  - resend
  - zustand
□ Install shadcn/ui: npx shadcn@latest init
  - Add components: button, card, input, dialog, dropdown-menu, toast, 
    tabs, badge, avatar, skeleton, separator, sheet, tooltip
□ Configure Supabase project (free tier)
□ Configure Vercel project → connect GitHub
□ Set up environment variables (.env.local + Vercel)
□ Configure ESLint + Prettier + TypeScript strict mode
□ Create GitHub Actions CI workflow (lint + type-check)
□ Configure Drizzle ORM with Supabase connection
□ Set up project directory structure per ARCHITECTURE.md

AGENT: Architect
GATE: Project builds, deploys to Vercel, shows Next.js default page
```

---

### Sprint 1: Foundation (Weeks 1–2)

**Goal:** Auth working, household creation, basic app shell with navigation.

```
DB AGENT:
□ Create Drizzle schemas for: profiles, households, household_members
□ Generate and run migrations
□ Create RLS policies for profiles + households
□ Generate TypeScript types from schema

BACKEND AGENT:
□ Auth middleware (requireAuth, requireHouseholdAccess)
□ POST /api/auth/signup (magic link via Supabase)
□ POST /api/auth/login
□ GET /api/auth/session
□ POST /api/auth/logout
□ POST /api/households (create)
□ GET /api/households/:id
□ POST /api/households/:id/invite
□ PATCH /api/households/:id/members/:memberId
□ Create HouseholdService

FRONTEND AGENT:
□ App layout: sidebar, topbar, content area
□ Auth pages: login, signup (magic link flow)
□ Design token CSS variables (from BRAND_GUIDELINES.md)
□ Tailwind theme configuration
□ Household creation wizard
□ Household settings page (basic)
□ Empty dashboard shell (placeholder cards)
□ Dark/light mode toggle

GATE:
  ✓ User can sign up with magic link
  ✓ User can create a household
  ✓ User can invite a partner via email
  ✓ Partner can join household
  ✓ App shell renders with sidebar navigation
  ✓ Deployed to Vercel preview
```

---

### Sprint 2: Accounts & Data (Weeks 3–4)

**Goal:** Users can add accounts and import CSV data. Holdings displayed.

```
DB AGENT:
□ Create schemas: accounts, instruments, holdings, transactions, account_snapshots
□ Generate migrations
□ Create RLS policies for all new tables
□ Initial instrument seed data (top 50 Swedish funds + ETFs with ISINs)

DATA AGENT:
□ Avanza CSV parser (transactions + portfolio)
□ Nordnet CSV parser (transactions)
□ Instrument resolver (ISIN → lookup/create)
□ Yahoo Finance price fetcher
□ ECB FX rate fetcher
□ Daily price refresh cron job

BACKEND AGENT:
□ POST /api/accounts (create)
□ GET /api/accounts?householdId=
□ GET /api/accounts/:id
□ PATCH /api/accounts/:id
□ DELETE /api/accounts/:id
□ POST /api/accounts/:id/holdings (manual add)
□ GET /api/accounts/:id/holdings
□ GET /api/accounts/:id/transactions
□ POST /api/import/csv (upload + parse + preview)
□ POST /api/import/:id/confirm
□ Create AccountService, ImportService

FRONTEND AGENT:
□ Add Account page (provider selection, type, wrapper)
□ CSV import flow (upload → preview → confirm)
□ Account detail page (holdings list, transactions list)
□ Holdings table component (sortable, with prices)
□ AmountDisplay component
□ AccountCard component
□ Provider logo/icon set

GATE:
  ✓ User can add accounts manually (ISK, KF, savings, pension, mortgage)
  ✓ User can import Avanza CSV → holdings + transactions appear
  ✓ User can import Nordnet CSV → holdings + transactions appear
  ✓ Instruments are auto-resolved by ISIN
  ✓ Market prices refresh daily
  ✓ Account visibility (full/hidden/private) works between partners
```

---

### Sprint 3: Balance Sheet & Intelligence (Weeks 5–6)

**Goal:** Household Balance Sheet with allocation charts. First AI feature (weekly narrative).

```
BACKEND AGENT:
□ GET /api/balance-sheet?householdId= (full aggregation)
□ GET /api/balance-sheet/history?householdId=&period=
□ Balance sheet calculation service (net worth, allocation, exposure)
□ Account snapshot cron job (daily snapshots for history)

AI AGENT:
□ OpenAI client configuration
□ Context assembler (household → structured context JSON)
□ Weekly "What Changed" narrative pipeline
□ POST /api/ai/narrative
□ Prompt template: weekly narrative (from LLM_INTEGRATION.md)
□ Structured output validation with Zod
□ Error handling + fallback (data-only if AI fails)
□ Vercel cron job for weekly narrative generation

FRONTEND AGENT:
□ Balance Sheet page: net worth header, member toggle
□ AllocationChart component (donut charts × 4: class, geo, currency, sector)
□ NetWorthTrend component (area chart with time series)
□ Dashboard: net worth card (live data)
□ Dashboard: "What Changed This Week" narrative card
□ Data quality indicator component

GATE:
  ✓ Balance Sheet page shows unified household net worth
  ✓ Allocation charts render correctly with real data
  ✓ Net worth history chart shows trend over time
  ✓ AI weekly narrative generates successfully
  ✓ Dashboard shows live net worth + narrative
  ✓ Member toggle filters by individual vs household
```

---

### Sprint 4: Timeline, Life Events & Fitness (Weeks 7–8)

**Goal:** Financial Timeline, one life event playbook, Financial Fitness Score.

```
DB AGENT:
□ Create schemas: timeline_entries, life_events, playbook_actions, fitness_scores
□ Generate migrations + RLS policies

BACKEND AGENT:
□ Timeline CRUD endpoints (GET, POST, PATCH, DELETE)
□ Life event endpoints (library, trigger, action update)
□ Financial Fitness calculation service
□ GET /api/fitness?householdId=
□ Fitness score cron job (daily recalculation)
□ Create TimelineService, EventService, FitnessService

AI AGENT:
□ Life Event playbook generation pipeline
□ Prompt template: "Buying first apartment" playbook
□ Impact modeling pipeline (what-if analysis)
□ Financial Fitness explanation pipeline
□ Fitness micro-action suggestion pipeline

FRONTEND AGENT:
□ Financial Timeline page (scrollable, filterable)
□ TimelineEntry component (all variants: event, decision, review, milestone)
□ Add timeline entry modal (manual entries)
□ Life Events library page
□ Playbook detail page (checklist, assignments, progress)
□ Life event trigger flow (inputs → generate playbook)
□ FitnessGauge component (arc gauge, 0-1000)
□ Financial Fitness page (score, 5 components, trend, actions)
□ Dashboard: fitness score card

GATE:
  ✓ Timeline shows chronological financial history
  ✓ User can add manual timeline entries
  ✓ User can trigger "Buying first apartment" life event
  ✓ AI generates personalized playbook with 10-15 actions
  ✓ Playbook actions are assignable and completable
  ✓ Financial Fitness Score displays with 5 components
  ✓ Fitness trend chart shows history
  ✓ Micro-actions suggest concrete improvements
```

---

### Sprint 5: Quarterly Review & Governance (Weeks 9–10)

**Goal:** AI-generated quarterly review. Proposal flow with approval mechanics.

```
DB AGENT:
□ Create schemas: quarterly_reviews, proposals, proposal_comments, audit_log
□ Generate migrations + RLS policies
□ Seed data: add sample quarterly reviews to demo households

BACKEND AGENT:
□ POST /api/reviews/generate (trigger AI generation)
□ GET /api/reviews/:id
□ GET /api/reviews?householdId=
□ Proposal CRUD: create, approve, reject, comment, list
□ Proposal impact analysis (auto-compute on creation)
□ Audit log service (log all mutations)
□ Create ReviewService, ProposalService

AI AGENT:
□ Quarterly Review generation pipeline (full structured review)
□ Performance attribution analysis
□ Recommendation generation with priority ranking
□ Proposal impact analysis pipeline

FRONTEND AGENT:
□ Quarterly Review page (narrative, attribution, recommendations, actions)
□ Review generation trigger UI (with progress indicator)
□ Proposals list page
□ Create Proposal flow (title, description, category)
□ ProposalCard component (with impact analysis, discussion, approve/reject)
□ Proposal detail page (comments, status, audit trail)
□ Dashboard: pending proposals card
□ Dashboard: upcoming review card
□ Notification indicators (visual badges for pending items)

GATE:
  ✓ AI generates comprehensive quarterly review
  ✓ Review includes performance attribution + recommendations
  ✓ User can create financial proposals
  ✓ Partner sees proposals and can discuss + approve/reject
  ✓ Approval decisions are recorded on timeline
  ✓ Audit trail captures all proposal actions
```

---

### Sprint 6: Demo Data, Polish & Launch Prep (Weeks 11–12)

**Goal:** 4 demo households seeded, onboarding polished, fully demo-ready.

```
DB AGENT:
□ Build complete seed data for 4 demo household variants:
  - Andersson (Standard): 8 accounts, 100+ transactions, 20+ timeline entries
  - Lindberg (FIRE): 6 accounts, 150+ transactions, 15+ timeline entries
  - Eriksson (FamFamily): 12 accounts across 2 linked households
  - Investment Circle (FriendlyFamily): 3 members with anonymized sharing
□ All seed data uses real Swedish ISINs and realistic prices
□ Pre-generate quarterly reviews + fitness scores for demo data

FRONTEND AGENT:
□ Landing / marketing page
□ Demo mode selector (4 household variants with descriptions)
□ Demo mode indicator (persistent banner: "Viewing demo data")
□ "Switch to real data" conversion flow
□ Onboarding flow polish (step indicators, progress, copy)
□ All empty states designed and implemented
□ All loading states with skeleton UI
□ Responsive design pass (tablet + mobile)
□ Dark mode complete pass
□ Accessibility audit (focus, contrast, screen reader labels)
□ Performance optimization (code splitting, image optimization)
□ SEO: meta tags, OG images, titles per page
□ Error boundary pages (404, 500, offline)

BACKEND AGENT:
□ POST /api/households/demo (initialize demo household)
□ GET /api/user/data-export (GDPR export)
□ DELETE /api/user/account (GDPR deletion)
□ Rate limiting on all endpoints
□ Final security header configuration
□ API error handling polish (consistent error format)

ALL AGENTS:
□ End-to-end testing: full user journey
  1. Sign up → create household → invite partner
  2. Add accounts (manual + CSV) → balance sheet populates
  3. View timeline → trigger life event → complete playbook actions
  4. Generate quarterly review → create proposal → approve
  5. Check fitness score → view improvement actions
□ Demo mode testing: each of 4 variants loads correctly
□ Performance audit: Lighthouse score ≥90
□ Mobile testing: all screens usable on 375px width

GATE:
  ✓ 4 demo households fully functional with realistic data
  ✓ Onboarding flow smooth and polished
  ✓ All screens responsive across desktop/tablet/mobile
  ✓ Dark mode fully functional
  ✓ Lighthouse performance ≥90
  ✓ Zero console errors
  ✓ GDPR endpoints functional (export + delete)
  ✓ Deployable to fyrk.com
```

---

## 3. Milestone Definitions

| Milestone | Sprint | Definition |
|---|---|---|
| **Buildable** | S1 | App builds, deploys, auth works, household creation works |
| **Data-ready** | S2 | Accounts, holdings, and CSV import functional |
| **Intelligent** | S3 | Balance sheet + AI narrative working — first "wow" moment |
| **Feature-complete** | S5 | All 5 pillars represented in prototype |
| **Demo-ready** | S6 | 4 demo households, polished UX, deployable to fyrk.com |

---

## 4. Testing Strategy

| Type | Tool | When | Coverage target |
|---|---|---|---|
| **Unit tests** | Vitest | Per service/util function | Critical business logic (fitness calc, allocation, CSV parsing) |
| **API integration** | Vitest + Supabase test project | Per API endpoint | All P0 endpoints |
| **Component tests** | Vitest + Testing Library | Key UI components | AmountDisplay, FitnessGauge, AllocationChart |
| **E2E tests** | Playwright | Sprint 6 | Full onboarding + demo mode journey |
| **Type checking** | TypeScript compiler (strict) | On every commit (CI) | 100% — zero `any` types |
| **Linting** | ESLint | On every commit (CI) | Zero warnings |

---

## 5. Deployment Pipeline

```
Developer pushes to feature branch
    ↓
GitHub Actions: lint + type-check + test
    ↓
Vercel: auto-deploy preview (unique URL per branch)
    ↓
Review + merge to main
    ↓
Vercel: auto-deploy to production (fyrk.com)
```

### Environment configuration

| Environment | Branch | URL | Database |
|---|---|---|---|
| **Local dev** | Any | localhost:3000 | Supabase local (supabase start) |
| **Preview** | Feature branches | *.vercel.app | Supabase staging project |
| **Production** | main | fyrk.com | Supabase production project |

---

## 6. Risk Mitigations Per Sprint

| Sprint | Risk | Mitigation |
|---|---|---|
| S1 | Supabase auth edge cases | Use Supabase SSR helpers; test magic link flow early |
| S2 | CSV format variations (Avanza/Nordnet change format) | Build resilient parser with header detection; handle unknown columns gracefully |
| S2 | Instrument resolution failures | Create placeholder instruments; flag for manual review |
| S3 | AI generation quality | Test prompts extensively; use structured output (JSON mode); validate with Zod |
| S3 | Performance with large balance sheets | Paginate holdings; cache aggregations; use database views |
| S4 | Fitness score fairness/accuracy | Start with simple heuristics; iterate based on user feedback; transparency is key |
| S5 | Real-time sync for proposals | Use Supabase Realtime; fallback to polling if issues |
| S6 | Demo data realism | Use actual Swedish ISINs + realistic prices; review with domain expert |

---

## 7. Post-Prototype Roadmap

| Phase | Timeline | Key features |
|---|---|---|
| **Private Beta** | Months 4–6 | 50 real households; PSD2 for bank accounts (via Tink/Finshark); 10 life event playbooks |
| **Public Beta (Sweden)** | Months 7–12 | 1,000 households; Extended Family + Circles; Swedish localization; premium tier with human reviews |
| **Nordic Expansion** | Months 13–24 | Norway, Denmark, Finland support; FiDA integrations (investments, pensions); 10K households |
| **European Scale** | Months 24–48 | Pan-EU FiDA coverage; multi-market tax/wrapper support; B2B data products; 50K+ households |

---

## 8. Document Index

All development context documents in `/docs/`:

| # | Document | Purpose | Size |
|---|---|---|---|
| 1 | [CONTEXT.md](./CONTEXT.md) | Project briefing — what, why, who, constraints | Root doc |
| 2 | [PRD.md](./PRD.md) | Product requirements — user stories, acceptance criteria | Feature spec |
| 3 | [ARCHITECTURE.md](./ARCHITECTURE.md) | Tech stack, app structure, infrastructure | System design |
| 4 | [DATA_MODEL.md](./DATA_MODEL.md) | Database schema — 14 tables, all columns, indexes | Schema source of truth |
| 5 | [API_SPEC.md](./API_SPEC.md) | API contracts — all endpoints with request/response | Frontend↔Backend contract |
| 6 | [LLM_INTEGRATION.md](./LLM_INTEGRATION.md) | AI pipeline — prompts, models, orchestration | AI agent guide |
| 7 | [EXTERNAL_DATA.md](./EXTERNAL_DATA.md) | Data sourcing — CSV, market data, provider adapters | Data agent guide |
| 8 | [SECURITY.md](./SECURITY.md) | Auth, RLS, GDPR, audit logging | Security baseline |
| 9 | [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) | Brand system, design tokens, components, screen blueprints | Frontend agent + Figma |
| 10 | [BUILD_PLAN.md](./BUILD_PLAN.md) | Sprint plan, agent assignments, testing, deployment | This document |
