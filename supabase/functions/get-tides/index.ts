import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

const ERDDAP_BASE = 'https://erddap.marine.ie/erddap/tabledap';

// Default to Fenit if station not specified
const DEFAULT_STATION = 'Fenit';
const DEFAULT_OFFSET_MS = 25 * 60 * 1000;

// OD Malin to LAT offset (metres) — approximate, varies slightly by station
const OD_MALIN_TO_LAT_OFFSET = 2.53;

// In-memory cache keyed by station
const cacheMap = new Map<string, { data: any; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

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
    let station = DEFAULT_STATION;
    let offsetMs = DEFAULT_OFFSET_MS;

    try {
      const body = await req.json();
      if (body.station) station = body.station;
      if (typeof body.offsetMinutes === 'number') offsetMs = body.offsetMinutes * 60 * 1000;
    } catch {}

    const now = new Date();
    const cacheKey = station;

    // Return cached data if fresh
    const cache = cacheMap.get(cacheKey);
    if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
      const result = buildResponse(cache.data, now, offsetMs);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromTime = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
    const toTime = new Date(now.getTime() + 8 * 24 * 3600 * 1000).toISOString();
    const contFrom = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const contTo = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const [hlRes, contRes] = await Promise.all([
      fetch(`${ERDDAP_BASE}/IMI_TidePrediction_HighLow.json?time,tide_time_category,Water_Level_ODMalin&stationID=%22${encodeURIComponent(station)}%22&time>=${fromTime}&time<=${toTime}&orderBy(%22time%22)`),
      fetch(`${ERDDAP_BASE}/imiTidePrediction.json?time,Water_Level&stationID=%22${encodeURIComponent(station)}%22&time>=${contFrom}&time<=${contTo}&orderBy(%22time%22)`),
    ]);

    if (!hlRes.ok || !contRes.ok) {
      throw new Error(`ERDDAP error: HL=${hlRes.status}, Cont=${contRes.status}`);
    }

    const hlJson = await hlRes.json();
    const contJson = await contRes.json();

    const data = { hl: hlJson, cont: contJson };
    cacheMap.set(cacheKey, { data, fetchedAt: Date.now() });

    const result = buildResponse(data, now, offsetMs);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tide error:', error);
    const now = new Date();
    const fallback = generateFallbackTides(now);
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildResponse(data: { hl: any; cont: any }, now: Date, offsetMs: number) {
  const nowMs = now.getTime();

  const hlRows = data.hl?.table?.rows ?? [];
  const events = hlRows.map((row: any[]) => {
    const stationTime = new Date(row[0]);
    const localTime = new Date(stationTime.getTime() + offsetMs);
    const category = row[1];
    const heightODMalin = row[2] as number;
    const heightLAT = parseFloat((heightODMalin + OD_MALIN_TO_LAT_OFFSET).toFixed(1));

    return {
      type: category === 'HIGH' ? 'high' : 'low',
      time: formatTime(localTime),
      height_m: heightLAT,
      timestamp: localTime.toISOString(),
    };
  });

  const filtered = events
    .filter((e: any) => new Date(e.timestamp).getTime() > nowMs - 3600000)
    .slice(0, 4);

  // Build 7-day forecast grouped by local (Europe/Dublin) date
  const forecast = build7DayForecast(events, now);

  const contRows = data.cont?.table?.rows ?? [];
  let currentHeight = 0;
  if (contRows.length > 0) {
    let closest = contRows[0];
    let closestDiff = Infinity;
    for (const row of contRows) {
      const t = new Date(row[0]).getTime() + offsetMs;
      const diff = Math.abs(t - nowMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = row;
      }
    }
    currentHeight = parseFloat((closest[1] as number).toFixed(1));
  }

  let state: 'rising' | 'falling' = 'falling';
  if (contRows.length >= 2) {
    const recent = contRows.filter((r: any[]) => {
      const t = new Date(r[0]).getTime() + offsetMs;
      return t <= nowMs;
    });
    if (recent.length >= 2) {
      const last = recent[recent.length - 1][1] as number;
      const prev = recent[recent.length - 2][1] as number;
      state = last >= prev ? 'rising' : 'falling';
    } else if (filtered.length > 0) {
      state = filtered[0].type === 'high' ? 'rising' : 'falling';
    }
  }

  return { events: filtered, current_height_m: currentHeight, state, forecast };
}

function dublinDateKey(d: Date): string {
  // YYYY-MM-DD in Europe/Dublin
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

function build7DayForecast(events: any[], now: Date) {
  const days: { date: string; events: any[] }[] = [];
  const todayKey = dublinDateKey(now);
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 24 * 3600 * 1000);
    const key = dublinDateKey(d);
    const dayEvents = events
      .filter((e: any) => dublinDateKey(new Date(e.timestamp)) === key)
      .map((e: any) => ({ type: e.type, time: e.time, height_m: e.height_m, timestamp: e.timestamp }));
    days.push({ date: key, events: dayEvents });
  }
  return days;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Dublin',
  });
}

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
