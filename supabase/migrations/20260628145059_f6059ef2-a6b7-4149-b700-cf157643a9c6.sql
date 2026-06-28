DROP POLICY IF EXISTS "anyone can update by endpoint" ON public.push_subscriptions;
DROP POLICY IF EXISTS "anyone can delete by endpoint" ON public.push_subscriptions;
DROP POLICY IF EXISTS "anyone can read subscriptions" ON public.push_subscriptions;

CREATE POLICY "owner can update own subscription"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner can delete own subscription"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "owner can read own subscription"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());