-- Lock down realtime channel subscriptions. Only the public alerts broadcast is allowed.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read on alerts-public topic" ON realtime.messages;
CREATE POLICY "Allow read on alerts-public topic"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING ( (SELECT realtime.topic()) = 'alerts-public' );