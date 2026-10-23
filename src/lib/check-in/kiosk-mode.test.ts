import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isKioskMode, kioskUrl } from "./kiosk-mode";

describe("Kiosk mode in the URL", () => {
  test("?kiosk=1 turns Kiosk mode on", () => {
    assert.equal(isKioskMode(new URLSearchParams("kiosk=1")), true);
    assert.equal(isKioskMode(new URLSearchParams("?kiosk=1")), true);
    assert.equal(isKioskMode(new URLSearchParams("day=2026-10-31&kiosk=1")), true);
  });

  test("anything else is the Staff desk", () => {
    for (const search of ["", "kiosk", "kiosk=", "kiosk=0", "kiosk=true", "kiosk=yes", "kiosk=01", "KIOSK=1", "kiosk= 1"]) {
      assert.equal(isKioskMode(new URLSearchParams(search)), false, JSON.stringify(search));
    }
  });

  test("turning Kiosk mode on adds kiosk=1 and keeps the rest of the address", () => {
    assert.equal(kioskUrl({ pathname: "/admin/check-in", search: "" }, true), "/admin/check-in?kiosk=1");
    assert.equal(
      kioskUrl({ pathname: "/admin/check-in", search: "?a=b", hash: "#top" }, true),
      "/admin/check-in?a=b&kiosk=1#top",
    );
    assert.equal(kioskUrl({ pathname: "/admin/check-in", search: "?kiosk=0" }, true), "/admin/check-in?kiosk=1");
  });

  test("turning Kiosk mode off removes the parameter, leaving no stray ?", () => {
    assert.equal(kioskUrl({ pathname: "/admin/check-in", search: "?kiosk=1" }, false), "/admin/check-in");
    assert.equal(kioskUrl({ pathname: "/admin/check-in", search: "?a=b&kiosk=1" }, false), "/admin/check-in?a=b");
    assert.equal(kioskUrl({ pathname: "/admin/check-in", search: "" }, false), "/admin/check-in");
  });

  test("the address it builds reads back as the mode asked for", () => {
    for (const on of [true, false]) {
      const url = new URL(kioskUrl({ pathname: "/admin/check-in", search: "?x=1&kiosk=1" }, on), "https://example.test");
      assert.equal(isKioskMode(url.searchParams), on);
    }
  });
});
