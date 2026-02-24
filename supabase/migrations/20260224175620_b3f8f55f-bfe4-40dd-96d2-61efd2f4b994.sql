DROP POLICY IF EXISTS "Anyone can register a push token" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Service role can read tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Anyone can update their token" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Anyone can delete tokens" ON public.fcm_tokens;

CREATE POLICY "Service role manages tokens"
ON public.fcm_tokens FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');