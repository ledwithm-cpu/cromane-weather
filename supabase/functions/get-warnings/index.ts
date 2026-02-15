import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Met Éireann warning feeds
const WARNING_URL = 'https://www.met.ie/Open_Data/json/warning_IRELAND.json';

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
    // Fetch Met Éireann warnings
    const warningRes = await fetch(WARNING_URL);
    let warnings: any[] = [];
    let marine = { type: 'No warnings', area: 'Southwest Coast', description: 'No active marine warnings.', active: false };

    if (warningRes.ok) {
      const warningData = await warningRes.json();

      // Filter for Kerry-relevant warnings
      if (Array.isArray(warningData)) {
        warnings = warningData
          .filter((w: any) => {
            const regions = (w.regions || []).map((r: string) => r.toLowerCase());
            const headline = (w.headline || '').toLowerCase();
            const description = (w.description || '').toLowerCase();
            return regions.some((r: string) => r.includes('kerry') || r.includes('munster') || r.includes('ireland')) ||
                   headline.includes('kerry') || description.includes('kerry');
          })
          .map((w: any) => ({
            level: (w.severity || w.level || 'yellow').toLowerCase().replace('minor', 'yellow').replace('moderate', 'orange').replace('severe', 'red').replace('extreme', 'red'),
            headline: w.headline || w.title || 'Weather Warning',
            description: w.description || '',
            valid_until: w.expiry || w.valid_until || 'Check met.ie',
          }));
      }

      // Check for marine / small craft warnings
      const marineWarnings = (Array.isArray(warningData) ? warningData : [])
        .filter((w: any) => {
          const type = (w.type || w.phenomenon || '').toLowerCase();
          const headline = (w.headline || '').toLowerCase();
          return type.includes('wind') || headline.includes('craft') || headline.includes('marine');
        });

      if (marineWarnings.length > 0) {
        const mw = marineWarnings[0];
        marine = {
          type: mw.headline?.includes('Craft') ? 'Small Craft Warning' : 'Wind Warning',
          area: 'Southwest Coast',
          description: mw.description || 'Active marine warning.',
          active: true,
        };
      }
    }

    return new Response(JSON.stringify({ warnings, marine }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Warnings fetch error:', error);
    return new Response(JSON.stringify({ 
      warnings: [],
      marine: { type: 'Data unavailable', area: 'Southwest Coast', description: 'Unable to fetch warnings. Check met.ie for updates.', active: false },
    }), {
      status: 200, // Return 200 with empty data so app still works
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
