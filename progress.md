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
| Sprint 2 | Accounts & data (manual + CSV + FX) | Completed | DB, data, backend, and frontend tracks merged to `main`; QA track intentionally skipped for now |
| Sprint 3 | Balance sheet + first AI narrative | Not Started | Next up after Sprint 2 merge completion |
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
Objective: deliver first real-data usable prototype workflow from account onboarding through CSV imports and normalized aggregation.

Delivered:
- Manual account setup flow
- CSV import parsing pipeline (Avanza + Nordnet) with normalized row modeling
- Accounts/import DB schema additions with RLS controls
- Accounts and import backend APIs/services (preview + confirm flow)
- ECB FX utility/cache for cross-currency normalization
- Frontend account views, add account flow, and CSV import UX
- Parser fixtures and tests for CSV and FX utility paths

Merged PR track summary:
- Data track merged (`codex/s2-data`, PR #7)
- DB track merged (`codex/s2-db`, PR #8)
- Backend track merged (`codex/s2-backend`, PR #10)
- Frontend track merged (`codex/s2-frontend-writable`, PR #9)
- Integration/QA track intentionally deferred/skipped in this cycle

## Next Sprint Plan (Sprint 3)
Objective: deliver balance-sheet level visibility and first AI narrative layer on top of the imported household/account data foundation.

Planned delivery:
- Household-level balance sheet aggregation and presentation
- Narrative/insight generation pass over imported account and transaction data
- Clear as-of/freshness handling in portfolio narrative surfaces
- Strengthened test coverage around aggregation and narrative endpoints

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
