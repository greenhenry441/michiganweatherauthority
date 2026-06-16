
CREATE TABLE public.alerts (
  id uuid primary key default gen_random_uuid(),
  type_id text,
  custom_name text,
  category text not null default 'statement',
  severity text not null default 'minor',
  headline text not null,
  description text not null,
  instruction text,
  areas text[] not null default '{}',
  issuer text not null default 'MWA Operations',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null default 'manual'
);

GRANT SELECT ON public.alerts TO anon, authenticated;
GRANT ALL ON public.alerts TO service_role;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active alerts"
  ON public.alerts FOR SELECT
  USING (expires_at > now());

ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

CREATE INDEX alerts_expires_at_idx ON public.alerts (expires_at DESC);
