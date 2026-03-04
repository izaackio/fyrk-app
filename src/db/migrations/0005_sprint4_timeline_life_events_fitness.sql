-- Sprint 4 timeline, life-event playbook, and fitness score persistence.

CREATE TABLE public.timeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  entry_type text NOT NULL,
  category text,
  title text NOT NULL,
  description text,
  reasoning text,
  expected_outcome text,
  linked_account_ids uuid[],
  linked_proposal_id uuid,
  linked_review_id uuid,
  linked_event_id uuid,
  entry_date date NOT NULL,
  is_future boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT timeline_entries_entry_type_check CHECK (
    entry_type IN ('life_event', 'decision', 'milestone', 'review', 'system', 'note')
  ),
  CONSTRAINT timeline_entries_category_check CHECK (
    category IS NULL OR category IN ('housing', 'family', 'career', 'investment', 'retirement', 'other')
  )
);

CREATE INDEX idx_timeline_household ON public.timeline_entries(household_id);
CREATE INDEX idx_timeline_date ON public.timeline_entries(entry_date);
CREATE INDEX idx_timeline_type ON public.timeline_entries(entry_type);
CREATE INDEX idx_timeline_created_by ON public.timeline_entries(created_by);

CREATE TABLE public.life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  triggered_by uuid NOT NULL REFERENCES public.profiles(id),
  event_type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  impact_summary text,
  impact_data jsonb,
  target_date date,
  completed_at timestamptz,
  timeline_entry_id uuid REFERENCES public.timeline_entries(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT life_events_event_type_check CHECK (
    event_type IN (
      'buying_apartment',
      'having_child',
      'changing_jobs',
      'inheritance',
      'retirement',
      'marriage',
      'divorce'
    )
  ),
  CONSTRAINT life_events_status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE INDEX idx_life_events_household ON public.life_events(household_id);
CREATE INDEX idx_life_events_status ON public.life_events(status);
CREATE INDEX idx_life_events_event_type ON public.life_events(event_type);
CREATE INDEX idx_life_events_target_date ON public.life_events(target_date);

ALTER TABLE public.timeline_entries
ADD CONSTRAINT timeline_entries_linked_event_id_fkey
FOREIGN KEY (linked_event_id)
REFERENCES public.life_events(id)
ON DELETE SET NULL;

CREATE TABLE public.playbook_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  life_event_id uuid NOT NULL REFERENCES public.life_events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  sort_order integer NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending',
  estimated_impact_amount integer,
  estimated_impact_description text,
  completed_at timestamptz,
  completion_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playbook_actions_category_check CHECK (
    category IN ('financial', 'legal', 'insurance', 'tax', 'administrative')
  ),
  CONSTRAINT playbook_actions_priority_check CHECK (
    priority IN ('critical', 'high', 'medium', 'low')
  ),
  CONSTRAINT playbook_actions_status_check CHECK (
    status IN ('pending', 'in_progress', 'completed', 'skipped')
  ),
  CONSTRAINT playbook_actions_sort_order_non_negative_check CHECK (sort_order >= 0)
);

CREATE INDEX idx_playbook_event ON public.playbook_actions(life_event_id);
CREATE INDEX idx_playbook_status ON public.playbook_actions(status);
CREATE INDEX idx_playbook_assigned_to ON public.playbook_actions(assigned_to);
CREATE INDEX idx_playbook_event_sort ON public.playbook_actions(life_event_id, sort_order);

CREATE TABLE public.fitness_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  total_score integer NOT NULL,
  buffer_score integer NOT NULL,
  growth_score integer NOT NULL,
  protection_score integer NOT NULL,
  efficiency_score integer NOT NULL,
  trajectory_score integer NOT NULL,
  component_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text,
  suggested_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fitness_scores_total_score_range_check CHECK (total_score BETWEEN 0 AND 1000),
  CONSTRAINT fitness_scores_buffer_score_range_check CHECK (buffer_score BETWEEN 0 AND 200),
  CONSTRAINT fitness_scores_growth_score_range_check CHECK (growth_score BETWEEN 0 AND 200),
  CONSTRAINT fitness_scores_protection_score_range_check CHECK (protection_score BETWEEN 0 AND 200),
  CONSTRAINT fitness_scores_efficiency_score_range_check CHECK (efficiency_score BETWEEN 0 AND 200),
  CONSTRAINT fitness_scores_trajectory_score_range_check CHECK (trajectory_score BETWEEN 0 AND 200),
  CONSTRAINT fitness_scores_component_total_check CHECK (
    total_score = (
      buffer_score
      + growth_score
      + protection_score
      + efficiency_score
      + trajectory_score
    )
  )
);

CREATE INDEX idx_fitness_household ON public.fitness_scores(household_id);
CREATE INDEX idx_fitness_date ON public.fitness_scores(calculated_at);
CREATE INDEX idx_fitness_household_date ON public.fitness_scores(household_id, calculated_at DESC);

CREATE TRIGGER set_timeline_entries_updated_at
BEFORE UPDATE ON public.timeline_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_life_events_updated_at
BEFORE UPDATE ON public.life_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_playbook_actions_updated_at
BEFORE UPDATE ON public.playbook_actions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_life_event_member(target_life_event_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.life_events le
    WHERE le.id = target_life_event_id
      AND le.deleted_at IS NULL
      AND public.is_household_member(le.household_id, target_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_playbook_action_member(
  target_playbook_action_id uuid,
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
    FROM public.playbook_actions pa
    JOIN public.life_events le
      ON le.id = pa.life_event_id
    WHERE pa.id = target_playbook_action_id
      AND le.deleted_at IS NULL
      AND public.is_household_member(le.household_id, target_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_life_event_household_member(
  target_life_event_id uuid,
  target_assignee_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.life_events le
    WHERE le.id = target_life_event_id
      AND le.deleted_at IS NULL
      AND public.is_household_member(le.household_id, target_assignee_id)
  );
$$;

ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.timeline_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.life_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_scores FORCE ROW LEVEL SECURITY;

CREATE POLICY timeline_entries_select_member
ON public.timeline_entries
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY timeline_entries_insert_member
ON public.timeline_entries
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND created_by = auth.uid()
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY timeline_entries_update_member
ON public.timeline_entries
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
  public.is_household_member(household_id, auth.uid())
  AND (
    created_by = auth.uid()
    OR public.is_household_manager(household_id, auth.uid())
  )
);

CREATE POLICY timeline_entries_delete_member
ON public.timeline_entries
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_household_manager(household_id, auth.uid())
);

CREATE POLICY life_events_select_member
ON public.life_events
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY life_events_insert_member
ON public.life_events
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND triggered_by = auth.uid()
  AND public.is_household_member(household_id, auth.uid())
);

CREATE POLICY life_events_update_member
ON public.life_events
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_household_member(household_id, auth.uid())
)
WITH CHECK (
  public.is_household_member(household_id, auth.uid())
);

CREATE POLICY life_events_delete_member
ON public.life_events
FOR DELETE
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY playbook_actions_select_member
ON public.playbook_actions
FOR SELECT
TO authenticated
USING (public.is_life_event_member(life_event_id, auth.uid()));

CREATE POLICY playbook_actions_insert_member
ON public.playbook_actions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_life_event_member(life_event_id, auth.uid())
  AND (
    assigned_to IS NULL
    OR public.is_life_event_household_member(life_event_id, assigned_to)
  )
);

CREATE POLICY playbook_actions_update_member
ON public.playbook_actions
FOR UPDATE
TO authenticated
USING (public.is_life_event_member(life_event_id, auth.uid()))
WITH CHECK (
  public.is_life_event_member(life_event_id, auth.uid())
  AND (
    assigned_to IS NULL
    OR public.is_life_event_household_member(life_event_id, assigned_to)
  )
);

CREATE POLICY playbook_actions_delete_member
ON public.playbook_actions
FOR DELETE
TO authenticated
USING (public.is_life_event_member(life_event_id, auth.uid()));

CREATE POLICY fitness_scores_select_member
ON public.fitness_scores
FOR SELECT
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY fitness_scores_insert_member
ON public.fitness_scores
FOR INSERT
TO authenticated
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY fitness_scores_update_member
ON public.fitness_scores
FOR UPDATE
TO authenticated
USING (public.is_household_member(household_id, auth.uid()))
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY fitness_scores_delete_member
ON public.fitness_scores
FOR DELETE
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));
