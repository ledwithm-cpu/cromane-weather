// SEO route metadata generator.
// Used by the build-time HTML emitter plugin (vite.config.ts) to produce
// per-route static HTML files with hardcoded OG/Twitter tags so social
// crawlers see the correct preview for every page, including each location.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCATIONS_PATH = resolve(__dirname, '../src/features/location/data/locations.ts');

const SITE_URL = 'https://saunasinireland.com';
const DEFAULT_OG_IMAGE =
  'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f1bce73d-3598-4d1f-b7fc-df8d9af07643/id-preview-60157873--6bd72f3e-cc1b-4456-8a58-e989a2a1b43d.lovable.app-1774037527519.png';

/**
 * Lightweight regex parser for LOCATIONS export. Avoids needing a full TS
 * compiler at build time. Each entry block is bounded by curly braces and
 * we extract the fields we care about for SEO.
 */
function parseLocations() {
  const src = readFileSync(LOCATIONS_PATH, 'utf-8');
  const arrayMatch = src.match(/export const LOCATIONS[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!arrayMatch) return [];

  const body = arrayMatch[1];
  const entries = [];
  // Split on object boundaries: `{ ... },`
  const blockRegex = /\{([\s\S]*?)\n\s*\},?/g;
  let m;
  while ((m = blockRegex.exec(body)) !== null) {
    const block = m[1];
    const get = (key) => {
      // Match a quoted value, allowing escaped quotes (e.g. "Samhradh\\'s Sauna").
      const re = new RegExp(
        `${key}\\s*:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)'|\`((?:[^\`\\\\]|\\\\.)*)\`)`
      );
      const r = block.match(re);
      const raw = r ? (r[1] ?? r[2] ?? r[3]) : undefined;
      return raw ? raw.replace(/\\(['"`\\])/g, '$1') : undefined;
    };
    const id = get('id');
    if (!id) continue;
    entries.push({
      id,
      name: get('name') || id,
      county: get('county') || '',
      saunaName: get('saunaName'),
    });
  }
  return entries;
}

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const countyLabel = (c = '') => c.replace(/\s*\([^)]*\)\s*/g, '').trim();

const REGIONS = [
  { slug: 'ireland', name: 'Ireland', country: 'Ireland' },
  { slug: 'scotland', name: 'Scotland', country: 'Scotland' },
  { slug: 'wales', name: 'Wales', country: 'Wales' },
  { slug: 'england', name: 'England', country: 'England' },
];

/**
 * Build the list of routes that need pre-baked SEO HTML.
 * Returns: [{ path, title, description, canonical, image }]
 */
export function getSeoRoutes() {
  const locations = parseLocations().filter((l) => l.saunaUrl);
  const total = locations.length;

  const staticRoutes = [
    {
      path: '/',
      title: `Coastal Saunas Directory · ${total} Beach Saunas in Ireland, Scotland, Wales & England`,
      description: `Find ${total} coastal saunas across Ireland, Scotland, Wales and England. Live tide times, sea conditions and direct booking links · 100% free, no signup needed.`,
    },
    {
      path: '/discover',
      title: `Sauna Map · ${total} Coastal Saunas in Ireland, Scotland, Wales & England`,
      description:
        'Interactive map of coastal saunas across Ireland, Scotland, Wales and England. Tap a pin for live tide times, sea conditions and booking links.',
    },
    {
      path: '/tides',
      title: 'Live Tide Times & Sea Conditions for Coastal Saunas',
      description:
        'Live tide times, tide heights, sea temperature, wind and weather warnings for coastal sauna and sea swimming spots.',
    },
    {
      path: '/how-it-works',
      title: 'How It Works | Irish Beach Saunas',
      description:
        'Learn how Irish Saunas tracks live tides, weather, lightning, and Met Éireann warnings to keep you safe on the coast.',
    },
    {
      path: '/contact',
      title: 'Contact | Irish Beach Saunas',
      description:
        'Get in touch with the team behind Irish Beach Saunas. Suggestions, sauna listings, partnerships, and feedback welcome.',
    },
  ];

  const regionRoutes = REGIONS.map((r) => {
    const count = locations.filter((l) => (l.country || 'Ireland') === r.country).length;
    return {
      path: `/${r.slug}`,
      title: `Coastal Saunas in ${r.name} · ${count} Beach Saunas, Tides & Weather`,
      description: `Browse ${count} coastal and beach saunas in ${r.name}. Live tide times, sea conditions and direct booking links for every sauna · free, no signup.`,
    };
  }).filter((r) => !r.title.includes(' 0 Beach'));

  // County/area hubs with 2+ saunas.
  const byCounty = new Map();
  for (const loc of locations) {
    const name = countyLabel(loc.county);
    const slug = slugify(name);
    const entry = byCounty.get(slug) || { slug, name, country: loc.country || 'Ireland', saunas: [] };
    entry.saunas.push(loc);
    byCounty.set(slug, entry);
  }
  const countyRoutes = [...byCounty.values()]
    .filter((c) => c.saunas.length >= 2)
    .map((c) => ({
      path: `/county/${c.slug}`,
      title: `${c.name} Saunas · ${c.saunas.length} Coastal Beach Saunas, Tides & Weather`,
      description: `Every coastal sauna in ${c.name}, ${c.country}: ${c.saunas
        .map((s) => s.saunaName || s.name)
        .slice(0, 4)
        .join(', ')} and more. Live tide times, sea conditions and direct booking links.`,
    }));

  const locationRoutes = locations.map((loc) => {
    const county = countyLabel(loc.county);
    const title = loc.saunaName
      ? `${loc.name} Sauna – ${loc.saunaName} Beach Sauna & Sea Swimming, ${county}`
      : `${loc.name} Beach Sauna & Sea Swimming – Tides & Weather, ${county}`;
    const description = loc.saunaName
      ? `${loc.name} sauna guide: book ${loc.saunaName}, a wood-fired beach sauna in ${loc.name}, ${county}. Live tide times, sea temperature, and weather for sea swimming and cold-water plunges in ${loc.name}.`
      : `${loc.name} beach sauna and sea swimming guide for ${county}. Live tide times, sea temperature, and weather to plan a coastal sauna and cold-water swim in ${loc.name}.`;
    return {
      path: `/${loc.id}`,
      title,
      description,
    };
  });

  return [...staticRoutes, ...regionRoutes, ...countyRoutes, ...locationRoutes].map((r) => ({
    ...r,
    canonical: `${SITE_URL}${r.path === '/' ? '/' : r.path}`,
    image: DEFAULT_OG_IMAGE,
  }));
}

/**
 * Inject/replace SEO-related tags inside the base index.html template.
 */
export function injectSeoTags(html, route) {
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const canonical = escapeHtml(route.canonical);
  const image = escapeHtml(route.image);

  let out = html;

  // Replace <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

  // Replace or insert key meta tags
  const replacers = [
    [/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`],
    [/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}" />`],
    [/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonical}" />`],
    [/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}">`],
    [/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${description}">`],
    [/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${image}">`],
    [/<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${title}">`],
    [/<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${description}">`],
    [/<meta\s+name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" content="${image}">`],
  ];

  for (const [re, replacement] of replacers) {
    if (re.test(out)) {
      out = out.replace(re, replacement);
    } else {
      // Inject before </head> if missing
      out = out.replace(/<\/head>/i, `    ${replacement}\n  </head>`);
    }
  }

  return out;
}
