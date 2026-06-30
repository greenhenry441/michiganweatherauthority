CREATE TABLE public.status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('alert','maintenance','info')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  link_url text,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.status_updates TO anon, authenticated;
GRANT ALL ON public.status_updates TO service_role;

ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;

-- Public read of currently-active entries only. Writes are service-role only
-- (no INSERT/UPDATE/DELETE policy → blocked for anon/authenticated under RLS).
CREATE POLICY "status_updates public read active"
  ON public.status_updates
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

CREATE TRIGGER status_updates_updated_at
  BEFORE UPDATE ON public.status_updates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX status_updates_active_idx ON public.status_updates (active, starts_at DESC);
