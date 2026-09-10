import type { APIRoute } from 'astro';
import { getPublishedCars } from '~/lib/cars';
import { LOCALES, abs, path, type RouteKey } from '~/i18n';

type Entry = {
  key: RouteKey;
  slug?: string;
  priority: string;
  changefreq: string;
};

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Hand-rolled rather than @astrojs/sitemap: car pages are rendered on demand
 * from D1, so a build-time sitemap would never list them.
 */
export const GET: APIRoute = async ({ locals }) => {
  const cars = await getPublishedCars(locals.runtime.env.DB);

  const entries: Entry[] = [
    { key: 'home', priority: '1.0', changefreq: 'weekly' },
    { key: 'cars', priority: '0.9', changefreq: 'daily' },
    { key: 'reserve', priority: '0.8', changefreq: 'monthly' },
    { key: 'faq', priority: '0.6', changefreq: 'monthly' },
    ...cars.map((car) => ({
      key: 'car' as RouteKey,
      slug: car.slug,
      priority: '0.7',
      changefreq: 'weekly',
    })),
  ];

  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = entries.flatMap((entry) =>
    LOCALES.map((locale) => {
      const loc = abs(path(entry.key, locale, entry.slug));
      // Every URL declares the full hreflang cluster, both directions.
      const alternates = LOCALES.map(
        (other) =>
          `    <xhtml:link rel="alternate" hreflang="${other === 'bs' ? 'bs-BA' : 'en'}" href="${escape(
            abs(path(entry.key, other, entry.slug)),
          )}" />`,
      ).join('\n');

      return [
        '  <url>',
        `    <loc>${escape(loc)}</loc>`,
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escape(
          abs(path(entry.key, 'bs', entry.slug)),
        )}" />`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n');
    }),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=1800',
    },
  });
};
