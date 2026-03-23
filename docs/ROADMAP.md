# FYRK — Product Roadmap
## From Prototype to Scale

> **Version:** 1.0
> **Last updated:** 2026-03-23
> **Audience:** Product owner, agents needing scope boundaries, investors
> **Execution:** [`sprints/SPRINT_GUIDELINES.md`](./sprints/SPRINT_GUIDELINES.md) — how sprints are structured, parallelized, and delivered

---

## Product Arc

Fyrk moves through four phases from prototype to European scale. Each phase is a milestone with a clear outcome, not a task list.

```
PROTOTYPE (S0-S7)         → Demo-ready product with complete design system
POLISH & CONNECT (S8-S10) → Production-grade UX + live data from providers
INTELLIGENCE (S11-S12)    → Proactive recommendations + notification pipeline
SCALE (S13+)              → Multi-user infra, commercial partnerships, expansion
```

---

## Milestone Arc

| Milestone | Sprint | Outcome | Status |
|-----------|--------|---------|--------|
| **Buildable** | S1 | Auth works, household creation works, app deploys to Vercel | ✅ Complete |
| **Data-ready** | S2 | Users can add accounts and import CSV data across providers | ✅ Complete |
| **Intelligent** | S3 | Balance sheet aggregation + first AI narrative — the first "wow" | ✅ Complete |
| **Feature-complete** | S5 | All 5 product pillars represented in working prototype | ✅ Complete |
| **Demo-ready** | S6 | 4 demo households, polished UX, GDPR controls, deployable to fyrk.com | ✅ Complete |
| **Brand-ready** | S7 | Design system migrated to "10x Financial Copilot" — zero old-palette remnants | 🔄 In Progress |
| **Polished** | S8 | Interaction quality at Linear/Stripe benchmark — copilot feed, motion, density | Planned |
| **Connected** | S9 | Live data from banks (Tink PSD2) and brokers (Avanza API) | Planned |
| **Auto-intelligent** | S10 | Financial timeline auto-generated from transactions, charts live | Planned |
| **Advisor-grade** | S11 | Optimization engine with quantified savings recommendations | Planned |
| **Proactive** | S12 | Weekly email digest, consent management, proactive alerts | Planned |
| **Scalable** | S13 | Durable workflows (Temporal), production provider agreements | Planned |

---

## Sprint Outcomes

Each sprint ships a **product outcome** — not a list of tasks. Task-level execution lives in [`docs/sprints/sprint-{N}/`](./sprints/).

### Sprint 0 — Pre-Launch Waitlist Page
**Outcome:** fyrk.com is live with a branded landing page capturing early interest.

### Sprint 1 — Foundation
**Outcome:** A user can sign up, create a household, and see a working app shell. CI pipeline enforces quality from day one.

### Sprint 2 — Accounts & Data
**Outcome:** A user can add financial accounts manually or via Avanza/Nordnet CSV import. Holdings display with cross-currency normalization via ECB FX rates.

### Sprint 3 — Balance Sheet & Intelligence
**Outcome:** A household sees unified net worth, allocation views, and receives an AI-generated "What Changed This Week" narrative. The transition from "data collected" to "data explained."

### Sprint 4 — Timeline, Life Events & Fitness
**Outcome:** A household has a financial timeline, can trigger life-event playbooks (starting with "Buying first apartment"), and sees a 0-1000 Financial Fitness Score with transparent component breakdown.

### Sprint 5 — Quarterly Review & Governance
**Outcome:** AI generates comprehensive quarterly reviews. Partners can propose, discuss, and approve/reject financial decisions with full audit trail. All 5 product pillars are now represented.

### Sprint 6 — Demo Data, Polish & Launch Prep
**Outcome:** 4 demo households with deterministic data, polished onboarding, GDPR export/deletion, and release validation. The prototype is demo-ready.

### Sprint 7 — Design System Migration: "10x Financial Copilot"
**Outcome:** The entire UI runs on the approved design system — DM Sans + Instrument Serif typography, modern blue color palette, ƒ logo mark, zero warm-palette remnants. Brand guidelines v1.0 is fully implemented in code.

> **Execution tracker:** [`sprints/sprint-7/SPRINT.md`](./sprints/sprint-7/SPRINT.md)
> **Design concept:** [`design-10x.html`](./design-10x.html)

### Sprint 8 — Interaction Quality & Copilot Polish
**Outcome:** Every screen in the product meets Linear/Stripe interaction quality benchmarks. Copilot feed cards, ⌘K command bar stub, motion system, and density toggle ("narrative" vs "terminal") are live. Zero placeholder screens remain.

**Depends on:** S7 (design system complete)

### Sprint 9 — Data Access & Provider Integration
**Outcome:** Fyrk connects to live financial data. Tink PSD2 for bank accounts, Avanza API for broker positions. Manual balance update for non-connected accounts. The CSV-only limitation is removed.

**Depends on:** S2 (accounts schema), S4 (timeline schema)

### Sprint 10 — Auto-Generated Timeline & Charts
**Outcome:** The financial timeline auto-populates from imported transactions using a detection engine with confidence scoring. Balance sheet gets interactive charts (net worth trend, allocation donuts, account breakdowns). This is the "wow moment."

**Depends on:** S9 (live transaction data), S4 (timeline entries)

### Sprint 11 — Intelligence & Optimization
**Outcome:** Fyrk generates actionable optimization recommendations — subscription audit, insurance benchmarks, fund fee analysis, tax wrapper optimization. Each recommendation shows quantified monthly/annual savings potential.

**Depends on:** S10 (detection engine), S3 (AI narrative pipeline)

### Sprint 12 — Weekly Email & Notification Pipeline
**Outcome:** Fyrk comes to users proactively. Weekly digest emails via Resend, consent expiry warnings, data freshness alerts. Notification preferences are configurable.

**Depends on:** S11 (enhanced intelligence), S0 (email infrastructure)

### Sprint 13 — Scale Preparation & Agent Architecture
**Outcome:** Infrastructure supports multi-user scale. Cron jobs migrated to Temporal durable workflows. Production Tink commercial agreement. Per-household knowledge graph foundation.

**Depends on:** S9-S12 (all data + intelligence features)

---

## Feature Traceability

Every PRD feature maps to a sprint and milestone. This is the contract between product scope and execution.

### P0 — Must Ship in Prototype (S0-S7)

| Feature | ID | Sprint | Status |
|---------|-----|--------|--------|
| User registration & auth | F01 | S1 | ✅ Shipped |
| Household creation | F02 | S1 | ✅ Shipped |
| Individual profile setup | F03 | S1 | ✅ Shipped |
| Manual account entry | F04 | S2 | ✅ Shipped |
| CSV import (Avanza) | F05 | S2 | ✅ Shipped |
| CSV import (Nordnet) | F06 | S2 | ✅ Shipped |
| Holdings management | F07 | S2 | ✅ Shipped |
| Household Balance Sheet | F08 | S3 | ✅ Shipped |
| "What Changed" narrative | F09 | S3 | ✅ Shipped |
| Financial Timeline | F10 | S4 | ✅ Shipped |
| Life Event trigger | F11 | S4 | ✅ Shipped |
| Playbook: "Buying first apartment" | F12 | S4 | ✅ Shipped |
| Financial Fitness Score | F13 | S4 | ✅ Shipped |
| Quarterly Review | F14 | S5 | ✅ Shipped |
| Proposal flow | F15 | S5 | ✅ Shipped |
| Demo mode | F16 | S6 | ✅ Shipped |
| Settings & household mgmt | F17 | S1+S6 | ✅ Shipped |

### P1 — Nice-to-Have for Prototype

| Feature | ID | Sprint | Status |
|---------|-----|--------|--------|
| Extended Family linking | F18 | S13+ | Deferred |
| Circle creation | F19 | S13+ | Deferred |
| Liability tracking | F20 | S2 (partial) | ✅ Schema shipped |
| Pension manual entry | F21 | S2 (partial) | ✅ Schema shipped |
| Insurance coverage entry | F22 | S2 (partial) | ✅ Schema shipped |
| Additional life event playbooks | F23 | S11+ | Planned |
| Financial Fitness micro-actions | F24 | S11 | Planned |
| Notification system | F25 | S12 | Planned |

### P2 — Deferred to v1

| Feature | ID | Sprint | Status |
|---------|-----|--------|--------|
| PSD2 bank integration (Tink) | F26 | S9 | Planned |
| MinPension integration | F27 | Post-S13 | Deferred |
| Insurance data via Insurely | F28 | Post-S13 | Deferred |
| Multi-language (Swedish) | F29 | Post-S13 | Deferred |
| Mobile app (React Native) | F30 | Post-S13 | Deferred |
| Human-augmented quarterly review | F31 | Post-S13 | Deferred |
| B2B data product | F32 | Post-S13 | Deferred |

---

## Risk Mitigations

| Sprint | Risk | Mitigation |
|--------|------|------------|
| S7 | Design system migration introduces regressions | Per-file ownership, parallel agents on isolated files, grep-based PR gates. See [`sprints/sprint-7/SPRINT.md`](./sprints/sprint-7/SPRINT.md) |
| S7 | Instrument_Serif not in next/font/google | Fallback: next/font/local with self-hosted .woff2 |
| S8 | Visual polish sprint scope creep | Strict checklist against design-10x.html; no new features |
| S9 | Tink API sandbox limitations | Validate all data types before production agreement |
| S9 | Avanza unofficial API breaks | Build as opt-in; CSV always available as fallback |
| S10 | False positive auto-timeline detections | Confidence scoring + user confirmation; never auto-confirm below 0.8 |
| S11 | Optimization recommendations perceived as financial advice | Non-advisory framing everywhere: "tax impact comparison" not "tax advice" |
| S12 | Email deliverability issues | Resend with verified domain; monitor bounce rates |
| S13 | Temporal infrastructure complexity | Keep cron fallback; migrate gradually; monitor cost |

---

## Post-Prototype Roadmap

| Phase | Timeline | Key Outcomes |
|-------|----------|--------------|
| **Private Beta** | Months 4-6 | 50 real households; PSD2 for bank accounts; 10 life event playbooks |
| **Public Beta (Sweden)** | Months 7-12 | 1,000 households; Extended Family + Circles; Swedish i18n; premium tier with human reviews |
| **Nordic Expansion** | Months 13-24 | Norway, Denmark, Finland; FiDA integrations (investments, pensions); 10K households |
| **European Scale** | Months 24-48 | Pan-EU FiDA coverage; multi-market tax/wrapper support; B2B data products; 50K+ households |

---

## Testing Strategy

| Type | Tool | Coverage |
|------|------|----------|
| Unit tests | Node.js native `test` + `tsx --test` | Critical business logic (net worth, allocation, fitness, CSV parsing) |
| API integration | Same + mock Supabase client | All P0 endpoints, auth/visibility checks |
| AI validation | Zod schema tests against fixture outputs | All 5 AI pipelines (narrative, review, playbook, fitness, proposal impact) |
| Type checking | TypeScript strict (CI) | 100% — zero `any` types |
| Linting | ESLint (CI) | Zero warnings |
| E2E | Playwright (S8+) | Full onboarding + demo mode journey |

---

## Deployment Pipeline

```
Feature branch → GitHub Actions (lint + type-check + test)
    → Vercel preview deploy (unique URL per branch)
    → PR review + merge to main
    → Vercel auto-deploy to production (fyrk.com)
```

| Environment | Branch | URL | Database |
|-------------|--------|-----|----------|
| Local dev | Any | localhost:3000 | Supabase local |
| Preview | Feature branches | *.vercel.app | Supabase staging |
| Production | main | fyrk.com | Supabase production |

---

## Document Index

| Doc | Role | Audience |
|-----|------|----------|
| [`CONTEXT.md`](./CONTEXT.md) | Vision, users, pillars, principles, glossary | Everyone |
| [`PRD.md`](./PRD.md) | Feature map, user stories, screen inventory | Product + Frontend |
| **[`ROADMAP.md`](./ROADMAP.md)** | **Outcome-focused milestone arc (this doc)** | **Product + all agents** |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Tech stack, app structure, multi-agent patterns | Architect + all agents |
| [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md) | Design system, tokens, typography, components | Frontend |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | DB schema, tables, columns, indexes | DB + Backend |
| [`API_SPEC.md`](./API_SPEC.md) | API contracts, request/response shapes | Backend + Frontend |
| [`LLM_INTEGRATION.md`](./LLM_INTEGRATION.md) | AI pipeline, prompts, models | AI agent |
| [`EXTERNAL_DATA.md`](./EXTERNAL_DATA.md) | CSV parsers, market data, provider adapters | Data agent |
| [`SECURITY.md`](./SECURITY.md) | Auth, RLS, GDPR, audit | All agents |
| [`FINANCIAL_LOGIC.md`](./FINANCIAL_LOGIC.md) | Deterministic calc engine, formulas | Backend + AI |
| [`SEEDING.md`](./SEEDING.md) | Demo data structure, seed scripts | DB + Data |
| [`sprints/SPRINT_GUIDELINES.md`](./sprints/SPRINT_GUIDELINES.md) | Sprint execution framework | All agents |
| [`sprints/sprint-{N}/SPRINT.md`](./sprints/) | Per-sprint task tracker | Executing agents |

> **Deprecated:** `BUILD_PLAN.md` (replaced by this document + `sprints/`), `DESIGN_SPRINT.md`, `DB_STABILITY_SPRINT7.md`, `RELEASE_NOTES_SPRINT6_RC.md` — all superseded.
