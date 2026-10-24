import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { accountChangeLine } from "./account-changes";

describe("accountChangeLine", () => {
  test("a created Account names its kind", () => {
    assert.equal(accountChangeLine({ action: "created", details: { kind: "kiosk" } }), "Created as Kiosk");
    assert.equal(accountChangeLine({ action: "created", details: { kind: "admin" } }), "Created as Admin");
    assert.equal(accountChangeLine({ action: "created", details: { kind: "staff" } }), "Created as Staff");
  });

  test("a changed name shows the old one and the new one", () => {
    assert.equal(
      accountChangeLine({ action: "name-changed", details: { from: "Somchai J", to: "Somchai Jaidee" } }),
      "Name changed: Somchai J → Somchai Jaidee",
    );
  });

  test("a changed email shows the old one and the new one", () => {
    assert.equal(
      accountChangeLine({ action: "email-changed", details: { from: "old@example.org", to: "new@example.org" } }),
      "Email changed: old@example.org → new@example.org",
    );
  });

  test("a changed kind names both kinds", () => {
    assert.equal(
      accountChangeLine({ action: "kind-changed", details: { from: "staff", to: "admin" } }),
      "Kind changed: Staff → Admin",
    );
    assert.equal(
      accountChangeLine({ action: "kind-changed", details: { from: "admin", to: "kiosk" } }),
      "Kind changed: Admin → Kiosk",
    );
  });

  test("a password set by someone else, and one changed by its owner, read differently", () => {
    assert.equal(accountChangeLine({ action: "password-set" }), "Password set");
    assert.equal(accountChangeLine({ action: "password-changed" }), "Password changed by owner");
  });

  test("disabling and enabling read as such", () => {
    assert.equal(accountChangeLine({ action: "disabled" }), "Disabled");
    assert.equal(accountChangeLine({ action: "enabled" }), "Enabled");
  });
});
