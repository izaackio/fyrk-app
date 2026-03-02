-- Sprint 3 balance-sheet history and weekly narrative cache persistence:
-- household_snapshots, weekly_narrative_cache.

CREATE TABLE public.household_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  total_net_worth integer NOT NULL,
  total_assets integer NOT NULL,
  total_liabilities integer NOT NULL DEFAULT 0,
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT household_snapshots_household_date_uniq UNIQUE (household_id, snapshot_date),
  CONSTRAINT household_snapshots_currency_iso3_check CHECK (char_length(currency) = 3),
  CONSTRAINT household_snapshots_assets_non_negative_check CHECK (total_assets >= 0),
  CONSTRAINT household_snapshots_liabilities_non_negative_check CHECK (total_liabilities >= 0),
  CONSTRAINT household_snapshots_net_worth_consistency_check CHECK (
    total_net_worth = total_assets - total_liabilities
  )
);

CREATE INDEX idx_household_snapshots_household_date
ON public.household_snapshots(household_id, snapshot_date);

CREATE INDEX idx_household_snapshots_snapshot_date
ON public.household_snapshots(snapshot_date);

CREATE TABLE public.weekly_narrative_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  as_of_week date NOT NULL,
  context_hash text NOT NULL,
  narrative text NOT NULL,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'ai',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_narrative_cache_household_week_uniq UNIQUE (household_id, as_of_week),
  CONSTRAINT weekly_narrative_cache_source_check CHECK (source IN ('ai', 'fallback'))
);

CREATE INDEX idx_weekly_narrative_cache_household_week
ON public.weekly_narrative_cache(household_id, as_of_week);

CREATE INDEX idx_weekly_narrative_cache_generated_at
ON public.weekly_narrative_cache(generated_at);

CREATE TRIGGER set_weekly_narrative_cache_updated_at
BEFORE UPDATE ON public.weekly_narrative_cache
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.household_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_narrative_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.household_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_narrative_cache FORCE ROW LEVEL SECURITY;

CREATE POLICY household_snapshots_select_member
ON public.household_snapshots
FOR SELECT
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY household_snapshots_insert_member
ON public.household_snapshots
FOR INSERT
TO authenticated
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY household_snapshots_update_member
ON public.household_snapshots
FOR UPDATE
TO authenticated
USING (public.is_household_member(household_id, auth.uid()))
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY household_snapshots_delete_member
ON public.household_snapshots
FOR DELETE
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY weekly_narrative_cache_select_member
ON public.weekly_narrative_cache
FOR SELECT
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY weekly_narrative_cache_insert_member
ON public.weekly_narrative_cache
FOR INSERT
TO authenticated
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY weekly_narrative_cache_update_member
ON public.weekly_narrative_cache
FOR UPDATE
TO authenticated
USING (public.is_household_member(household_id, auth.uid()))
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY weekly_narrative_cache_delete_member
ON public.weekly_narrative_cache
FOR DELETE
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));
