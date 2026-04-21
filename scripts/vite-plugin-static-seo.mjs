// Vite plugin: emits per-route index.html files at build time with
// hardcoded OG/Twitter meta tags for social media crawlers.
//
// How it works:
//   1. After Vite produces the main dist/index.html, we read it.
//   2. For each route in getSeoRoutes(), we clone that HTML, swap in
//      route-specific <title>/meta tags, and emit it as
//      dist/<route>/index.html.
//   3. When a crawler (or user) hits /cromane, the host serves the
//      pre-baked dist/cromane/index.html directly. The same React app
//      then hydrates on top, so end-user behavior is unchanged.
//
// No Puppeteer, no headless browser, no runtime cost — just static
// HTML files with the right meta tags.

import { getSeoRoutes, injectSeoTags } from './seo-routes.mjs';

export default function staticSeoPlugin() {
  return {
    name: 'lovable:static-seo',
    apply: 'build',
    enforce: 'post',

    generateBundle(_options, bundle) {
      const indexAsset = bundle['index.html'];
      if (!indexAsset || indexAsset.type !== 'asset') {
        this.warn('[static-seo] index.html not found in bundle, skipping');
        return;
      }

      const baseHtml = String(indexAsset.source);
      const routes = getSeoRoutes();
      let count = 0;

      for (const route of routes) {
        // Skip "/" since the original index.html already covers it.
        if (route.path === '/') {
          // But still update the root index.html with canonical homepage tags
          indexAsset.source = injectSeoTags(baseHtml, route);
          continue;
        }

        const cleanPath = route.path.replace(/^\/+/, '');
        const fileName = `${cleanPath}/index.html`;
        const html = injectSeoTags(baseHtml, route);

        this.emitFile({
          type: 'asset',
          fileName,
          source: html,
        });
        count++;
      }

      this.info(`[static-seo] emitted ${count} pre-rendered route(s)`);
    },
  };
}
