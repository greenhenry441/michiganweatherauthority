
-- =========================================================================
-- USER PREFERENCES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- units
  units_temp TEXT NOT NULL DEFAULT 'F' CHECK (units_temp IN ('F','C')),
  units_speed TEXT NOT NULL DEFAULT 'mph' CHECK (units_speed IN ('mph','kph')),
  units_precip TEXT NOT NULL DEFAULT 'in' CHECK (units_precip IN ('in','mm')),
  clock_24h BOOLEAN NOT NULL DEFAULT false,
  -- notifications
  notify_severity TEXT[] NOT NULL DEFAULT ARRAY['extreme','severe','moderate']::text[],
  notify_counties TEXT[] NOT NULL DEFAULT ARRAY[]::text[], -- empty = all MI
  notify_types TEXT[] NOT NULL DEFAULT ARRAY[]::text[],    -- empty = all types
  quiet_start TIME,
  quiet_end TIME,
  quiet_tz TEXT NOT NULL DEFAULT 'America/Detroit',
  daily_briefing BOOLEAN NOT NULL DEFAULT false,
  lightning_radius_mi INT NOT NULL DEFAULT 0 CHECK (lightning_radius_mi >= 0 AND lightning_radius_mi <= 100),
  -- home + map
  home_lat DOUBLE PRECISION,
  home_lon DOUBLE PRECISION,
  home_label TEXT,
  default_map TEXT NOT NULL DEFAULT 'radar' CHECK (default_map IN ('radar','alerts','lightning','satellite')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs read"   ON public.user_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own prefs insert" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs update" ON public.user_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs delete" ON public.user_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- SAVED LOCATIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_locations_user_idx ON public.saved_locations(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_locations TO authenticated;
GRANT ALL ON public.saved_locations TO service_role;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own loc all" ON public.saved_locations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- ALERT THRESHOLDS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.saved_locations(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('temp_f','wind_mph','gust_mph','precip_in','humidity','uv','pressure_mb')),
  op TEXT NOT NULL CHECK (op IN ('>','<','>=','<=','=')),
  value DOUBLE PRECISION NOT NULL,
  label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_thresholds_user_idx ON public.alert_thresholds(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_thresholds TO authenticated;
GRANT ALL ON public.alert_thresholds TO service_role;
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thr all" ON public.alert_thresholds FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- SPOTTER REPORTS (community)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.spotter_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('tornado','funnel','wall_cloud','hail','wind_damage','flooding','heavy_snow','ice','other')),
  measurement TEXT,            -- e.g. "1.5 in" hail, "60 mph" gust
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  location_label TEXT,
  notes TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  confirmed_count INT NOT NULL DEFAULT 0,
  doubt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spotter_reports_created_idx ON public.spotter_reports(created_at DESC);
GRANT SELECT ON public.spotter_reports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.spotter_reports TO authenticated;
GRANT ALL ON public.spotter_reports TO service_role;
ALTER TABLE public.spotter_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports public read" ON public.spotter_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reports own insert"  ON public.spotter_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports own update"  ON public.spotter_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reports own delete"  ON public.spotter_reports FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- REPORT REACTIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.report_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.spotter_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('confirm','doubt')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);
CREATE INDEX IF NOT EXISTS report_reactions_report_idx ON public.report_reactions(report_id);
GRANT SELECT ON public.report_reactions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.report_reactions TO authenticated;
GRANT ALL ON public.report_reactions TO service_role;
ALTER TABLE public.report_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions public read" ON public.report_reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reactions own write"   ON public.report_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions own update"  ON public.report_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions own delete"  ON public.report_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to keep counts in sync
CREATE OR REPLACE FUNCTION public.sync_report_reaction_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spotter_reports
       SET confirmed_count = confirmed_count + CASE WHEN NEW.kind='confirm' THEN 1 ELSE 0 END,
           doubt_count     = doubt_count     + CASE WHEN NEW.kind='doubt'   THEN 1 ELSE 0 END
     WHERE id = NEW.report_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spotter_reports
       SET confirmed_count = GREATEST(0, confirmed_count - CASE WHEN OLD.kind='confirm' THEN 1 ELSE 0 END),
           doubt_count     = GREATEST(0, doubt_count     - CASE WHEN OLD.kind='doubt'   THEN 1 ELSE 0 END)
     WHERE id = OLD.report_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.kind <> OLD.kind THEN
    UPDATE public.spotter_reports
       SET confirmed_count = GREATEST(0, confirmed_count + CASE WHEN NEW.kind='confirm' THEN 1 WHEN OLD.kind='confirm' THEN -1 ELSE 0 END),
           doubt_count     = GREATEST(0, doubt_count     + CASE WHEN NEW.kind='doubt'   THEN 1 WHEN OLD.kind='doubt'   THEN -1 ELSE 0 END)
     WHERE id = NEW.report_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS report_reactions_sync ON public.report_reactions;
CREATE TRIGGER report_reactions_sync
AFTER INSERT OR UPDATE OR DELETE ON public.report_reactions
FOR EACH ROW EXECUTE FUNCTION public.sync_report_reaction_counts();
REVOKE EXECUTE ON FUNCTION public.sync_report_reaction_counts() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- REPORT COMMENTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.spotter_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_comments_report_idx ON public.report_comments(report_id, created_at DESC);
GRANT SELECT ON public.report_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.report_comments TO authenticated;
GRANT ALL ON public.report_comments TO service_role;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.report_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comments own insert"  ON public.report_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments own update"  ON public.report_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments own/admin del" ON public.report_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- SCHEDULED ALERTS (admin only)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_alerts_pending_idx ON public.scheduled_alerts(send_at) WHERE status = 'pending';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_alerts TO authenticated;
GRANT ALL ON public.scheduled_alerts TO service_role;
ALTER TABLE public.scheduled_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched admin all" ON public.scheduled_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- PUSH DELIVERY LOG (admin only)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  id BIGSERIAL PRIMARY KEY,
  alert_id UUID,
  endpoint TEXT NOT NULL,
  user_id UUID,
  ok BOOLEAN NOT NULL,
  status_code INT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_delivery_log_created_idx ON public.push_delivery_log(created_at DESC);
GRANT SELECT ON public.push_delivery_log TO authenticated;
GRANT ALL ON public.push_delivery_log TO service_role;
ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdl admin read" ON public.push_delivery_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================================
-- updated_at trigger for user_preferences
-- =========================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS user_preferences_touch ON public.user_preferences;
CREATE TRIGGER user_preferences_touch BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
