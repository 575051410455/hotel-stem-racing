// Formats an Attendee's chosen Event Days, in Thai and English, always in the Event's time zone
// (never the server's).

import { event } from "../event";

/** Daily opening hours as "HH:mm" in Bangkok time. */
export type OpeningHours = { opens: string; closes: string };

export type FormattedEventDates = { th: string; en: string };

// Asia/Bangkok has had no daylight saving since 1920, so a fixed offset turns a Bangkok
// wall-clock time into the right instant.
const BANGKOK_OFFSET = "+07:00";
const DAY_MS = 24 * 60 * 60 * 1000;

const LOCALES = { th: "th-TH", en: "en-GB" } as const;

// Built per call, so nothing captures whatever zone the process had at import time.
function dateFormat(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    timeZone: event.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeFormat(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(LOCALES.en, {
    timeZone: event.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function bangkokInstant(isoDate: string, time = "00:00"): Date {
  return new Date(`${isoDate}T${time}:00${BANGKOK_OFFSET}`);
}

/** ICU puts thin spaces around range dashes in some locales; plain spaces read the same everywhere. */
function plainSpaces(value: string): string {
  return value.replace(/[  ]/g, " ");
}

/** Groups ISO dates into runs of consecutive days, so 31 Oct + 1 Nov reads as one range. */
function consecutiveRuns(isoDates: string[]): [string, string][] {
  const sorted = [...new Set(isoDates)].sort();
  const runs: [string, string][] = [];
  for (const date of sorted) {
    const last = runs.at(-1);
    if (last && Date.parse(date) - Date.parse(last[1]) === DAY_MS) last[1] = date;
    else runs.push([date, date]);
  }
  return runs;
}

function formatDates(format: Intl.DateTimeFormat, runs: [string, string][]): string {
  return runs
    .map(([first, last]) =>
      first === last
        ? format.format(bangkokInstant(first))
        : format.formatRange(bangkokInstant(first), bangkokInstant(last)),
    )
    .map(plainSpaces)
    .join(", ");
}

export function formatEventDates(
  isoDates: string[],
  openingHours?: OpeningHours,
): FormattedEventDates {
  const runs = consecutiveRuns(isoDates);
  const th = formatDates(dateFormat(LOCALES.th), runs);
  const en = formatDates(dateFormat(LOCALES.en), runs);
  if (!openingHours || runs.length === 0) return { th, en };

  const day = runs[0][0];
  const hours = plainSpaces(
    timeFormat().formatRange(
      bangkokInstant(day, openingHours.opens),
      bangkokInstant(day, openingHours.closes),
    ),
  );
  return { th: `${th} เวลา ${hours} น.`, en: `${en}, ${hours}` };
}
