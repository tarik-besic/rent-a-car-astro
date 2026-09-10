import { defineConfig, passthroughImageService } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// PUBLIC_SITE_URL must be the final production origin (no trailing slash).
// It drives canonical URLs, hreflang, sitemap.xml, robots.txt and og:url.
const SITE = (process.env.PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');

const siteHostname = (() => {
  try {
    return new URL(SITE).hostname;
  } catch {
    return '';
  }
})();

/**
 * Hosts whose Host / X-Forwarded-Host headers Astro is allowed to trust.
 *
 * This is not optional. Without it Astro falls back to `http://localhost` for
 * `Astro.url`, the built-in CSRF check then compares the browser's real Origin
 * against that, and every reservation form POST is rejected with 403 in
 * production. The workers.dev entry keeps the form working on the default
 * Cloudflare domain even before a custom domain is set.
 */
const allowedDomains = [
  { hostname: 'localhost' },
  { hostname: '127.0.0.1' },
  { hostname: '**.workers.dev' },
  ...(siteHostname && !siteHostname.endsWith('workers.dev')
    ? [{ hostname: siteHostname }, { hostname: `**.${siteHostname}` }]
    : []),
];

export default defineConfig({
  site: SITE,
  output: 'server',
  adapter: cloudflare({
    // Local `astro dev` gets real D1/R2 bindings through miniflare, reading
    // wrangler.jsonc. Without this the admin area cannot work offline.
    platformProxy: { enabled: true },
  }),
  // Every image URL is built by hand in src/lib/image.ts and resized in the
  // browser at upload time, so Astro's sharp-based service is dead weight —
  // and sharp does not run on workerd at all.
  image: { service: passthroughImageService() },
  trailingSlash: 'never',
  security: {
    // Blocks cross-site form submissions to the reservation endpoint.
    checkOrigin: true,
    allowedDomains,
  },
  build: {
    // The whole stylesheet is a few KB — inlining it removes a render-blocking
    // request, which is the single biggest LCP win on a site this small.
    inlineStylesheets: 'always',
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
