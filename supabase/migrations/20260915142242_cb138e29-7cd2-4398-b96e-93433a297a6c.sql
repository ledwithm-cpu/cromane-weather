CREATE TABLE public.booking_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id TEXT NOT NULL,
  sauna_name TEXT,
  source TEXT,
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.booking_clicks TO anon;
GRANT INSERT ON public.booking_clicks TO authenticated;
GRANT ALL ON public.booking_clicks TO service_role;

ALTER TABLE public.booking_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a booking click"
  ON public.booking_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX booking_clicks_location_idx ON public.booking_clicks (location_id);
CREATE INDEX booking_clicks_created_at_idx ON public.booking_clicks (created_at DESC);