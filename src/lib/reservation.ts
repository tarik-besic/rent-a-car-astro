import type { AstroGlobal } from 'astro';
import { type Locale } from '~/i18n';
import { getCar } from './cars';
import { formatDate } from './format';
import { mailtoLink } from './mailto';
import { reservationMessage, whatsappLink, type ReservationFields } from './whatsapp';

export type ReservationValues = ReservationFields;

export type ReservationState = {
  values: ReservationValues;
  /** Pre-filled mailto: link for the no-JavaScript case. */
  mailto: string;
};

const EMPTY: ReservationValues = {
  car: '',
  pickupDate: '',
  returnDate: '',
  pickupPlace: '',
  name: '',
  phone: '',
  email: '',
  note: '',
};

const str = (data: FormData, key: string): string => {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim().slice(0, 500) : '';
};

/**
 * Handles the reservation page for both locales.
 *
 * The only submission path is WhatsApp: the POST is answered with a 303
 * straight to the wa.me deep link, so the primary conversion path works even
 * with JavaScript disabled. The e-mail button is a mailto: link handled
 * entirely by the visitor's own mail app — nothing is sent from the server.
 */
export async function handleReservation(
  astro: AstroGlobal,
  locale: Locale,
): Promise<Response | ReservationState> {
  if (astro.request.method === 'POST') {
    const data = await astro.request.formData();

    const message = reservationMessage(locale, {
      car: str(data, 'car'),
      pickupDate: formatDate(str(data, 'pickupDate'), locale),
      returnDate: formatDate(str(data, 'returnDate'), locale),
      pickupPlace: str(data, 'pickupPlace'),
      name: str(data, 'name'),
      phone: str(data, 'phone'),
      email: str(data, 'email'),
      note: str(data, 'note'),
    });

    return astro.redirect(whatsappLink(message), 303);
  }

  // A car can be preselected from its detail page: /rezervacija?car=<slug>
  const preselected = astro.url.searchParams.get('car') ?? '';
  // getCar() is the public lookup, so a hidden car cannot be preselected.
  const db = astro.locals.runtime.env.DB;
  const car = preselected ? ((await getCar(db, preselected))?.name ?? '') : '';

  const values: ReservationValues = { ...EMPTY, car };
  return { values, mailto: mailtoLink(locale, values) };
}
