// Dates and times in the Event's time zone (Bangkok), whatever the server's or device's zone.
// Pure; safe in server and browser code.

import { event } from "./event";

// Asia/Bangkok has had no daylight saving since 1920, so a fixed offset turns a Bangkok
// wall-clock time into the right instant.
const BANGKOK_OFFSET = "+07:00";

const bangkokParts = new Intl.DateTimeFormat("en-US", {
  timeZone: event.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsOf(instant: Date) {
  return Object.fromEntries(bangkokParts.formatToParts(instant).map(({ type, value }) => [type, value]));
}

/** The Bangkok calendar date of `instant`, e.g. "2026-10-31". */
export function bangkokDate(instant: Date): string {
  const part = partsOf(instant);
  return `${part.year}-${part.month}-${part.day}`;
}

/** The 24-hour Bangkok clock time of `instant`: "09:05", or "09:05:09" with `seconds`. */
export function bangkokTime(instant: Date, { seconds = false }: { seconds?: boolean } = {}): string {
  const part = partsOf(instant);
  return seconds ? `${part.hour}:${part.minute}:${part.second}` : `${part.hour}:${part.minute}`;
}

/**
 * English month names for `bangkokEnglishDateTime`, put in British order by hand. en-US's, which
 * keep "Sep" where en-GB now writes "Sept"; its order and commas go unused.
 */
const bangkokEnglishDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: event.timeZone,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "22 Oct 2026, 14:05": the Back Office's English timestamp (list, detail and CSV), in Bangkok time. */
export function bangkokEnglishDateTime(instant: Date): string {
  const part = Object.fromEntries(bangkokEnglishDateParts.formatToParts(instant).map(({ type, value }) => [type, value]));
  return `${part.day} ${part.month} ${part.year}, ${bangkokTime(instant)}`;
}

/** The instant of a Bangkok date ("2026-10-31") at a Bangkok wall-clock time ("09:00", default midnight). */
export function bangkokInstant(isoDate: string, time = "00:00"): Date {
  return new Date(`${isoDate}T${time}:00${BANGKOK_OFFSET}`);
}
