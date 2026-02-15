import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const tides = generateTidalPredictions(now);

    return new Response(JSON.stringify(tides), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tide error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Semi-diurnal tidal approximation for Cromane/Castlemaine Harbour
function generateTidalPredictions(now: Date) {
  const TIDAL_PERIOD_MS = 12 * 3600 * 1000 + 25 * 60 * 1000;
  const MEAN_HIGH = 4.1;
  const MEAN_LOW = 0.9;

  const refHigh = new Date('2025-01-01T03:30:00Z').getTime();
  const elapsed = now.getTime() - refHigh;
  const cycles = Math.floor(elapsed / TIDAL_PERIOD_MS);
  const nearestHigh = new Date(refHigh + cycles * TIDAL_PERIOD_MS);

  const events = [];
  for (let i = -1; i <= 2; i++) {
    const highTime = new Date(nearestHigh.getTime() + i * TIDAL_PERIOD_MS);
    const lowTime = new Date(highTime.getTime() + TIDAL_PERIOD_MS / 2);
    const dayOfMonth = highTime.getDate();
    const springFactor = 1 + 0.15 * Math.cos((dayOfMonth / 14.76) * Math.PI * 2);

    events.push({
      type: 'high',
      time: formatTime(highTime),
      height_m: parseFloat((MEAN_HIGH * springFactor).toFixed(1)),
      timestamp: highTime.toISOString(),
    });
    events.push({
      type: 'low',
      time: formatTime(lowTime),
      height_m: parseFloat((MEAN_LOW / springFactor).toFixed(1)),
      timestamp: lowTime.toISOString(),
    });
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events.filter(e => new Date(e.timestamp).getTime() > now.getTime() - 3600000).slice(0, 4);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Dublin',
  });
}
