import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { bangkokDate, bangkokInstant, bangkokTime } from "./bangkok-time";

// Instants are written in UTC, and the expected Bangkok values are worked out by hand (UTC+07:00,
// no daylight saving), so a helper that used the machine's or UTC's zone would disagree.

describe("Bangkok time", () => {
  test("the calendar date turns over at midnight in Bangkok, not in UTC", () => {
    assert.equal(bangkokDate(new Date("2026-10-30T16:59:59.999Z")), "2026-10-30");
    assert.equal(bangkokDate(new Date("2026-10-30T17:00:00Z")), "2026-10-31");
  });

  test("the clock time is 24-hour Bangkok time, with seconds when asked", () => {
    assert.equal(bangkokTime(new Date("2026-10-31T02:05:09Z")), "09:05");
    assert.equal(bangkokTime(new Date("2026-10-31T02:05:09Z"), { seconds: true }), "09:05:09");
    assert.equal(bangkokTime(new Date("2026-10-31T13:30:00Z")), "20:30");
  });

  test("midnight in Bangkok reads 00:00, not 24:00", () => {
    assert.equal(bangkokTime(new Date("2026-10-30T17:00:00Z"), { seconds: true }), "00:00:00");
  });

  test("a Bangkok date and wall-clock time give the right instant", () => {
    assert.equal(bangkokInstant("2026-10-31", "09:00").toISOString(), "2026-10-31T02:00:00.000Z");
  });

  test("a Bangkok date alone gives the instant of its midnight", () => {
    assert.equal(bangkokInstant("2026-10-31").toISOString(), "2026-10-30T17:00:00.000Z");
  });
});
