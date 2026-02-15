import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiting (per IP, 30 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const now = new Date();
    const tides = generateTidalPredictions(now);
    const currentHeight = getCurrentTideHeight(now);
    const tideState = getTideState(now);

    return new Response(JSON.stringify({ events: tides, current_height_m: currentHeight, state: tideState }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tide error:', error);
    return new Response(JSON.stringify({ error: 'Unable to fetch tide data. Please try again later.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Semi-diurnal tidal approximation for Cromane/Castlemaine Harbour
function generateTidalPredictions(now: Date) {
  const TIDAL_PERIOD_MS = 12 * 3600 * 1000 + 25 * 60 * 1000;
  const MEAN_HIGH = 4.1;
  const MEAN_LOW = 0.9;

  const refHigh = new Date('2025-01-01T03:30:00Z').getTime();
  const elapsed = now.getTime() - refHigh;
  const cycles = Math.floor(elapsed / TIDAL_PERIOD_MS);
  const nearestHigh = new Date(refHigh + cycles * TIDAL_PERIOD_MS);

  const events = [];
  for (let i = -1; i <= 2; i++) {
    const highTime = new Date(nearestHigh.getTime() + i * TIDAL_PERIOD_MS);
    const lowTime = new Date(highTime.getTime() + TIDAL_PERIOD_MS / 2);
    const dayOfMonth = highTime.getDate();
    const springFactor = 1 + 0.15 * Math.cos((dayOfMonth / 14.76) * Math.PI * 2);

    events.push({
      type: 'high',
      time: formatTime(highTime),
      height_m: parseFloat((MEAN_HIGH * springFactor).toFixed(1)),
      timestamp: highTime.toISOString(),
    });
    events.push({
      type: 'low',
      time: formatTime(lowTime),
      height_m: parseFloat((MEAN_LOW / springFactor).toFixed(1)),
      timestamp: lowTime.toISOString(),
    });
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events.filter(e => new Date(e.timestamp).getTime() > now.getTime() - 3600000).slice(0, 4);
}

// Calculate current tide height using cosine interpolation
function getCurrentTideHeight(now: Date): number {
  const TIDAL_PERIOD_MS = 12 * 3600 * 1000 + 25 * 60 * 1000;
  const MEAN_HIGH = 4.1;
  const MEAN_LOW = 0.9;
  const refHigh = new Date('2025-01-01T03:30:00Z').getTime();
  const elapsed = now.getTime() - refHigh;
  const phase = (elapsed % TIDAL_PERIOD_MS) / TIDAL_PERIOD_MS;
  const dayOfMonth = now.getDate();
  const springFactor = 1 + 0.15 * Math.cos((dayOfMonth / 14.76) * Math.PI * 2);
  const high = MEAN_HIGH * springFactor;
  const low = MEAN_LOW / springFactor;
  const mid = (high + low) / 2;
  const amp = (high - low) / 2;
  // phase 0 = high, 0.5 = low, 1 = high
  return parseFloat((mid + amp * Math.cos(phase * 2 * Math.PI)).toFixed(1));
}

// Determine if tide is rising or falling
function getTideState(now: Date): 'rising' | 'falling' {
  const TIDAL_PERIOD_MS = 12 * 3600 * 1000 + 25 * 60 * 1000;
  const refHigh = new Date('2025-01-01T03:30:00Z').getTime();
  const elapsed = now.getTime() - refHigh;
  const phase = (elapsed % TIDAL_PERIOD_MS) / TIDAL_PERIOD_MS;
  // 0-0.5 = falling (high to low), 0.5-1 = rising (low to high)
  return phase < 0.5 ? 'falling' : 'rising';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Dublin',
  });
}
