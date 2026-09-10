import { site } from '~/config/site';
import type { Locale } from '~/i18n';

const LOCALE_TAGS: Record<Locale, string> = { bs: 'bs-BA', en: 'en-GB' };

/** "60 KM" — whole marks, no decimals unless the sheet actually has them. */
export function formatPrice(value: number, locale: Locale): string {
  const formatted = new Intl.NumberFormat(LOCALE_TAGS[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
  return `${formatted} ${site.currency.symbol}`;
}

/** Bare number for structured data, which must not contain a currency symbol. */
export const priceValue = (value: number): string => value.toFixed(2);

export function formatDate(iso: string, locale: Locale): string {
  if (!iso) return '';
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Bosnian plural for a photo count, used by the /admin screens.
 * 1 slika · 2-4 slike · 5+ slika, with the 11-14 exception.
 */
export function formatPhotoCount(count: number): string {
  if (count === 0) return 'Nema slika';
  const lastTwo = count % 100;
  const last = count % 10;
  const few = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  const one = last === 1 && lastTwo !== 11;
  return `${count} ${one ? 'slika' : few ? 'slike' : 'slika'}`;
}

/** Truncates on a word boundary — meta descriptions get cut off mid-word otherwise. */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}
