# Demo DB Seeding (Sprint 6)

This project now includes a deterministic demo-data seed for launch baseline variants:

- `standard` (Andersson)
- `fire` (Lindberg)
- `fam_family` (Eriksson, modeled as two linked households)
- `friendly_family` (The Investment Circle, `type='circle'`)

The seed includes:

- Realistic account and holding distributions per variant
- 24 months of deterministic transactions and timeline history
- Pre-generated derived records: `account_snapshots`, `household_snapshots`, `fitness_scores`, `weekly_narrative_cache`, `quarterly_reviews`
- Household-isolated references compatible with existing schema and RLS patterns

## Prerequisites

- Postgres schema/migrations are already applied
- `DATABASE_URL` (or `SUPABASE_DB_URL`) points to the target database

## Commands

1. Full reseed (reset + insert + verification):

```bash
npm run db:seed:demo
```

2. Reset only (remove seeded demo records):

```bash
npm run db:seed:demo:reset
```

3. Seed only (no reset):

```bash
npm run db:seed:demo:seed-only
```

4. Determinism/distribution test for dataset generator:

```bash
npm run test:db-seed
```

## Expected verification output (reseed)

`npm run db:seed:demo` prints a variant summary and validates deterministic expected counts.

Expected per-variant counts:

- `standard`: households=1, accounts=8, holdings=17, transactions=412, timeline=22, lifeEvents=2, accountSnapshots=192, householdSnapshots=24, fitness=12, narratives=1, reviews=4
- `fire`: households=1, accounts=6, holdings=25, transactions=340, timeline=18, lifeEvents=1, accountSnapshots=144, householdSnapshots=24, fitness=12, narratives=1, reviews=4
- `fam_family`: households=2, accounts=12, holdings=40, transactions=592, timeline=28, lifeEvents=1, accountSnapshots=288, householdSnapshots=48, fitness=24, narratives=2, reviews=8
- `friendly_family`: households=1, accounts=12, holdings=36, transactions=666, timeline=12, lifeEvents=0, accountSnapshots=288, householdSnapshots=24, fitness=12, narratives=1, reviews=4

Expected totals:

- households=5, accounts=38, holdings=118, transactions=2010, timeline=80, lifeEvents=4, accountSnapshots=912, householdSnapshots=120, fitness=60, narratives=5, reviews=20

If verification passes, the script ends with:

```text
Seed verification matched expected deterministic counts.
```
