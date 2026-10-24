// How the daily Registrations chart and its text alternative show Bangkok days and counts, in
// English. Pure; safe in browser and server.

import { bangkokInstant } from "@/lib/bangkok-time";
import { event } from "@/lib/event";

type DayParts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

/**
 * A Bangkok day's parts with English names, which `write` puts in British order. The names are
 * en-US's, which keep "Sep" where en-GB now writes "Sept"; its order and commas go unused.
 */
function dayFormat(options: Intl.DateTimeFormatOptions, write: (parts: DayParts) => string) {
  const format = new Intl.DateTimeFormat("en-US", { timeZone: event.timeZone, ...options });
  return (isoDate: string) => {
    const parts = format.formatToParts(bangkokInstant(isoDate));
    return write(Object.fromEntries(parts.map(({ type, value }) => [type, value])));
  };
}

/** "23 Oct", for the chart's axis. */
export const formatAxisDay = dayFormat(
  { day: "numeric", month: "short" },
  ({ day, month }) => `${day} ${month}`,
);

/** "Fri 23 Oct 2026", for the tooltip. */
export const formatTooltipDay = dayFormat(
  { weekday: "short", day: "numeric", month: "short", year: "numeric" },
  ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
);

/** "Friday 23 October 2026", for the screen-reader table: nothing abbreviated. */
export const formatSpokenDay = dayFormat(
  { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  ({ weekday, day, month, year }) => `${weekday} ${day} ${month} ${year}`,
);

/** "1,234": with thousands separators. */
export const formatCount = new Intl.NumberFormat("en-GB").format;

/** "1 person", "1,234 people". */
export function formatPeople(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "person" : "people"}`;
}
