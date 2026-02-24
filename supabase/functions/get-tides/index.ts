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

// Marine Institute ERDDAP – free, no API key required
// Fenit is the nearest station to Cromane (~10km). Tide propagation delay ~25 min into Castlemaine Harbour.
const ERDDAP_BASE = 'https://erddap.marine.ie/erddap/tabledap';
const STATION = 'Fenit';
const CROMANE_OFFSET_MS = 25 * 60 * 1000; // ~25 min delay from Fenit to Cromane

// In-memory cache to avoid hammering ERDDAP on every request
let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min cache

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

    // Return cached data if fresh
    if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
      // Recompute current height from cached continuous data
      const result = buildResponse(cache.data, now);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch high/low events and continuous water level in parallel
    const fromTime = new Date(now.getTime() - 2 * 3600 * 1000).toISOString(); // 2h ago
    const toTime = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();  // 24h ahead
    const contFrom = new Date(now.getTime() - 30 * 60 * 1000).toISOString();  // 30 min ago
    const contTo = new Date(now.getTime() + 60 * 60 * 1000).toISOString();    // 1h ahead

    const [hlRes, contRes] = await Promise.all([
      fetch(`${ERDDAP_BASE}/IMI_TidePrediction_HighLow.json?time,tide_time_category,Water_Level_ODMalin&stationID=%22${STATION}%22&time>=${fromTime}&time<=${toTime}&orderBy(%22time%22)`),
      fetch(`${ERDDAP_BASE}/imiTidePrediction.json?time,Water_Level&stationID=%22${STATION}%22&time>=${contFrom}&time<=${contTo}&orderBy(%22time%22)`),
    ]);

    if (!hlRes.ok || !contRes.ok) {
      throw new Error(`ERDDAP error: HL=${hlRes.status}, Cont=${contRes.status}`);
    }

    const hlJson = await hlRes.json();
    const contJson = await contRes.json();

    const data = { hl: hlJson, cont: contJson };
    cache = { data, fetchedAt: Date.now() };

    const result = buildResponse(data, now);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tide error:', error);
    // Fall back to harmonic approximation if ERDDAP is down
    const now = new Date();
    const fallback = generateFallbackTides(now);
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// OD Malin to LAT offset for Fenit (metres)
// LAT is ~2.5m below OD Malin for this area
const OD_MALIN_TO_LAT_OFFSET = 2.53;

function buildResponse(data: { hl: any; cont: any }, now: Date) {
  const nowMs = now.getTime();

  // Parse high/low events, apply Cromane time offset and datum conversion
  const hlRows = data.hl?.table?.rows ?? [];
  const events = hlRows.map((row: any[]) => {
    const fenitTime = new Date(row[0]);
    const cromaneTime = new Date(fenitTime.getTime() + CROMANE_OFFSET_MS);
    const category = row[1]; // "HIGH" or "LOW"
    const heightODMalin = row[2] as number;
    const heightLAT = parseFloat((heightODMalin + OD_MALIN_TO_LAT_OFFSET).toFixed(1));

    return {
      type: category === 'HIGH' ? 'high' : 'low',
      time: formatTime(cromaneTime),
      height_m: heightLAT,
      timestamp: cromaneTime.toISOString(),
    };
  });

  // Filter: show events from 1h ago onwards, max 4
  const filtered = events
    .filter((e: any) => new Date(e.timestamp).getTime() > nowMs - 3600000)
    .slice(0, 4);

  // Get current water level from continuous data (already in LAT)
  const contRows = data.cont?.table?.rows ?? [];
  let currentHeight = 0;
  if (contRows.length > 0) {
    // Find the closest time point to now (with Cromane offset)
    let closest = contRows[0];
    let closestDiff = Infinity;
    for (const row of contRows) {
      const t = new Date(row[0]).getTime() + CROMANE_OFFSET_MS;
      const diff = Math.abs(t - nowMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = row;
      }
    }
    currentHeight = parseFloat((closest[1] as number).toFixed(1));
  }

  // Determine rising/falling from continuous data
  let state: 'rising' | 'falling' = 'falling';
  if (contRows.length >= 2) {
    // Compare two recent points
    const recent = contRows.filter((r: any[]) => {
      const t = new Date(r[0]).getTime() + CROMANE_OFFSET_MS;
      return t <= nowMs;
    });
    if (recent.length >= 2) {
      const last = recent[recent.length - 1][1] as number;
      const prev = recent[recent.length - 2][1] as number;
      state = last >= prev ? 'rising' : 'falling';
    } else if (filtered.length > 0) {
      // Infer from next event
      state = filtered[0].type === 'high' ? 'rising' : 'falling';
    }
  }

  return { events: filtered, current_height_m: currentHeight, state };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Dublin',
  });
}

// Fallback harmonic model (only used if ERDDAP is unreachable)
function generateFallbackTides(now: Date) {
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
    const springFactor = 1 + 0.15 * Math.cos((highTime.getDate() / 14.76) * Math.PI * 2);

    events.push({ type: 'high', time: formatTime(highTime), height_m: parseFloat((MEAN_HIGH * springFactor).toFixed(1)), timestamp: highTime.toISOString() });
    events.push({ type: 'low', time: formatTime(lowTime), height_m: parseFloat((MEAN_LOW / springFactor).toFixed(1)), timestamp: lowTime.toISOString() });
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const filtered = events.filter(e => new Date(e.timestamp).getTime() > now.getTime() - 3600000).slice(0, 4);

  const phase = (elapsed % TIDAL_PERIOD_MS) / TIDAL_PERIOD_MS;
  const springFactor = 1 + 0.15 * Math.cos((now.getDate() / 14.76) * Math.PI * 2);
  const high = MEAN_HIGH * springFactor;
  const low = MEAN_LOW / springFactor;
  const mid = (high + low) / 2;
  const amp = (high - low) / 2;
  const currentHeight = parseFloat((mid + amp * Math.cos(phase * 2 * Math.PI)).toFixed(1));
  const state = phase < 0.5 ? 'falling' : 'rising';

  return { events: filtered, current_height_m: currentHeight, state };
}
