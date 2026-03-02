-- Sprint 2 accounts and import domain:
-- accounts, instruments, holdings, transactions, account_snapshots, import_jobs, import_rows.

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id),
  provider_id text NOT NULL,
  provider_name text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL,
  wrapper_type text,
  currency text NOT NULL DEFAULT 'SEK',
  visibility text NOT NULL DEFAULT 'full',
  external_id text,
  last_synced timestamptz,
  sync_source text NOT NULL DEFAULT 'manual',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT accounts_account_type_check CHECK (
    account_type IN ('investment', 'savings', 'pension', 'loan', 'mortgage', 'insurance')
  ),
  CONSTRAINT accounts_wrapper_type_check CHECK (
    wrapper_type IS NULL OR wrapper_type IN ('ISK', 'KF', 'depa', 'PPM', 'tjanstepension', 'private_pension')
  ),
  CONSTRAINT accounts_currency_iso3_check CHECK (char_length(currency) = 3),
  CONSTRAINT accounts_visibility_check CHECK (visibility IN ('full', 'amount_hidden', 'private')),
  CONSTRAINT accounts_sync_source_check CHECK (sync_source IN ('manual', 'csv', 'psd2', 'fida'))
);

CREATE INDEX idx_accounts_household ON public.accounts(household_id);
CREATE INDEX idx_accounts_owner ON public.accounts(owner_user_id);

CREATE TABLE public.instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin text,
  ticker text,
  name text NOT NULL,
  asset_class text NOT NULL,
  currency text NOT NULL,
  exchange text,
  country text,
  sector text,
  last_price integer,
  last_price_at timestamptz,
  price_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT instruments_currency_iso3_check CHECK (char_length(currency) = 3),
  CONSTRAINT instruments_country_iso2_check CHECK (country IS NULL OR char_length(country) = 2),
  CONSTRAINT instruments_asset_class_check CHECK (
    asset_class IN ('equity', 'fixed_income', 'fund', 'etf', 'cash', 'real_estate', 'crypto', 'other')
  ),
  CONSTRAINT instruments_price_source_check CHECK (
    price_source IS NULL OR price_source IN ('yahoo', 'manual', 'imported')
  )
);

CREATE UNIQUE INDEX idx_instruments_isin ON public.instruments(isin);
CREATE INDEX idx_instruments_ticker ON public.instruments(ticker);

CREATE TABLE public.holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES public.instruments(id),
  quantity numeric(18, 8) NOT NULL,
  average_cost integer,
  cost_currency text,
  market_value integer,
  value_currency text,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT holdings_quantity_non_negative_check CHECK (quantity >= 0),
  CONSTRAINT holdings_cost_currency_iso3_check CHECK (
    cost_currency IS NULL OR char_length(cost_currency) = 3
  ),
  CONSTRAINT holdings_value_currency_iso3_check CHECK (
    value_currency IS NULL OR char_length(value_currency) = 3
  ),
  CONSTRAINT holdings_source_check CHECK (source IN ('manual', 'csv', 'api'))
);

CREATE INDEX idx_holdings_account ON public.holdings(account_id);
CREATE INDEX idx_holdings_instrument ON public.holdings(instrument_id);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES public.instruments(id),
  type text NOT NULL,
  quantity numeric(18, 8),
  price integer,
  amount integer NOT NULL,
  currency text NOT NULL,
  fee_amount integer NOT NULL DEFAULT 0,
  fee_currency text,
  fx_rate numeric(12, 6),
  fx_amount integer,
  fx_currency text,
  transaction_date date NOT NULL,
  settlement_date date,
  description text,
  external_ref text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT transactions_type_check CHECK (
    type IN ('buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee', 'interest', 'transfer', 'tax')
  ),
  CONSTRAINT transactions_currency_iso3_check CHECK (char_length(currency) = 3),
  CONSTRAINT transactions_fee_currency_iso3_check CHECK (
    fee_currency IS NULL OR char_length(fee_currency) = 3
  ),
  CONSTRAINT transactions_fx_currency_iso3_check CHECK (
    fx_currency IS NULL OR char_length(fx_currency) = 3
  ),
  CONSTRAINT transactions_source_check CHECK (source IN ('manual', 'csv', 'api'))
);

CREATE INDEX idx_txn_account ON public.transactions(account_id);
CREATE INDEX idx_txn_date ON public.transactions(transaction_date);
CREATE INDEX idx_txn_instrument ON public.transactions(instrument_id);

CREATE TABLE public.account_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  total_value integer NOT NULL,
  cash_balance integer NOT NULL DEFAULT 0,
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_snapshots_account_date_uniq UNIQUE (account_id, snapshot_date),
  CONSTRAINT account_snapshots_currency_iso3_check CHECK (char_length(currency) = 3)
);

CREATE INDEX idx_snap_account_date ON public.account_snapshots(account_id, snapshot_date);

CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  format text NOT NULL,
  status text NOT NULL DEFAULT 'preview',
  rows_parsed integer NOT NULL DEFAULT 0,
  holdings_detected integer NOT NULL DEFAULT 0,
  transactions_detected integer NOT NULL DEFAULT 0,
  instruments_resolved integer NOT NULL DEFAULT 0,
  instruments_unresolved integer NOT NULL DEFAULT 0,
  file_name text,
  file_checksum text,
  preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT import_jobs_format_check CHECK (format IN ('avanza', 'nordnet', 'unknown')),
  CONSTRAINT import_jobs_status_check CHECK (
    status IN ('preview', 'confirmed', 'failed', 'cancelled', 'expired')
  ),
  CONSTRAINT import_jobs_rows_parsed_non_negative_check CHECK (rows_parsed >= 0),
  CONSTRAINT import_jobs_holdings_detected_non_negative_check CHECK (holdings_detected >= 0),
  CONSTRAINT import_jobs_transactions_detected_non_negative_check CHECK (transactions_detected >= 0),
  CONSTRAINT import_jobs_instruments_resolved_non_negative_check CHECK (instruments_resolved >= 0),
  CONSTRAINT import_jobs_instruments_unresolved_non_negative_check CHECK (instruments_unresolved >= 0)
);

CREATE INDEX idx_import_jobs_account ON public.import_jobs(account_id);
CREATE INDEX idx_import_jobs_created_by ON public.import_jobs(created_by);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at);

CREATE TABLE public.import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  row_kind text NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_data jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolution_status text NOT NULL DEFAULT 'pending',
  instrument_id uuid REFERENCES public.instruments(id),
  dedupe_key text,
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT import_rows_row_index_non_negative_check CHECK (row_index >= 0),
  CONSTRAINT import_rows_row_kind_check CHECK (
    row_kind IN ('transaction', 'holding', 'account', 'instrument', 'unknown')
  ),
  CONSTRAINT import_rows_resolution_status_check CHECK (
    resolution_status IN ('pending', 'valid', 'invalid', 'ignored', 'resolved')
  ),
  CONSTRAINT import_rows_job_row_kind_uniq UNIQUE (import_job_id, row_index, row_kind)
);

CREATE INDEX idx_import_rows_job ON public.import_rows(import_job_id);
CREATE INDEX idx_import_rows_status ON public.import_rows(resolution_status);
CREATE INDEX idx_import_rows_instrument ON public.import_rows(instrument_id);

CREATE TRIGGER set_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_instruments_updated_at
BEFORE UPDATE ON public.instruments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_holdings_updated_at
BEFORE UPDATE ON public.holdings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_import_jobs_updated_at
BEFORE UPDATE ON public.import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_import_rows_updated_at
BEFORE UPDATE ON public.import_rows
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_account_member(target_account_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounts a
    JOIN public.household_members hm
      ON hm.household_id = a.household_id
    WHERE a.id = target_account_id
      AND a.deleted_at IS NULL
      AND hm.user_id = target_user_id
      AND hm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_account_owner(target_account_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = target_account_id
      AND a.deleted_at IS NULL
      AND a.owner_user_id = target_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_import_job(target_import_job_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.import_jobs ij
    JOIN public.accounts a
      ON a.id = ij.account_id
    WHERE ij.id = target_import_job_id
      AND ij.deleted_at IS NULL
      AND a.deleted_at IS NULL
      AND (
        ij.created_by = target_user_id
        OR a.owner_user_id = target_user_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_import_job(target_import_job_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.import_jobs ij
    WHERE ij.id = target_import_job_id
      AND ij.deleted_at IS NULL
      AND (
        ij.created_by = target_user_id
        OR public.is_account_owner(ij.account_id, target_user_id)
      )
  );
$$;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.instruments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.holdings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.account_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows FORCE ROW LEVEL SECURITY;

CREATE POLICY accounts_select_member
ON public.accounts
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY accounts_insert_owner
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND owner_user_id = auth.uid()
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY accounts_update_owner
ON public.accounts
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY accounts_delete_owner
ON public.accounts
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY instruments_select_authenticated
ON public.instruments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY instruments_insert_authenticated
ON public.instruments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY holdings_select_member
ON public.holdings
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_account_member(account_id, auth.uid())
);

CREATE POLICY holdings_insert_owner
ON public.holdings
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND public.is_account_owner(account_id, auth.uid())
);

CREATE POLICY holdings_update_owner
ON public.holdings
FOR UPDATE
TO authenticated
USING (public.is_account_owner(account_id, auth.uid()))
WITH CHECK (public.is_account_owner(account_id, auth.uid()));

CREATE POLICY holdings_delete_owner
ON public.holdings
FOR DELETE
TO authenticated
USING (public.is_account_owner(account_id, auth.uid()));

CREATE POLICY transactions_select_member
ON public.transactions
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_account_member(account_id, auth.uid())
);

CREATE POLICY transactions_insert_owner
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND public.is_account_owner(account_id, auth.uid())
);

CREATE POLICY transactions_update_owner
ON public.transactions
FOR UPDATE
TO authenticated
USING (public.is_account_owner(account_id, auth.uid()))
WITH CHECK (public.is_account_owner(account_id, auth.uid()));

CREATE POLICY transactions_delete_owner
ON public.transactions
FOR DELETE
TO authenticated
USING (public.is_account_owner(account_id, auth.uid()));

CREATE POLICY account_snapshots_select_member
ON public.account_snapshots
FOR SELECT
TO authenticated
USING (public.is_account_member(account_id, auth.uid()));

CREATE POLICY account_snapshots_insert_owner
ON public.account_snapshots
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_owner(account_id, auth.uid()));

CREATE POLICY account_snapshots_update_owner
ON public.account_snapshots
FOR UPDATE
TO authenticated
USING (public.is_account_owner(account_id, auth.uid()))
WITH CHECK (public.is_account_owner(account_id, auth.uid()));

CREATE POLICY account_snapshots_delete_owner
ON public.account_snapshots
FOR DELETE
TO authenticated
USING (public.is_account_owner(account_id, auth.uid()));

CREATE POLICY import_jobs_select_owner
ON public.import_jobs
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.can_access_import_job(id, auth.uid())
);

CREATE POLICY import_jobs_insert_owner
ON public.import_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND created_by = auth.uid()
  AND public.is_account_owner(account_id, auth.uid())
);

CREATE POLICY import_jobs_update_owner
ON public.import_jobs
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_account_owner(account_id, auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_account_owner(account_id, auth.uid())
);

CREATE POLICY import_jobs_delete_owner
ON public.import_jobs
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_account_owner(account_id, auth.uid())
);

CREATE POLICY import_rows_select_owner
ON public.import_rows
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.can_access_import_job(import_job_id, auth.uid())
);

CREATE POLICY import_rows_insert_owner
ON public.import_rows
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND public.can_manage_import_job(import_job_id, auth.uid())
);

CREATE POLICY import_rows_update_owner
ON public.import_rows
FOR UPDATE
TO authenticated
USING (public.can_manage_import_job(import_job_id, auth.uid()))
WITH CHECK (public.can_manage_import_job(import_job_id, auth.uid()));

CREATE POLICY import_rows_delete_owner
ON public.import_rows
FOR DELETE
TO authenticated
USING (public.can_manage_import_job(import_job_id, auth.uid()));
