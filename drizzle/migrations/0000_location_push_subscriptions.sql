DELETE FROM public.fcm_tokens;
ALTER TABLE public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_token_key;
ALTER TABLE public.fcm_tokens ADD COLUMN location_id text;
ALTER TABLE public.fcm_tokens ADD COLUMN lat double precision;
ALTER TABLE public.fcm_tokens ADD COLUMN lon double precision;
ALTER TABLE public.fcm_tokens ADD CONSTRAINT fcm_tokens_token_location_key UNIQUE (token, location_id);
CREATE INDEX IF NOT EXISTS fcm_tokens_location_idx ON public.fcm_tokens (location_id);

ALTER TABLE public.push_notification_log ADD COLUMN location_id text;
CREATE INDEX IF NOT EXISTS push_log_cooldown_idx ON public.push_notification_log (location_id, notification_type, sent_at DESC);

REVOKE ALL ON public.fcm_tokens FROM anon, authenticated;
REVOKE ALL ON public.push_notification_log FROM anon, authenticated;
GRANT ALL ON public.fcm_tokens TO service_role;
GRANT ALL ON public.push_notification_log TO service_role;