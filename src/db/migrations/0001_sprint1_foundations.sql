-- Sprint 1 database foundations: profiles, households, household_members.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  base_currency text NOT NULL DEFAULT 'SEK',
  locale text NOT NULL DEFAULT 'en',
  onboarding_completed boolean NOT NULL DEFAULT false,
  is_demo_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT profiles_base_currency_iso3_check CHECK (char_length(base_currency) = 3)
);

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'household',
  base_currency text NOT NULL DEFAULT 'SEK',
  is_demo boolean NOT NULL DEFAULT false,
  demo_variant text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT households_type_check CHECK (type IN ('household', 'extended_family', 'circle')),
  CONSTRAINT households_base_currency_iso3_check CHECK (char_length(base_currency) = 3),
  CONSTRAINT households_demo_variant_check CHECK (
    demo_variant IS NULL OR demo_variant IN ('standard', 'fire', 'fam_family', 'friendly_family')
  )
);

CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  invited_email text,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT household_members_household_user_uniq UNIQUE (household_id, user_id),
  CONSTRAINT household_members_role_check CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  CONSTRAINT household_members_status_check CHECK (status IN ('active', 'invited', 'removed'))
);

CREATE INDEX idx_hm_household ON public.household_members(household_id);
CREATE INDEX idx_hm_user ON public.household_members(user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_households_updated_at
BEFORE UPDATE ON public.households
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_household_members_updated_at
BEFORE UPDATE ON public.household_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_household_member(target_household_id uuid, target_user_id uuid)
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
  );
$$;

CREATE OR REPLACE FUNCTION public.is_household_manager(target_household_id uuid, target_user_id uuid)
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
      AND hm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_household_owner(target_household_id uuid, target_user_id uuid)
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
      AND hm.role = 'owner'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.households FORCE ROW LEVEL SECURITY;
ALTER TABLE public.household_members FORCE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY households_select_member
ON public.households
FOR SELECT
TO authenticated
USING (public.is_household_member(id, auth.uid()));

CREATE POLICY households_insert_creator
ON public.households
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY households_update_manager
ON public.households
FOR UPDATE
TO authenticated
USING (public.is_household_manager(id, auth.uid()))
WITH CHECK (public.is_household_manager(id, auth.uid()));

CREATE POLICY households_delete_owner
ON public.households
FOR DELETE
TO authenticated
USING (public.is_household_owner(id, auth.uid()));

CREATE POLICY household_members_select_member
ON public.household_members
FOR SELECT
TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY household_members_insert_creator_owner
ON public.household_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'
  AND status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.households h
    WHERE h.id = household_id
      AND h.created_by = auth.uid()
  )
);

CREATE POLICY household_members_insert_manager
ON public.household_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_household_manager(household_id, auth.uid()));

CREATE POLICY household_members_update_manager
ON public.household_members
FOR UPDATE
TO authenticated
USING (public.is_household_manager(household_id, auth.uid()))
WITH CHECK (public.is_household_manager(household_id, auth.uid()));

CREATE POLICY household_members_delete_manager
ON public.household_members
FOR DELETE
TO authenticated
USING (public.is_household_manager(household_id, auth.uid()));
