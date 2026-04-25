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
const TIDE_POINT_INTERVAL_MS = 30 * 60 * 1000;
const TIME_FORMATTER = new Intl.DateTimeFormat('en-IE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Dublin',
});
const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Dublin',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

// Default to Fenit if station not specified
const DEFAULT_STATION = 'Fenit';
const DEFAULT_OFFSET_MS = 25 * 60 * 1000;

// OD Malin → Chart Datum (LAT) offset in metres. Varies per station.
// Default ≈ 2.55m. Per-location overrides are passed in from the client (e.g. Fenit ≈ 2.67).
const DEFAULT_OD_MALIN_TO_LAT_OFFSET = 2.55;

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
    let chartDatumOffset = DEFAULT_OD_MALIN_TO_LAT_OFFSET;

    try {
      const body = await req.json();
      if (body.station) station = body.station;
      if (typeof body.offsetMinutes === 'number') offsetMs = body.offsetMinutes * 60 * 1000;
      if (typeof body.chartDatumOffset === 'number') chartDatumOffset = body.chartDatumOffset;
    } catch {}

    const now = new Date();
    const cacheKey = station;

    // Return cached data if fresh
    const cache = cacheMap.get(cacheKey);
    if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
      const result = buildResponse(cache.data, now, offsetMs, chartDatumOffset);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromTime = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
    const toTime = new Date(now.getTime() + 8 * 24 * 3600 * 1000).toISOString();
    const contFrom = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const contTo = new Date(now.getTime() + 8 * 24 * 3600 * 1000).toISOString();

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

    const result = buildResponse(data, now, offsetMs, chartDatumOffset);
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

function buildResponse(data: { hl: any; cont: any }, now: Date, offsetMs: number, chartDatumOffset: number) {
  const nowMs = now.getTime();
  // HighLow dataset reports Water_Level_ODMalin (relative to OD Malin) → add offset to get LAT.
  const toChartDatumHeight = (heightODMalin: number, precision: number) =>
    parseFloat((heightODMalin + chartDatumOffset).toFixed(precision));
  // Continuous imiTidePrediction dataset reports Water_Level which is ALREADY on local LAT
  // (sea surface height above local Lowest Astronomical Tide). Do NOT add the offset again.
  const roundLAT = (heightLAT: number, precision: number) =>
    parseFloat(heightLAT.toFixed(precision));

  const hlRows = data.hl?.table?.rows ?? [];
  const events = hlRows.map((row: any[]) => {
    const stationTime = new Date(row[0]);
    const localTime = new Date(stationTime.getTime() + offsetMs);
    const category = row[1];
    const heightODMalin = row[2] as number;
    const heightLAT = toChartDatumHeight(heightODMalin, 1);

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

  const contRows = data.cont?.table?.rows ?? [];
  const continuousPoints = [];
  let currentHeight = 0;
  let state: 'rising' | 'falling' = 'falling';
  let closestHeightOD: number | null = null;
  let closestDiff = Infinity;
  let previousPastHeight: number | null = null;
  let latestPastHeight: number | null = null;
  let lastIncludedPointAt = -Infinity;

  for (const row of contRows) {
    const localMs = new Date(row[0]).getTime() + offsetMs;
    const heightOD = row[1] as number;
    const diff = Math.abs(localMs - nowMs);

    if (diff < closestDiff) {
      closestDiff = diff;
      closestHeightOD = heightOD;
    }

    if (localMs <= nowMs) {
      previousPastHeight = latestPastHeight;
      latestPastHeight = heightOD;
    }

    if (localMs - lastIncludedPointAt >= TIDE_POINT_INTERVAL_MS) {
      const localTime = new Date(localMs);
      continuousPoints.push({
        time: formatTime(localTime),
        height_m: toChartDatumHeight(heightOD, 2),
        timestamp: localTime.toISOString(),
      });
      lastIncludedPointAt = localMs;
    }
  }

  if (closestHeightOD !== null) {
    currentHeight = toChartDatumHeight(closestHeightOD, 1);
  }

  if (previousPastHeight !== null && latestPastHeight !== null) {
    state = latestPastHeight >= previousPastHeight ? 'rising' : 'falling';
  } else if (filtered.length > 0) {
    state = filtered[0].type === 'high' ? 'rising' : 'falling';
  }

  // Build 7-day forecast grouped by local (Europe/Dublin) date, including
  // sampled continuous prediction points so the client draws the real tide curve.
  const forecast = build7DayForecast(events, now, continuousPoints);

  return { events: filtered, current_height_m: currentHeight, state, forecast };
}

function dublinDateKey(d: Date): string {
  // YYYY-MM-DD in Europe/Dublin
  const parts = DATE_KEY_FORMATTER.formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

function build7DayForecast(events: any[], now: Date, points: any[] = []) {
  const days: { date: string; events: any[]; points: any[] }[] = [];
  const todayKey = dublinDateKey(now);
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 24 * 3600 * 1000);
    const key = dublinDateKey(d);
    const dayEvents = events
      .filter((e: any) => dublinDateKey(new Date(e.timestamp)) === key)
      .map((e: any) => ({ type: e.type, time: e.time, height_m: e.height_m, timestamp: e.timestamp }));
    const dayPoints = points
      .filter((p: any) => dublinDateKey(new Date(p.timestamp)) === key)
      .map((p: any) => ({ time: p.time, height_m: p.height_m, timestamp: p.timestamp }));
    days.push({ date: key, events: dayEvents, points: dayPoints });
  }
  return days;
}

function formatTime(date: Date): string {
  return TIME_FORMATTER.format(date);
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
  // Generate ~16 days of events to safely cover 7-day forecast window
  for (let i = -2; i <= 14; i++) {
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

  const forecast = build7DayForecast(events, now);
  return { events: filtered, current_height_m: currentHeight, state, forecast };
}
