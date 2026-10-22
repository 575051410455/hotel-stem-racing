// Which Event Days an Attendee can still choose. Pure: the caller passes the current time.
// Safe to import from server and browser code.

import { type EventDay, event } from "@/lib/event";
import type { FieldErrors } from "./fields";

/** The calendar date ("2026-10-31") of `instant` in the Event's time zone, whatever the server's. */
function eventDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: event.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: "year" | "month" | "day") => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * Event Days that have not ended at `now`. An Event Day stays open until the end of its date in
 * Bangkok (23:59:59.999), so same-day walk-ins can still register.
 */
export function openEventDays(now: Date): EventDay[] {
  const today = eventDate(now);
  // ISO dates compare correctly as strings.
  return event.eventDays.filter((day) => day.date >= today);
}

/** Registration closes when the last Event Day ends. */
export function isRegistrationClosed(now: Date): boolean {
  return openEventDays(now).length === 0;
}

/**
 * A Thai error on `eventDays` when any chosen Event Day has ended at `now`, otherwise `{}`.
 * Unknown dates are left to Field validation.
 */
export function endedEventDayErrors(chosen: readonly string[], now: Date): FieldErrors {
  const open = openEventDays(now);
  const ended = event.eventDays.filter(
    (day) => chosen.includes(day.date) && !open.some((openDay) => openDay.date === day.date),
  );
  if (ended.length === 0) return {};
  const labels = ended.map((day) => day.label).join(" และ ");
  return { eventDays: `${labels} ผ่านไปแล้ว กรุณาเลือกวันเข้าร่วมงานอื่น` };
}

/** The Event Day that `now` falls on in Bangkok, or undefined when today isn't an Event Day. */
export function eventDayOn(now: Date): EventDay | undefined {
  const today = eventDate(now);
  return event.eventDays.find((day) => day.date === today);
}
