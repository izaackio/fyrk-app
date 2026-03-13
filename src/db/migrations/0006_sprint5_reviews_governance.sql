-- Sprint 5 quarterly reviews and proposal governance persistence:
-- quarterly_reviews, proposals, proposal_approvals, proposal_comments, audit_log.

CREATE TABLE public.quarterly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  quarter_label text NOT NULL,
  net_worth_start integer NOT NULL,
  net_worth_end integer NOT NULL,
  net_worth_change integer NOT NULL,
  market_returns_amount integer NOT NULL DEFAULT 0,
  net_savings_amount integer NOT NULL DEFAULT 0,
  debt_reduction_amount integer NOT NULL DEFAULT 0,
  fees_drag_amount integer NOT NULL DEFAULT 0,
  narrative text,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  fitness_score integer,
  fitness_components jsonb,
  upcoming_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  generated_at timestamptz,
  published_at timestamptz,
  timeline_entry_id uuid REFERENCES public.timeline_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT quarterly_reviews_period_check CHECK (period_end >= period_start),
  CONSTRAINT quarterly_reviews_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_reviews_household ON public.quarterly_reviews(household_id);
CREATE INDEX idx_reviews_household_period ON public.quarterly_reviews(household_id, period_end);
CREATE INDEX idx_reviews_status ON public.quarterly_reviews(status);
CREATE INDEX idx_reviews_timeline_entry ON public.quarterly_reviews(timeline_entry_id);

CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  impact_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  requires_approval_from uuid[] NOT NULL DEFAULT '{}'::uuid[],
  approved_by uuid[] NOT NULL DEFAULT '{}'::uuid[],
  rejected_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  timeline_entry_id uuid REFERENCES public.timeline_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT proposals_category_check CHECK (
    category IN ('investment', 'insurance', 'debt', 'savings', 'other')
  ),
  CONSTRAINT proposals_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  CONSTRAINT proposals_rejected_by_status_check CHECK (rejected_by IS NULL OR status = 'rejected'),
  CONSTRAINT proposals_resolution_status_check CHECK (
    (
      status = 'pending'
      AND resolved_at IS NULL
    )
    OR (
      status IN ('approved', 'rejected', 'withdrawn')
      AND resolved_at IS NOT NULL
    )
  )
);

CREATE INDEX idx_proposals_household ON public.proposals(household_id);
CREATE INDEX idx_proposals_household_status ON public.proposals(household_id, status);
CREATE INDEX idx_proposals_created_by ON public.proposals(created_by);
CREATE INDEX idx_proposals_resolved_at ON public.proposals(resolved_at);
CREATE INDEX idx_proposals_timeline_entry ON public.proposals(timeline_entry_id);

CREATE TABLE public.proposal_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  approver_user_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending',
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_approvals_proposal_approver_uniq UNIQUE (proposal_id, approver_user_id),
  CONSTRAINT proposal_approvals_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT proposal_approvals_decided_at_status_check CHECK (
    (
      status = 'pending'
      AND decided_at IS NULL
    )
    OR (
      status IN ('approved', 'rejected')
      AND decided_at IS NOT NULL
    )
  )
);

CREATE INDEX idx_proposal_approvals_proposal ON public.proposal_approvals(proposal_id);
CREATE INDEX idx_proposal_approvals_approver ON public.proposal_approvals(approver_user_id);
CREATE INDEX idx_proposal_approvals_status ON public.proposal_approvals(status);

CREATE TABLE public.proposal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_comments_proposal ON public.proposal_comments(proposal_id);
CREATE INDEX idx_comments_user ON public.proposal_comments(user_id);
CREATE INDEX idx_comments_created_at ON public.proposal_comments(created_at);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  changes jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_household ON public.audit_log(household_id);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_date ON public.audit_log(created_at);
CREATE INDEX idx_audit_household_date ON public.audit_log(household_id, created_at);

ALTER TABLE public.timeline_entries
ADD CONSTRAINT timeline_entries_linked_review_id_fkey
FOREIGN KEY (linked_review_id)
REFERENCES public.quarterly_reviews(id)
ON DELETE SET NULL;

ALTER TABLE public.timeline_entries
ADD CONSTRAINT timeline_entries_linked_proposal_id_fkey
FOREIGN KEY (linked_proposal_id)
REFERENCES public.proposals(id)
ON DELETE SET NULL;

CREATE INDEX idx_timeline_linked_review ON public.timeline_entries(linked_review_id);
CREATE INDEX idx_timeline_linked_proposal ON public.timeline_entries(linked_proposal_id);

CREATE TRIGGER set_quarterly_reviews_updated_at
BEFORE UPDATE ON public.quarterly_reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_proposal_approvals_updated_at
BEFORE UPDATE ON public.proposal_approvals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_proposal_comments_updated_at
BEFORE UPDATE ON public.proposal_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_household_contributor(target_household_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = target_household_id
      AND hm.user_id = target_user_id
      AND hm.status = 'active'
      AND hm.role IN ('owner', 'admin', 'member')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quarterly_review_member(
  target_quarterly_review_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quarterly_reviews qr
    WHERE qr.id = target_quarterly_review_id
      AND qr.deleted_at IS NULL
      AND public.is_household_member(qr.household_id, target_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_proposal_member(target_proposal_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.proposals p
    WHERE p.id = target_proposal_id
      AND p.deleted_at IS NULL
      AND public.is_household_member(p.household_id, target_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_proposal_contributor(target_proposal_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.proposals p
    WHERE p.id = target_proposal_id
      AND p.deleted_at IS NULL
      AND public.is_household_contributor(p.household_id, target_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_proposal_manager(target_proposal_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.proposals p
    WHERE p.id = target_proposal_id
      AND p.deleted_at IS NULL
      AND public.is_household_manager(p.household_id, target_user_id)
  );
$$;

ALTER TABLE public.quarterly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quarterly_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY quarterly_reviews_select_member
ON public.quarterly_reviews
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY quarterly_reviews_insert_contributor
ON public.quarterly_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND public.is_household_contributor(household_id, auth.uid())
);

CREATE POLICY quarterly_reviews_update_contributor
ON public.quarterly_reviews
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_household_contributor(household_id, auth.uid())
)
WITH CHECK (public.is_household_contributor(household_id, auth.uid()));

CREATE POLICY quarterly_reviews_delete_manager
ON public.quarterly_reviews
FOR DELETE
TO authenticated
USING (public.is_household_manager(household_id, auth.uid()));

CREATE POLICY proposals_select_member
ON public.proposals
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY proposals_insert_contributor
ON public.proposals
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND created_by = auth.uid()
  AND public.is_household_contributor(household_id, auth.uid())
);

CREATE POLICY proposals_update_creator_or_manager
ON public.proposals
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    created_by = auth.uid()
    OR public.is_household_manager(household_id, auth.uid())
  )
)
WITH CHECK (
  public.is_household_contributor(household_id, auth.uid())
  AND (
    created_by = auth.uid()
    OR public.is_household_manager(household_id, auth.uid())
  )
);

CREATE POLICY proposals_delete_creator_or_manager
ON public.proposals
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_household_manager(household_id, auth.uid())
);

CREATE POLICY proposal_approvals_select_member
ON public.proposal_approvals
FOR SELECT
TO authenticated
USING (public.is_proposal_member(proposal_id, auth.uid()));

CREATE POLICY proposal_approvals_insert_self
ON public.proposal_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  approver_user_id = auth.uid()
  AND public.is_proposal_contributor(proposal_id, auth.uid())
);

CREATE POLICY proposal_approvals_update_self_or_manager
ON public.proposal_approvals
FOR UPDATE
TO authenticated
USING (
  approver_user_id = auth.uid()
  OR public.is_proposal_manager(proposal_id, auth.uid())
)
WITH CHECK (
  approver_user_id = auth.uid()
  OR public.is_proposal_manager(proposal_id, auth.uid())
);

CREATE POLICY proposal_approvals_delete_manager
ON public.proposal_approvals
FOR DELETE
TO authenticated
USING (public.is_proposal_manager(proposal_id, auth.uid()));

CREATE POLICY proposal_comments_select_member
ON public.proposal_comments
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_proposal_member(proposal_id, auth.uid())
);

CREATE POLICY proposal_comments_insert_self
ON public.proposal_comments
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND user_id = auth.uid()
  AND public.is_proposal_contributor(proposal_id, auth.uid())
);

CREATE POLICY proposal_comments_update_author_or_manager
ON public.proposal_comments
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    user_id = auth.uid()
    OR public.is_proposal_manager(proposal_id, auth.uid())
  )
)
WITH CHECK (
  public.is_proposal_member(proposal_id, auth.uid())
  AND (
    user_id = auth.uid()
    OR public.is_proposal_manager(proposal_id, auth.uid())
  )
);

CREATE POLICY proposal_comments_delete_author_or_manager
ON public.proposal_comments
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_proposal_manager(proposal_id, auth.uid())
);

CREATE POLICY audit_log_select_member
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY audit_log_insert_actor_member
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_household_member(household_id, auth.uid())
);
