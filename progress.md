# FYRK Development Progress Log

This document is the running delivery log for Fyrk. Update it at the end of every sprint cycle and after major merges.

## Status Legend
- `Not Started`: no implementation work started
- `In Progress`: active branch work and/or open PRs
- `Completed`: merged to `main`
- `Blocked`: cannot proceed due to dependency or external constraint

## Current Snapshot
- Last updated: 2026-02-27
- Baseline branch: `main`
- Latest merged commit on `main`: `e4d360c`
- Product phase: Prototype build-out

| Sprint | Scope | Status | Notes |
|---|---|---|---|
| Sprint 0 | Pre-launch waitlist page | In Progress | Planning and runbook added; implementation pending |
| Sprint 1 | Foundation (arch + DB + backend + frontend shell) | Completed | All Sprint 1 agent tracks merged to `main` |
| Sprint 2 | Accounts & data (manual + CSV + FX) | Next Up | Branches prepared for parallel execution |
| Sprint 3 | Balance sheet + first AI narrative | Not Started | Pending Sprint 2 completion |
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

## Next Sprint Plan (Sprint 2)
Objective: make the prototype usable with real user financial data imports.

Planned delivery:
- Manual account setup flow
- CSV import pipeline (Avanza + Nordnet)
- Holdings/transactions persistence and views
- ECB FX integration for cross-currency normalization
- Provider-reported values as source of truth (no live security repricing engine in prototype)

Parallel workstreams:
- `codex/s2-data-fx-csv`: CSV parsers + ECB FX utility
- `codex/s2-backend`: account/import APIs and services
- `codex/s2-frontend`: add-account/import/account detail UX

Merge sequence for Sprint 2:
1. Data utilities
2. Backend APIs/services
3. Frontend integration

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
