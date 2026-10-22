import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseSiteverifyResponse } from "./turnstile";

describe("Turnstile siteverify responses", () => {
  test("a successful verification passes", () => {
    const body = {
      success: true,
      challenge_ts: "2026-10-22T05:00:00.000Z",
      hostname: "register.example.com",
      "error-codes": [],
      action: "",
      cdata: "",
    };

    assert.deepEqual(parseSiteverifyResponse(body), { success: true, errorCodes: [] });
  });

  test("a rejected token fails and keeps Cloudflare's error codes", () => {
    const body = { success: false, "error-codes": ["timeout-or-duplicate"] };

    assert.deepEqual(parseSiteverifyResponse(body), {
      success: false,
      errorCodes: ["timeout-or-duplicate"],
    });
  });

  test("anything but an explicit success: true fails", () => {
    for (const body of [{ success: "true" }, { "error-codes": [] }, {}, null, "OK", [true]]) {
      assert.equal(parseSiteverifyResponse(body).success, false, JSON.stringify(body));
    }
  });

  test("malformed error codes are dropped", () => {
    const body = { success: false, "error-codes": ["invalid-input-secret", 42, null] };

    assert.deepEqual(parseSiteverifyResponse(body).errorCodes, ["invalid-input-secret"]);
    assert.deepEqual(parseSiteverifyResponse({ success: false, "error-codes": "bad" }).errorCodes, []);
  });
});
