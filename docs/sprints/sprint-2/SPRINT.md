# Sprint 2 — Accounts & Data

> **Status:** COMPLETE
> **Goal:** Users can add accounts and import CSV data. Holdings displayed with cross-currency normalization.
> **Dates:** Weeks 3-4 (~2026-03-02)

---

## Delivered

- Manual account setup flow (ISK, KF, savings, pension, mortgage)
- CSV import parsing pipeline (Avanza + Nordnet) with normalized row models
- Accounts/import DB schema additions with RLS controls
- Accounts + import backend APIs/services (preview + confirm flow)
- ECB FX utility/cache for cross-currency normalization
- Frontend account views, add-account flow, and CSV import UX
- Parser fixtures and test coverage for CSV and FX utility paths

## Merged PRs

| PR | Branch | Merged | Description |
|----|--------|--------|-------------|
| #7 | `codex/s2-data` | 2026-03-02 | Avanza/Nordnet CSV parsers + ECB FX utilities |
| #8 | `codex/s2-db` | 2026-03-02 | Accounts/import schema, migration, and RLS |
| #9 | `codex/s2-frontend-writable` | 2026-03-02 | Account and CSV import UX |
| #10 | `codex/s2-backend` | 2026-03-02 | Accounts and CSV import APIs |

## Assumed Tasks (Retrospective)

| Task | Lane | Scope | Status |
|------|------|-------|--------|
| T1 | Data | Avanza/Nordnet CSV parsers, instrument resolver, ECB FX fetcher | COMPLETE |
| T2 | DB | Schemas for accounts, instruments, holdings, transactions, snapshots + RLS | COMPLETE |
| T3 | Frontend | Add-account page, CSV import flow, account detail, holdings table | COMPLETE |
| T4 | Backend | Account CRUD, import preview/confirm, AccountService, ImportService | COMPLETE |

## Key Decisions

- Integration/QA track intentionally skipped in this sprint cycle
- ECB FX rates used for cross-currency normalization (no live repricing engine)
- Imported/provider values remain authoritative (source-of-truth principle)
- CSV parsers support both Avanza portfolio + transaction formats and Nordnet transactions

## Definition of Done (Retrospective)

- [x] User can add accounts manually
- [x] User can import Avanza/Nordnet CSV with preview + confirm
- [x] Holdings and transactions appear after import
- [x] Cross-currency normalization via ECB FX
- [x] All 4 agent lanes merged to main
