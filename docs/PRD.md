# FYRK — Product Requirements Document
## Prototype Scope

> **Version:** 0.1
> **Source:** [CONTEXT.md](./CONTEXT.md) · [Pitch Deck](./fyrk_pitch_deck_v1.md)
> **Consumed by:** Frontend agents, Backend agents, QA

---

## 1. Feature Map

### P0 — Must ship in prototype

| ID | Feature | Pillar | Description |
|---|---|---|---|
| F01 | User registration & auth | Foundation | Email + magic link signup, session management |
| F02 | Household creation | Foundation | Create household, invite partner via email |
| F03 | Individual profile setup | Foundation | Name, base currency, financial goals (starter set) |
| F04 | Manual account entry | Pillar 1 | Add accounts with provider, type, wrapper, currency |
| F05 | CSV import (Avanza) | Pillar 1 | Parse Avanza transaction/holding exports |
| F06 | CSV import (Nordnet) | Pillar 1 | Parse Nordnet transaction/holding exports |
| F07 | Holdings management | Pillar 1 | View, edit, delete holdings; use provider-reported values (no live security repricing in prototype) |
| F08 | Household Balance Sheet | Pillar 1 | Unified net worth, asset allocation, exposure charts |
| F09 | "What Changed" narrative | Pillar 1 | AI-generated weekly summary of household financial changes |
| F10 | Financial Timeline | Core UX | Chronological view of events, decisions, outcomes |
| F11 | Life Event trigger | Pillar 2 | Start a life event; select from library |
| F12 | Playbook: "Buying first apartment" | Pillar 2 | AI-generated checklist + impact modeling for home purchase |
| F13 | Financial Fitness Score | Pillar 4 | 0–1000 composite score, 5 components, trend chart |
| F14 | Quarterly Review | Pillar 3 | AI-generated household review with recommendations |
| F15 | Proposal flow | Pillar 5 | Create proposal → auto-context → discuss → approve/reject |
| F16 | Demo mode | Onboarding | 4 pre-seeded households for zero-friction first experience |
| F17 | Settings & household mgmt | Foundation | Manage members, roles, privacy, account visibility |

### P1 — Nice-to-have for prototype

| ID | Feature | Pillar | Description |
|---|---|---|---|
| F18 | Extended Family linking | Entity model | Link households within a family |
| F19 | Circle creation | Entity model | Create friend/colleague circle with anonymized sharing |
| F20 | Liability tracking | Pillar 1 | Mortgage & loan entry with rate, term, amortization |
| F21 | Pension manual entry | Pillar 1 | PPM + tjänstepension placeholder accounts |
| F22 | Insurance coverage entry | Pillar 1 | Manual insurance policy tracking |
| F23 | Additional life event playbooks | Pillar 2 | "Having a child", "Changing jobs", "Inheritance" |
| F24 | Financial Fitness micro-actions | Pillar 4 | Weekly AI-generated improvement suggestions |
| F25 | Notification system | Core UX | Push/email for proposals, reviews, alerts |

### P2 — Deferred to v1

| ID | Feature | Description |
|---|---|---|
| F26 | PSD2 bank integration (Tink/Insurely) | Live bank account balances + transactions |
| F27 | MinPension integration | Pension data aggregation |
| F28 | Insurance data via Insurely | Policy and coverage data |
| F29 | Multi-language (Swedish) | Full i18n implementation |
| F30 | Mobile app (React Native) | Native iOS/Android app |
| F31 | Human-augmented quarterly review | Video call booking with financial coordinator |
| F32 | B2B data product | Anonymized household intelligence for institutions |

---

## 2. User Stories

### Onboarding & Setup

```
US-01: As a new user, I want to sign up with my email so that I can create my Fyrk account.
  Acceptance: Email + magic link → verify → account created → onboarding starts
  
US-02: As a user, I want to create a household and invite my partner so that we can manage finances together.
  Acceptance: Create household → enter partner email → partner receives invite → partner joins → household active

US-03: As a user, I want to try Fyrk with demo data before entering my own so that I can understand the value.
  Acceptance: On signup, option to "Explore with demo data" → loads one of 4 pre-seeded households → all features functional → clear "This is demo data" indicator → can switch to real data anytime

US-04: As a user, I want to add my financial accounts manually so that Fyrk can see my complete picture.
  Acceptance: Add account → select provider (Avanza/Nordnet/SEB/etc.) → select type (ISK/KF/Depå/Savings/Loan/Pension) → enter currency → account appears in dashboard

US-05: As a user, I want to import my Avanza/Nordnet transaction history via CSV so that I don't have to enter everything manually.
  Acceptance: Upload CSV → system detects format → preview parsed data → confirm → transactions + holdings imported → visible on balance sheet
```

### Household Balance Sheet

```
US-06: As a household member, I want to see our combined net worth so that I understand our total financial position.
  Acceptance: Dashboard shows total household net worth (assets – liabilities) → breakdown by account → breakdown by member → trend over time

US-07: As a household member, I want to see our asset allocation so that I understand our risk exposure.
  Acceptance: Charts showing allocation by: asset class, geography, currency, sector → household-level and individual-level toggle

US-08: As a household member, I want to control which of my accounts are visible to my partner so that I maintain privacy where needed.
  Acceptance: Per-account privacy setting: "Full" (visible) / "Amount hidden" (exists but amount redacted) / "Private" (invisible) → partner sees appropriate view

US-09: As a household member, I want to receive a weekly "What Changed" summary so that I stay informed without checking daily.
  Acceptance: AI generates 3–5 sentence narrative: market movements, net worth change, notable transactions, upcoming events → delivered via dashboard and/or email
```

### Financial Timeline

```
US-10: As a household member, I want to see our financial life on a timeline so that I understand our journey.
  Acceptance: Scrollable chronological view → shows: account openings, life events, decisions, quarterly reviews, fitness milestones → linked to relevant detail views

US-11: As a household member, I want to add manual entries to our timeline so that important decisions are recorded.
  Acceptance: Add entry with: date, category, title, description, optional linked accounts → appears on timeline → editable/deletable

US-12: As a household member, I want to record financial decisions with my reasoning so that we can learn from them later.
  Acceptance: Create decision entry → title, reasoning, expected outcome, linked accounts/instruments → track over time → "How did this turn out?" follow-up at 30/90/365 days
```

### Life Events

```
US-13: As a household member, I want to trigger a life event so that Fyrk generates a financial playbook.
  Acceptance: Select event type → enter event-specific inputs → AI generates personalized playbook → checklist of actions with priority, assignments, and impact estimates

US-14: As a household member, I want to work through a playbook checklist so that we complete all financial preparations.
  Acceptance: Checklist with actionable items → assignable to specific member → markable as done → progress indicator → completion tracked on timeline

US-15: As a household member, I want to see the financial impact of a life event so that I understand the consequences.
  Acceptance: Impact model shows: effect on net worth, cash flow, allocation, fitness score → before/after comparison → key assumptions visible and editable
```

### Quarterly Review

```
US-16: As a household member, I want to receive a quarterly financial review so that I have a structured "family office" check-in.
  Acceptance: AI generates review covering: net worth change attribution, fitness score trend, fee/drag analysis, coverage gaps, recommendations, upcoming events → downloadable as PDF → saved on timeline

US-17: As a household member, I want to see actionable recommendations in my review so that I know what to focus on.
  Acceptance: Each recommendation has: priority, estimated impact, explanation, one-click action (create proposal or dismiss) → completion tracked
```

### Financial Fitness

```
US-18: As a household member, I want to see our Financial Fitness Score so that I have a clear measure of financial health.
  Acceptance: Score 0–1000 displayed prominently → 5 component scores (Buffer, Growth, Protection, Efficiency, Trajectory) → each component explained → trend chart over time

US-19: As a household member, I want to understand how to improve our score so that we can take concrete action.
  Acceptance: Each component shows: current score, what would improve it, specific actions → "Improve by X points: [action]" format
```

### Governance

```
US-20: As a household member, I want to create a financial proposal so that my partner can review and approve.
  Acceptance: Create proposal → title, description, type (investment/insurance/debt/other) → system auto-attaches: impact on allocation, risk, fitness score → visible to all household members

US-21: As a household member, I want to discuss a proposal with my partner so that we make informed joint decisions.
  Acceptance: Discussion thread on each proposal → both members can comment → visible history

US-22: As a household member, I want to approve or reject a proposal so that decisions are formally recorded.
  Acceptance: Approve/reject buttons → both members must approve for "approved" status → decision recorded on timeline with full context → audit trail preserved
```

### Extended Family & Circles (P1)

```
US-23: As a household, we want to link with another household (e.g., parents) for estate planning visibility.
  Acceptance: Send link request → other household accepts → configurable sharing (which accounts/metrics visible) → combined view for shared purposes

US-24: As a user, I want to create a circle with friends for anonymized financial comparison.
  Acceptance: Create circle → invite members → members share: allocation %, fitness score, return % (never absolute amounts) → circle dashboard with comparisons
```

---

## 3. Onboarding Flow

```
STEP 1: Landing page → "Get started" or "Explore demo"
        ↓
STEP 2: [Demo path] → Select household variant → Full product experience with demo data
        [Real path] → Email signup → Magic link → Account created
        ↓
STEP 3: "Create your household" → Household name → Invite partner (optional, can skip)
        ↓
STEP 4: "Add your first account" → Quick-add: select provider + type
        → Or: "Import from CSV" → Upload Avanza/Nordnet export
        → Or: "I'll add accounts later" → Go to dashboard with empty state
        ↓
STEP 5: Dashboard → Household Balance Sheet (even with 1 account)
        → Prompt: "Add more accounts for your complete picture"
        → If partner joined: "Welcome! Here's your household view."
```

**Key principle:** Value should be visible within 3 minutes of signup. Even a single account shows fitness score components, timeline entry, and next-step suggestions.

---

## 4. Screen Inventory

| Screen | Route | Features | Priority |
|---|---|---|---|
| Landing / Marketing | `/` | Value prop, demo CTA, signup | P0 |
| Auth (Login/Signup) | `/auth` | Email + magic link | P0 |
| Demo selector | `/demo` | 4 household variants to explore | P0 |
| Dashboard (Household home) | `/dashboard` | Net worth, fitness score, recent timeline, quick actions | P0 |
| Balance Sheet | `/balance-sheet` | Full net worth breakdown, allocation charts, accounts list | P0 |
| Account detail | `/accounts/:id` | Holdings, transactions, performance, settings | P0 |
| Add account | `/accounts/new` | Provider selection, type, manual or CSV | P0 |
| CSV import | `/import` | Upload, preview, map columns, confirm | P0 |
| Financial Timeline | `/timeline` | Chronological event view, filters, add entry | P0 |
| Life Events library | `/events` | Available life events, active playbooks | P0 |
| Playbook detail | `/events/:id` | Checklist, assignments, impact model, progress | P0 |
| Quarterly Review | `/review/:id` | Full review content, recommendations, actions | P0 |
| Financial Fitness | `/fitness` | Score, components, trend, improvement actions | P0 |
| Proposals | `/proposals` | List of proposals, create new | P0 |
| Proposal detail | `/proposals/:id` | Context, discussion, approve/reject | P0 |
| Settings | `/settings` | Profile, household, members, privacy, accounts | P0 |
| Extended Family | `/family` | Linked households, shared views | P1 |
| Circle | `/circle` | Member list, anonymized comparisons | P1 |

---

## 5. Edge Cases & Error States

| Scenario | Handling |
|---|---|
| Partner hasn't joined yet | Show individual view, clear prompts to "Invite partner for household view" |
| CSV format not recognized | Show error with supported format list; offer manual entry fallback |
| CSV contains unknown instruments | Create placeholder with ISIN; flag for user to confirm |
| No market data for an instrument | Show last known value with "Price may be stale" indicator |
| Empty household (no accounts) | Rich empty state with guided "Add your first account" flow |
| Partner rejects a proposal | Record rejection with timestamp; proposer can modify and resubmit |
| Only one partner has accounts | Show household view with "partial data" indicator |
| User deletes account with history | Soft delete; maintain timeline references; offer "undo" |
| AI generation fails | Graceful fallback: show structured data without narrative; retry button |
| Demo user wants to convert to real | "Switch to your own data" flow; demo data archived, not mixed |
