-- 1. Clean up any stray admin rows (defensive — currently none)
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id <> (SELECT id FROM auth.users WHERE email = 'greenhenry441@gmail.com');

-- 2. Enforcement trigger: only greenhenry441@gmail.com can ever be admin
CREATE OR REPLACE FUNCTION public.enforce_single_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT id INTO owner_id FROM auth.users WHERE email = 'greenhenry441@gmail.com';

  -- Block changing or deleting the owner's admin row
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.role = 'admin' AND OLD.user_id = owner_id THEN
    RAISE EXCEPTION 'The owner admin role cannot be modified or removed';
  END IF;

  -- Block creating/updating an admin row for anyone other than the owner
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.role = 'admin' AND NEW.user_id <> owner_id THEN
    RAISE EXCEPTION 'Only greenhenry441@gmail.com may hold the admin role';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS enforce_single_admin_trg ON public.user_roles;
CREATE TRIGGER enforce_single_admin_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_admin();