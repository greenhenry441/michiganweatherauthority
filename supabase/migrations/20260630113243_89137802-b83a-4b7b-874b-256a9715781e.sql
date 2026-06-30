-- Make has_role ignore the caller-supplied _user_id and always use auth.uid() internally.
-- Signature is preserved so existing RLS policies and triggers keep compiling, but the
-- function can no longer be tricked into checking a role for an arbitrary UUID.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  )
$$;
