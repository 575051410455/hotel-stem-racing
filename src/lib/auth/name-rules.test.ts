import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { nameProblem } from "./name-rules";

describe("Account name rules", () => {
  test("accepts names in English letters, digits, spaces, -, ' and .", () => {
    for (const name of ["Napat Wongsa", "Kiosk 1", "Mary-Jane", "O'Neil", "J. Smith", "Admin", "a"]) {
      assert.equal(nameProblem(name), null, name);
    }
  });

  test("refuses a name in Thai, or with Thai in it", () => {
    for (const name of ["สมชาย ใจดี", "เจ้าหน้าที่", "Napat วงศา", "Kiosk ๑"]) {
      assert.equal(nameProblem(name), "not-english", name);
    }
  });

  test("refuses other letters and symbols", () => {
    for (const name of ["José", "Zoë", "Somchai_Jaidee", "Somchai, Jaidee", "Somchai\tJaidee", "Napat (Admin)"]) {
      assert.equal(nameProblem(name), "not-english", name);
    }
  });

  test("refuses a name with no letter at all", () => {
    for (const name of ["123", "1-2", "...", "' -"]) {
      assert.equal(nameProblem(name), "not-english", name);
    }
  });

  test("refuses an empty name, or one of only spaces", () => {
    assert.equal(nameProblem(""), "empty");
    assert.equal(nameProblem("   "), "empty");
  });

  test("refuses a name over 100 characters", () => {
    assert.equal(nameProblem("a".repeat(100)), null);
    assert.equal(nameProblem("a".repeat(101)), "too-long");
    // Over 100 is reported as too long, even when it isn't in English either.
    assert.equal(nameProblem("ก".repeat(101)), "too-long");
  });

  test("checks the name trimmed, as it is stored", () => {
    assert.equal(nameProblem("  Napat Wongsa  "), null);
    assert.equal(nameProblem(`  ${"a".repeat(100)}  `), null);
    assert.equal(nameProblem("\n Kiosk 1 \t"), null);
  });
});
