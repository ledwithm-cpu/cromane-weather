import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Default coordinates (Cromane)
const DEFAULT_LAT = 52.1008;
const DEFAULT_LON = -9.8856;
const GEOFENCE_KM = 20;

// ─── Strike Cache (persists across warm invocations, keyed by location) ───
type Strike = {
  time_ns: number;
  lat: number;
  lon: number;
  distance_km: number;
  bearing_deg: number;
  bearing_compass: string;
  alert_level: number;
};
const strikeCaches = new Map<string, Array<Strike>>();
// Tracks whether a given cacheKey has been hydrated from the DB this warm cycle
const hydratedCaches = new Set<string>();
const CACHE_TTL_MS = 30 * 60 * 1000;

// Lazy Supabase admin client (service role) — initialized once per warm worker
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  _supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAdmin;
}


// ─── Nowcast Cache (keyed by location) ───
const nowcastCaches = new Map<string, { result: NowcastResult; time: number }>();
const NOWCAST_CACHE_TTL_MS = 5 * 60 * 1000;

interface NowcastResult {
  lpi: number;
  cape: number;
  atmospheric_alert: boolean;
  storm_cells: StormCell[];
  nearest_cell: StormCell | null;
  eta_minutes: number | null;
  nowcast_level: number;
  status_text: string;
  radar_sync_ms: number;
}

interface StormCell {
  direction: string;
  distance_km: number;
  intensity_mm: number;
  eta_minutes: number | null;
  approaching: boolean;
}

// Rate limiting
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

// ─── Geo Math ───
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

function bearingToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getAlertLevel(distanceKm: number): number {
  if (distanceKm <= 5) return 3;
  if (distanceKm <= 10) return 2;
  if (distanceKm <= 20) return 1;
  return 0;
}

function destinationPoint(lat: number, lon: number, distKm: number, bearingDeg: number): [number, number] {
  const R = 6371;
  const d = distKm / R;
  const brng = bearingDeg * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

function getStrikeCache(key: string) {
  if (!strikeCaches.has(key)) strikeCaches.set(key, []);
  return strikeCaches.get(key)!;
}

// ─── Strike Cache Management ───
function pruneCache(cache: typeof strikeCaches extends Map<string, infer V> ? V : never) {
  const cutoff = Date.now() - CACHE_TTL_MS;
  let i = 0;
  while (i < cache.length) {
    if (Math.floor(cache[i].time_ns / 1_000_000) < cutoff) {
      cache.splice(i, 1);
    } else {
      i++;
    }
  }
}

function addStrikeToCache(cache: ReturnType<typeof getStrikeCache>, strike: ReturnType<typeof getStrikeCache>[0]) {
  if (!cache.some(s => s.time_ns === strike.time_ns && s.lat === strike.lat && s.lon === strike.lon)) {
    cache.push(strike);
    return true;
  }
  return false;
}

// ─── Hybrid Persistence: hydrate from DB on cold start ───
async function hydrateStrikeCacheFromDb(cacheKey: string, cache: ReturnType<typeof getStrikeCache>) {
  if (hydratedCaches.has(cacheKey)) return;
  hydratedCaches.add(cacheKey); // mark first to prevent duplicate hydration on parallel requests
  if (cache.length > 0) return; // already populated in-memory, no need to hit DB

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const cutoffNs = (Date.now() - CACHE_TTL_MS) * 1_000_000;
  try {
    const { data, error } = await supabase
      .from('lightning_cache')
      .select('time_ns, lat, lon, distance_km, bearing_deg, bearing_compass, alert_level')
      .eq('cache_key', cacheKey)
      .gte('time_ns', cutoffNs)
      .order('time_ns', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Hydration query error:', error.message);
      return;
    }
    if (data && data.length > 0) {
      for (const row of data) {
        addStrikeToCache(cache, {
          time_ns: Number(row.time_ns),
          lat: row.lat as number,
          lon: row.lon as number,
          distance_km: row.distance_km as number,
          bearing_deg: row.bearing_deg as number,
          bearing_compass: row.bearing_compass as string,
          alert_level: row.alert_level as number,
        });
      }
      console.log(`💧 Hydrated ${data.length} strikes for ${cacheKey} from DB`);
    }
  } catch (e) {
    console.error('Hydration error:', e);
  }
}

// ─── Hybrid Persistence: batch insert newly collected strikes ───
async function persistNewStrikes(cacheKey: string, newStrikes: Strike[]) {
  if (newStrikes.length === 0) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const rows = newStrikes.map(s => ({
    cache_key: cacheKey,
    time_ns: s.time_ns,
    lat: s.lat,
    lon: s.lon,
    distance_km: s.distance_km,
    bearing_deg: s.bearing_deg,
    bearing_compass: s.bearing_compass,
    alert_level: s.alert_level,
  }));

  try {
    // upsert with ignoreDuplicates so the unique constraint dedupes silently
    const { error } = await supabase
      .from('lightning_cache')
      .upsert(rows, { onConflict: 'cache_key,time_ns,lat,lon', ignoreDuplicates: true });
    if (error) {
      console.error('Persist strikes error:', error.message);
    } else {
      console.log(`💾 Persisted ${rows.length} new strikes for ${cacheKey}`);
    }
  } catch (e) {
    console.error('Persist strikes exception:', e);
  }
}

// ─── Blitzortung WebSocket ───
async function fetchStrikesViaWebSocket(
  homeLat: number,
  homeLon: number,
  cacheKey: string,
  cache: ReturnType<typeof getStrikeCache>,
): Promise<void> {
  // Hydrate from DB before opening the socket so the cache reflects recent history
  await hydrateStrikeCacheFromDb(cacheKey, cache);

  const servers = ['wss://ws1.blitzortung.org/', 'wss://ws7.blitzortung.org/', 'wss://ws2.blitzortung.org/'];
  const serverUrl = servers[Math.floor(Math.random() * servers.length)];

  // Collect strikes added during this socket session for batch persistence
  const newStrikes: Strike[] = [];

  return new Promise((resolve) => {
    const finish = async () => {
      // Batch write to DB AFTER socket closes, only the truly new strikes
      await persistNewStrikes(cacheKey, newStrikes);
      resolve();
    };

    const timeout = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      finish();
    }, 4000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(serverUrl);
    } catch (e) {
      console.error('WebSocket creation failed:', e);
      clearTimeout(timeout);
      finish();
      return;
    }

    ws.onopen = () => {
      console.log(`Connected to ${serverUrl}`);
      ws.send(JSON.stringify({ a: 111 }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.lat !== undefined && data.lon !== undefined) {
          const lat = data.lat;
          const lon = data.lon;
          const dist = haversine(homeLat, homeLon, lat, lon);
          if (dist <= GEOFENCE_KM) {
            const brng = bearing(homeLat, homeLon, lat, lon);
            const timeNs = data.time || Date.now() * 1_000_000;
            const strike: Strike = {
              time_ns: timeNs, lat, lon,
              distance_km: dist,
              bearing_deg: brng,
              bearing_compass: bearingToCompass(brng),
              alert_level: getAlertLevel(dist),
            };
            const wasNew = addStrikeToCache(cache, strike);
            if (wasNew) newStrikes.push(strike);
            console.log(`⚡ Strike detected! ${Math.round(dist * 10) / 10}km ${bearingToCompass(brng)}`);
          }
        }
      } catch { /* skip */ }
    };

    ws.onerror = () => { clearTimeout(timeout); finish(); };
    ws.onclose = () => { clearTimeout(timeout); finish(); };
  });
}

// ─── Nowcast ───
async function fetchNowcast(homeLat: number, homeLon: number, cacheKey: string): Promise<NowcastResult> {
  const cached = nowcastCaches.get(cacheKey);
  if (cached && Date.now() - cached.time < NOWCAST_CACHE_TTL_MS) {
    return cached.result;
  }

  const radarSyncTime = Date.now();
  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  const distances = [50, 100];

  const gridPoints: Array<{ lat: number; lon: number; dist: number; bearingDeg: number; dir: string }> = [];
  for (const dist of distances) {
    for (const b of bearings) {
      const [lat, lon] = destinationPoint(homeLat, homeLon, dist, b);
      gridPoints.push({ lat, lon, dist, bearingDeg: b, dir: bearingToCompass(b) });
    }
  }

  const homeLats = [homeLat, ...gridPoints.map(p => p.lat)].join(',');
  const homeLons = [homeLon, ...gridPoints.map(p => p.lon)].join(',');

  const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${homeLats}&longitude=${homeLons}&hourly=lightning_potential,cape,precipitation&forecast_hours=6&timezone=Europe%2FDublin`;

  let lpi = 0;
  let cape = 0;
  let homePrecip = 0;
  const stormCells: StormCell[] = [];

  try {
    const res = await fetch(openMeteoUrl);
    if (res.ok) {
      const data = await res.json();
      const now = new Date();
      const currentHour = now.toISOString().substring(0, 13) + ':00';
      const results = Array.isArray(data) ? data : [data];

      if (results[0]?.hourly) {
        const h = results[0].hourly;
        const timeIdx = h.time?.findIndex((t: string) => t >= currentHour) ?? 0;
        lpi = h.lightning_potential?.[timeIdx] ?? 0;
        cape = h.cape?.[timeIdx] ?? 0;
        homePrecip = h.precipitation?.[timeIdx] ?? 0;
      }

      for (let i = 0; i < gridPoints.length; i++) {
        const ptData = results[i + 1]?.hourly;
        if (!ptData) continue;
        const timeIdx = ptData.time?.findIndex((t: string) => t >= currentHour) ?? 0;
        const precip = ptData.precipitation?.[timeIdx] ?? 0;
        const nextPrecip = ptData.precipitation?.[timeIdx + 1] ?? 0;

        if (precip > 4 || nextPrecip > 4) {
          const gp = gridPoints[i];
          const intensity = Math.max(precip, nextPrecip);
          const assumedSpeedKmh = 40;
          const etaMin = Math.round((gp.dist / assumedSpeedKmh) * 60);
          const isApproaching = gp.dist === 100
            ? true
            : precip > homePrecip * 2;

          stormCells.push({
            direction: gp.dir,
            distance_km: gp.dist,
            intensity_mm: Math.round(intensity * 10) / 10,
            eta_minutes: isApproaching ? etaMin : null,
            approaching: isApproaching,
          });
        }
      }
    }
  } catch (e) {
    console.error('Nowcast fetch error:', e);
  }

  const approachingCells = stormCells.filter(c => c.approaching && c.eta_minutes !== null);
  const nearestCell = approachingCells.length > 0
    ? approachingCells.reduce((a, b) => (a.eta_minutes ?? 999) < (b.eta_minutes ?? 999) ? a : b)
    : null;

  const etaMinutes = nearestCell?.eta_minutes ?? null;
  const atmosphericAlert = lpi > 0 || cape > 500;

  let nowcastLevel = 0;
  let statusText = 'Atmosphere Stable';

  if (nearestCell && etaMinutes !== null && etaMinutes <= 60) {
    nowcastLevel = 1;
    statusText = `Storm Approaching: ETA ${etaMinutes} mins`;
    if (etaMinutes <= 30) {
      statusText = `Storm Cell Detected: Approaching from ${nearestCell.direction}. Estimated arrival: ${etaMinutes} minutes.`;
    }
  } else if (atmosphericAlert) {
    nowcastLevel = 0.5;
    statusText = 'Atmosphere Charging: Conditions favorable for thunder.';
  }

  const result: NowcastResult = {
    lpi, cape, atmospheric_alert: atmosphericAlert,
    storm_cells: stormCells, nearest_cell: nearestCell,
    eta_minutes: etaMinutes, nowcast_level: nowcastLevel,
    status_text: statusText, radar_sync_ms: radarSyncTime,
  };

  nowcastCaches.set(cacheKey, { result, time: Date.now() });
  return result;
}

// ─── Main Handler ───
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

  let homeLat = DEFAULT_LAT;
  let homeLon = DEFAULT_LON;
  let locationName = 'Cromane';

  try {
    const body = await req.json();
    if (body.lat && body.lon) { homeLat = body.lat; homeLon = body.lon; }
    if (body.name) locationName = body.name;
  } catch {}

  const url = new URL(req.url);
  const testMode = url.searchParams.get('test') === '1';
  const cacheKey = getCacheKey(homeLat, homeLon);
  const strikeCache = getStrikeCache(cacheKey);

  try {
    const [_, nowcast] = await Promise.all([
      testMode
        ? injectTestStrike(homeLat, homeLon, strikeCache).then(() => persistNewStrikes(cacheKey, strikeCache.slice(-1)))
        : fetchStrikesViaWebSocket(homeLat, homeLon, cacheKey, strikeCache),
      fetchNowcast(homeLat, homeLon, cacheKey),
    ]);

    pruneCache(strikeCache);

    const sorted = [...strikeCache].sort((a, b) => b.time_ns - a.time_ns);
    const maxAlertLevel = sorted.length > 0
      ? Math.max(...sorted.map(s => s.alert_level))
      : 0;
    const closestStrike = sorted.length > 0
      ? sorted.reduce((prev, curr) => curr.distance_km < prev.distance_km ? curr : prev)
      : null;
    const lastStrikeTime = sorted.length > 0
      ? Math.floor(sorted[0].time_ns / 1_000_000)
      : null;

    let effectiveAlertLevel = maxAlertLevel;
    if (nowcast.nowcast_level >= 1 && effectiveAlertLevel < 1) {
      effectiveAlertLevel = 1;
    }

    const result = {
      alert_level: effectiveAlertLevel,
      strike_count: sorted.length,
      last_strike_time_ms: lastStrikeTime,
      closest_strike: closestStrike ? {
        distance_km: Math.round(closestStrike.distance_km * 10) / 10,
        bearing_compass: closestStrike.bearing_compass,
        bearing_deg: Math.round(closestStrike.bearing_deg),
      } : null,
      strikes: sorted.slice(0, 10).map(s => ({
        distance_km: Math.round(s.distance_km * 10) / 10,
        bearing_compass: s.bearing_compass,
        time_ms: Math.floor(s.time_ns / 1_000_000),
      })),
      nowcast: {
        lpi: nowcast.lpi,
        cape: nowcast.cape,
        atmospheric_alert: nowcast.atmospheric_alert,
        nowcast_level: nowcast.nowcast_level,
        status_text: nowcast.status_text,
        eta_minutes: nowcast.eta_minutes,
        nearest_cell: nowcast.nearest_cell,
        storm_cell_count: nowcast.storm_cells.length,
        radar_sync_ms: nowcast.radar_sync_ms,
      },
      checked_at: Date.now(),
      source: 'blitzortung-websocket',
      geofence_km: GEOFENCE_KM,
    };

    // Push notifications fire for whichever location the frontend is polling.
    // The 15-minute cooldown inside triggerPushIfNeeded prevents spam.
    triggerPushIfNeeded(effectiveAlertLevel, nowcast, closestStrike, locationName).catch(e =>
      console.error('Push trigger error:', e)
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Lightning fetch error:', error);
    return new Response(JSON.stringify({
      alert_level: 0,
      strike_count: 0,
      last_strike_time_ms: null,
      closest_strike: null,
      strikes: [],
      nowcast: {
        lpi: 0, cape: 0, atmospheric_alert: false,
        nowcast_level: 0, status_text: 'Atmosphere Stable',
        eta_minutes: null, nearest_cell: null, storm_cell_count: 0,
        radar_sync_ms: Date.now(),
      },
      checked_at: Date.now(),
      error: 'Unable to fetch lightning data. Please try again later.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function injectTestStrike(homeLat: number, homeLon: number, cache: ReturnType<typeof getStrikeCache>) {
  const testLat = homeLat - 0.002;
  const testLon = homeLon - 0.005;
  const dist = haversine(homeLat, homeLon, testLat, testLon);
  const brng = bearing(homeLat, homeLon, testLat, testLon);
  addStrikeToCache(cache, {
    time_ns: Date.now() * 1_000_000,
    lat: testLat, lon: testLon,
    distance_km: dist,
    bearing_deg: brng,
    bearing_compass: bearingToCompass(brng),
    alert_level: getAlertLevel(dist),
  });
  console.log('🧪 Test strike injected');
}

// ─── Push Notification Trigger ───
let lastPushLevel = 0;
let lastPushTime = 0;
const PUSH_COOLDOWN_MS = 15 * 60 * 1000;

async function triggerPushIfNeeded(
  alertLevel: number,
  nowcast: NowcastResult,
  closestStrike: { distance_km: number; bearing_compass: string } | null,
  locationName: string,
) {
  const now = Date.now();
  if (now - lastPushTime < PUSH_COOLDOWN_MS && alertLevel <= lastPushLevel) return;

  let title = '';
  let body = '';
  let notificationType = '';

  if (alertLevel >= 3 && closestStrike) {
    title = '⚡ Lightning Alert — Take Cover';
    body = `Lightning detected ${closestStrike.distance_km}km ${closestStrike.bearing_compass}. Seek shelter immediately.`;
    notificationType = 'immediate_danger';
  } else if (alertLevel >= 2 && closestStrike) {
    title = '⚡ Lightning Warning';
    body = `Lightning detected ${closestStrike.distance_km}km ${closestStrike.bearing_compass}. Stay alert.`;
    notificationType = 'lightning_warning';
  } else if (alertLevel >= 1 || nowcast.nowcast_level >= 1) {
    if (nowcast.eta_minutes !== null && nowcast.eta_minutes <= 60) {
      title = `🌩️ Storm Approaching ${locationName}`;
      body = `Storm cell detected ${nowcast.nearest_cell?.direction ?? ''} — ETA ${nowcast.eta_minutes} minutes.`;
      notificationType = 'storm_approaching';
    } else if (alertLevel >= 1) {
      title = '⚡ Lightning Awareness';
      body = `Lightning activity detected within 20km of ${locationName}.`;
      notificationType = 'lightning_awareness';
    } else {
      return;
    }
  } else if (nowcast.atmospheric_alert && nowcast.lpi > 0.5) {
    title = '🌩️ Heads Up — Atmosphere Charging';
    body = `Conditions favorable for thunderstorms near ${locationName}.`;
    notificationType = 'atmosphere_charging';
  } else {
    return;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        notification_type: notificationType,
        alert_level: alertLevel,
        data: {
          alert_level: String(alertLevel),
          nowcast_level: String(nowcast.nowcast_level),
        },
      }),
    });

    const result = await res.json();
    console.log(`📲 Push sent: ${notificationType}, delivered to ${result.sent ?? 0} devices`);

    lastPushLevel = alertLevel;
    lastPushTime = now;
  } catch (e) {
    console.error('Failed to trigger push notification:', e);
  }
}
