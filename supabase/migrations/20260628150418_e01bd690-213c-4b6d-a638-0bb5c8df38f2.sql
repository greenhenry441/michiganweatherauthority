
-- ============= Roles =============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============= MFA factors =============
CREATE TABLE IF NOT EXISTS public.user_mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('signin','command')),
  method text NOT NULL CHECK (method IN ('totp','email')),
  secret text,
  confirmed_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purpose)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mfa_factors TO authenticated;
GRANT ALL ON public.user_mfa_factors TO service_role;

ALTER TABLE public.user_mfa_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can read mfa" ON public.user_mfa_factors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner can insert mfa" ON public.user_mfa_factors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner can update mfa" ON public.user_mfa_factors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner can delete mfa" ON public.user_mfa_factors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_mfa_factors_set_updated_at
  BEFORE UPDATE ON public.user_mfa_factors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============= Email OTP codes =============
CREATE TABLE IF NOT EXISTS public.mfa_email_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('signin','command','enroll')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mfa_email_codes TO authenticated;
GRANT ALL ON public.mfa_email_codes TO service_role;

ALTER TABLE public.mfa_email_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can read codes" ON public.mfa_email_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner can insert codes" ON public.mfa_email_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner can update codes" ON public.mfa_email_codes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS mfa_email_codes_user_purpose_idx
  ON public.mfa_email_codes (user_id, purpose, expires_at DESC);

-- ============= Command unlock attempts =============
CREATE TABLE IF NOT EXISTS public.command_unlock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.command_unlock_attempts TO authenticated;
GRANT ALL ON public.command_unlock_attempts TO service_role;

ALTER TABLE public.command_unlock_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can read attempts" ON public.command_unlock_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS command_unlock_attempts_user_idx
  ON public.command_unlock_attempts (user_id, attempted_at DESC);
