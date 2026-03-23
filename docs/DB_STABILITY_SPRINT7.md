# Sprint 7 DB Stability Audit (DEPRECATED)

> **⚠️ DEPRECATED:** Sprint execution now lives under [`sprints/sprint-7/SPRINT.md`](./sprints/sprint-7/SPRINT.md).
> This document is retained as a reference artifact for the DB stability audit that was part of Sprint 7 Phase A (PR #38).
> **Sprint framework:** [`sprints/SPRINT_GUIDELINES.md`](./sprints/SPRINT_GUIDELINES.md)

## Scope

This pass audited the persisted data model introduced across Sprint 1 through Sprint 6 and applied only minimal fixes needed for Sprint 7 QA hardening.

- No feature schema expansion was introduced.
- RLS policies and tenancy checks were left unchanged.
- Changes are limited to idempotency guarantees and hot-path index coverage.

## Audit Summary

### Migration chain

- Present migrations: `0001`, `0002`, `0003`, `0005`, `0006`.
- `0004` is absent, but the migration chain is still internally consistent: later migrations only depend on objects created in earlier applied files.
- Current schema exports under `src/db/schema/*` remain aligned with the migration history after the Sprint 7 hardening migration.

### Critical issues found

1. `fitness_scores` allowed multiple active rows for the same household/day.
   - Risk: duplicate daily scores from concurrent `/api/fitness` requests.
2. `quarterly_reviews` allowed multiple active rows for the same household/quarter.
   - Risk: duplicate reviews from repeated generate clicks or retry races.
3. CSV import confirmation relied on application-side existence checks only.
   - Risk: duplicate `holdings` and `transactions` under concurrent confirm requests.
4. Two high-traffic read paths lacked sort-compatible composite indexes.
   - `/api/timeline`
   - `/api/accounts/[id]/transactions`

## Applied Fixes

### Migration

`src/db/migrations/0007_sprint7_db_stability.sql` adds:

- unique daily fitness index on `(household_id, calculated_at)`
- partial unique quarterly review index on `(household_id, period_start, period_end)` where `deleted_at is null`
- partial unique holdings index on `(account_id, instrument_id, as_of_date)` where `deleted_at is null`
- partial unique transaction dedupe index on `(account_id, external_ref)` where `deleted_at is null and external_ref is not null`
- composite timeline feed index on `(household_id, entry_date desc, id desc)` where `deleted_at is null`
- composite account transaction feed index on `(account_id, transaction_date desc, id desc)` where `deleted_at is null`

The migration also includes preflight guards that stop the rollout if duplicate live rows already exist for any new uniqueness invariant.

### Service hardening

- `FitnessService` now treats unique-key races as idempotent reads and returns the existing daily score.
- `ReviewService` now treats per-quarter unique-key races as idempotent reads and returns the existing review id.
- `ImportService` now converts duplicate imported transactions into ignored rows and resolves concurrent holding conflicts by updating the canonical active holding row.

## Query Path Validation

Actual `EXPLAIN` output could not be captured in this workspace because no local PostgreSQL runtime or DB connection was available. Validation was performed by matching each production query shape to the available leading index columns and sort order.

### Covered hot paths

- `/api/timeline`
  - Query shape: `household_id = ?`, `deleted_at is null`, ordered by `entry_date desc, id desc`
  - Covering index: `idx_timeline_household_date_id_active`

- `/api/accounts/[id]/transactions`
  - Query shape: `account_id = ?`, `deleted_at is null`, optional date range, ordered by `transaction_date desc, id desc`
  - Covering index: `idx_txn_account_date_id_active`

- CSV import transaction dedupe
  - Query shape: `account_id = ?`, `external_ref = ?`, `deleted_at is null`
  - Covering index: `transactions_account_external_ref_active_uniq`

- CSV import holding upsert lookup
  - Query shape: `account_id = ?`, `instrument_id = ?`, `as_of_date = ?`, `deleted_at is null`
  - Covering index: `holdings_account_instrument_as_of_active_uniq`

### Existing indexes kept as sufficient

- `household_snapshots(household_id, snapshot_date)`
- `account_snapshots(account_id, snapshot_date)`
- `quarterly_reviews(household_id, period_end)`
- `proposals(household_id, status)`
- `weekly_narrative_cache(household_id, as_of_week)`

These already match the current filter patterns well enough for the present Sprint 7 scope.

## Operational Safeguards

### Preflight checks

Run these before applying the Sprint 7 migration in any environment with real data:

```sql
select household_id, calculated_at, count(*)
from public.fitness_scores
group by household_id, calculated_at
having count(*) > 1;

select household_id, period_start, period_end, count(*)
from public.quarterly_reviews
where deleted_at is null
group by household_id, period_start, period_end
having count(*) > 1;

select account_id, instrument_id, as_of_date, count(*)
from public.holdings
where deleted_at is null
group by account_id, instrument_id, as_of_date
having count(*) > 1;

select account_id, external_ref, count(*)
from public.transactions
where deleted_at is null
  and external_ref is not null
group by account_id, external_ref
having count(*) > 1;
```

### Rollout notes

- Apply during a low-write window if possible.
- If any preflight query returns rows, resolve those duplicates manually before applying the migration.
- For `quarterly_reviews`, preserve any `timeline_entries.linked_review_id` references if duplicate cleanup is required.

### Rollback

If rollback is required, drop the Sprint 7 indexes in reverse order and restore the non-unique fitness index:

```sql
drop index if exists public.idx_timeline_household_date_id_active;
drop index if exists public.idx_txn_account_date_id_active;
drop index if exists public.transactions_account_external_ref_active_uniq;
drop index if exists public.holdings_account_instrument_as_of_active_uniq;
drop index if exists public.quarterly_reviews_household_period_active_uniq;
drop index if exists public.idx_fitness_household_date;

create index if not exists idx_fitness_household_date
on public.fitness_scores(household_id, calculated_at);
```
