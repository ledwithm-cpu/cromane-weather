-- Lightning strike cache (persisted backup for in-memory cache)
CREATE TABLE public.lightning_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL,
  time_ns BIGINT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  bearing_deg DOUBLE PRECISION NOT NULL,
  bearing_compass TEXT NOT NULL,
  alert_level INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT lightning_cache_unique_strike UNIQUE (cache_key, time_ns, lat, lon)
);

-- Index for fast hydration: lookup recent strikes by location
CREATE INDEX idx_lightning_cache_key_time ON public.lightning_cache (cache_key, time_ns DESC);

-- Index for fast cleanup of old strikes
CREATE INDEX idx_lightning_cache_time_ns ON public.lightning_cache (time_ns);

-- Enable RLS
ALTER TABLE public.lightning_cache ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions only)
CREATE POLICY "Service role only"
ON public.lightning_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');