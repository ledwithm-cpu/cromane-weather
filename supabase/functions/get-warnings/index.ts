import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WARNINGS_PAGE_URL = 'https://www.met.ie/warnings';

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

function cleanHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function parseWarningsHtml(html: string): { warnings: any[]; marine: any } {
  const warnings: any[] = [];
  let marine = { type: 'No warnings', area: 'Southwest Coast', description: 'No active marine warnings.', active: false };

  // Split at Marine Warnings heading
  const marineSplit = html.split(/<h2>Marine Warnings<\/h2>/i);
  const weatherHtml = marineSplit[0] || '';
  const marineHtml = marineSplit[1] || '';

  // Parse weather warning blocks using <h3> tags
  // Format: <h3>Status Yellow - Rain warning for Counties...</h3>
  const h3Regex = /<h3>\s*Status\s+(Yellow|Orange|Red)\s*[-–]\s*([\w\s]+?)\s*warning\s+for\s+(.*?)<\/h3>/gi;
  let match;

  while ((match = h3Regex.exec(weatherHtml)) !== null) {
    const level = match[1].toLowerCase();
    const type = match[2].trim();
    const regions = cleanHtml(match[3]);

    // Skip Northern Ireland warnings
    const contextBefore = weatherHtml.substring(Math.max(0, match.index - 500), match.index);
    if (contextBefore.includes('Northern Ireland')) continue;

    // Check if Kerry-relevant
    const regionsLower = regions.toLowerCase();
    const isKerryRelevant = regionsLower.includes('kerry') || regionsLower.includes('munster') ||
      regionsLower.includes('ireland') || regionsLower.includes('all counties');

    if (!isKerryRelevant) continue;

    // Extract description and validity from text after h3
    const afterH3 = weatherHtml.substring(match.index + match[0].length, match.index + match[0].length + 2000);

    // Get description: text in <p> tags between the heading and the "Valid:" line
    const descParts: string[] = [];
    const pRegex = /<p(?:\s[^>]*)?>(?!<strong>Met|<strong>Issued|<strong>UK)([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(afterH3)) !== null) {
      const text = cleanHtml(pMatch[1]);
      if (text.startsWith('Valid:')) break;
      if (text.startsWith('Issued:')) break;
      if (text && !text.startsWith('Met Éireann') && !text.startsWith('Met Eireann')) {
        descParts.push(text);
      }
    }

    // Extract valid until
    const validMatch = afterH3.match(/Valid:\s*(.*?)(?:<\/p>)/i);
    const validUntil = validMatch ? cleanHtml(validMatch[1]) : 'Check met.ie';

    const description = descParts.join(' ').trim();
    const allText = (type + ' ' + description).toLowerCase();
    const isThunderstorm = allText.includes('thunder') || allText.includes('lightning');
    const elevated = isThunderstorm && level === 'yellow';

    const headline = `${type} warning`;
    if (!warnings.some(w => w.headline === headline && w.level === level)) {
      warnings.push({
        level: elevated ? 'orange' : level,
        headline,
        description: description || `${type} warning in effect.`,
        valid_until: validUntil,
        is_thunderstorm: isThunderstorm,
        elevated,
      });
    }
  }

  // Parse marine warnings
  const marineH3Regex = /<h3>\s*Status\s+(Yellow|Orange|Red)\s*[-–]\s*([\w\s]+?)\s*(?:warning\s+)?for\s+(.*?)<\/h3>/gi;
  while ((match = marineH3Regex.exec(marineHtml)) !== null) {
    const type = match[2].trim();
    const area = cleanHtml(match[3]);

    // Get description
    const afterH3 = marineHtml.substring(match.index + match[0].length, match.index + match[0].length + 1000);
    const descP = afterH3.match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i);
    const description = descP ? cleanHtml(descP[1]) : '';

    const isGale = type.toLowerCase().includes('gale');
    const typeName = isGale ? 'Gale Warning' : type.toLowerCase().includes('craft') ? 'Small Craft Warning' : type;

    const currentIsGale = marine.type === 'Gale Warning';
    if (!marine.active || (isGale && !currentIsGale)) {
      marine = {
        type: typeName,
        area: area || 'Southwest Coast',
        description: description || `Active ${typeName.toLowerCase()}.`,
        active: true,
      };
    }
  }

  return { warnings, marine };
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
    const res = await fetch(WARNINGS_PAGE_URL, {
      headers: { 'User-Agent': 'CromaneWatch/1.0 (weather monitoring)' },
    });

    if (!res.ok) {
      console.error('Failed to fetch warnings page:', res.status);
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    console.log('HTML length:', html.length);
    
    // Debug: check if h3 tags with Status exist
    const h3Test = html.match(/<h3>[^<]*Status[^<]*<\/h3>/gi);
    console.log('h3 Status matches:', h3Test?.length, h3Test?.map(h => h.substring(0, 100)));
    
    const { warnings, marine } = parseWarningsHtml(html);

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
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
