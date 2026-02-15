import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Met Éireann warning feeds
const WARNING_URL = 'https://www.met.ie/Open_Data/json/warning_IRELAND.json';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      marine: { type: 'Data unavailable', area: 'Southwest Coast', description: 'Unable to fetch warnings.', active: false },
      error: error.message 
    }), {
      status: 200, // Return 200 with empty data so app still works
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
