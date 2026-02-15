import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LAT = 52.105818;
const LON = -9.895735;

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
    // Fetch current weather + 3h history for trend
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=wind_speed_10m,wind_direction_10m,temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover&daily=sunrise,sunset&hourly=wind_speed_10m&timezone=Europe%2FDublin&past_hours=3&forecast_hours=0&forecast_days=1`;

    // Fetch sea surface temperature from marine API
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&current=sea_surface_temperature&timezone=Europe%2FDublin`;

    // Fetch Met Éireann Valentia Observatory observations for feels-like
    const metEireannUrl = 'https://prodapi.metweb.ie/observations/valentia/today';

    const [res, marineRes, metRes] = await Promise.all([
      fetch(url),
      fetch(marineUrl),
      fetch(metEireannUrl).catch(() => null),
    ]);
    if (!res.ok) {
      throw new Error(`Open-Meteo API error [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();
    let waterTemp: number | null = null;
    if (marineRes.ok) {
      const marineData = await marineRes.json();
      waterTemp = marineData?.current?.sea_surface_temperature ?? null;
    }

    // Calculate feels-like from Met Éireann observation data (Valentia Observatory)
    let feelsLike: number | null = null;
    if (metRes && metRes.ok) {
      try {
        const metData = await metRes.json();
        // Find the latest observation (last entry with valid data)
        if (Array.isArray(metData) && metData.length > 0) {
          const latest = metData[metData.length - 1];
          const tempC = parseFloat(latest.temperature);
          // Met Éireann windSpeed is in knots – convert to km/h for wind chill formula
          const windKt = parseFloat(latest.windSpeed);
          const windKmh = windKt * 1.852;
          if (!isNaN(tempC) && !isNaN(windKmh)) {
            feelsLike = Math.round(calcWindChill(tempC, windKmh));
          }
        }
      } catch (e) {
        console.warn('Met Éireann parse error:', e);
      }
    }

    const current = data.current;

    // Wind speed from km/h to knots
    const speedKmh = current.wind_speed_10m;
    const speedKnots = Math.round(speedKmh * 0.539957);

    // Beaufort scale
    const beaufort = kmhToBeaufort(speedKmh);
    const beaufortLabels = [
      'Calm', 'Light air', 'Light breeze', 'Gentle breeze',
      'Moderate breeze', 'Fresh breeze', 'Strong breeze',
      'Near gale', 'Gale', 'Strong gale', 'Storm',
      'Violent storm', 'Hurricane force',
    ];

    // Direction degrees to compass
    const dirDeg = current.wind_direction_10m;
    const direction = degreesToCompass(dirDeg);

    // Trend from hourly data (compare 3h ago to now)
    const hourly = data.hourly?.wind_speed_10m || [];
    let trend: 'rising' | 'falling' | 'steady' = 'steady';
    if (hourly.length >= 2) {
      const oldest = hourly[0];
      const newest = hourly[hourly.length - 1];
      if (newest > oldest + 2) trend = 'rising';
      else if (newest < oldest - 2) trend = 'falling';
    }

    // Extract sunrise/sunset times (format: "2025-01-15T08:45" -> "08:45")
    const sunrise = data.daily?.sunrise?.[0]?.split('T')[1] ?? null;
    const sunset = data.daily?.sunset?.[0]?.split('T')[1] ?? null;

    // Use Met Éireann feels-like if available, fall back to Open-Meteo
    const feelsLikeFinal = feelsLike ?? Math.round(current.apparent_temperature);

    const result = {
      speed_knots: speedKnots,
      speed_beaufort: beaufort,
      beaufort_label: beaufortLabels[beaufort] || 'Unknown',
      direction,
      direction_degrees: dirDeg,
      temperature_c: Math.round(current.temperature_2m),
      trend,
      precipitation_mm: current.precipitation ?? 0,
      weather_code: current.weather_code ?? 0,
      cloud_cover: current.cloud_cover ?? 0,
      water_temperature_c: waterTemp !== null ? Math.round(waterTemp) : null,
      feels_like_c: feelsLikeFinal,
      sunrise,
      sunset,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    return new Response(JSON.stringify({ error: 'Unable to fetch weather data. Please try again later.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Wind chill formula (Environment Canada / Met Éireann standard)
function calcWindChill(tempC: number, windKmh: number): number {
  if (tempC > 10 || windKmh < 4.8) return tempC;
  return 13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * tempC * Math.pow(windKmh, 0.16);
}

function kmhToBeaufort(kmh: number): number {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  for (let i = 0; i < thresholds.length; i++) {
    if (kmh < thresholds[i]) return i;
  }
  return 12;
}

function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
