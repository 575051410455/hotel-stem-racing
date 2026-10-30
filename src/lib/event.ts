// The Event this app registers Attendees for. Safe to import from server and browser code.

import type { Language } from "./language";

/** Text in each public language. English uses Gregorian years and English day names. */
type InEachLanguage = Readonly<Record<Language, string>>;

export type EventDay = {
  /** ISO date in the Event's time zone, e.g. "2026-10-31". */
  date: string;
  label: InEachLanguage;
};

export const event = {
  name: "STEM Racing Thailand 2026",
  venue: { th: "โรงแรมแกรนด์ ริชมอนด์ จังหวัดนนทบุรี", en: "Grand Richmond Hotel, Nonthaburi" },
  dateRangeLabel: { th: "30 ตุลาคม – 1 พฤศจิกายน 2569", en: "30 October – 1 November 2026" },
  timeZone: "Asia/Bangkok",
  eventDays: [
    { date: "2026-10-30", label: { th: "วันที่ 30 ตุลาคม 2569", en: "Friday 30 October 2026" } },
    { date: "2026-10-31", label: { th: "วันที่ 31 ตุลาคม 2569", en: "Saturday 31 October 2026" } },
    { date: "2026-11-01", label: { th: "วันที่ 1 พฤศจิกายน 2569", en: "Sunday 1 November 2026" } },
  ] satisfies EventDay[],
} as const;

/** The Event Day on `date`, or undefined when `date` isn't one. */
export function findEventDay(date: string | null | undefined): EventDay | undefined {
  return event.eventDays.find((day) => day.date === date);
}

/** An Event Day's label ("วันที่ 31 ตุลาคม 2569", "Saturday 31 October 2026"), or the date itself if it isn't one. */
export function eventDayLabel(date: string, language: Language): string {
  return findEventDay(date)?.label[language] ?? date;
}

/** "30 ตุลาคม – 1 พฤศจิกายน 2569" / "30 October – 1 November 2026". */
export function eventDateRangeLabel(language: Language): string {
  return event.dateRangeLabel[language];
}

/** The venue's name in `language`. */
export function eventVenue(language: Language): string {
  return event.venue[language];
}
