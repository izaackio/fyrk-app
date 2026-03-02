# FYRK Development Progress Log

This document is the running delivery log for Fyrk. Update it at the end of every sprint cycle and after major merges.

## Status Legend
- `Not Started`: no implementation work started
- `In Progress`: active branch work and/or open PRs
- `Completed`: merged to `main`
- `Blocked`: cannot proceed due to dependency or external constraint

## Current Snapshot
- Last updated: 2026-03-02
- Baseline branch: `main`
- Latest merged commit on `main`: `7ebebe9`
- Product phase: Prototype build-out

| Sprint | Scope | Status | Notes |
|---|---|---|---|
| Sprint 0 | Pre-launch waitlist page | In Progress | Planning and runbook added; implementation pending |
| Sprint 1 | Foundation (arch + DB + backend + frontend shell) | Completed | All Sprint 1 agent tracks merged to `main` |
| Sprint 2 | Accounts & data (manual + CSV + FX) | Completed | DB, data, backend, and frontend tracks merged to `main`; QA track intentionally skipped |
| Sprint 3 | Balance sheet + first AI narrative | Not Started | Execution runbook prepared; kickoff ready |
| Sprint 4 | Timeline + life event + fitness | Not Started | Pending Sprint 3 completion |
| Sprint 5 | Quarterly review + governance | Not Started | Pending Sprint 4 completion |
| Sprint 6 | Demo data + polish + launch prep | Not Started | Pending Sprint 5 completion |

## Completed Work So Far

### Sprint 1 (Completed)
Objective: establish production-grade project foundation and core household/auth workflows.

Delivered:
- Next.js + TypeScript baseline scaffold and project configuration
- CI setup with required checks split for lint/test/type-check
- Sprint 1 DB schema + migration + RLS foundation (`profiles`, `households`, `household_members`)
- Auth + household API foundations merged
- Frontend auth shell, onboarding shell, and app navigation skeleton merged

Merged PR track summary:
- Architect track merged (`codex/s1-arch`)
- DB track merged (`codex/s1-db`)
- Backend track merged (`codex/s1-backend`)
- Frontend track merged (`codex/s1-frontend`)

### Sprint 2 (Completed)
Objective: deliver the first real-data usable prototype flow from account setup through CSV imports and cross-currency normalization.

Delivered:
- Manual account setup flow
- CSV import parsing pipeline (Avanza + Nordnet) with normalized row models
- Accounts/import DB schema additions with RLS controls
- Accounts + import backend APIs/services (preview + confirm flow)
- ECB FX utility/cache for cross-currency normalization
- Frontend account views, add-account flow, and CSV import UX
- Parser fixtures and test coverage for CSV and FX utility paths

Merged PR track summary:
- Data track merged (`codex/s2-data`, PR #7)
- DB track merged (`codex/s2-db`, PR #8)
- Backend track merged (`codex/s2-backend`, PR #10)
- Frontend track merged (`codex/s2-frontend-writable`, PR #9)
- Integration/QA track intentionally deferred for later pass

## Next Sprint Plan (Sprint 3)
Objective: turn imported account data into a household-level intelligence layer with reliable aggregation and first AI narrative output.

Planned delivery:
- Balance sheet APIs (`/api/balance-sheet`, `/api/balance-sheet/history`)
- Net worth and allocation experience in UI (household + per-member view)
- Daily snapshots for history continuity
- Weekly AI narrative pipeline with fallback behavior
- Dashboard cards for live net worth + "What Changed This Week"

## Sprint 3 Deep-Dive Section

### Sprint Goal Compared to Sprint 1 and 2

| Sprint | Core outcome | User-visible value shift |
|---|---|---|
| Sprint 1 | Foundation (auth, household, app shell) | User can create/join a household and access a secure app |
| Sprint 2 | Data ingestion (accounts + CSV + FX normalization primitives) | User can onboard real account data and see holdings/transactions |
| Sprint 3 | Intelligence layer (balance sheet + narrative insight) | User can understand overall financial position and weekly change story |

Sprint 3 is the transition from "data collected" to "data explained."  
It must keep Sprint 2 source-of-truth principles: imported/provider values are authoritative, and no live security repricing engine is introduced.

### Sprint 3 Scope

In-scope:
- Household balance sheet aggregation with account visibility rules
- Balance sheet history endpoint backed by snapshots
- Daily account/household snapshot job
- AI weekly narrative generation endpoint + caching/fallback
- Frontend balance sheet page and dashboard summary cards
- Data freshness and coverage messaging in UX

Out-of-scope:
- Quarterly review generation
- Life event playbooks
- Fitness score feature set
- PSD2/FiDA providers or live broker APIs
- Full timeline feature set expansion

### Fresh Branches and Worktrees

Create all Sprint 3 branches from latest `origin/main` (do not reuse stale branches).

| Lane | Branch | Worktree |
|---|---|---|
| DB | `codex/s3-db` | `/Users/isacandersson/Documents/projects/fyrk_worktrees/s3_db` |
| Backend | `codex/s3-backend` | `/Users/isacandersson/Documents/projects/fyrk_worktrees/s3_backend` |
| AI | `codex/s3-ai` | `/Users/isacandersson/Documents/projects/fyrk_worktrees/s3_ai` |
| Frontend | `codex/s3-frontend` | `/Users/isacandersson/Documents/projects/fyrk_worktrees/s3_frontend` |
| Integration (optional) | `codex/s3-integration` | `/Users/isacandersson/Documents/projects/fyrk_worktrees/s3_integration` |

Initialization sequence:
1. `git checkout main`
2. `git pull --ff-only origin main`
3. `git worktree add /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_db -b codex/s3-db origin/main`
4. `git worktree add /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_backend -b codex/s3-backend origin/main`
5. `git worktree add /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_ai -b codex/s3-ai origin/main`
6. `git worktree add /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_frontend -b codex/s3-frontend origin/main`
7. `git worktree add /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_integration -b codex/s3-integration origin/main`

### Parallelization Guardrails

File ownership:
1. `codex/s3-db` owns `src/db/schema/*` and `src/db/migrations/*`
2. `codex/s3-backend` owns `src/app/api/balance-sheet/*`, `src/services/balance-sheet*`, `src/services/snapshot*`, `src/lib/calculations/*`, `src/lib/validations/balance-sheet*`
3. `codex/s3-ai` owns `src/lib/ai/*` and `src/app/api/ai/*`
4. `codex/s3-frontend` owns `src/app/(app)/balance-sheet/*`, `src/app/(app)/dashboard/*`, and Sprint 3 UI components
5. Shared-file gate: `src/types/domain.ts`, `package.json`, and lockfile are owned by `codex/s3-backend`

Cross-branch rules:
1. Rebase against `origin/main` before every push
2. No force-push on shared Sprint branches
3. If a lane needs a non-owned file, it must log a dependency and stop
4. Keep PRs scoped to one lane only

Strict merge sequence:
1. `codex/s3-db`
2. `codex/s3-backend`
3. `codex/s3-ai`
4. `codex/s3-frontend`
5. `codex/s3-integration` (if needed)

### Ready-to-Use Agent Prompts

#### Prompt 1: Sprint 3 DB Agent

```text
You are the Sprint 3 DB agent for Fyrk.

Workspace: /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_db
Branch: codex/s3-db
Base: origin/main

Goal:
Add Sprint 3 persistence for balance-sheet history and AI narrative caching.

Deliver:
1) Migration: src/db/migrations/0003_sprint3_balance_sheet_ai.sql
2) New/expanded schema exports for:
   - household snapshots (household-level daily totals)
   - weekly narratives cache table (per household, as-of week)
   - any supporting indexes/FKs needed for fast history queries
3) RLS policies aligned with SECURITY.md and household membership model.

Allowed files:
- src/db/schema/*
- src/db/migrations/*

Forbidden:
- src/app/api/*
- src/services/*
- src/lib/ai/*
- frontend files

Constraints:
- Preserve Sprint 2 source-of-truth: imported/provider values remain authoritative.
- Use snake_case columns and timestamptz conventions.
- Soft delete conventions only where mutable entities require it.

Exit criteria:
- migration applies cleanly
- schema compiles through index exports
- RLS exists for all Sprint 3 tables
- PR includes migration notes and rollback considerations
```

#### Prompt 2: Sprint 3 Backend Agent

```text
You are the Sprint 3 Backend agent for Fyrk.

Workspace: /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_backend
Branch: codex/s3-backend
Base: origin/main (after s3-db merge)

Goal:
Implement balance-sheet aggregation and history APIs plus snapshot jobs.

Deliver endpoints:
1) GET /api/balance-sheet?householdId=...
2) GET /api/balance-sheet/history?householdId=...&period=...
3) Internal snapshot runner route for scheduled jobs (daily account/household snapshot generation)

Deliver services:
1) BalanceSheetService (net worth, assets/liabilities, allocation, data quality)
2) SnapshotService (daily rollups, idempotent writes)
3) Zod validation schemas for all new query params

Allowed files:
- src/app/api/balance-sheet/*
- src/app/api/cron/*
- src/services/balance-sheet*
- src/services/snapshot*
- src/lib/calculations/*
- src/lib/validations/balance-sheet*
- src/types/domain.ts (owner)
- package.json + lockfile (owner)

Forbidden:
- src/db/schema/* edits
- src/lib/ai/*
- frontend files

Constraints:
- Enforce auth + household membership checks everywhere.
- Respect account visibility modes in household aggregation.
- Use ECB FX utility for normalization only; no live repricing engine.
- API error shapes must align with docs/API_SPEC.md.

Exit criteria:
- endpoints compile and return contract-consistent payloads
- snapshot job is idempotent for same day reruns
- backend contract tests added for auth/visibility/period handling
- package-level test command is enabled and runnable in CI
```

#### Prompt 3: Sprint 3 AI Agent

```text
You are the Sprint 3 AI agent for Fyrk.

Workspace: /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_ai
Branch: codex/s3-ai
Base: origin/main (after s3-backend merge)

Goal:
Implement weekly narrative generation pipeline with robust fallback behavior.

Deliver:
1) OpenAI client wiring under src/lib/ai/*
2) Context assembler from household + balance sheet deltas
3) Prompt template(s) for weekly narrative aligned with docs/LLM_INTEGRATION.md
4) POST /api/ai/narrative endpoint with:
   - structured output validation
   - cache lookup/write
   - graceful fallback payload when AI generation fails
5) Optional cron route for weekly generation trigger

Allowed files:
- src/lib/ai/*
- src/app/api/ai/*
- tests/fixtures/ai/* (if needed)

Forbidden:
- src/db/schema/*
- src/services/balance-sheet*
- frontend files
- package.json/lockfile edits (backend owner only)

Constraints:
- No personalized investment recommendations.
- Tone and voice must align with BRAND_GUIDELINES.md warm-authority principles.
- Keep token usage bounded and deterministic with schema validation.

Exit criteria:
- narrative endpoint works on-demand for a household
- failed model call returns fallback data without crashing user flow
- tests cover prompt output schema validation + fallback path
```

#### Prompt 4: Sprint 3 Frontend Agent

```text
You are the Sprint 3 Frontend agent for Fyrk.

Workspace: /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_frontend
Branch: codex/s3-frontend
Base: origin/main (after s3-backend and s3-ai merge)

Goal:
Ship Sprint 3 user experience for household balance sheet and weekly narrative.

Deliver:
1) /balance-sheet page with:
   - net worth summary
   - assets vs liabilities
   - allocation blocks (asset class, geography, currency, sector)
   - member toggle (household vs member lens)
2) Dashboard updates:
   - net worth summary card
   - "What Changed This Week" narrative card
3) Data freshness + partial coverage states
4) Empty, loading, and error states for all new views

Allowed files:
- src/app/(app)/balance-sheet/*
- src/app/(app)/dashboard/*
- src/components/balance-sheet*
- src/components/dashboard*
- sprint-3-specific hooks/view-model helpers

Forbidden:
- src/app/api/*
- src/services/*
- src/db/schema/*
- package.json/lockfile edits

Constraints:
- Use BRAND_GUIDELINES.md as source of truth.
- Display provider/imported values and as-of dates clearly.
- Avoid language implying live market repricing.

Exit criteria:
- balance-sheet and dashboard views complete on desktop/mobile
- accessibility checks pass for core interactions
- UI handles fallback narrative response without breaking layout
```

#### Prompt 5: Sprint 3 Integration Agent (Optional)

```text
You are the Sprint 3 integration agent for Fyrk.

Workspace: /Users/isacandersson/Documents/projects/fyrk_worktrees/s3_integration
Branch: codex/s3-integration
Base: origin/main after s3-db/s3-backend/s3-ai/s3-frontend merges

Goal:
Stabilize end-to-end Sprint 3 behavior without expanding scope.

Deliver:
1) E2E sanity pass: imported data -> balance sheet -> narrative card
2) Fix-forward integration bugs only
3) Final Sprint 3 progress log update and release notes snippet

Allowed files:
- minimal changes across integrated modules
- tests/docs updates tied to Sprint 3 acceptance

Forbidden:
- net-new features outside Sprint 3 acceptance criteria
```

### Tests Required for Sprint 3

Test infrastructure gate:
1. Add and enforce `npm run test` so CI test job is no longer effectively optional.
2. CI must run and fail on test regressions (no skipped-by-missing-script path).

Unit tests:
1. Balance sheet calculation math (assets, liabilities, net worth, allocation percentages).
2. Visibility filtering logic (full, amount_hidden, private).
3. History period aggregation (`1m`, `3m`, `6m`, `12m`, `all`) and edge dates.
4. AI schema validation for structured narrative output.
5. AI fallback path when OpenAI call fails or returns invalid schema.

API integration tests:
1. `GET /api/balance-sheet` auth and household membership checks.
2. `GET /api/balance-sheet` mixed currency normalization using stored FX snapshot metadata.
3. `GET /api/balance-sheet/history` query validation and deterministic ordering.
4. `POST /api/ai/narrative` cache hit vs cache miss behavior.
5. Snapshot job idempotency for reruns on the same snapshot date.

Frontend tests:
1. Balance sheet page loading, success, empty, and error states.
2. Member toggle updates displayed totals consistently.
3. Dashboard narrative card renders AI and fallback responses.
4. Data freshness badges/messages render with correct as-of metadata.

Manual end-to-end smoke:
1. Import Avanza/Nordnet CSV (Sprint 2 path), then verify balance-sheet totals appear.
2. Trigger narrative generation, verify card content and fallback behavior.
3. Validate partner visibility behavior on household-level rollups.

Hard acceptance gates:
1. `npm run lint`
2. `npm run type-check`
3. `npm run test`
4. `npm run build`
5. All Sprint 3 endpoints and UI flows pass smoke checks on Vercel preview

## Open Risks / Watchpoints
- Single Supabase environment across preview + production increases risk of accidental production data writes from previews.
- Email infrastructure (Resend/domain verification) not yet configured for invite/confirmation workflows.
- Market data remains intentionally minimal for prototype (FX only).

## Recurring Sprint Log Template

Copy this block for each upcoming sprint cycle.

```md
## Sprint X (YYYY-MM-DD to YYYY-MM-DD)
Status: Not Started | In Progress | Completed | Blocked
Objective:
- ...

Scope committed:
- ...

Parallel tracks:
- Architect:
- DB:
- Backend:
- Frontend:
- AI/Data:

Delivered (merged to main):
- ...

Carry-over / deferred:
- ...

Decisions made:
- ...

Risks and mitigations:
- ...

Next sprint prerequisites:
- ...
```
