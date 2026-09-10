import { site, SITE_URL, googleMapsUrl } from '~/config/site';
import { abs, path, t, type Locale } from '~/i18n';
import { priceValue } from './format';
import type { Car } from './cars';

const ORG_ID = `${SITE_URL}/#business`;
const SITE_ID = `${SITE_URL}/#website`;

const DAY_MAP: Record<string, string> = {
  Mo: 'Monday',
  Tu: 'Tuesday',
  We: 'Wednesday',
  Th: 'Thursday',
  Fr: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

/** "Mo-Sa 08:00-20:00" -> an OpeningHoursSpecification node. */
function openingHours(spec: string) {
  const match = spec.match(/^([A-Za-z-,]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!match) return null;

  const [, daysPart, opens, closes] = match;
  const days: string[] = [];

  for (const chunk of daysPart.split(',')) {
    const [from, to] = chunk.split('-');
    const keys = Object.keys(DAY_MAP);
    const start = keys.indexOf(from);
    if (start === -1) continue;
    if (!to) {
      days.push(DAY_MAP[from]);
      continue;
    }
    const end = keys.indexOf(to);
    for (let i = start; i !== -1 && end !== -1 && i <= end; i++) days.push(DAY_MAP[keys[i]]);
  }

  if (!days.length) return null;
  return {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: days,
    opens,
    closes,
  };
}

/**
 * The AutoRental node. This is what Google reads for the knowledge panel and
 * local pack, so telephone, address and geo need to match the client's Google
 * Business Profile exactly.
 */
export function businessSchema(locale: Locale) {
  const d = t(locale);
  const sameAs = [site.social.instagram, site.social.facebook].filter(Boolean);

  return {
    '@type': ['AutoRental', 'LocalBusiness'],
    '@id': ORG_ID,
    name: site.name,
    legalName: site.legalName,
    url: abs(path('home', locale)),
    description: d.home.description,
    telephone: site.phone,
    email: site.email,
    image: `${SITE_URL}/og-default.png`,
    priceRange: `${site.currency.symbol}${site.currency.symbol}`,
    currenciesAccepted: site.currency.code,
    paymentAccepted: 'Cash, Credit Card',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      postalCode: site.address.postalCode,
      addressRegion: site.address.region,
      addressCountry: site.address.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    hasMap: googleMapsUrl,
    areaServed: site.serviceAreas.map((area) => ({ '@type': 'Place', name: area })),
    openingHoursSpecification: site.openingHours.map(openingHours).filter(Boolean),
    ...(sameAs.length ? { sameAs } : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'reservations',
      telephone: site.phone,
      email: site.email,
      availableLanguage: ['bs', 'hr', 'sr', 'en'],
    },
  };
}

export function websiteSchema(locale: Locale) {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE_URL,
    name: site.name,
    inLanguage: t(locale).meta.htmlLang,
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/**
 * A rental car is offered as a service, not sold, so it is modelled as a
 * Product whose Offer carries a per-day UnitPriceSpecification. Google shows
 * the price and availability from this in rich results.
 */
export function carSchema(car: Car, locale: Locale, imageUrls: string[]) {
  const d = t(locale);
  const url = abs(path('car', locale, car.slug));

  const specs = [
    car.transmission && { name: d.common.specs.transmission, value: d.common.values[car.transmission] },
    car.fuel && { name: d.common.specs.fuel, value: d.common.values[car.fuel] },
    car.seats && { name: d.common.specs.seats, value: String(car.seats) },
    car.doors && { name: d.common.specs.doors, value: String(car.doors) },
    car.category && { name: d.common.specs.category, value: car.category },
  ].filter(Boolean) as { name: string; value: string }[];

  return {
    '@type': ['Product', 'Car'],
    '@id': `${url}#product`,
    name: car.name,
    url,
    description: car.description[locale] || d.car.descriptionTemplate(car.name, String(car.pricePerDay ?? '')),
    brand: { '@type': 'Brand', name: car.make },
    model: car.model,
    ...(car.year ? { vehicleModelDate: String(car.year), productionDate: String(car.year) } : {}),
    ...(car.seats ? { seatingCapacity: car.seats } : {}),
    ...(car.doors ? { numberOfDoors: car.doors } : {}),
    ...(car.fuel ? { fuelType: d.common.values[car.fuel] } : {}),
    ...(car.transmission
      ? { vehicleTransmission: d.common.values[car.transmission] }
      : {}),
    ...(imageUrls.length ? { image: imageUrls } : {}),
    category: car.category || undefined,
    additionalProperty: specs.map((spec) => ({
      '@type': 'PropertyValue',
      name: spec.name,
      value: spec.value,
    })),
    ...(car.pricePerDay
      ? {
          offers: {
            '@type': 'Offer',
            '@id': `${url}#offer`,
            url,
            priceCurrency: site.currency.code,
            price: priceValue(car.pricePerDay),
            availability: car.available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            businessFunction: 'https://purl.org/goodrelations/v1#LeaseOut',
            seller: { '@id': ORG_ID },
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: priceValue(car.pricePerDay),
              priceCurrency: site.currency.code,
              unitCode: 'DAY',
              referenceQuantity: {
                '@type': 'QuantitativeValue',
                value: 1,
                unitCode: 'DAY',
              },
            },
          },
        }
      : {}),
  };
}

/** Wraps nodes in the @graph envelope so every page emits exactly one script. */
export function graph(nodes: unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
