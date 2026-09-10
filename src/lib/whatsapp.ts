import { site } from '~/config/site';
import { t, type Locale } from '~/i18n';

/** wa.me works on mobile apps, desktop app and web — the safest deep link. */
export function whatsappLink(message: string): string {
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function genericWhatsappLink(locale: Locale): string {
  return whatsappLink(t(locale).whatsapp.generic);
}

export function carWhatsappLink(locale: Locale, carName: string): string {
  return whatsappLink(t(locale).whatsapp.car(carName));
}

export type ReservationFields = {
  car: string;
  pickupDate: string;
  returnDate: string;
  pickupPlace: string;
  name: string;
  phone: string;
  email: string;
  note: string;
};

/** The pre-filled reservation message — the client's whole intake flow. */
export function reservationMessage(locale: Locale, fields: Partial<ReservationFields>): string {
  const d = t(locale).whatsapp;
  const lines = [d.reservation];

  const add = (label: string, value?: string) => {
    if (value && value.trim()) lines.push(`${label}: ${value.trim()}`);
  };

  add(d.fields.car, fields.car);
  add(d.fields.pickup, fields.pickupDate);
  add(d.fields.ret, fields.returnDate);
  add(d.fields.place, fields.pickupPlace);
  add(d.fields.name, fields.name);
  add(d.fields.phone, fields.phone);
  add(d.fields.email, fields.email);
  add(d.fields.note, fields.note);

  return lines.join('\n');
}

export const viberLink = site.viber ? `viber://chat?number=%2B${site.viber}` : '';
