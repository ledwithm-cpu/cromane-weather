import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cromane coordinates
const HOME_LAT = 52.1008;
const HOME_LON = -9.8856;

// Alert thresholds in km
const THRESHOLD_AWARENESS = 20;
const THRESHOLD_WARNING = 10;
const THRESHOLD_DANGER = 5;

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

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bearing from home to strike
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
  if (distanceKm <= THRESHOLD_DANGER) return 3;
  if (distanceKm <= THRESHOLD_WARNING) return 2;
  if (distanceKm <= THRESHOLD_AWARENESS) return 1;
  return 0;
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
    // Use Blitzortung's public JSON archive - fetch last 10 minutes of data for Europe (container 1)
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
    const utcDay = String(now.getUTCDate()).padStart(2, '0');
    const utcHour = String(now.getUTCHours()).padStart(2, '0');
    const utcMin10 = String(Math.floor(now.getUTCMinutes() / 10) * 10).padStart(2, '0');

    // Try current 10-min block and previous one for freshness
    const blocks = [
      `${utcYear}/${utcMonth}/${utcDay}/${utcHour}/${utcMin10}`,
    ];
    
    // Also fetch previous 10-min block
    const prevDate = new Date(now.getTime() - 10 * 60 * 1000);
    const prevYear = prevDate.getUTCFullYear();
    const prevMonth = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
    const prevDay = String(prevDate.getUTCDate()).padStart(2, '0');
    const prevHour = String(prevDate.getUTCHours()).padStart(2, '0');
    const prevMin10 = String(Math.floor(prevDate.getUTCMinutes() / 10) * 10).padStart(2, '0');
    blocks.push(`${prevYear}/${prevMonth}/${prevDay}/${prevHour}/${prevMin10}`);

    const nearbyStrikes: Array<{
      time_ns: number;
      lat: number;
      lon: number;
      distance_km: number;
      bearing_deg: number;
      bearing_compass: string;
      alert_level: number;
    }> = [];

    for (const block of blocks) {
      try {
        // Blitzortung public JSON archive (Container 1 = Europe)
        const archiveUrl = `https://data.blitzortung.org/Data/Protected/last_strikes.php?north=${HOME_LAT + 0.3}&south=${HOME_LAT - 0.3}&west=${HOME_LON - 0.5}&east=${HOME_LON + 0.5}&number=100`;
        
        const res = await fetch(archiveUrl, {
          headers: { 'Accept': 'text/plain' },
        });

        if (!res.ok) {
          // If protected endpoint fails, fall back to the archive
          const fallbackUrl = `https://data.blitzortung.org/Data/Protected/strikes.php?north=${HOME_LAT + 0.3}&south=${HOME_LAT - 0.3}&west=${HOME_LON - 0.5}&east=${HOME_LON + 0.5}&number=100&sig=0`;
          const fallbackRes = await fetch(fallbackUrl);
          if (!fallbackRes.ok) {
            console.log(`Archive block unavailable: ${block}`);
            continue;
          }
          const text = await fallbackRes.text();
          parseStrikes(text, nearbyStrikes);
        } else {
          const text = await res.text();
          parseStrikes(text, nearbyStrikes);
        }
        break; // Only need one successful fetch
      } catch (e) {
        console.log(`Failed to fetch block ${block}:`, e);
      }
    }

    // Sort by time (most recent first)
    nearbyStrikes.sort((a, b) => b.time_ns - a.time_ns);

    // Determine overall alert level
    const maxAlertLevel = nearbyStrikes.length > 0
      ? Math.max(...nearbyStrikes.map(s => s.alert_level))
      : 0;

    // Find the closest strike
    const closestStrike = nearbyStrikes.length > 0
      ? nearbyStrikes.reduce((prev, curr) => curr.distance_km < prev.distance_km ? curr : prev)
      : null;

    // Most recent strike timestamp
    const lastStrikeTime = nearbyStrikes.length > 0
      ? Math.floor(nearbyStrikes[0].time_ns / 1_000_000) // Convert ns to ms
      : null;

    const result = {
      alert_level: maxAlertLevel,
      strike_count: nearbyStrikes.length,
      last_strike_time_ms: lastStrikeTime,
      closest_strike: closestStrike ? {
        distance_km: Math.round(closestStrike.distance_km * 10) / 10,
        bearing_compass: closestStrike.bearing_compass,
        bearing_deg: Math.round(closestStrike.bearing_deg),
      } : null,
      strikes: nearbyStrikes.slice(0, 10).map(s => ({
        distance_km: Math.round(s.distance_km * 10) / 10,
        bearing_compass: s.bearing_compass,
        time_ms: Math.floor(s.time_ns / 1_000_000),
      })),
      checked_at: Date.now(),
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
      status: 200, // Return 200 with safe defaults so app still works
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseStrikes(text: string, results: Array<any>) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  for (const line of lines) {
    try {
      const strike = JSON.parse(line);
      const lat = strike.lat;
      const lon = strike.lon;
      const time_ns = strike.time;

      if (lat == null || lon == null) continue;

      const dist = haversine(HOME_LAT, HOME_LON, lat, lon);
      if (dist <= THRESHOLD_AWARENESS) {
        const brng = bearing(HOME_LAT, HOME_LON, lat, lon);
        results.push({
          time_ns: time_ns || 0,
          lat,
          lon,
          distance_km: dist,
          bearing_deg: brng,
          bearing_compass: bearingToCompass(brng),
          alert_level: getAlertLevel(dist),
        });
      }
    } catch {
      // Skip malformed lines
    }
  }
}
