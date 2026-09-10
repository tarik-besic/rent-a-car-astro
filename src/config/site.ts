import { envVar } from '~/lib/env';

/**
 * SINGLE SOURCE OF TRUTH for every business detail on the site.
 *
 * Every value is overridable with a PUBLIC_* environment variable, so the
 * client's phone number and address change without a code edit. The second
 * argument to env() is the fallback.
 *
 * These are read at BUILD time (Vite inlines them), because this object is
 * built at module scope and Cloudflare bindings do not exist there. Changing
 * one therefore needs a redeploy — which is fine for a phone number, and is
 * exactly why anything that changes often (cars, prices, availability) lives
 * in D1 instead of here.
 */

const env = envVar;

/** Strips everything that is not a digit — wa.me refuses "+", spaces and dashes. */
const digits = (value: string): string => value.replace(/\D/g, '');

/**
 * Bosnian locative case of a place name — "u Sarajevu", not "u Sarajevou".
 * The heuristic covers the common single-word city names; anything irregular
 * (e.g. "Banja Luka" -> "Banjoj Luci") should be set via PUBLIC_CITY_LOCATIVE.
 */
const locative = (name: string): string => {
  if (/o$/i.test(name)) return `${name.slice(0, -1)}u`;
  if (/a$/i.test(name)) return `${name.slice(0, -1)}i`;
  if (/[eiu]$/i.test(name)) return name;
  return `${name}u`;
};

export const SITE_URL = envVar('PUBLIC_SITE_URL', 'http://localhost:4321').replace(/\/+$/, '');

export const site = {
  /** Business / brand name, shown in the header, <title> and structured data. */
  name: env('PUBLIC_BUSINESS_NAME', 'Auto Rentanje'),
  /** Registered legal name, used only in structured data. Optional. */
  legalName: env('PUBLIC_LEGAL_NAME', 'Auto Rentanje d.o.o.'),
  url: SITE_URL,

  /**
   * THE most important value on the site: the WhatsApp number.
   * Full international format, digits only, no leading "+" or "00".
   * Example for Bosnia: 38761524541
   */
  whatsapp: digits(env('PUBLIC_WHATSAPP', '38761524541')),
  /** Human-readable phone number for display. */
  phoneDisplay: env('PUBLIC_PHONE_DISPLAY', '+387 61 524 541'),
  /** tel: link target. */
  phone: env('PUBLIC_PHONE', '+38761524541'),
  /** Inbox that reservation e-mails are delivered to. */
  email: env('PUBLIC_EMAIL', 'info@auto-rentanje.ba'),
  /** Viber / Telegram are optional — leave empty to hide the buttons. */
  viber: digits(env('PUBLIC_VIBER', '')),

  /**
   * Physical address of the office. Note this is separate from `city` below:
   * the office is in Ilidža, while the service area advertised in copy and
   * page titles is Sarajevo.
   */
  address: {
    street: env('PUBLIC_ADDRESS_STREET', 'Spomenik'),
    city: env('PUBLIC_ADDRESS_CITY', 'Ilidža'),
    postalCode: env('PUBLIC_ADDRESS_POSTAL', '71101'),
    region: env('PUBLIC_ADDRESS_REGION', 'Kanton Sarajevo'),
    countryCode: env('PUBLIC_ADDRESS_COUNTRY', 'BA'),
  },

  /** Used for LocalBusiness structured data and the map link. */
  geo: {
    lat: env('PUBLIC_GEO_LAT', '43.839081'),
    lng: env('PUBLIC_GEO_LNG', '18.295747'),
  },

  /**
   * "Open in Google Maps" target. Defaults to the pin the client shared, so
   * the link opens exactly their marker rather than a fuzzy address search.
   * Clear it and a coordinate link is derived from `geo` instead.
   */
  mapsUrl: env('PUBLIC_MAPS_URL', 'https://maps.app.goo.gl/Y2TmoKfqeJ4UsmZp7'),

  /** Primary service city — woven into titles, H1s and meta descriptions. */
  city: env('PUBLIC_CITY', 'Sarajevo'),

  /** Locative form used in Bosnian copy: "najam vozila u Sarajevu". */
  cityLocative: env('PUBLIC_CITY_LOCATIVE', locative(env('PUBLIC_CITY', 'Sarajevo'))),

  /** Extra locations served, comma separated. Used in copy and FAQ answers. */
  serviceAreas: env('PUBLIC_SERVICE_AREAS', 'Sarajevo, Sarajevo Airport, Ilidža, Vogošća')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  /** Opening hours, in schema.org openingHours shorthand. */
  openingHours: env('PUBLIC_OPENING_HOURS', 'Mo-Sa 08:00-20:00|Su 09:00-17:00')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean),

  /** Social profiles — empty values are skipped everywhere. */
  social: {
    instagram: env('PUBLIC_INSTAGRAM', ''),
    facebook: env('PUBLIC_FACEBOOK', ''),
  },

  currency: {
    code: env('PUBLIC_CURRENCY_CODE', 'BAM'),
    /** Suffix rendered after the amount, e.g. "60 KM". */
    symbol: env('PUBLIC_CURRENCY_SYMBOL', 'KM'),
  },

  /**
   * Full-bleed hero background. An absolute URL or a path in /public.
   * Falls back to the first featured car's photo when empty.
   */
  heroImage: env('PUBLIC_HERO_IMAGE', ''),

  /** Shown as a trust signal in the hero. Set to 0 to hide. */
  yearsInBusiness: Number(env('PUBLIC_YEARS_IN_BUSINESS', '10')) || 0,
} as const;

export const googleMapsUrl =
  site.mapsUrl ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${site.geo.lat},${site.geo.lng}`,
  )}`;

export type Site = typeof site;
