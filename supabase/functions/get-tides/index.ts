import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createRateLimiter, getClientIp } from "../_shared/rate-limit.ts";

const limiter = createRateLimiter();


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

// Stations whose continuous prediction series is published under "<name>_MODELLED"
// in imiTidePrediction (the HighLow dataset uses the bare name).
const MODELLED_CONTINUOUS = new Set([
  'Achill_Island', 'Bray_Harbour', 'Carrigaholt', 'Clare_Island', 'Crosshaven', 'Dungarvan',
  'Killary_Harbour', 'Kinsale', 'Lahinch', 'Letterfrack', 'Tory_Island', 'Wicklow',
]);
export function continuousStationId(station: string): string {
  return MODELLED_CONTINUOUS.has(station) ? `${station}_MODELLED` : station;
}

// In-memory cache keyed by station
const cacheMap = new Map<string, { data: any; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;
// "Last good" copy per station · used only when ERDDAP fails. Never older than 24h.
const lastGoodMap = new Map<string, { data: any; fetchedAt: number }>();
const LAST_GOOD_MAX_AGE_MS = 24 * 3600 * 1000;

export const UNAVAILABLE_RESPONSE = {
  unavailable: true,
  events: [],
  current_height_m: null,
  state: null,
  forecast: [],
};

/** Test hook: clear both caches. */
export function _resetTideCaches() {
  cacheMap.clear();
  lastGoodMap.clear();
}

/** Test hook: seed a last-good copy. */
export function _seedLastGood(station: string, data: any, fetchedAt: number) {
  lastGoodMap.set(station, { data, fetchedAt });
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export async function handleTides(req: Request, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (limiter.isRateLimited(getClientIp(req))) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  let station = DEFAULT_STATION;
  let offsetMs = DEFAULT_OFFSET_MS;
  let chartDatumOffset = DEFAULT_OD_MALIN_TO_LAT_OFFSET;

  try {
    const body = await req.json();
    if (typeof body.station === 'string' && body.station.length > 0 && body.station.length < 64) station = body.station;
    if (typeof body.offsetMinutes === 'number' && Number.isFinite(body.offsetMinutes)) offsetMs = body.offsetMinutes * 60 * 1000;
    if (typeof body.chartDatumOffset === 'number' && Number.isFinite(body.chartDatumOffset)) chartDatumOffset = body.chartDatumOffset;
  } catch {}

  try {

    const now = new Date();
    const cacheKey = station;

    // Return cached data if fresh
    const cache = cacheMap.get(cacheKey);
    if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS) {
      return json(buildResponse(cache.data, now, offsetMs, chartDatumOffset));
    }

    const fromTime = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
    const toTime = new Date(now.getTime() + 8 * 24 * 3600 * 1000).toISOString();
    const contFrom = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const contTo = new Date(now.getTime() + 8 * 24 * 3600 * 1000).toISOString();

    const [hlRes, contRes] = await Promise.all([
      fetchFn(`${ERDDAP_BASE}/IMI_TidePrediction_HighLow.json?time,tide_time_category,Water_Level_ODMalin&stationID=%22${encodeURIComponent(station)}%22&time>=${fromTime}&time<=${toTime}&orderBy(%22time%22)`),
      fetchFn(`${ERDDAP_BASE}/imiTidePrediction.json?time,Water_Level&stationID=%22${encodeURIComponent(continuousStationId(station))}%22&time>=${contFrom}&time<=${contTo}&orderBy(%22time%22)`),
    ]);

    if (!hlRes.ok || !contRes.ok) {
      throw new Error(`ERDDAP error: HL=${hlRes.status}, Cont=${contRes.status}`);
    }

    const hlJson = await hlRes.json();
    const contJson = await contRes.json();

    const data = { hl: hlJson, cont: contJson };
    if (!(data.hl?.table?.rows?.length) || !(data.cont?.table?.rows?.length)) {
      throw new Error('ERDDAP returned no rows');
    }
    const fetchedAt = Date.now();
    cacheMap.set(cacheKey, { data, fetchedAt });
    lastGoodMap.set(cacheKey, { data, fetchedAt });

    const result = buildResponse(data, now, offsetMs, chartDatumOffset);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tide error:', error);
    const lastGood = lastGoodMap.get(station);
    if (lastGood && Date.now() - lastGood.fetchedAt < LAST_GOOD_MAX_AGE_MS) {
      const result = buildResponse(lastGood.data, new Date(), offsetMs, chartDatumOffset);
      return json({ ...result, stale: true, fetched_at: new Date(lastGood.fetchedAt).toISOString() });
    }
    return json(UNAVAILABLE_RESPONSE);
  }
}

serve((req) => handleTides(req));

export function buildResponse(data: { hl: any; cont: any }, now: Date, offsetMs: number, chartDatumOffset: number) {
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
  let closestHeightLAT: number | null = null;
  let closestDiff = Infinity;
  let previousPastHeight: number | null = null;
  let latestPastHeight: number | null = null;
  let lastIncludedPointAt = -Infinity;

  for (const row of contRows) {
    const localMs = new Date(row[0]).getTime() + offsetMs;
    const heightLAT = row[1] as number; // Water_Level is already on local LAT (Chart Datum)
    const diff = Math.abs(localMs - nowMs);

    if (diff < closestDiff) {
      closestDiff = diff;
      closestHeightLAT = heightLAT;
    }

    if (localMs <= nowMs) {
      previousPastHeight = latestPastHeight;
      latestPastHeight = heightLAT;
    }

    if (localMs - lastIncludedPointAt >= TIDE_POINT_INTERVAL_MS) {
      const localTime = new Date(localMs);
      continuousPoints.push({
        time: formatTime(localTime),
        height_m: roundLAT(heightLAT, 2),
        timestamp: localTime.toISOString(),
      });
      lastIncludedPointAt = localMs;
    }
  }

  if (closestHeightLAT !== null) {
    currentHeight = roundLAT(closestHeightLAT, 1);
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
