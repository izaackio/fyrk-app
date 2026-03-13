-- Sprint 7 DB stability hardening:
-- - enforce idempotent writes for daily fitness, quarterly reviews, and CSV imports
-- - add hot-path indexes for timeline and account transaction feeds

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT household_id, calculated_at
      FROM public.fitness_scores
      GROUP BY household_id, calculated_at
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION
      'Duplicate fitness_scores rows detected for (household_id, calculated_at); resolve duplicates before applying 0007_sprint7_db_stability.sql.';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT household_id, period_start, period_end
      FROM public.quarterly_reviews
      WHERE deleted_at IS NULL
      GROUP BY household_id, period_start, period_end
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION
      'Duplicate active quarterly_reviews rows detected for (household_id, period_start, period_end); resolve duplicates before applying 0007_sprint7_db_stability.sql.';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT account_id, instrument_id, as_of_date
      FROM public.holdings
      WHERE deleted_at IS NULL
      GROUP BY account_id, instrument_id, as_of_date
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION
      'Duplicate active holdings rows detected for (account_id, instrument_id, as_of_date); resolve duplicates before applying 0007_sprint7_db_stability.sql.';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT account_id, external_ref
      FROM public.transactions
      WHERE deleted_at IS NULL
        AND external_ref IS NOT NULL
      GROUP BY account_id, external_ref
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION
      'Duplicate active transactions rows detected for (account_id, external_ref); resolve duplicates before applying 0007_sprint7_db_stability.sql.';
  END IF;
END
$$;

DROP INDEX IF EXISTS public.idx_fitness_household_date;

CREATE UNIQUE INDEX idx_fitness_household_date
ON public.fitness_scores(household_id, calculated_at);

CREATE UNIQUE INDEX IF NOT EXISTS quarterly_reviews_household_period_active_uniq
ON public.quarterly_reviews(household_id, period_start, period_end)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS holdings_account_instrument_as_of_active_uniq
ON public.holdings(account_id, instrument_id, as_of_date)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_account_external_ref_active_uniq
ON public.transactions(account_id, external_ref)
WHERE deleted_at IS NULL
  AND external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_txn_account_date_id_active
ON public.transactions(account_id, transaction_date DESC, id DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_timeline_household_date_id_active
ON public.timeline_entries(household_id, entry_date DESC, id DESC)
WHERE deleted_at IS NULL;
