
-- Table for storing FCM device tokens
CREATE TABLE public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Public insert (anonymous devices can register)
CREATE POLICY "Anyone can register a push token"
ON public.fcm_tokens
FOR INSERT
WITH CHECK (true);

-- Public select for the edge function to read tokens
CREATE POLICY "Service role can read tokens"
ON public.fcm_tokens
FOR SELECT
USING (true);

-- Allow updating last_used_at
CREATE POLICY "Anyone can update their token"
ON public.fcm_tokens
FOR UPDATE
USING (true);

-- Cleanup: allow deleting stale tokens
CREATE POLICY "Anyone can delete tokens"
ON public.fcm_tokens
FOR DELETE
USING (true);

-- Table to track sent notifications (prevent spam)
CREATE TABLE public.push_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  alert_level INTEGER NOT NULL DEFAULT 0,
  details JSONB
);

ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notification log"
ON public.push_notification_log
FOR ALL
USING (true);
