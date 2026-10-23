import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { canCheckIn, canChooseCheckInDay, canUseBackOffice, homePath } from "./access";

describe("What each kind of Account may do", () => {
  test("a Kiosk Account is refused the Back Office but may record Check-Ins", () => {
    assert.equal(canUseBackOffice("kiosk"), false);
    assert.equal(canCheckIn("kiosk"), true);
  });

  test("a Staff Account may use the Back Office and record Check-Ins", () => {
    assert.equal(canUseBackOffice("staff"), true);
    assert.equal(canCheckIn("staff"), true);
  });

  test("only a Staff Account may record a Check-In for an Event Day other than today", () => {
    assert.equal(canChooseCheckInDay("staff"), true);
    assert.equal(canChooseCheckInDay("kiosk"), false);
  });

  test("a Kiosk Account lands on the Kiosk page, a Staff Account on the Back Office", () => {
    assert.equal(homePath("kiosk"), "/kiosk");
    assert.equal(homePath("staff"), "/admin");
  });
});
