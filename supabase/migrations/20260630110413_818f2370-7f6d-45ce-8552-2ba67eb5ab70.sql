CREATE TABLE public.dispatcher_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'cron',
  ok boolean NOT NULL,
  total int NOT NULL DEFAULT 0,
  passed int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text
);

GRANT SELECT ON public.dispatcher_test_runs TO authenticated;
GRANT ALL ON public.dispatcher_test_runs TO service_role;

ALTER TABLE public.dispatcher_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dispatcher test runs"
  ON public.dispatcher_test_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX dispatcher_test_runs_ran_at_idx ON public.dispatcher_test_runs (ran_at DESC);