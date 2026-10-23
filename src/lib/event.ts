// The Event this app registers Attendees for. Safe to import from server and browser code.

export type EventDay = {
  /** ISO date in the Event's time zone, e.g. "2026-10-31". */
  date: string;
  label: string;
};

export const event = {
  name: "STEM Racing Thailand 2026",
  venue: "โรงแรมแกรนด์ ริชมอนด์ จังหวัดนนทบุรี",
  dateRangeLabel: "31 ตุลาคม – 1 พฤศจิกายน 2569",
  timeZone: "Asia/Bangkok",
  eventDays: [
    { date: "2026-10-31", label: "วันที่ 31 ตุลาคม 2569" },
    { date: "2026-11-01", label: "วันที่ 1 พฤศจิกายน 2569" },
  ] satisfies EventDay[],
} as const;

/** The Event Day on `date`, or undefined when `date` isn't one. */
export function findEventDay(date: string | null | undefined): EventDay | undefined {
  return event.eventDays.find((day) => day.date === date);
}

/** The Thai label of an Event Day ("วันที่ 31 ตุลาคม 2569"), or the date itself if it isn't one. */
export function eventDayLabel(date: string): string {
  return findEventDay(date)?.label ?? date;
}
