# Sprint 0 — Pre-Launch Waitlist Page

> **Status:** COMPLETE
> **Goal:** Live "coming soon" page at fyrk.com from day one. Capture early interest while the product is being built.
> **Dates:** Parallel with pre-sprint (Day 0-3)

---

## Delivered

- Root route `/` serves branded pre-launch landing page
- Marketing sections, waitlist form UX, and signup/demo CTAs
- SEO metadata (meta tags, OG image, page title)
- Vercel Analytics and Speed Insights script hooks in root layout
- Mobile-responsive landing page
- Waitlist backend API (`POST /api/waitlist`) — merged later (PR #43)

## Merged PRs

| PR | Branch | Merged | Description |
|----|--------|--------|-------------|
| #17 | `codex/s0-frontend` | 2026-03-03 | Pre-launch landing page + waitlist UX |
| #19 | `codex/s0-frontend` | 2026-03-03 | Landing visual fix: align to Warm Authority brand system |
| #43 | `codex/s0-backend` | 2026-03-13 | Waitlist signup backend (merged retroactively during S7) |

## Assumed Tasks (Retrospective)

| Task | Lane | Scope | Status |
|------|------|-------|--------|
| T1 | Frontend | Landing page hero, feature pillars, waitlist form, responsive layout | COMPLETE |
| T2 | Frontend | Brand alignment pass (visual fix) | COMPLETE |
| T3 | Backend | `POST /api/waitlist`, Supabase persistence, duplicate handling | COMPLETE (late) |

## Key Decisions

- Backend waitlist route was deferred and merged later during Sprint 7 timeframe (PR #43)
- Landing page posts to `/api/waitlist` but the route was not present on main until S7
- Architect/deployment lane (Vercel production, DNS, Lighthouse gate) not repo-verifiable

## Definition of Done (Retrospective)

- [x] fyrk.com shows branded waitlist page
- [x] Marketing sections and waitlist form UX merged
- [x] SEO metadata present
- [x] Mobile-responsive layout
- [ ] ~~End-to-end signup storage~~ (backend merged late)
