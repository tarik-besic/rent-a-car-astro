import { SITE_URL } from '~/config/site';
import { bs, type Dict } from './bs';
import { en } from './en';

export const LOCALES = ['bs', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** The default locale is served from the root, without a URL prefix. */
export const DEFAULT_LOCALE: Locale = 'bs';

const DICTS: Record<Locale, Dict> = { bs, en };

export const t = (locale: Locale): Dict => DICTS[locale];
export type { Dict };

export type RouteKey = 'home' | 'cars' | 'car' | 'reserve' | 'faq';

/**
 * Localised URL slugs. Translated paths (not ?lang= params) are what make the
 * two language versions rank independently in each market.
 */
const ROUTES: Record<RouteKey, Record<Locale, string>> = {
  home: { bs: '/', en: '/en' },
  cars: { bs: '/vozila', en: '/en/cars' },
  car: { bs: '/vozila/:slug', en: '/en/cars/:slug' },
  reserve: { bs: '/rezervacija', en: '/en/reservation' },
  faq: { bs: '/faq', en: '/en/faq' },
};

/** Builds a root-relative path for a route in a given locale. */
export function path(key: RouteKey, locale: Locale, slug?: string): string {
  const template = ROUTES[key][locale];
  return slug ? template.replace(':slug', slug) : template;
}

/** Turns a root-relative path into an absolute URL for canonicals and og:url. */
export function abs(pathname: string): string {
  return `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
}

/** hreflang set for a page, including x-default pointing at the primary locale. */
export function alternates(key: RouteKey, slug?: string): { hreflang: string; href: string }[] {
  const list = LOCALES.map((locale) => ({
    hreflang: locale === 'bs' ? 'bs-BA' : 'en',
    href: abs(path(key, locale, slug)),
  }));
  list.push({ hreflang: 'x-default', href: abs(path(key, DEFAULT_LOCALE, slug)) });
  return list;
}

/** The other locale — used by the header language switch. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'bs' ? 'en' : 'bs';
}

/** Main navigation, in display order. */
export function navItems(locale: Locale): { label: string; href: string; key: RouteKey }[] {
  const d = t(locale);
  return [
    { key: 'home', label: d.nav.home, href: path('home', locale) },
    { key: 'cars', label: d.nav.cars, href: path('cars', locale) },
    { key: 'reserve', label: d.nav.reserve, href: path('reserve', locale) },
    { key: 'faq', label: d.nav.faq, href: path('faq', locale) },
  ];
}
