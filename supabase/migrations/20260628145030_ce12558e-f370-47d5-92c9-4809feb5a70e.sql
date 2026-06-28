CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  min_severity text NOT NULL DEFAULT 'moderate',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone may register a subscription (endpoint is unique so duplicates upsert)
CREATE POLICY "anyone can insert their own subscription"
  ON public.push_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone may read back the row for the endpoint they own (used by client upsert)
CREATE POLICY "anyone can read subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anyone can update by endpoint"
  ON public.push_subscriptions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anyone can delete by endpoint"
  ON public.push_subscriptions FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TRIGGER push_subscriptions_set_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();