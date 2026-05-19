import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonCorsHeaders } from "../_shared/cors.ts";
import { createRateLimiter, getClientIp } from "../_shared/rate-limit.ts";
import {
  bearing,
  bearingToCompass,
  getAlertLevel,
  getCacheKey,
  haversine,
} from "./geofence.ts";
import {
  addStrikeToCache,
  getStrikeCache,
  hydrateStrikeCacheFromDb,
  persistNewStrikes,
  pruneCache,
  type Strike,
} from "./cache.ts";
import { fetchNowcast, type NowcastResult } from "./nowcast.ts";

const DEFAULT_LAT = 52.1008;
const DEFAULT_LON = -9.8856;
const GEOFENCE_KM = 20;

const limiter = createRateLimiter();

// ─── Blitzortung WebSocket ───
async function fetchStrikesViaWebSocket(
  homeLat: number,
  homeLon: number,
  cacheKey: string,
  cache: Strike[],
): Promise<void> {
  await hydrateStrikeCacheFromDb(cacheKey, cache);

  const servers = ['wss://ws1.blitzortung.org/', 'wss://ws7.blitzortung.org/', 'wss://ws2.blitzortung.org/'];
  const serverUrl = servers[Math.floor(Math.random() * servers.length)];
  const newStrikes: Strike[] = [];

  return new Promise((resolve) => {
    const finish = async () => {
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

function injectTestStrike(homeLat: number, homeLon: number, cache: Strike[]) {
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

// ─── Main Handler ───
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (limiter.isRateLimited(getClientIp(req))) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...jsonCorsHeaders, 'Retry-After': '60' },
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
    const [, nowcast] = await Promise.all([
      testMode
        ? Promise.resolve(injectTestStrike(homeLat, homeLon, strikeCache))
            .then(() => persistNewStrikes(cacheKey, strikeCache.slice(-1)))
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

    triggerPushIfNeeded(effectiveAlertLevel, nowcast, closestStrike, locationName).catch(e =>
      console.error('Push trigger error:', e)
    );

    return new Response(JSON.stringify(result), { headers: jsonCorsHeaders });
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
      headers: jsonCorsHeaders,
    });
  }
});
