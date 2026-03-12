import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WARNINGS_PAGE_URL = 'https://www.met.ie/warnings';

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

/** Parse warning blocks from the Met Éireann warnings HTML page */
function parseWarningsHtml(html: string): { warnings: any[]; marine: any } {
  const warnings: any[] = [];
  let marine = { type: 'No warnings', area: 'Southwest Coast', description: 'No active marine warnings.', active: false };

  // Split HTML into Weather Warnings and Marine Warnings sections
  const weatherSection = html.split(/Marine Warnings/i)[0] || html;
  const marineSection = html.split(/Marine Warnings/i)[1] || '';

  // Parse weather warnings - look for warning heading pattern:
  // "Status Yellow - Rain warning for Counties..."
  const warningHeadingRegex = /Status\s+(Yellow|Orange|Red)\s*[-–]\s*(\w[\w\s]*?)\s*warning\s+for\s+([\s\S]*?)(?=<\/h|<\/a)/gi;
  // Also try the class-based approach from the HTML
  const warningBlockRegex = /<div[^>]*class="[^"]*warning-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

  // Primary approach: parse the structured heading + description blocks
  // Pattern: <h3>Status Yellow - Rain warning for Counties</h3> ... description ... Valid: dates
  const h3Regex = /Status\s+(Yellow|Orange|Red)\s*[-–]\s*([\w\s]+?)\s*warning\s+for\s+([^<]+)/gi;
  let match;

  while ((match = h3Regex.exec(html)) !== null) {
    const level = match[1].toLowerCase();
    const type = match[2].trim();
    const regions = match[3].trim();

    // Skip Northern Ireland warnings
    const afterMatch = html.substring(match.index, match.index + 1500);
    if (afterMatch.includes('UK Met Office') || afterMatch.includes('Northern Ireland')) continue;

    // Check if Kerry-relevant
    const regionsLower = regions.toLowerCase();
    const isKerryRelevant = regionsLower.includes('kerry') || regionsLower.includes('munster') ||
      regionsLower.includes('ireland') || regionsLower.includes('all counties') ||
      regionsLower.includes('connacht'); // Connacht sometimes paired with Munster warnings

    // Extract description - text after "Met Éireann Weather Warning" until "Valid:"
    const descMatch = afterMatch.match(/Met\s+[ÉE]ireann\s+Weather\s+Warning[\s\S]*?<\/[^>]+>\s*([\s\S]*?)(?=Valid:|Issued:)/i);
    const rawDesc = descMatch ? descMatch[1] : '';
    // Clean HTML tags and normalize whitespace
    const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract valid until
    const validMatch = afterMatch.match(/Valid:\s*([\s\S]*?)(?=Issued:|<\/div>|$)/i);
    const validUntil = validMatch
      ? validMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      : 'Check met.ie';

    // Check if thunderstorm-related
    const allText = (type + ' ' + description).toLowerCase();
    const isThunderstorm = allText.includes('thunder') || allText.includes('lightning');
    const elevated = isThunderstorm && level === 'yellow';

    // Check if this is a marine/gale warning (skip for weather section)
    const isMarine = type.toLowerCase().includes('gale') || type.toLowerCase().includes('marine') ||
      type.toLowerCase().includes('craft');

    if (isMarine) {
      // Handle in marine section below
      continue;
    }

    if (isKerryRelevant) {
      const headline = `Status ${match[1]} - ${type} warning for ${regions}`;
      // Avoid duplicates
      if (!warnings.some(w => w.headline === headline)) {
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
  }

  // Parse marine warnings from marine section
  const marineH3Regex = /Status\s+(Yellow|Orange|Red)\s*[-–]\s*([\w\s]+?)\s*(?:warning\s+)?for\s+([^<]+)/gi;
  while ((match = marineH3Regex.exec(marineSection)) !== null) {
    const level = match[1].toLowerCase();
    const type = match[2].trim();
    const area = match[3].trim();

    // Extract description
    const afterMatch = marineSection.substring(match.index, match.index + 1500);
    const descMatch = afterMatch.match(/(?:<\/h[^>]+>|<\/a>)\s*([\s\S]*?)(?=Valid:|Issued:|$)/i);
    const rawDesc = descMatch ? descMatch[1] : '';
    const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const isGale = type.toLowerCase().includes('gale');
    const isSmallCraft = type.toLowerCase().includes('craft');
    const typeName = isGale ? 'Gale Warning' : isSmallCraft ? 'Small Craft Warning' : type;

    // Gale takes priority over small craft
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
    // Fetch the Met Éireann warnings HTML page directly
    const res = await fetch(WARNINGS_PAGE_URL, {
      headers: { 'User-Agent': 'CromaneWatch/1.0 (weather monitoring)' },
    });

    if (!res.ok) {
      console.error('Failed to fetch Met Éireann warnings page:', res.status);
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    console.log('Fetched warnings HTML, length:', html.length);

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
