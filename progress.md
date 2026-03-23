# FYRK Development Progress Log

This document is the running delivery log for Fyrk. Update it at the end of every sprint cycle and after major merges.

## Status Legend
- `Not Started`: no implementation work started
- `In Progress`: active branch work and/or open PRs
- `Completed`: merged to `main`
- `Blocked`: cannot proceed due to dependency or external constraint

## Current Snapshot
- Last updated: 2026-03-23
- Baseline branch: `main`
- Product phase: Prototype build-out → Design system migration

| Sprint | Scope | Status | Notes |
|---|---|---|---|
| Sprint 0 | Pre-launch waitlist page | Completed | Waitlist page live at fyrk.com |
| Sprint 1 | Foundation (arch + DB + backend + frontend shell) | Completed | All Sprint 1 agent tracks merged to `main` |
| Sprint 2 | Accounts & data (manual + CSV + FX) | Completed | DB, data, backend, and frontend tracks merged to `main`; QA track intentionally skipped |
| Sprint 3 | Balance sheet + first AI narrative | Completed | DB, backend, frontend, and AI lanes merged to `main`; integration lane not run |
| Sprint 4 | Timeline + life event + fitness | Completed | Timeline entries, life events, playbooks, fitness scoring delivered |
| Sprint 5 | Quarterly review + governance | Completed | Quarterly reviews, proposals, governance flows delivered |
| Sprint 6 | Demo data + polish + launch prep | Completed | Data seed, backend hardening, AI precompute, frontend polish, and release validation lanes merged |
| Sprint 7 | **Design system migration — "10x Financial Copilot"** | **In Progress** | Phases A-B complete (PRs #38-40, #51-52). Phase C (T3-T6 color migration) in progress. See [`docs/sprints/sprint-7/SPRINT.md`](docs/sprints/sprint-7/SPRINT.md) |
| Sprint 8 | Interaction quality + copilot polish | Not Started | Feed cards, ⌘K command bar, motion, density modes. Builds on S7 design system |
| Sprint 9 | Data access + provider integration | Not Started | Tink PSD2, Avanza API, provider_connections |
| Sprint 10 | Auto-generated timeline + charts | Not Started | Detection engine, auto-timeline, Recharts |
| Sprint 11 | Intelligence + optimization | Not Started | Optimization engine, enhanced narrative, MarketConfig |
| Sprint 12 | Weekly email + notification pipeline | Not Started | Resend integration, consent management, proactive alerts |
| Sprint 13 | Scale preparation + agent architecture | Not Started | Temporal.io, production Tink, Insurely |

## Sprint-by-Sprint Progress

### Sprint 0 — Pre-Launch Waitlist Page
> **Full record:** [`docs/sprints/sprint-0/SPRINT.md`](docs/sprints/sprint-0/SPRINT.md)

Delivered: Landing page, waitlist UX, SEO metadata, analytics hooks. Backend (PR #43) merged retroactively during S7.
PRs: #17, #19, #43

### Sprint 1 — Foundation
> **Full record:** [`docs/sprints/sprint-1/SPRINT.md`](docs/sprints/sprint-1/SPRINT.md)

Delivered: Next.js scaffold, CI, DB schema + RLS, auth + household APIs, frontend shell + onboarding.
PRs: #2, #3, #4, #5, #6

### Sprint 2 — Accounts & Data
> **Full record:** [`docs/sprints/sprint-2/SPRINT.md`](docs/sprints/sprint-2/SPRINT.md)

Delivered: Account setup, CSV import (Avanza + Nordnet), ECB FX normalization, account views + import UX.
PRs: #7, #8, #9, #10

### Sprint 3 — Balance Sheet & Intelligence
> **Full record:** [`docs/sprints/sprint-3/SPRINT.md`](docs/sprints/sprint-3/SPRINT.md)

Delivered: Balance sheet aggregation + history, daily snapshot cron, weekly AI narrative with fallback, dashboard insights.
PRs: #11, #12, #13, #14, #15, #18, #20

### Sprint 4 — Timeline, Life Events & Fitness
> **Full record:** [`docs/sprints/sprint-4/SPRINT.md`](docs/sprints/sprint-4/SPRINT.md)

Delivered: Timeline CRUD, life-event playbooks, fitness scoring, deterministic financial logic expansion, integration pass.
PRs: #21, #22, #23, #24, #25

### Sprint 5 — Quarterly Review & Governance
> **Full record:** [`docs/sprints/sprint-5/SPRINT.md`](docs/sprints/sprint-5/SPRINT.md)

Delivered: Quarterly review generation, proposal governance (create/approve/reject/comment), audit trail, fix-forward integration.
PRs: #26, #27, #28, #29, #30, #31

### Sprint 6 — Demo Data, Polish & Launch Prep
> **Full record:** [`docs/sprints/sprint-6/SPRINT.md`](docs/sprints/sprint-6/SPRINT.md)
> **Release notes:** [`docs/sprints/sprint-6/RELEASE_NOTES.md`](docs/sprints/sprint-6/RELEASE_NOTES.md)

Delivered: Deterministic demo seed, backend hardening, GDPR endpoints, AI precompute/fallback, frontend polish, release validation.
PRs: #32, #33, #34, #35, #36, #37

### Sprint 7 — Design System Migration: "10x Financial Copilot" (In Progress)

> **Authoritative tracker:** [`docs/sprints/sprint-7/SPRINT.md`](docs/sprints/sprint-7/SPRINT.md)
> **Sprint framework:** [`docs/sprints/SPRINT_GUIDELINES.md`](docs/sprints/SPRINT_GUIDELINES.md)

Objective: migrate the entire codebase from "Warm Authority" to the approved "10x Financial Copilot" design system — new fonts, new colors, new logo, zero old-palette remnants. Includes brand hardening, backend/AI quality tightening, and full color token migration.

#### Phase A — Brand Hardening (Complete)
Early Sprint 7 work that tightened backend contracts, frontend brand surfaces, and AI tone quality ahead of the design system migration.

Merged PRs:
- PR #38 — Backend regression coverage (`codex/s7-backend-regression`)
- PR #39 — Frontend brand surfaces (`codex/s7-frontend-brand`)
- PR #40 — AI tone quality (`codex/s7-ai-quality`)

#### Phase B — Foundation + Logo (Complete)
Core design system migration: new fonts (DM Sans + Instrument Serif), new color tokens, brand guidelines rewrite, and ƒ logo mark.

Merged PRs:
- PR #51 — Foundation: fonts, color tokens, brand guidelines (`design/phase-1-foundation`)
- PR #52 — Logo: Instrument Serif italic ƒ mark (`codex/design/phase-2-logo`)

#### Phase C — Component Color Migration (TODO — 4 parallel tasks)
Replace all hardcoded old-palette `rgb()` values in component CSS modules with new design tokens. See task prompts in `docs/sprints/sprint-7/tasks/`.

| Task | File | Status |
|------|------|--------|
| T3 | `theme.module.css` | TODO |
| T4 | `shell.module.css` | TODO |
| T5 | `landing.module.css` | TODO |
| T6 | `dashboard-insights.module.css` | TODO |

All four tasks can run in parallel (zero shared files).

## Current Active Sprint (Sprint 7 — Phase C)
Objective: complete the remaining color migration tasks (T3-T6) to reach zero old-palette references in `src/`.

Definition of Done: see `docs/sprints/sprint-7/SPRINT.md` for full automated + visual verification checklist.

## Open Risks / Watchpoints

- Single Supabase environment across preview + production increases risk of accidental production data writes from previews.
- Email infrastructure (Resend/domain verification) not yet configured for invite/confirmation workflows.
- Market data remains intentionally minimal for prototype (FX only).

---

> **Sprint source of truth:** All sprint records, task prompts, and execution guidelines live under [`docs/sprints/`](docs/sprints/). This file is a delivery log with pointers — not a planning document.
> **Sprint framework:** [`docs/sprints/SPRINT_GUIDELINES.md`](docs/sprints/SPRINT_GUIDELINES.md)
