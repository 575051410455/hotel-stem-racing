// How the Back Office Registration list shows stored values, in English. Pure; safe in browser and
// server.

import { bangkokEnglishDateTime } from "@/lib/bangkok-time";
import { formatPhoneAsYouType } from "@/lib/registrations/fields";

type DateParts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

/**
 * A date's parts with English names, which the caller puts in British order ("Sat 31 Oct"). The
 * names are en-US's, which keep "Sep" where en-GB now writes "Sept"; its order and commas go unused.
 */
function englishDateParts(options: Intl.DateTimeFormatOptions): (instant: Date) => DateParts {
  const format = new Intl.DateTimeFormat("en-US", options);
  return (instant) => {
    const parts = format.formatToParts(instant);
    return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  };
}

/** "22 Oct 2026, 14:05": always Bangkok time, whatever the browser's zone, on a 24-hour clock. */
export function formatCreatedAt(iso: string): string {
  return bangkokEnglishDateTime(new Date(iso));
}

/** An ISO Event Day has no time, so it is read as a UTC calendar day. */
const eventDayParts = englishDateParts({ timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

/** "Sat 31 Oct" for an ISO Event Day. */
export function formatEventDay(isoDate: string): string {
  const { weekday, day, month } = eventDayParts(new Date(isoDate));
  return `${weekday} ${day} ${month}`;
}

/** "+66812345678" → "081-234-5678", as Attendees typed it. */
export function formatPhone(e164: string): string {
  return e164.startsWith("+66") ? formatPhoneAsYouType(`0${e164.slice(3)}`) : e164;
}
