# FYRK Development Progress Log

This document is the running delivery log for Fyrk. Update it at the end of every sprint cycle and after major merges.

## Status Legend
- `Not Started`: no implementation work started
- `In Progress`: active branch work and/or open PRs
- `Completed`: merged to `main`
- `Blocked`: cannot proceed due to dependency or external constraint

## Current Snapshot
- Last updated: 2026-03-09
- Baseline branch: `main`
- Latest merged commit on `main`: `c61fe8b`
- Product phase: Prototype build-out

| Sprint | Scope | Status | Notes |
|---|---|---|---|
| Sprint 0 | Pre-launch waitlist page | In Progress | Landing page is live on `/`, but the waitlist API + persistence lane is not merged to `main` |
| Sprint 1 | Foundation (arch + DB + backend + frontend shell) | Completed | All Sprint 1 agent tracks merged to `main` |
| Sprint 2 | Accounts & data (manual + CSV + FX) | Completed | DB, data, backend, and frontend tracks merged to `main`; QA track intentionally skipped |
| Sprint 3 | Balance sheet + first AI narrative | Completed | DB, backend, frontend, and AI lanes merged to `main`; backend financial-logic follow-up also merged; integration lane not run |
| Sprint 4 | Timeline + life event + fitness | Completed | DB, backend/AI-services, frontend, and integration lanes merged to `main` |
| Sprint 5 | Quarterly review + governance | Completed | DB, backend, AI, frontend, and integration lanes merged to `main` |
| Sprint 6 | Demo data + polish + launch prep | In Progress | Demo seed foundation merged to `main`; backend hardening, AI precompute, frontend polish, and release lanes still pending |
| Sprint 6.5 | Design system hardening + UX QA | Not Started | Planned quality bridge between Sprint 6 delivery and Sprint 7 excellence pass |
| Sprint 7 | Brand excellence + interaction quality | Not Started | Final premium UI/UX hardening benchmarked to top-tier product quality |

## Sprint-by-Sprint Progress

### Sprint 0 (In Progress)
Objective: launch a branded pre-launch landing page on `fyrk.com` and capture early interest while the product is still being built.

Delivered on `main`:
- Root route `/` now serves the branded pre-launch landing page
- Marketing sections, waitlist form UX, and signup/demo CTAs are merged
- SEO metadata for the landing page is present
- Vercel analytics and Speed Insights script hooks are present in the root layout

Sprint 0 agent status snapshot:
- Frontend agent: Completed and merged (PR #17, PR #19)
- Backend agent: Not merged to `main` (no merged `POST /api/waitlist` route or persistence table/schema)
- Architect/deployment lane: Not repo-verifiable from codebase state alone

Remaining gaps against Build Plan:
- The waitlist form on the landing page posts to `/api/waitlist`, but that route is not present on `main`
- The planned `waitlist_signups` persistence layer is not present on `main`
- End-to-end signup storage and duplicate-safe confirmation are therefore not complete on `main`
- Production deployment, DNS, and Lighthouse gate results cannot be verified from repo state alone

Sprint 0 achieved outcome so far:
- Fyrk has a production-facing pre-launch landing experience on `main`, but it does not yet have the merged backend needed to capture real waitlist signups end-to-end.

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

Sprint 1 agent status snapshot:
- Architect agent: Completed and merged (PR #2)
- DB agent: Completed and merged (PR #3)
- Backend agent: Completed and merged (PR #5)
- Frontend agent: Completed and merged (PR #4)

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

Sprint 2 agent status snapshot:
- Data agent: Completed and merged (PR #7)
- DB agent: Completed and merged (PR #8)
- Backend agent: Completed and merged (PR #10)
- Frontend agent: Completed and merged (PR #9)
- Integration/QA agent: Intentionally skipped in this sprint cycle

### Sprint 3 (Completed)
Objective: turn imported account data into a household-level intelligence layer with reliable aggregation and first AI narrative output.

Delivered:
- Household balance sheet APIs with history endpoint
- Daily snapshot cron route/service with idempotent writes
- Balance sheet calculation service and validation layer
- Weekly AI narrative endpoint with cache + fallback behavior
- Balance sheet and dashboard insight UI experiences
- Sprint 3 schema additions for household snapshots and narrative cache

Merged PR track summary:
- DB track merged (`codex/s3-db`, PR #11)
- Backend track merged (`codex/s3-backend`, PR #13)
- Backend financial-logic follow-up merged (`codex/s3-backend-finlogic-release`, PR #20)
- Frontend track merged (`codex/s3-frontend`, PR #14)
- AI track merged (`codex/s3-ai`, PR #15)
- Integration lane (`codex/s3-integration`) intentionally not run in this cycle

Release train summary:
- Sprint 3 DB + backend merged on 2026-03-03
- Sprint 3 frontend + AI merged on 2026-03-03
- Sprint 3 backend financial-logic alignment follow-up merged on 2026-03-04
- Docs runbook merged on 2026-03-02 (PR #12)

Sprint 3 agent status snapshot:
- DB agent: Completed and merged (PR #11)
- Backend agent: Completed and merged (PR #13), with follow-up release merged (PR #20)
- Frontend agent: Completed and merged (PR #14)
- AI agent: Completed and merged (PR #15)
- Integration/QA agent: Intentionally not run in this sprint cycle

### Sprint 4 (Completed)
Objective: add household financial timeline, first life-event playbook flow, and initial fitness scoring surfaces.

Delivered:
- Timeline API + UI delivery (`/api/timeline`, `/timeline`) including create/update/delete support
- Life-event library, trigger flow, and playbook action update endpoints
- Fitness score APIs, deterministic calculation coverage, and frontend score surfaces
- Sprint 4 schema/migration additions for timeline entries, life events, playbook actions, and fitness scores
- AI interpretation for life-event playbooks and fitness explanation fallbacks

Merged PR track summary:
- DB track merged (`codex/s4-db`, PR #21)
- AI/services track merged (`codex/s4-ai`, PR #23)
- Frontend track merged (`codex/s4-frontend`, PR #22)
- Backend API/services scope delivered in `codex/s4-ai` lane for this sprint cycle (no dedicated `codex/s4-backend` branch)

Sprint 4 integration/scope-lock summary (2026-03-05):
- Branch: `codex/s4-integration` from latest `origin/main`
- Sanity checks executed: `npm run lint`, `npm run type-check`, `npm test`, `npm run test:sprint3-backend`, `npm run build`
- Result: all checks green; no reproducible regressions found in integration lane
- Scope lock: no net-new features added during integration pass; bug-fix-only policy maintained

Sprint 4 agent status snapshot:
- DB agent: Completed and merged (PR #21)
- Backend agent: Completed via AI/services lane merge (PR #23)
- AI agent: Completed and merged (PR #23)
- Frontend agent: Completed and merged (PR #22)
- Integration/QA agent: Completed and merged (PR #24)

### Sprint 5 (Completed)
Objective: deliver quarterly review generation and governance proposal workflows.

Delivered:
- Quarterly review persistence, APIs, generation flow, and PDF readiness contract
- Proposal governance persistence, APIs, approvals, rejection, comments, and audit trail support
- AI quarterly review and proposal-impact pipelines with schema validation
- Frontend quarterly review and proposal governance UX, including dashboard summary states
- Integration fix-forward pass to stabilize approval, timeline-linking, and review-generation flows

Merged PR track summary:
- DB track merged (`codex/s5-db`, PR #26)
- Backend track merged (`codex/s5-backend`, PR #30)
- AI track merged (`codex/s5-ai`, PR #27)
- Frontend track merged (`codex/s5-frontend`, PR #28)
- Integration track merged (`codex/s5-integration`, PR #29)

Sprint 5 integration/QA summary (2026-03-06):
- Branch: `codex/s5-integration`
- Sanity checks executed:
  - `npx tsx --test src/components/sprint5/fallback.integration.test.ts`
  - `npm run lint`
  - `npm run type-check`
  - `npm test`
- Result: all checks green
- Fix-forward outcomes:
  - Proposal approval now stays `pending` until all required household approvals are recorded
  - Proposal approve/reject transitions now write decision timeline entries and populate `timelineEntryId`
  - Quarterly review generation now writes a review timeline entry and populates `timelineEntryId`
  - Approval actions now append audit comments to proposal discussion history
  - Proposal UI now distinguishes partial approval recording vs final approval completion

Sprint 5 agent status snapshot:
- DB agent: Completed and merged (PR #26)
- Backend agent: Completed and merged (PR #30)
- AI agent: Completed and merged (PR #27)
- Frontend agent: Completed and merged (PR #28)
- Integration/QA agent: Completed and merged (PR #29)

Sprint 5 achieved outcome:
- Fyrk now supports household review generation and governance workflows end-to-end: reviews can be generated and read, proposals can be created and discussed, approvals/rejections are tracked, and governance events are written back into the household timeline with auditability.

### Sprint 6 (In Progress)
Objective: deliver demo-mode readiness, onboarding polish, and launch-baseline product hardening.

Delivered on `main` so far:
- Deterministic demo household dataset builder and seed runner
- Demo dataset tests to verify repeatability and exact record counts
- Seeding documentation and package scripts for reset/seed flows

Merged PR track summary:
- Data/DB seed track merged (`codex/s6-data-seed`, PR #32)

Sprint 6 agent status snapshot:
- Data/DB seed agent: Completed and merged (PR #32)
- Backend hardening agent: Not started on `main`
- AI precompute agent: Not started on `main`
- Frontend polish agent: Not started on `main`
- Integration/release agent: Not started on `main`

Sprint 6 achieved outcome so far:
- Fyrk now has a deterministic demo-data foundation for launch prep, but the runtime demo mode, hardening, and final release lanes are still pending.

## Current Active Sprint (Sprint 6)
Objective: finish demo-mode readiness, onboarding polish, and launch-baseline product hardening.

Planned delivery:
- Seed 4 high-quality demo household variants with realistic data and derived artifacts
- Add demo-mode initialization and GDPR/data-handling endpoints
- Polish onboarding, empty/loading/error states, and public-to-product transitions
- Strengthen launch-quality reliability, security, accessibility, and performance
- Prepare a demo-ready release baseline before Sprint 6.5/7 quality hardening

Upcoming quality runway after Sprint 5:
- Sprint 6: demo data, onboarding polish, launch baseline
- Sprint 6.5: focused design-system consistency, interaction QA, and accessibility/performance regression hardening
- Sprint 7: benchmark-grade brand and interaction excellence pass

## Sprint 3 Deep-Dive Section (Archived Plan)

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
