-- Sprint 0 waitlist pre-launch capture.

CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_signups_email_lowercase_check CHECK (email = lower(email))
);

CREATE UNIQUE INDEX waitlist_signups_email_uniq ON public.waitlist_signups(email);

CREATE TRIGGER set_waitlist_signups_updated_at
BEFORE UPDATE ON public.waitlist_signups
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_signups FORCE ROW LEVEL SECURITY;

CREATE POLICY waitlist_signups_insert_public
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY waitlist_signups_select_admin_service
ON public.waitlist_signups
FOR SELECT
TO postgres, service_role
USING (true);
