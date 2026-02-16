import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cromane coordinates & geofence
const HOME_LAT = 52.1008;
const HOME_LON = -9.8856;
const GEOFENCE_KM = 20;

// In-memory strike cache (persists across warm invocations)
const strikeCache: Array<{
  time_ns: number;
  lat: number;
  lon: number;
  distance_km: number;
  bearing_deg: number;
  bearing_compass: string;
  alert_level: number;
}> = [];
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
  if (distanceKm <= 5) return 3;   // Immediate danger
  if (distanceKm <= 10) return 2;  // Warning
  if (distanceKm <= 20) return 1;  // Awareness (tightened from 50km)
  return 0;
}

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
  // Deduplicate by time_ns
  if (!strikeCache.some(s => s.time_ns === strike.time_ns && s.lat === strike.lat && s.lon === strike.lon)) {
    strikeCache.push(strike);
  }
}

// Connect to Blitzortung WebSocket, collect strikes for a few seconds
async function fetchStrikesViaWebSocket(): Promise<void> {
  // Rotate through available servers
  const servers = ['wss://ws1.blitzortung.org/', 'wss://ws7.blitzortung.org/', 'wss://ws2.blitzortung.org/'];
  const serverUrl = servers[Math.floor(Math.random() * servers.length)];
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      resolve();
    }, 4000); // Listen for 4 seconds

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
      // Subscribe to region 1 (Europe) which covers Ireland
      ws.send(JSON.stringify({ a: 111 }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Strike data has lat, lon, time fields
        if (data.lat !== undefined && data.lon !== undefined) {
          const lat = data.lat;
          const lon = data.lon;
          const dist = haversine(HOME_LAT, HOME_LON, lat, lon);
          
          if (dist <= GEOFENCE_KM) {
            const brng = bearing(HOME_LAT, HOME_LON, lat, lon);
            const timeNs = data.time || Date.now() * 1_000_000;
            addStrikeToCache({
              time_ns: timeNs,
              lat,
              lon,
              distance_km: dist,
              bearing_deg: brng,
              bearing_compass: bearingToCompass(brng),
              alert_level: getAlertLevel(dist),
            });
            console.log(`⚡ Strike detected! ${Math.round(dist * 10) / 10}km ${bearingToCompass(brng)}`);
          }
        }
      } catch {
        // Skip non-JSON or malformed messages
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
      clearTimeout(timeout);
      resolve();
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
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

  // Check for test mode
  const url = new URL(req.url);
  const testMode = url.searchParams.get('test') === '1';

  try {
    if (testMode) {
      // Simulate a strike at Cromane Lower (52.0985, -9.8910)
      const testLat = 52.0985;
      const testLon = -9.8910;
      const dist = haversine(HOME_LAT, HOME_LON, testLat, testLon);
      const brng = bearing(HOME_LAT, HOME_LON, testLat, testLon);
      addStrikeToCache({
        time_ns: Date.now() * 1_000_000,
        lat: testLat,
        lon: testLon,
        distance_km: dist,
        bearing_deg: brng,
        bearing_compass: bearingToCompass(brng),
        alert_level: getAlertLevel(dist),
      });
      console.log('🧪 Test strike injected at Cromane Lower');
    } else {
      // Fetch real strikes via WebSocket
      await fetchStrikesViaWebSocket();
    }

    // Prune old strikes
    pruneCache();

    // Sort by time (most recent first)
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

    const result = {
      alert_level: maxAlertLevel,
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
      checked_at: Date.now(),
      error: 'Unable to fetch lightning data. Please try again later.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
