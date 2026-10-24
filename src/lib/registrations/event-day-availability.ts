// Which Event Days an Attendee can still choose. Pure: the caller passes the current time.
// Safe to import from server and browser code.

import { bangkokDate } from "@/lib/bangkok-time";
import { type EventDay, event } from "@/lib/event";
import type { Language } from "@/lib/language";
import type { FieldErrors } from "./fields";

/** "{days} has passed", per language (copy-public.md, "Event Day passed" and "Joining two days"). */
const endedMessages: Record<Language, { join: string; ended: (days: string) => string }> = {
  th: { join: " และ ", ended: (days) => `${days} ผ่านไปแล้ว กรุณาเลือกวันเข้าร่วมงานอื่น` },
  en: { join: " and ", ended: (days) => `${days} has already passed. Please choose another day.` },
};

/**
 * Event Days that have not ended at `now`. An Event Day stays open until the end of its date in
 * Bangkok (23:59:59.999), so same-day walk-ins can still register.
 */
export function openEventDays(now: Date): EventDay[] {
  const today = bangkokDate(now);
  // ISO dates compare correctly as strings.
  return event.eventDays.filter((day) => day.date >= today);
}

/** Registration closes when the last Event Day ends. */
export function isRegistrationClosed(now: Date): boolean {
  return openEventDays(now).length === 0;
}

/**
 * An error in `language` on `eventDays` when any chosen Event Day has ended at `now`, otherwise
 * `{}`. Unknown dates are left to Field validation.
 */
export function endedEventDayErrors(chosen: readonly string[], now: Date, language: Language): FieldErrors {
  const open = openEventDays(now);
  const ended = event.eventDays.filter(
    (day) => chosen.includes(day.date) && !open.some((openDay) => openDay.date === day.date),
  );
  if (ended.length === 0) return {};
  const text = endedMessages[language];
  return { eventDays: text.ended(ended.map((day) => day.label[language]).join(text.join)) };
}

/** The Event Day that `now` falls on in Bangkok, or undefined when today isn't an Event Day. */
export function eventDayOn(now: Date): EventDay | undefined {
  const today = bangkokDate(now);
  return event.eventDays.find((day) => day.date === today);
}
