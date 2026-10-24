import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  type AccountKind,
  canChangeOwnPassword,
  canCheckIn,
  canChooseCheckInDay,
  canEditOwnName,
  canManageAccounts,
  canUseBackOffice,
  canUseCheckInDesk,
  homePath,
  isAccountKind,
  mustChooseOwnPassword,
} from "./access";

describe("What each kind of Account may do", () => {
  test("only an Admin Account may use the Back Office's Registrations, email and export", () => {
    assert.equal(canUseBackOffice("admin"), true);
    assert.equal(canUseBackOffice("staff"), false);
    assert.equal(canUseBackOffice("kiosk"), false);
  });

  test("every kind of Account may record Check-Ins", () => {
    assert.equal(canCheckIn("admin"), true);
    assert.equal(canCheckIn("staff"), true);
    assert.equal(canCheckIn("kiosk"), true);
  });

  test("Staff and Admin Accounts may record a Check-In for an Event Day other than today; a Kiosk may not", () => {
    assert.equal(canChooseCheckInDay("admin"), true);
    assert.equal(canChooseCheckInDay("staff"), true);
    assert.equal(canChooseCheckInDay("kiosk"), false);
  });

  test("Staff and Admin Accounts may change their own password and name; a Kiosk Account may not", () => {
    for (const can of [canChangeOwnPassword, canEditOwnName]) {
      assert.equal(can("admin"), true);
      assert.equal(can("staff"), true);
      assert.equal(can("kiosk"), false);
    }
  });

  test("only an Admin Account may manage Accounts", () => {
    assert.equal(canManageAccounts("admin"), true);
    assert.equal(canManageAccounts("staff"), false);
    assert.equal(canManageAccounts("kiosk"), false);
  });

  test("anything that isn't exactly a known kind gets nothing", () => {
    for (const value of ["Admin", "superuser", "", undefined, null]) assert.equal(isAccountKind(value), false);
    const unknown = "superuser" as AccountKind;
    for (const can of [
      canUseBackOffice,
      canUseCheckInDesk,
      canCheckIn,
      canChooseCheckInDay,
      canChangeOwnPassword,
      canEditOwnName,
      canManageAccounts,
    ]) {
      assert.equal(can(unknown), false);
    }
    assert.equal(homePath(unknown), "/kiosk");
  });

  test("Staff and Admin Accounts may use the check-in desk; a Kiosk Account may not", () => {
    assert.equal(canUseCheckInDesk("admin"), true);
    assert.equal(canUseCheckInDesk("staff"), true);
    assert.equal(canUseCheckInDesk("kiosk"), false);
  });

  test("each kind of Account lands where it works: Admin on the Back Office, Staff on the desk, Kiosk on the Kiosk", () => {
    assert.equal(homePath("admin"), "/admin");
    assert.equal(homePath("staff"), "/admin/check-in");
    assert.equal(homePath("kiosk"), "/kiosk");
  });

  test("a Staff or Admin Account whose password someone else set must choose its own first; a Kiosk Account never", () => {
    assert.equal(mustChooseOwnPassword("admin", true), true);
    assert.equal(mustChooseOwnPassword("staff", true), true);
    assert.equal(mustChooseOwnPassword("kiosk", true), false);
    for (const kind of ["admin", "staff", "kiosk"] as const) assert.equal(mustChooseOwnPassword(kind, false), false);
    assert.equal(mustChooseOwnPassword("superuser" as AccountKind, true), false);
  });
});
