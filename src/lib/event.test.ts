import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { eventDateRangeLabel, eventDayLabel, eventVenue } from "./event";

// Expected labels are copied from the copy deck (.scratch/thai-english/copy-public.md, "The Event").

describe("The Event's labels", () => {
  test("each Event Day has an English label with its weekday and the Gregorian year", () => {
    assert.equal(eventDayLabel("2026-10-30", "en"), "Friday 30 October 2026");
    assert.equal(eventDayLabel("2026-10-31", "en"), "Saturday 31 October 2026");
    assert.equal(eventDayLabel("2026-11-01", "en"), "Sunday 1 November 2026");
  });

  test("each Event Day keeps its Thai label", () => {
    assert.equal(eventDayLabel("2026-10-30", "th"), "วันที่ 30 ตุลาคม 2569");
    assert.equal(eventDayLabel("2026-10-31", "th"), "วันที่ 31 ตุลาคม 2569");
    assert.equal(eventDayLabel("2026-11-01", "th"), "วันที่ 1 พฤศจิกายน 2569");
  });

  test("a date that isn't an Event Day is shown as itself", () => {
    assert.equal(eventDayLabel("2026-11-02", "en"), "2026-11-02");
  });

  test("the date range and venue read in each language", () => {
    assert.equal(eventDateRangeLabel("en"), "30 October – 1 November 2026");
    assert.equal(eventDateRangeLabel("th"), "30 ตุลาคม – 1 พฤศจิกายน 2569");
    assert.equal(eventVenue("en"), "Grand Richmond Hotel, Nonthaburi");
    assert.equal(eventVenue("th"), "โรงแรมแกรนด์ ริชมอนด์ จังหวัดนนทบุรี");
  });
});
