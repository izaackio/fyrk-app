# CLAUDE.md — Fyrk App

> Shared agent instructions for Claude Code, Codex, and other AI assistants.

## Project overview

Fyrk is a household financial copilot built for Swedish families. It aggregates investment, savings, pension, loan, and insurance accounts into a unified balance sheet with AI-generated narratives, fitness scoring, quarterly reviews, and governance workflows (proposals & approvals).

**Domain**: Personal finance / wealth management
**Locale**: Sweden-first (SEK base currency, Avanza/Nordnet CSV import, ECB FX rates)
**Stage**: Active development — Sprint 7 (design system migration)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC) |
| Language | TypeScript 5.9 (strict mode) |
| Database | PostgreSQL 16 via Supabase |
| ORM | Drizzle ORM 0.45 |
| Auth | Supabase Auth (magic link + session) |
| Styling | CSS Modules + Tailwind CSS 4 |
| Validation | Zod 4 |
| Forms | React Hook Form 7 |
| AI | OpenAI GPT-4o / GPT-4o-mini (custom HTTP client, not SDK) |
| Testing | Node.js native `test` + `assert/strict` via `tsx --test` |
| Hosting | Vercel |
| Package manager | npm |
| Node | >= 20.10.0 |

---

## Commands

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm run lint             # ESLint (zero warnings allowed)
npm run lint:fix         # Auto-fix lint issues
npm run type-check       # tsc --noEmit
npm run test             # Run all *.test.ts files
npm run test:db-seed     # Test demo data seeding only
npm run db:seed:demo     # Seed demo households + data
```

---

## Project structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Authenticated routes (dashboard, accounts, etc.)
│   ├── (auth)/            # Auth routes (signup, login)
│   └── api/               # REST API routes
├── components/
│   ├── ui/                # Reusable primitives (Card, InputField, Chip)
│   ├── layout/            # Shell, sidebar, topbar, household-context
│   ├── theme/             # Design tokens (tokens.css, theme.module.css)
│   ├── marketing/         # Landing page
│   └── [feature]/         # Feature-specific components + CSS modules
├── db/
│   ├── schema/            # Drizzle schema definitions (34 tables)
│   ├── migrations/        # Sprint-based SQL migrations (0001–0007)
│   └── seed/              # Demo data seeding
├── lib/
│   ├── ai/                # AI pipeline (client, prompts, schemas, quality)
│   ├── auth/              # requireAuth(), rate-limit, Supabase clients
│   ├── calculations/      # Financial math (net worth, fitness, allocation, FX)
│   ├── validations/       # Zod schemas by domain
│   ├── csv/               # CSV parsers (Avanza, Nordnet)
│   └── market-data/       # ECB FX rates
├── services/              # Business logic layer (18+ service classes)
├── types/                 # Domain TypeScript interfaces
└── tests/fixtures/        # AI output samples, CSV fixtures, FX snapshots
```

---

## Code conventions

### TypeScript
- **Strict mode** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- Path alias: `@/*` → `./src/*`
- No `any` — ESLint enforces `@typescript-eslint/no-explicit-any: error`
- Use inline type imports: `import { type Foo } from "./bar"`
- Unused vars must be prefixed with `_`
- Domain types use `as const` unions: `type AccountType = (typeof accountTypes)[number]`

### Formatting (Prettier)
- Double quotes, semicolons, no trailing commas
- Print width: 100 characters

### CSS & Styling
- **CSS Modules** (`.module.css`) for all component styles — scoped class names
- **CSS custom properties** for design tokens (`var(--text-base)`, `var(--space-md)`)
- Tailwind CSS 4 is available via PostCSS but components primarily use CSS Modules
- No utility class coupling in component styles

### Components
- Server Components (RSC) by default; add `"use client"` only when needed
- Each feature component has its own `.module.css` file
- Reusable primitives live in `src/components/ui/`
- Feature components live in `src/components/[feature]/`

### API routes
```typescript
// Pattern: src/app/api/[feature]/route.ts
export async function GET(request: Request): Promise<Response> {
  enforceRateLimit(request, "read");
  const authContext = await requireAuth();
  const query = parseWithSchema(params, schema);
  const result = await service.method(authContext, query);
  return successResponse(result);
}
```
- All data access goes through the services layer — never query DB from routes
- Use `successResponse()` / `errorResponse()` helpers from `@/services/http`
- Validate all input with Zod schemas from `@/lib/validations/`

### Services layer
- One service per domain (accounts, balance-sheet, household, fitness, etc.)
- Services receive `AuthContext` as first parameter
- Throw `ServiceError(code, message, status)` for domain errors
- All Supabase queries run through services (RLS enforces row-level security)

### Database
- **Amounts**: Store in integer minor currency units (1 SEK = 100 öre)
- **Timestamps**: Always `timestamptz` (UTC)
- **Soft deletes**: `deleted_at` column on mutable entities
- **Keys**: UUIDs (Supabase default)
- **Naming**: `snake_case` in DB, `camelCase` in TypeScript
- **Multi-tenancy**: Via `household_id` FK (not separate schemas)
- Migrations are sprint-based SQL files in `src/db/migrations/`

### Testing
- Node.js native `test` module + `assert/strict` — no external framework
- Run with `tsx --test`
- Tests colocated next to source: `service.test.ts` alongside `service.ts`
- Mock Supabase client for service integration tests
- AI tests validate Zod schemas against sample outputs
- Fixtures in `tests/fixtures/`

### AI pipeline
- Custom HTTP client (not OpenAI SDK) in `lib/ai/client.ts`
- Prompt templates in `lib/ai/prompts/`
- All AI outputs validated through Zod schemas (`lib/ai/schemas.ts`)
- Deterministic context hashing for caching (`lib/ai/deterministic-artifacts.ts`)
- Quality validation: warmth/authority tone scoring (`lib/ai/quality.ts`)
- Five AI use cases: weekly narrative, quarterly review, life event playbook, fitness explanation, proposal impact

---

## Design system (Sprint 7)

### Typography
- **Data font**: DM Sans (400–700) — clean, data-forward
- **Narrative font**: Instrument Serif (400 italic) — editorial warmth
- **Mono font**: IBM Plex Mono (400–600)

### Brand
- Logo: Instrument Serif "ƒ" mark (financial function symbol)
- Layout density toggle: "narrative" (spacious) vs "terminal" (compact)
- Light/dark theme via `[data-theme]` attribute

### Color palette (light mode reference)
- Background: `#fafafa` (neutral), Surface: `#ffffff`
- Text primary: `#111111`, Text secondary: `#666666`
- Brand primary: `#0066ff` (blue), Brand accent: `#f5a623` (amber)
- Status up: `#00a866` (green), Status down: `#e03e3e` (red)
- Chart purple: `#7b61ff`, Warning: `#e68a00`

---

## Git workflow

### Branch naming
- `codex/s{N}-{layer}` — Sprint work branches (e.g., `codex/s5-backend`)
- `codex/{feature-slug}` — Feature branches (e.g., `codex/dashboard-home-redesign`)
- `design/{phase}` — Design system branches (e.g., `design/phase-1-foundation`)

### Commit messages
Follow conventional commits:
- `feat(scope):` — New feature
- `fix(scope):` — Bug fix
- `design(scope):` — Design system changes
- `chore(scope):` — Tooling, deps, config
- `docs:` — Documentation
- `ci:` — CI/CD changes

### PR flow
- All work merges to `main` via PR
- CI gates: lint, type-check, test
- GitHub remote: `izaackio/fyrk-app` (private)

---

## Environment

Required env vars (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server only)
- `OPENAI_API_KEY` — OpenAI API key for AI features

---

## Key architectural decisions

1. **Services layer owns all data access** — API routes are thin; business logic and queries live in services
2. **Zod at every boundary** — Input validation on API routes, output validation on AI responses
3. **CSS Modules over Tailwind utilities** — Component styles are scoped and token-driven
4. **No external test framework** — Native Node.js `test` module keeps deps minimal
5. **Custom OpenAI HTTP client** — No SDK dependency; direct fetch with JSON mode
6. **Integer currency** — All monetary values in minor units to avoid floating-point errors
7. **Sprint-based migrations** — Each sprint produces one migration file; no auto-generated diffs
