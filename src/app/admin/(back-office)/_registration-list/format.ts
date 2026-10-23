// How the Back Office Registration list shows stored values. Pure; safe in browser and server.

import { event } from "@/lib/event";
import { formatPhoneAsYouType } from "@/lib/registrations/fields";

/** "22 ต.ค. 2569 14:05": always Bangkok time, whatever the browser's zone. */
const createdAtFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: event.timeZone,
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatCreatedAt(iso: string): string {
  return createdAtFormat.format(new Date(iso));
}

/** "31 ต.ค." for an ISO Event Day; the date has no time, so read it as a UTC calendar day. */
const eventDayFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

export function formatEventDay(isoDate: string): string {
  return eventDayFormat.format(new Date(isoDate));
}

/** "+66812345678" → "081-234-5678", as Attendees typed it. */
export function formatPhone(e164: string): string {
  return e164.startsWith("+66") ? formatPhoneAsYouType(`0${e164.slice(3)}`) : e164;
}
