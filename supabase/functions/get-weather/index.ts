import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LAT = 52.105818;
const LON = -9.895735;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch current weather + 3h history for trend
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=wind_speed_10m,wind_direction_10m,temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover&daily=sunrise,sunset&hourly=wind_speed_10m&timezone=Europe%2FDublin&past_hours=3&forecast_hours=0&forecast_days=1`;

    // Fetch sea surface temperature from marine API
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&current=sea_surface_temperature&timezone=Europe%2FDublin`;

    const [res, marineRes] = await Promise.all([fetch(url), fetch(marineUrl)]);
    if (!res.ok) {
      throw new Error(`Open-Meteo API error [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();
    let waterTemp: number | null = null;
    if (marineRes.ok) {
      const marineData = await marineRes.json();
      waterTemp = marineData?.current?.sea_surface_temperature ?? null;
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
      feels_like_c: Math.round(current.apparent_temperature),
      sunrise,
      sunset,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
