import type { APIRoute } from 'astro';
import { site } from '~/config/site';

/** Served as a route so the installed-app name follows PUBLIC_BUSINESS_NAME. */
export const GET: APIRoute = () => {
  const manifest = {
    name: site.name,
    short_name: site.name.length > 12 ? 'Rent a Car' : site.name,
    description: `Rent a car ${site.city}`,
    start_url: '/',
    display: 'browser',
    background_color: '#0a0c0f',
    theme_color: '#0a0c0f',
    lang: 'bs',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
