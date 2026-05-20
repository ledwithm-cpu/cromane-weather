// Generates public/sitemap.xml from the SEO route list (which itself
// reads src/lib/locations.ts). Runs via predev / prebuild npm scripts
// so adding a new town to LOCATIONS automatically expands the sitemap.

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSeoRoutes } from './seo-routes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://saunasinireland.com';

// Per-route metadata defaults. Location pages share the same shape.
const META = {
  '/': { changefreq: 'daily', priority: '1.0' },
  '/discover': { changefreq: 'weekly', priority: '0.8' },
  '/how-it-works': { changefreq: 'monthly', priority: '0.6' },
  '/contact': { changefreq: 'monthly', priority: '0.5' },
};
const LOCATION_META = { changefreq: 'daily', priority: '0.7' };

const routes = getSeoRoutes();

const urls = routes
  .map((r) => {
    const meta = META[r.path] ?? LOCATION_META;
    return [
      '  <url>',
      `    <loc>${BASE_URL}${r.path}</loc>`,
      `    <changefreq>${meta.changefreq}</changefreq>`,
      `    <priority>${meta.priority}</priority>`,
      '  </url>',
    ].join('\n');
  })
  .join('\n');

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urls,
  '</urlset>',
  '',
].join('\n');

const outPath = resolve(__dirname, '../public/sitemap.xml');
writeFileSync(outPath, xml);
console.log(`[sitemap] wrote ${routes.length} entries → public/sitemap.xml`);
