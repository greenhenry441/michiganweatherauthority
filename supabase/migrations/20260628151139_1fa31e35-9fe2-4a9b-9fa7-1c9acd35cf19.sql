DROP POLICY IF EXISTS "anyone can insert their own subscription" ON public.push_subscriptions;

CREATE POLICY "users insert own subscription"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());