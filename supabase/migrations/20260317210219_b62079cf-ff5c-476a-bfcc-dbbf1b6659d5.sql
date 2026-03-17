DROP POLICY "Service role can manage notification log" ON push_notification_log;

CREATE POLICY "Service role only"
  ON push_notification_log
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');