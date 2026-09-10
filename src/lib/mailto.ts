import { site } from '~/config/site';
import { t, type Locale } from '~/i18n';
import { reservationMessage, type ReservationFields } from './whatsapp';

/**
 * Builds a mailto: link with the whole enquiry pre-written.
 *
 * Deliberately a plain link rather than a server-side send: clicking it hands
 * off to whatever mail app the visitor already uses, so nothing depends on an
 * e-mail API being configured, in credit, or trusted by the recipient's spam
 * filter. The body is the same text the WhatsApp button sends.
 */
export function mailtoLink(locale: Locale, fields: Partial<ReservationFields>): string {
  const d = t(locale);
  const subject = fields.car ? `${d.reserve.mailSubject}: ${fields.car}` : d.reserve.mailSubject;
  const body = reservationMessage(locale, fields);

  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
