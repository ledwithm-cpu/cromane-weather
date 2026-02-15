import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Met Éireann warning feeds
const WARNING_JSON_URL = 'https://www.met.ie/Open_Data/json/warning_IRELAND.json';
const WARNING_XML_URL = 'https://www.met.ie/Open_Data/xml/xWarningPage.xml';

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
    let warnings: any[] = [];
    let marine = { type: 'No warnings', area: 'Southwest Coast', description: 'No active marine warnings.', active: false };

    // Fetch both JSON and XML feeds in parallel
    const [jsonRes, xmlRes] = await Promise.all([
      fetch(WARNING_JSON_URL).catch(() => null),
      fetch(WARNING_XML_URL).catch(() => null),
    ]);

    // --- Parse JSON feed (county-level weather warnings) ---
    if (jsonRes?.ok) {
      try {
        const warningData = await jsonRes.json();
        const warningList = Array.isArray(warningData) ? warningData : [];

        warnings = warningList
          .filter((w: any) => {
            const allText = JSON.stringify(w).toLowerCase();
            return allText.includes('kerry') || allText.includes('munster') || 
                   allText.includes('ireland') || allText.includes('national') ||
                   allText.includes('all counties');
          })
          .map((w: any) => {
            const rawLevel = (w.severity || w.level || 'yellow').toLowerCase();
            let level = 'yellow';
            if (rawLevel.includes('red') || rawLevel.includes('severe')) level = 'red';
            else if (rawLevel.includes('orange') || rawLevel.includes('moderate')) level = 'orange';
            return {
              level,
              headline: w.headline || w.title || 'Weather Warning',
              description: w.description || '',
              valid_until: w.expiry || w.valid_until || 'Check met.ie',
            };
          });
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }

    // --- Parse XML feed (includes marine/gale warnings) ---
    if (xmlRes?.ok) {
      try {
        const xmlText = await xmlRes.text();
        console.log('XML feed (first 1500):', xmlText.substring(0, 1500));

        // Simple XML parsing - extract warntype blocks
        const warnTypeRegex = /<warntype\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/warntype>/gi;
        const warningTypeRegex = /<warning-type[^>]*>([\s\S]*?)<\/warning-type>/gi;
        
        let warnMatch;
        while ((warnMatch = warnTypeRegex.exec(xmlText)) !== null) {
          const warnTypeName = warnMatch[1]; // e.g. "Gale Warning"
          const warnTypeBlock = warnMatch[2];
          
          // Extract individual warning-type entries
          let wtMatch;
          const innerRegex = /<warning-type[^>]*>([\s\S]*?)<\/warning-type>/gi;
          while ((wtMatch = innerRegex.exec(warnTypeBlock)) !== null) {
            const block = wtMatch[1];
            
            const getTag = (tag: string): string => {
              const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
              return m ? m[1].trim() : '';
            };

            const level = getTag('awareness-level') || 'Yellow';
            const header = getTag('header') || warnTypeName;
            const warnText = getTag('warntext') || getTag('warnText') || '';
            const validFrom = getTag('validfromtime') || getTag('validFromTime') || '';
            const validTo = getTag('validtotime') || getTag('validToTime') || '';
            const regions = getTag('regions') || '';

            const isGaleOrMarine = warnTypeName.toLowerCase().includes('gale') ||
                                    warnTypeName.toLowerCase().includes('marine') ||
                                    warnTypeName.toLowerCase().includes('craft') ||
                                    header.toLowerCase().includes('gale') ||
                                    header.toLowerCase().includes('marine');

            // Check if still valid
            const now = new Date();
            const validToDate = validTo ? new Date(validTo) : null;
            const isActive = !validToDate || validToDate > now;

            if (isActive && isGaleOrMarine) {
              const isGale = warnTypeName.toLowerCase().includes('gale') || header.toLowerCase().includes('gale');
              // Gale takes priority over small craft
              const currentIsGale = marine.type === 'Gale Warning';
              if (!marine.active || (isGale && !currentIsGale)) {
                const typeName = isGale ? 'Gale Warning' :
                                 warnTypeName.toLowerCase().includes('craft') ? 'Small Craft Warning' :
                                 warnTypeName;
                marine = {
                  type: typeName,
                  area: 'Southwest Coast',
                  description: warnText || header || `Active ${warnTypeName.toLowerCase()}.`,
                  active: true,
                };
              }
            }
            
            // Also check for Kerry-relevant weather warnings from XML
            if (isActive && !isGaleOrMarine) {
              const allText = (header + ' ' + warnText + ' ' + regions).toLowerCase();
              if (allText.includes('kerry') || allText.includes('munster') || 
                  allText.includes('ireland') || allText.includes('all counties')) {
                const wLevel = level.toLowerCase().includes('red') ? 'red' :
                               level.toLowerCase().includes('orange') ? 'orange' : 'yellow';
                // Only add if not already from JSON
                if (!warnings.some(w => w.headline === header)) {
                  warnings.push({
                    level: wLevel,
                    headline: header || warnTypeName,
                    description: warnText,
                    valid_until: validTo || 'Check met.ie',
                  });
                }
              }
            }
          }
        }

        // Also check global awareness level as fallback
        if (!marine.active) {
          const globalMatch = xmlText.match(/<global-awareness-level[^>]*>([^<]*)<\/global-awareness-level>/i);
          if (globalMatch) {
            console.log('Global awareness level:', globalMatch[1]);
          }
        }
      } catch (e) {
        console.error('XML parse error:', e);
      }
    }

    console.log(`Returning ${warnings.length} warnings, marine active: ${marine.active} (${marine.type})`);


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
