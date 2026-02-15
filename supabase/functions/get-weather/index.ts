import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LAT = 51.9356;
const LON = -9.9067;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch current weather + 3h history for trend
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=wind_speed_10m,wind_direction_10m,temperature_2m&hourly=wind_speed_10m&timezone=Europe%2FDublin&past_hours=3&forecast_hours=0`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo API error [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();
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

    const result = {
      speed_knots: speedKnots,
      speed_beaufort: beaufort,
      beaufort_label: beaufortLabels[beaufort] || 'Unknown',
      direction,
      direction_degrees: dirDeg,
      temperature_c: Math.round(current.temperature_2m),
      trend,
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
