import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { openEventDays } from "./event-day-availability";

// Instants are written in Bangkok wall-clock time (UTC+07:00). Expected Event Days are written
// out by hand from the rule "an Event Day stays open until the end of its date in Bangkok".
const bangkok = (wallClock: string) => new Date(`${wallClock}+07:00`);
const dates = (now: Date) => openEventDays(now).map((day) => day.date);

describe("Event Day availability", () => {
  test("before the Event, both Event Days are open", () => {
    assert.deepEqual(dates(bangkok("2026-10-22T12:00:00")), ["2026-10-31", "2026-11-01"]);
  });

  test("on the morning of 31 October, both Event Days are open", () => {
    assert.deepEqual(dates(bangkok("2026-10-31T08:00:00")), ["2026-10-31", "2026-11-01"]);
  });

  test("31 October stays open until its last minute", () => {
    assert.deepEqual(dates(bangkok("2026-10-31T23:59:00")), ["2026-10-31", "2026-11-01"]);
    assert.deepEqual(dates(bangkok("2026-10-31T23:59:59.999")), ["2026-10-31", "2026-11-01"]);
  });

  // 2026-11-01T00:00+07:00 is still 31 October in UTC (17:00), so this also catches a check
  // done in the server's or UTC's calendar instead of Bangkok's.
  test("at midnight in Bangkok 31 October has ended and only 1 November is open", () => {
    assert.deepEqual(dates(bangkok("2026-11-01T00:00:00")), ["2026-11-01"]);
  });

  test("1 November stays open until its last minute", () => {
    assert.deepEqual(dates(bangkok("2026-11-01T23:59:00")), ["2026-11-01"]);
  });

  test("once 1 November has ended, no Event Day is open", () => {
    assert.deepEqual(dates(bangkok("2026-11-02T00:00:00")), []);
  });
});
