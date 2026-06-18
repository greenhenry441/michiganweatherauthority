
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_categories text[] NOT NULL DEFAULT ARRAY['warning','watch','advisory','statement']::text[],
  ADD COLUMN IF NOT EXISTS notify_event_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notify_hourly_forecast boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_only_my_area boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Public can read active alerts" ON public.alerts;
CREATE POLICY "Public can read active alerts"
  ON public.alerts
  FOR SELECT
  TO public
  USING (expires_at > now() AND issued_at <= now());
