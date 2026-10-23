import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { randomPassword } from "./random-password";

describe("Random password", () => {
  test("is 24 lower-case letters and digits with no look-alikes (o, 0, i, 1)", () => {
    for (let i = 0; i < 2000; i++) {
      assert.match(randomPassword(), /^[abcdefghjklmnpqrstuvwxyz23456789]{24}$/);
    }
  });

  test("is different every time", () => {
    const passwords = new Set(Array.from({ length: 1000 }, () => randomPassword()));

    assert.equal(passwords.size, 1000);
  });
});
