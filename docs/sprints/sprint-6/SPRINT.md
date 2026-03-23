# Sprint 6 — Demo Data, Polish & Launch Prep

> **Status:** COMPLETE
> **Goal:** 4 demo households seeded, onboarding polished, fully demo-ready prototype baseline.
> **Dates:** Weeks 11-12 (~2026-03-07 to 2026-03-11)

---

## Delivered

- Deterministic demo household dataset builder and seed runner
- Demo dataset tests verifying repeatability and exact record counts
- Seeding documentation and package scripts for reset/seed flows
- Demo household initialization and demo cookie/context handling
- GDPR data export and account deletion endpoints (auth-gated)
- Deterministic AI artifact builders and demo-safe fallback behavior
- Onboarding, app-shell, route-state, and household/demo selector polish
- Release validation: regression pack, live demo reseed, production smoke, GDPR endpoint checks

## Merged PRs

| PR | Branch | Merged | Description |
|----|--------|--------|-------------|
| #32 | `codex/s6-data-seed` | 2026-03-07 | Deterministic demo DB seed foundation |
| #33 | `codex/progress-full-audit` | 2026-03-11 | Audit and reconcile sprint progress log |
| #34 | `codex/s6-backend-hardening` | 2026-03-11 | Backend hardening for demo mode and GDPR flows |
| #35 | `codex/s6-ai-precompute` | 2026-03-11 | Stabilize demo AI artifacts |
| #36 | `codex/s6-frontend-polish` | 2026-03-11 | Frontend polish |
| #37 | `codex/s6-integration-release` | 2026-03-11 | Sprint 6 release candidate validation |

## Assumed Tasks (Retrospective)

| Task | Lane | Scope | Status |
|------|------|-------|--------|
| T1 | Data/DB | Deterministic demo households (4 variants), seed runner, count tests | COMPLETE |
| T2 | Backend | Demo initialization, GDPR endpoints, rate limiting, error handling | COMPLETE |
| T3 | AI | Deterministic AI artifact builders, demo-safe fallback | COMPLETE |
| T4 | Frontend | Onboarding polish, demo selector, loading/empty/error states | COMPLETE |
| T5 | Integration | Regression pack, live demo reseed, production smoke, release validation | COMPLETE |

## Key Decisions

- All seed data uses real Swedish ISINs and realistic prices for demo fidelity
- Deterministic AI precompute ensures demo households have narrative/review/fitness artifacts without live generation
- GDPR endpoints (data export, account deletion) are auth-gated and return hardened error envelopes
- Release candidate validated locally via `next start` smoke + CI green

## Release Candidate

See [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) for the full Sprint 6 RC validation summary.

## Definition of Done (Retrospective)

- [x] Demo households functional with deterministic seed data
- [x] Onboarding flow polished with proper loading/error states
- [x] GDPR endpoints functional (export + delete)
- [x] Regression pack green: lint, type-check, test (81/81), build
- [x] Production smoke passed on `next start`
- [x] All 5 agent lanes merged to main
