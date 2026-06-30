-- 1) Remove client read access to MFA secrets and OTP hashes; server uses service_role only
DROP POLICY IF EXISTS "owner can read mfa" ON public.user_mfa_factors;
DROP POLICY IF EXISTS "owner can read codes" ON public.mfa_email_codes;

-- 2) Restrict spotter_reports public read: drop anon access; authenticated still see all,
--    but public visitors must go through server functions that strip user_id and coarsen GPS.
DROP POLICY IF EXISTS "reports public read" ON public.spotter_reports;
CREATE POLICY "reports authed read"
  ON public.spotter_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) Revoke EXECUTE on the SECURITY DEFINER helper from client roles.
--    RLS policies invoke it under the table owner's privileges, so policy evaluation continues to work.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
