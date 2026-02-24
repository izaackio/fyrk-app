# FYRK — Project Context
## AI Development Brief

> **Version:** 0.1 — Prototype
> **Last updated:** 2026-02-20
> **Status:** Pre-development
> **Related docs:** [PRD](./PRD.md) · [Architecture](./ARCHITECTURE.md) · [Data Model](./DATA_MODEL.md) · [API Spec](./API_SPEC.md) · [LLM Integration](./LLM_INTEGRATION.md) · [External Data](./EXTERNAL_DATA.md) · [Security](./SECURITY.md) · [Brand Guidelines](./BRAND_GUIDELINES.md) · [Build Plan](./BUILD_PLAN.md)

---

## 1. What Is Fyrk?

Fyrk is the **Digital Family Office** — an AI-powered financial operating system for households. It aggregates a household's complete financial life across all providers, runs continuous intelligence, orchestrates life-event-driven planning, and enables collaborative financial governance between partners and family members.

**One sentence:** *"Fyrk gives every household the financial coordination and intelligence that only ultra-wealthy families with private family offices have today — at €29/month."*

### What Fyrk Is

- A **cross-provider household balance sheet** — see everything in one place
- A **life-event orchestration engine** — every big moment has a financial playbook
- A **quarterly financial review system** — automated "family office meeting"
- A **financial fitness tracker** — an improvable 0–1000 score
- A **collaborative governance layer** — propose, discuss, approve, track

### What Fyrk Is NOT

- Not a broker (no trade execution)
- Not a bank (no money storage)
- Not a robo-advisor (no discretionary management)
- Not investment advice (cost/ops/tax impact guidance with disclaimers)
- Not a budgeting app (wealth management, not expense tracking)
- Not a data aggregator (aggregation is infrastructure, not the product)

---

## 2. Target Users

### Primary: Dual-income Nordic households with 3+ financial providers

These households typically have:
- 2 adults (25–55 years old), possibly children
- ISK + KF + depå accounts across Avanza and/or Nordnet
- PPM pension + 1–2 tjänstepension providers
- 1 mortgage + savings in a bank (SEB, Nordea, Handelsbanken, Swedbank)
- 1–2 insurance providers
- Shared financial goals but no shared financial system

### Pre-seeded demo households (4 variants)

| Variant | Name | Structure | Key scenario |
|---|---|---|---|
| **Standard** | Andersson | 2 adults + 2 children | Buying apartment, managing family finances, saving for kids |
| **FIRE** | Lindberg | 2 adults, no children | Aggressively saving/investing toward early retirement (Financial Independence, Retire Early) |
| **FamFamily** | Eriksson Clan | 2 linked households within same family (parents + adult children) | Estate planning, intergenerational coordination, inheritance preparation |
| **FriendlyFamily** | The Investment Circle | 2–3 households, friends/colleagues | Shared investment discussions, anonymized benchmarking, collaborative learning |

Each demo household includes 2+ years of realistic Swedish financial data: accounts, transactions, holdings, life events, decisions, and outcomes on the Financial Timeline.

---

## 3. Product Pillars (Prototype Scope)

### Pillar 1: Household Balance Sheet ✅ Full in prototype
- Unified net worth across all providers, both partners
- Asset allocation (class, geography, currency, sector)
- Liabilities (mortgage, loans)
- Cash & liquidity buckets
- Weekly "What Changed" AI-generated narrative

### Pillar 2: Life Event Engine ✅ One playbook in prototype
- Life event detection and triggering
- Personalized playbook generation (AI-powered)
- Checklist with assignments per household member
- Impact modeling (what-if scenarios)
- **Prototype:** "Buying first apartment in Sweden" as the showcase playbook

### Pillar 3: Quarterly Review ✅ v0 in prototype
- AI-generated comprehensive household review
- Performance attribution (market vs savings vs debt reduction vs drag)
- Recommendations ranked by impact
- Financial Fitness trend over time
- Upcoming events and preparation alerts

### Pillar 4: Financial Fitness Score ✅ v0 in prototype
- Composite score 0–1000
- 5 components: Buffer, Growth, Protection, Efficiency, Trajectory
- Transparent: every point explained
- Household-level: both partners contribute
- Weekly micro-actions for improvement

### Pillar 5: Household Governance ✅ Simple flow in prototype
- Proposals: either partner creates
- Auto-attached context (impact on allocation, risk, fitness score)
- Discussion thread
- Approval workflow
- Audit trail
- ~~SBR routing~~ — **Explicitly excluded from scope**

---

## 4. Multi-Entity Model

Fyrk operates across four concentric entity levels:

```
┌────────────────────────────────────────────────────┐
│  CIRCLE (Friends / Colleagues)                      │
│  ┌────────────────────────────────────────────┐     │
│  │  EXTENDED FAMILY (Parents / Siblings)       │     │
│  │  ┌────────────────────────────────────┐     │     │
│  │  │  HOUSEHOLD (Partners + Dependents)  │     │     │
│  │  │  ┌──────────────────────────┐       │     │     │
│  │  │  │  INDIVIDUAL (You)        │       │     │     │
│  │  │  └──────────────────────────┘       │     │     │
│  │  └────────────────────────────────────┘     │     │
│  └────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────┘
```

| Level | Privacy model | Governance | Prototype |
|---|---|---|---|
| **Individual** | Full — only you see | N/A | ✅ Yes |
| **Household** | Configurable per-account (full / amount-hidden / hidden) | Proposals + approvals | ✅ Yes |
| **Extended Family** | Granular per-account sharing permissions | Visibility only, no approvals | 🟡 P1 (nice-to-have) |
| **Circle** | Percentages only, never absolute amounts | Discussion only | 🟡 P1 (nice-to-have) |

---

## 5. Non-Negotiable Principles

1. **Transparency-first** — show the math; never black-box anything
2. **Household-native** — the entity is the household, not the individual
3. **Nordic-native** — ISK, KF, depå, PPM, tjänstepension, Swedish tax rules
4. **Privacy-controlled** — user chooses what to share at every level
5. **Aggregation is invisible** — users see intelligence, not data feeds
6. **Conservative by default** — when uncertain, understate, don't overpromise
7. **Non-advisory framing** — cost/ops/tax-impact guidance, not investment advice

---

## 6. Glossary of Domain Terms

| Term | Definition |
|---|---|
| **ISK** | Investeringssparkonto — Swedish tax-advantaged investment wrapper, taxed on a schablonintäkt (flat rate) rather than capital gains |
| **KF** | Kapitalförsäkring — insurance-based investment wrapper, different tax treatment, useful for certain situations |
| **Depå** | Traditional custody account with capital gains taxation |
| **PPM** | Premiepensionsmyndigheten — state-administered premium pension, part of Swedish public pension system |
| **Tjänstepension** | Occupational pension, employer-contributed, managed by various providers (Skandia, AMF, Alecta, SPP) |
| **Schablonintäkt** | Imputed income (ISK/KF taxation method) — taxed on account value, not realized gains |
| **FiDA** | Financial Data Access regulation (EU) — mandates open API access to investments, pensions, insurance data |
| **FISP** | Financial Information Service Provider — new licensed entity under FiDA |
| **PSD2** | Payment Services Directive 2 — mandates open API access to payment accounts |
| **MinPension** | Swedish service aggregating pension information across providers |
| **Insurely** | Swedish fintech providing API access to insurance + loan + pension data |
| **Household** | 2+ people managing finances jointly — the core Fyrk entity |
| **Extended Family** | Multiple households within the same family linked for coordination |
| **Circle** | Group of people (friends, colleagues) sharing anonymized financial intelligence |
| **Financial Timeline** | Chronological record of a household's financial life: events, decisions, outcomes |
| **Life Event** | Significant household milestone triggering a financial playbook |
| **Quarterly Review** | AI-generated comprehensive household financial review, quarterly cadence |
| **Financial Fitness** | Composite 0–1000 score measuring household financial health |
| **Playbook** | Sequenced set of financial actions triggered by a life event |
| **Proposal** | A financial decision proposed by one household member for approval by others |

---

## 7. Technical Constraints

| Constraint | Value |
|---|---|
| **Budget** | Pre-seed — minimize infrastructure costs; use free tiers |
| **Timeline** | 12 weeks (6 two-week sprints) to demo-ready prototype |
| **Team** | 1–2 developers + AI coding agents (Claude Code / Codex) |
| **Target platforms** | Web (responsive, desktop-first) + Mobile app (React Native later) |
| **Design** | Figma-ready component system; premium "family office" aesthetic |
| **Language** | Build in English; i18n architecture from day one; Swedish first localization |
| **Data access** | Manual + CSV for prototype; PSD2 via middleware for cash; FiDA-ready architecture |
| **AI costs** | Budget ~$200/month for LLM API calls during development |

---

## 8. Development Methodology

### Multi-agent development pattern

This project is designed for AI-assisted development with multiple agents working in parallel:

**Agent roles:**
- **Architect agent** — reads CONTEXT + ARCHITECTURE + DATA_MODEL → scaffolds project, generates migrations, sets up infrastructure
- **Backend agent** — reads API_SPEC + DATA_MODEL + SECURITY → implements API routes, services, RLS policies
- **Frontend agent** — reads BRAND_GUIDELINES + API_SPEC + PRD → builds components, pages, interactions
- **AI/LLM agent** — reads LLM_INTEGRATION + DATA_MODEL → implements AI pipeline, prompts, generation flows
- **Data agent** — reads EXTERNAL_DATA + DATA_MODEL → implements CSV parsers, data importers, seed data

**Coordination rules:**
- All agents share the same codebase and database schema
- DATA_MODEL.md is the single source of truth for entity names and types
- API_SPEC.md is the contract between backend and frontend agents
- Every agent must follow SECURITY.md for auth and RLS
- Naming conventions: camelCase for JS/TS, snake_case for database columns
- All code in TypeScript with strict mode enabled
- Tests alongside implementation (colocated `*.test.ts` files)

### Code quality standards

- TypeScript strict mode, no `any` types
- ESLint + Prettier configured from day one
- Every API endpoint has input validation (Zod schemas)
- Every database query goes through the service layer (never direct SQL in routes)
- Error handling: structured error types, user-friendly messages
- Logging: structured JSON logs with request IDs
- Git: conventional commits, feature branches, PR reviews
