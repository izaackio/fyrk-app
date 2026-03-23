# Sprint 3 — Balance Sheet & Intelligence

> **Status:** COMPLETE
> **Goal:** Household balance sheet with allocation views. First AI feature: weekly narrative ("What Changed This Week").
> **Dates:** Weeks 5-6 (~2026-03-03)

---

## Delivered

- Household balance sheet APIs with history endpoint
- Daily snapshot cron route/service with idempotent writes
- Balance sheet calculation service and validation layer
- Deterministic financial logic modules (net-worth, allocation, fx, assumptions)
- Weekly AI narrative endpoint with cache + fallback behavior
- OpenAI client wiring (custom HTTP client, not SDK)
- Balance sheet and dashboard insight UI experiences
- Sprint 3 schema additions for household snapshots and narrative cache

## Merged PRs

| PR | Branch | Merged | Description |
|----|--------|--------|-------------|
| #11 | `codex/s3-db` | 2026-03-03 | Balance-sheet history and weekly narrative cache schema |
| #12 | `codex/progress-log-s3-final` | 2026-03-02 | Sprint 3 runbook documentation |
| #13 | `codex/s3-backend` | 2026-03-03 | Balance-sheet APIs and daily snapshot cron |
| #14 | `codex/s3-frontend` | 2026-03-03 | Balance-sheet and dashboard insight UX |
| #15 | `codex/s3-ai` | 2026-03-03 | Weekly narrative generation with fallback |
| #18 | `codex/s34-scope-finlogic-v2` | 2026-03-03 | Sprint 3/4 scope update + financial logic spec |
| #20 | `codex/s3-backend-finlogic-release` | 2026-03-04 | Backend alignment with deterministic financial logic spec |

## Assumed Tasks (Retrospective)

| Task | Lane | Scope | Status |
|------|------|-------|--------|
| T1 | DB | Household snapshots, narrative cache schema, migration 0003 | COMPLETE |
| T2 | Backend | Balance sheet aggregation, history, snapshot cron, financial logic modules | COMPLETE |
| T3 | AI | OpenAI client, context assembler, weekly narrative pipeline + fallback | COMPLETE |
| T4 | Frontend | Balance sheet page, allocation views, dashboard narrative card | COMPLETE |
| T5 | Backend | Financial logic alignment follow-up (net-worth, allocation, fx, assumptions) | COMPLETE |

## Key Decisions

- Custom OpenAI HTTP client (no SDK dependency) — direct fetch with JSON mode
- "LLM never does math" rule: narrative interprets pre-computed deterministic values only
- Integration lane intentionally not run this cycle
- Financial logic spec introduced mid-sprint to formalize deterministic calculation modules

## Definition of Done (Retrospective)

- [x] Balance sheet page shows unified household net worth
- [x] AI weekly narrative generates successfully with fallback
- [x] Dashboard shows live net worth + narrative card
- [x] Deterministic calculation tests pass
- [x] All 5 agent lanes merged to main (DB, backend, frontend, AI, backend follow-up)
