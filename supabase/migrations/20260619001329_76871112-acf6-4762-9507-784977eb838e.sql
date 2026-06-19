
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS work_zip text,
  ADD COLUMN IF NOT EXISTS work_city text,
  ADD COLUMN IF NOT EXISTS work_lat double precision,
  ADD COLUMN IF NOT EXISTS work_lon double precision,
  ADD COLUMN IF NOT EXISTS notify_eas boolean NOT NULL DEFAULT true;

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'weather';

CREATE INDEX IF NOT EXISTS alerts_kind_idx ON public.alerts(kind);
