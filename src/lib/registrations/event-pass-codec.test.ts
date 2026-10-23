import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { generatePassCode, normalisePassCode, passLink } from "./event-pass-codec";

describe("Event Pass codec", () => {
  test("Pass Codes are EP- plus 8 characters with no look-alikes (O, 0, I, 1)", () => {
    for (let i = 0; i < 2000; i++) {
      assert.match(generatePassCode(), /^EP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  test("normalises a typed Pass Code in any case, with or without spaces and hyphens", () => {
    for (const typed of ["EP-7KQ2MZ9H", "ep-7kq2mz9h", "EP7KQ2MZ9H", " ep 7kq2 mz9h ", "Ep-7KQ2-MZ9H"]) {
      assert.equal(normalisePassCode(typed), "EP-7KQ2MZ9H", typed);
    }
  });

  test("does not treat other text as a Pass Code", () => {
    for (const typed of ["", "hello", "EP-7KQ2MZ9", "EP-7KQ2MZ9HX", "EP-7KQ2MZ90", "XX-7KQ2MZ9H", "7KQ2MZ9H"]) {
      assert.equal(normalisePassCode(typed), null, typed);
    }
  });

  const token = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

  test("builds the Event Pass link from the configured domain", () => {
    assert.equal(
      passLink(token, "https://register.example.org"),
      `https://register.example.org/p/${token}`,
    );
  });

  test("trims trailing slashes from the configured domain", () => {
    assert.equal(passLink(token, "https://register.example.org/"), `https://register.example.org/p/${token}`);
    assert.equal(passLink(token, "http://localhost:3000//"), `http://localhost:3000/p/${token}`);
  });

  test("refuses to build a link without a configured domain", () => {
    assert.throws(() => passLink(token, undefined), /APP_URL/);
    assert.throws(() => passLink(token, "  "), /APP_URL/);
  });
});
