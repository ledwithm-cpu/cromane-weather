import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cromane coordinates & geofence
const HOME_LAT = 52.1008;
const HOME_LON = -9.8856;
const GEOFENCE_KM = 20;

// ─── Strike Cache (persists across warm invocations) ───
const strikeCache: Array<{
  time_ns: number;
  lat: number;
  lon: number;
  distance_km: number;
  bearing_deg: number;
  bearing_compass: string;
  alert_level: number;
}> = [];
const CACHE_TTL_MS = 30 * 60 * 1000;

// ─── Nowcast Cache ───
let nowcastCache: NowcastResult | null = null;
let nowcastCacheTime = 0;
const NOWCAST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface NowcastResult {
  lpi: number;
  cape: number;
  atmospheric_alert: boolean;
  storm_cells: StormCell[];
  nearest_cell: StormCell | null;
  eta_minutes: number | null;
  nowcast_level: number; // 0=stable, 0.5=charging, 1=approaching
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

// Get point at given distance/bearing from origin
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

// ─── Strike Cache Management ───
function pruneCache() {
  const cutoff = Date.now() - CACHE_TTL_MS;
  let i = 0;
  while (i < strikeCache.length) {
    if (Math.floor(strikeCache[i].time_ns / 1_000_000) < cutoff) {
      strikeCache.splice(i, 1);
    } else {
      i++;
    }
  }
}

function addStrikeToCache(strike: typeof strikeCache[0]) {
  if (!strikeCache.some(s => s.time_ns === strike.time_ns && s.lat === strike.lat && s.lon === strike.lon)) {
    strikeCache.push(strike);
  }
}

// ─── Blitzortung WebSocket ───
async function fetchStrikesViaWebSocket(): Promise<void> {
  const servers = ['wss://ws1.blitzortung.org/', 'wss://ws7.blitzortung.org/', 'wss://ws2.blitzortung.org/'];
  const serverUrl = servers[Math.floor(Math.random() * servers.length)];

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      resolve();
    }, 4000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(serverUrl);
    } catch (e) {
      console.error('WebSocket creation failed:', e);
      clearTimeout(timeout);
      resolve();
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
          const dist = haversine(HOME_LAT, HOME_LON, lat, lon);
          if (dist <= GEOFENCE_KM) {
            const brng = bearing(HOME_LAT, HOME_LON, lat, lon);
            const timeNs = data.time || Date.now() * 1_000_000;
            addStrikeToCache({
              time_ns: timeNs, lat, lon,
              distance_km: dist,
              bearing_deg: brng,
              bearing_compass: bearingToCompass(brng),
              alert_level: getAlertLevel(dist),
            });
            console.log(`⚡ Strike detected! ${Math.round(dist * 10) / 10}km ${bearingToCompass(brng)}`);
          }
        }
      } catch { /* skip */ }
    };

    ws.onerror = () => { clearTimeout(timeout); resolve(); };
    ws.onclose = () => { clearTimeout(timeout); resolve(); };
  });
}

// ─── Nowcast: Open-Meteo LPI + Spatial Grid Storm Tracking ───
async function fetchNowcast(): Promise<NowcastResult> {
  // Check cache
  if (nowcastCache && Date.now() - nowcastCacheTime < NOWCAST_CACHE_TTL_MS) {
    return nowcastCache;
  }

  const radarSyncTime = Date.now();

  // Spatial grid: 8 cardinal points at 50km and 100km
  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  const distances = [50, 100]; // km rings

  const gridPoints: Array<{ lat: number; lon: number; dist: number; bearingDeg: number; dir: string }> = [];
  for (const dist of distances) {
    for (const b of bearings) {
      const [lat, lon] = destinationPoint(HOME_LAT, HOME_LON, dist, b);
      gridPoints.push({ lat, lon, dist, bearingDeg: b, dir: bearingToCompass(b) });
    }
  }

  // Build Open-Meteo URLs:
  // 1. Home point: LPI + CAPE + precipitation
  // 2. Grid points: precipitation only (batched)
  const homeLats = [HOME_LAT, ...gridPoints.map(p => p.lat)].join(',');
  const homeLons = [HOME_LON, ...gridPoints.map(p => p.lon)].join(',');

  const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${homeLats}&longitude=${homeLons}&hourly=lightning_potential,cape,precipitation&forecast_hours=6&timezone=Europe%2FDublin`;

  let lpi = 0;
  let cape = 0;
  let homePrecip = 0;
  const stormCells: StormCell[] = [];

  try {
    const res = await fetch(openMeteoUrl);
    if (res.ok) {
      const data = await res.json();

      // Find current hour index
      const now = new Date();
      const currentHour = now.toISOString().substring(0, 13) + ':00';

      // data is an array when multiple coordinates
      const results = Array.isArray(data) ? data : [data];

      // Home point (index 0)
      if (results[0]?.hourly) {
        const h = results[0].hourly;
        const timeIdx = h.time?.findIndex((t: string) => t >= currentHour) ?? 0;
        lpi = h.lightning_potential?.[timeIdx] ?? 0;
        cape = h.cape?.[timeIdx] ?? 0;
        homePrecip = h.precipitation?.[timeIdx] ?? 0;
      }

      // Grid points (index 1..N)
      for (let i = 0; i < gridPoints.length; i++) {
        const ptData = results[i + 1]?.hourly;
        if (!ptData) continue;

        const timeIdx = ptData.time?.findIndex((t: string) => t >= currentHour) ?? 0;
        const precip = ptData.precipitation?.[timeIdx] ?? 0;

        // Current hour + next hour to detect intensifying cells
        const nextPrecip = ptData.precipitation?.[timeIdx + 1] ?? 0;

        // Heavy precipitation threshold: > 4mm/h suggests convective activity
        if (precip > 4 || nextPrecip > 4) {
          const gp = gridPoints[i];

          // Check if inner ring (50km) has less precip than outer (100km) = approaching
          // Or if this point's precip is heavy enough
          const intensity = Math.max(precip, nextPrecip);

          // Simple ETA: distance / assumed storm speed (40 km/h typical mid-latitude)
          const assumedSpeedKmh = 40;
          const etaMin = Math.round((gp.dist / assumedSpeedKmh) * 60);

          // Check if it's approaching by comparing inner/outer ring precip
          // A cell is "approaching" if outer ring has heavier precip in same direction
          const isApproaching = gp.dist === 100
            ? true // outer ring detections are potentially approaching
            : precip > homePrecip * 2; // inner ring with much more precip than home

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

  // Determine approaching cells with ETA
  const approachingCells = stormCells.filter(c => c.approaching && c.eta_minutes !== null);
  const nearestCell = approachingCells.length > 0
    ? approachingCells.reduce((a, b) => (a.eta_minutes ?? 999) < (b.eta_minutes ?? 999) ? a : b)
    : null;

  const etaMinutes = nearestCell?.eta_minutes ?? null;
  const atmosphericAlert = lpi > 0 || cape > 500;

  // Nowcast level
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

  console.log(`🌩️ Nowcast: LPI=${lpi}, CAPE=${cape}, cells=${stormCells.length}, approaching=${approachingCells.length}, level=${nowcastLevel}`);

  const result: NowcastResult = {
    lpi,
    cape,
    atmospheric_alert: atmosphericAlert,
    storm_cells: stormCells,
    nearest_cell: nearestCell,
    eta_minutes: etaMinutes,
    nowcast_level: nowcastLevel,
    status_text: statusText,
    radar_sync_ms: radarSyncTime,
  };

  nowcastCache = result;
  nowcastCacheTime = Date.now();
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

  const url = new URL(req.url);
  const testMode = url.searchParams.get('test') === '1';

  try {
    // Fetch strikes + nowcast in parallel
    const [_, nowcast] = await Promise.all([
      testMode ? injectTestStrike() : fetchStrikesViaWebSocket(),
      fetchNowcast(),
    ]);

    pruneCache();

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

    // Combined alert_level considers both real-time strikes AND predicted threats
    let effectiveAlertLevel = maxAlertLevel;
    if (nowcast.nowcast_level >= 1 && effectiveAlertLevel < 1) {
      effectiveAlertLevel = 1; // Approaching storm = at least awareness
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
      // ─── Nowcast (new) ───
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

// Test strike injection helper
async function injectTestStrike() {
  const testLat = 52.0985;
  const testLon = -9.8910;
  const dist = haversine(HOME_LAT, HOME_LON, testLat, testLon);
  const brng = bearing(HOME_LAT, HOME_LON, testLat, testLon);
  addStrikeToCache({
    time_ns: Date.now() * 1_000_000,
    lat: testLat, lon: testLon,
    distance_km: dist,
    bearing_deg: brng,
    bearing_compass: bearingToCompass(brng),
    alert_level: getAlertLevel(dist),
  });
  console.log('🧪 Test strike injected at Cromane Lower');
}
