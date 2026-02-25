# FYRK — Technical Architecture
## System Design & Stack Decisions

> **Version:** 0.1
> **Source:** [CONTEXT.md](./CONTEXT.md) · [PRD.md](./PRD.md)
> **Consumed by:** Architect agent, Backend agent, Frontend agent

---

## 1. Stack Decisions (Final)

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Runtime** | Node.js | 22 LTS | Unified JS/TS across stack |
| **Framework** | Next.js | 15 (App Router) | SSR + API routes + RSC in one codebase |
| **Language** | TypeScript | 5.x, strict mode | Type safety across full stack |
| **Database** | Supabase (PostgreSQL 16) | Latest | Free tier, RLS, realtime, auth, storage |
| **ORM** | Drizzle ORM | Latest | Type-safe, lightweight, great PostgreSQL support |
| **Auth** | Supabase Auth | Built-in | Magic link, session management, RLS integration |
| **Styling** | Tailwind CSS 4 | Latest | Rapid development, consistent design |
| **Component Library** | shadcn/ui | Latest | Accessible, customizable, Radix-based |
| **Charts** | Recharts | Latest | React-native financial charts |
| **State Management** | React Server Components + Zustand | Latest | Server-first; Zustand for client interactions |
| **Form Handling** | React Hook Form + Zod | Latest | Validation + type safety |
| **AI/LLM** | OpenAI (GPT-4o) | Latest | Structured output, function calling |
| **Email** | Resend | Latest | Transactional email (invites, magic links, reviews) |
| **File Storage** | Supabase Storage | Built-in | CSV uploads, generated PDFs |
| **Hosting** | Vercel | Pro plan | Zero-config Next.js, preview deploys, edge functions |
| **Domain/CDN** | Cloudflare | Free | DNS, CDN, DDoS protection |
| **Monitoring** | Vercel Analytics + Sentry | Free tiers | Performance + error tracking |
| **CI/CD** | GitHub Actions | Free tier | Lint, type-check, test, deploy on push |
| **i18n** | next-intl | Latest | Server-component-compatible internationalization |
| **Cron/Jobs** | Vercel Cron | Built-in | Scheduled tasks (weekly narratives, quarterly reviews) |

---

## 2. Application Architecture

### Monolith-first approach

The prototype is a **single Next.js application** with clear internal service boundaries. This is intentional — avoid microservice complexity until scale demands it.

```
┌─────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                     │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │   FRONTEND (App Router)│  │   API LAYER (/api/*)         │ │
│  │                        │  │                              │ │
│  │  Pages & Layouts       │  │  Route handlers              │ │
│  │  React Server Comps    │──│  Input validation (Zod)      │ │
│  │  Client Components     │  │  Auth middleware              │ │
│  │  Design System         │  │  Rate limiting                │ │
│  └──────────────────────┘  └──────────┬───────────────────┘ │
│                                        │                      │
│  ┌─────────────────────────────────────┴──────────────────┐  │
│  │                   SERVICE LAYER                          │  │
│  │                                                          │  │
│  │  HouseholdService    AccountService    TimelineService   │  │
│  │  BalanceSheetService  EventService     ReviewService     │  │
│  │  FitnessService      ProposalService   ImportService     │  │
│  │  AIService           NotificationService                 │  │
│  └──────────────────────────┬───────────────────────────┘   │
│                              │                                │
│  ┌───────────────────────────┴────────────────────────────┐  │
│  │                    DATA LAYER                            │  │
│  │                                                          │  │
│  │  Drizzle ORM → PostgreSQL (Supabase)                    │  │
│  │  Row-Level Security Policies                             │  │
│  │  Supabase Realtime subscriptions                         │  │
│  │  Supabase Storage (files)                                │  │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               EXTERNAL INTEGRATIONS                    │    │
│  │                                                        │    │
│  │  OpenAI API    ECB FX API         (Future: Tink/FiDA) │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Service layer boundaries

Every service encapsulates a domain. Services never access each other's database tables directly — they call each other's public methods.

```typescript
// Service interface pattern (every service follows this)
interface HouseholdService {
  create(userId: string, name: string): Promise<Household>
  getById(id: string): Promise<Household | null>
  getMembers(householdId: string): Promise<HouseholdMember[]>
  inviteMember(householdId: string, email: string, role: Role): Promise<Invitation>
  // ... etc
}
```

---

## 3. Directory Structure

```
fyrk/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + type-check + test
│       └── deploy.yml                # Vercel deployment
├── public/
│   ├── fonts/                        # Inter, Outfit
│   └── images/                       # Static assets
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/                    # Main app route group (authed)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── balance-sheet/page.tsx
│   │   │   ├── accounts/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── timeline/page.tsx
│   │   │   ├── events/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── review/
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── fitness/page.tsx
│   │   │   ├── proposals/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── (marketing)/              # Public pages
│   │   │   └── page.tsx              # Landing page
│   │   ├── demo/page.tsx             # Demo household selector
│   │   ├── api/                      # API Route handlers
│   │   │   ├── auth/
│   │   │   ├── households/
│   │   │   ├── accounts/
│   │   │   ├── holdings/
│   │   │   ├── timeline/
│   │   │   ├── events/
│   │   │   ├── reviews/
│   │   │   ├── fitness/
│   │   │   ├── proposals/
│   │   │   └── import/
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles + Tailwind
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── charts/                   # Financial chart components
│   │   ├── timeline/                 # Timeline components
│   │   ├── layout/                   # Navigation, sidebar, headers
│   │   └── forms/                    # Form components
│   ├── services/                     # Business logic layer
│   │   ├── household.service.ts
│   │   ├── account.service.ts
│   │   ├── balance-sheet.service.ts
│   │   ├── timeline.service.ts
│   │   ├── event.service.ts
│   │   ├── review.service.ts
│   │   ├── fitness.service.ts
│   │   ├── proposal.service.ts
│   │   ├── import.service.ts
│   │   ├── ai.service.ts
│   │   └── notification.service.ts
│   ├── db/                           # Database layer
│   │   ├── schema/                   # Drizzle schema definitions
│   │   │   ├── users.ts
│   │   │   ├── households.ts
│   │   │   ├── accounts.ts
│   │   │   ├── holdings.ts
│   │   │   ├── transactions.ts
│   │   │   ├── instruments.ts
│   │   │   ├── timeline.ts
│   │   │   ├── events.ts
│   │   │   ├── reviews.ts
│   │   │   ├── fitness.ts
│   │   │   ├── proposals.ts
│   │   │   └── index.ts              # Re-exports all schemas
│   │   ├── migrations/               # Generated migrations
│   │   ├── seed/                     # Seed data
│   │   │   ├── households/
│   │   │   │   ├── andersson.ts      # Standard household
│   │   │   │   ├── lindberg.ts       # FIRE household
│   │   │   │   ├── eriksson.ts       # FamFamily
│   │   │   │   └── circle.ts         # FriendlyFamily
│   │   │   └── index.ts
│   │   └── client.ts                 # Drizzle + Supabase client
│   ├── lib/                          # Shared utilities
│   │   ├── ai/                       # LLM integration
│   │   │   ├── client.ts             # OpenAI client config
│   │   │   ├── prompts/              # Prompt templates
│   │   │   ├── schemas/              # Structured output schemas
│   │   │   └── pipelines/            # AI pipeline orchestration
│   │   ├── csv/                      # CSV parsers
│   │   │   ├── avanza.parser.ts
│   │   │   └── nordnet.parser.ts
│   │   ├── market-data/              # External data fetchers
│   │   ├── calculations/             # Financial calculations
│   │   │   ├── fitness.ts            # Fitness score calculation
│   │   │   ├── allocation.ts         # Asset allocation logic
│   │   │   ├── exposure.ts           # Exposure analysis
│   │   │   └── performance.ts        # Performance attribution
│   │   ├── auth/                     # Auth utilities
│   │   ├── validations/              # Zod schemas
│   │   └── utils.ts                  # General helpers
│   ├── hooks/                        # React hooks
│   ├── store/                        # Zustand stores
│   ├── types/                        # Shared TypeScript types
│   │   ├── domain.ts                 # Domain types
│   │   ├── api.ts                    # API request/response types
│   │   └── index.ts
│   └── config/                       # Configuration
│       ├── constants.ts
│       ├── providers.ts              # Broker/provider configurations
│       └── env.ts                    # Environment variable validation
├── tests/                            # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── drizzle.config.ts                 # Drizzle ORM config
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── .env.local                        # Local env vars (not committed)
├── .env.example                      # Env var template
└── package.json
```

---

## 4. Frontend Architecture

### Rendering strategy

| Page type | Rendering | Reason |
|---|---|---|
| Marketing/Landing | Static (SSG) | SEO, fast load |
| Auth pages | Server (SSR) | Session handling |
| Dashboard | Server (RSC) + Client hydration | Data-heavy, needs real-time updates |
| Balance Sheet | Server (RSC) + Client charts | Complex data, interactive charts |
| Timeline | Server (RSC) + Client scroll | Infinite scroll, animations |
| Forms (add account, proposals) | Client Components | Interactive, real-time validation |

### Component architecture

```
Design tokens (CSS variables / Tailwind theme)
    ↓
Primitive components (shadcn/ui: Button, Input, Card, Dialog...)
    ↓
Domain components (AccountCard, FitnessGauge, TimelineEntry...)
    ↓
Composite components (BalanceSheetView, QuarterlyReviewPanel...)
    ↓
Page components (DashboardPage, TimelinePage...)
    ↓
Layouts (AppLayout, AuthLayout, MarketingLayout)
```

### Client state management

Minimal client state — prefer server data via RSC. Zustand only for:
- UI state (sidebar open/close, modal visibility, active filters)
- Optimistic updates (proposal approval, account edits)
- Demo mode state (which demo household is active)

---

## 5. Backend Architecture

### API conventions

- **RESTful** with JSON responses
- All dates in ISO 8601 (UTC)
- All amounts in **minor currency units** (öre, not SEK) — integer storage, avoid floating point
- Currency code always alongside amounts
- Pagination: cursor-based (`?cursor=xxx&limit=20`)
- Filtering: query params (`?type=ISK&provider=avanza`)
- Sorting: `?sort=created_at&order=desc`
- Errors: `{ error: { code: string, message: string, details?: object } }`
- All endpoints return `{ data: T }` or `{ data: T[], meta: { cursor, hasMore } }`

### Middleware chain

```
Request
  → Rate limiter (per IP + per user)
  → Auth check (Supabase session)
  → Input validation (Zod)
  → Route handler
  → Service layer
  → Data layer (Drizzle + RLS)
  → Response
```

### Background jobs (Vercel Cron)

| Job | Schedule | Action |
|---|---|---|
| Weekly "What Changed" | Every Monday 07:00 UTC | For each household: calculate changes, generate AI narrative, create timeline entry |
| Quarterly Review | 1st of Jan/Apr/Jul/Oct | For each household: aggregate quarter data, generate AI review, notify members |
| Market data refresh | Daily 18:00 UTC | Fetch latest prices for all held instruments |
| Fitness score recalculation | Daily 06:00 UTC | Recalculate scores for all households |
| Stale data alerts | Weekly | Flag accounts not updated in 14+ days |

---

## 6. Real-time Architecture

Supabase Realtime used for:
- **Proposals:** live updates when partner creates/approves/comments
- **Household changes:** when partner adds account or modifies holdings
- **Notifications:** real-time alerts in-app

```typescript
// Client-side subscription pattern
const channel = supabase
  .channel('household-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'proposals',
    filter: `household_id=eq.${householdId}`
  }, (payload) => {
    // Update UI optimistically
  })
  .subscribe()
```

---

## 7. Extension Points (FiDA / Integrations)

The architecture includes clean abstraction points for future integrations:

```typescript
// Provider adapter interface — implemented per data source
interface DataProviderAdapter {
  readonly providerId: string
  readonly providerName: string
  readonly supportedDataTypes: DataType[]
  
  connect(userId: string, credentials: ProviderCredentials): Promise<Connection>
  fetchAccounts(connectionId: string): Promise<Account[]>
  fetchHoldings(accountId: string): Promise<Holding[]>
  fetchTransactions(accountId: string, since: Date): Promise<Transaction[]>
  disconnect(connectionId: string): Promise<void>
}

// Implementations (prototype)
class ManualEntryAdapter implements DataProviderAdapter { ... }
class CsvImportAdapter implements DataProviderAdapter { ... }

// Implementations (v1 — FiDA)
class TinkAdapter implements DataProviderAdapter { ... }
class InsurelyAdapter implements DataProviderAdapter { ... }
class MinPensionAdapter implements DataProviderAdapter { ... }
```

---

## 8. Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_ORG_ID=

# Resend (email)
RESEND_API_KEY=

# Market Data (optional in prototype; required only for non-ECB providers)
MARKET_DATA_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENV=development

# Feature flags
FEATURE_DEMO_MODE=true
FEATURE_AI_NARRATIVES=true
FEATURE_EXTENDED_FAMILY=false
FEATURE_CIRCLES=false

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## 9. Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| Largest Contentful Paint | < 2.0s | Vercel Analytics |
| First Input Delay | < 100ms | Vercel Analytics |
| Cumulative Layout Shift | < 0.1 | Vercel Analytics |
| API response (p95) | < 500ms | Server logs |
| AI generation (quarterly review) | < 30s | Background job, not blocking |
| AI generation (narrative) | < 10s | Background job |
| CSV import (1000 rows) | < 5s | Server logs |
| Database queries (p95) | < 100ms | Drizzle query logging |

---

## 10. Mobile Strategy

### Prototype: Web-first, responsive

The prototype is a responsive web app. Desktop-first design, optimized for tablet and mobile viewports.

### v1: React Native (future)

Architecture choices are made to support a React Native mobile app sharing the same API:
- API-first design (all logic behind API routes, not in RSC)
- Service layer is framework-agnostic (pure TypeScript)
- Auth via Supabase works identically in React Native
- Design tokens defined as platform-agnostic values in config
