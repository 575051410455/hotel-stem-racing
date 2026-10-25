import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { accountInitials } from "./account-initials";

describe("Account initials", () => {
  test("uses the first and last words of an English Account name", () => {
    assert.equal(accountInitials("Napat Wongsa", "napat@example.org"), "NW");
    assert.equal(accountInitials("Kiosk 1", "kiosk@example.org"), "K1");
    assert.equal(accountInitials("  Mary   Jane  Smith  ", "mary@example.org"), "MS");
  });

  test("uses one initial for a one-word Account name", () => {
    assert.equal(accountInitials("Admin", "admin@example.org"), "A");
  });

  test("uses the email's first letter for an old name outside the English rule", () => {
    assert.equal(accountInitials("สมชาย ใจดี", "somchai@example.org"), "S");
    assert.equal(accountInitials("Napat วงศา", "napat@example.org"), "N");
    assert.equal(accountInitials("สมชาย ใจดี", "7somchai@example.org"), "S");
  });
});
