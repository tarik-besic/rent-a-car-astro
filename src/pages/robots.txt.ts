import type { APIRoute } from 'astro';
import { SITE_URL } from '~/config/site';

export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    // Filtered listing views are noindex anyway; keep crawl budget on real pages.
    'Disallow: /*?klasa=',
    'Disallow: /*?class=',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
