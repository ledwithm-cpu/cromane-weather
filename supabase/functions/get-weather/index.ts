import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_LAT = 52.105818;
const DEFAULT_LON = -9.895735;

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

// Met Éireann station URLs
const MET_STATIONS: Record<string, string> = {
  'valentia': 'https://prodapi.metweb.ie/observations/valentia/today',
  'roches-point': 'https://prodapi.metweb.ie/observations/roches-point/today',
  'sherkin-island': 'https://prodapi.metweb.ie/observations/sherkin-island/today',
  'shannon': 'https://prodapi.metweb.ie/observations/shannon/today',
  'athenry': 'https://prodapi.metweb.ie/observations/athenry/today',
  'knock': 'https://prodapi.metweb.ie/observations/knock/today',
  'malin-head': 'https://prodapi.metweb.ie/observations/malin-head/today',
  'dublin-airport': 'https://prodapi.metweb.ie/observations/dublin-airport/today',
  'johnstown-castle': 'https://prodapi.metweb.ie/observations/johnstown-castle/today',
};

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
    // Parse request body for dynamic coordinates
    let LAT = DEFAULT_LAT;
    let LON = DEFAULT_LON;
    let metStation = 'valentia';

    try {
      const body = await req.json();
      if (body.lat && body.lon) { LAT = body.lat; LON = body.lon; }
      if (body.metStation) metStation = body.metStation;
    } catch {}

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=wind_speed_10m,wind_direction_10m,temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_probability_max,weather_code&hourly=wind_speed_10m&timezone=Europe%2FDublin&past_hours=3&forecast_days=7`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&current=sea_surface_temperature&timezone=Europe%2FDublin`;
    const metEireannUrl = MET_STATIONS[metStation] || MET_STATIONS['valentia'];

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

    // "Feels like" comes from Open-Meteo's apparent_temperature, which is
    // computed at the requested lat/lon and accounts for humidity, wind and
    // radiation. We previously derived it from Met Éireann's Valentia station
    // using wind-chill only — that station is up to ~70km from many of our
    // saunas and overestimated "feels like" on mild days (e.g. showed 16° when
    // the real apparent temp at Cromane was ~7°).
    const feelsLikeFinal = Math.round(current.apparent_temperature);

    const current = data.current;
    const speedKmh = current.wind_speed_10m;
    const speedKnots = Math.round(speedKmh * 0.539957);
    const beaufort = kmhToBeaufort(speedKmh);
    const beaufortLabels = [
      'Calm', 'Light air', 'Light breeze', 'Gentle breeze',
      'Moderate breeze', 'Fresh breeze', 'Strong breeze',
      'Near gale', 'Gale', 'Strong gale', 'Storm',
      'Violent storm', 'Hurricane force',
    ];

    const dirDeg = current.wind_direction_10m;
    const direction = degreesToCompass(dirDeg);

    const hourly = data.hourly?.wind_speed_10m || [];
    let trend: 'rising' | 'falling' | 'steady' = 'steady';
    if (hourly.length >= 2) {
      const oldest = hourly[0];
      const newest = hourly[hourly.length - 1];
      if (newest > oldest + 2) trend = 'rising';
      else if (newest < oldest - 2) trend = 'falling';
    }

    const sunrise = data.daily?.sunrise?.[0]?.split('T')[1] ?? null;
    const sunset = data.daily?.sunset?.[0]?.split('T')[1] ?? null;

    // Build 7-day forecast
    const daily = data.daily ?? {};
    const dates: string[] = daily.time ?? [];
    const forecast = dates.slice(0, 7).map((date: string, i: number) => {
      const dirDeg = daily.wind_direction_10m_dominant?.[i] ?? 0;
      return {
        date,
        temp_max_c: Math.round(daily.temperature_2m_max?.[i] ?? 0),
        temp_min_c: Math.round(daily.temperature_2m_min?.[i] ?? 0),
        feels_like_max_c: Math.round(daily.apparent_temperature_max?.[i] ?? 0),
        feels_like_min_c: Math.round(daily.apparent_temperature_min?.[i] ?? 0),
        wind_speed_kmh: Math.round(daily.wind_speed_10m_max?.[i] ?? 0),
        wind_direction_degrees: dirDeg,
        wind_direction: degreesToCompass(dirDeg),
        precipitation_probability: daily.precipitation_probability_max?.[i] ?? 0,
        weather_code: daily.weather_code?.[i] ?? 0,
        sunrise: daily.sunrise?.[i]?.split('T')[1] ?? null,
        sunset: daily.sunset?.[i]?.split('T')[1] ?? null,
      };
    });

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
      forecast,
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
