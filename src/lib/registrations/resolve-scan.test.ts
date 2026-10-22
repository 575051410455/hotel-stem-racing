import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveScan } from "./event-pass-codec";

describe("Resolving a scan", () => {
  test("a bare token resolves to that token", () => {
    assert.deepEqual(resolveScan("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b"), {
      kind: "token",
      token: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
    });
  });

  test("a token in upper case or with surrounding whitespace resolves to the stored lower-case token", () => {
    for (const scanned of ["3F2B8C1E-9A4D-4E6F-8B7A-1C2D3E4F5A6B", "  3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b\n"]) {
      assert.deepEqual(
        resolveScan(scanned),
        { kind: "token", token: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" },
        JSON.stringify(scanned),
      );
    }
  });

  test("a Pass Code resolves in any case, with or without spaces and hyphens", () => {
    for (const typed of [
      "EP-7KQ2MZ9H",
      "ep-7kq2mz9h",
      "EP7KQ2MZ9H",
      "ep 7kq2 mz9h",
      " Ep-7KQ2-MZ9H ",
      "e p - 7 k q 2 - m z 9 h",
    ]) {
      assert.deepEqual(resolveScan(typed), { kind: "pass-code", passCode: "EP-7KQ2MZ9H" }, typed);
    }
  });

  test("a Pass Code typed without its EP prefix resolves, since 8 characters can only be the code", () => {
    for (const typed of ["7KQ2MZ9H", "7kq2-mz9h", " 7KQ2 MZ9H "]) {
      assert.deepEqual(resolveScan(typed), { kind: "pass-code", passCode: "EP-7KQ2MZ9H" }, typed);
    }
    // A code whose own characters start with EP keeps them: the length tells the two apart.
    assert.deepEqual(resolveScan("EPAB2345"), { kind: "pass-code", passCode: "EP-EPAB2345" });
    assert.deepEqual(resolveScan("EP-EPAB2345"), { kind: "pass-code", passCode: "EP-EPAB2345" });
  });

  test("an Event Pass link resolves to its token, whatever the host, so old-domain QR codes keep working", () => {
    for (const link of [
      "https://register.stemracingthailand.com/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "https://old-domain.example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "http://localhost:3000/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "https://example.org/registration/2026/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "https://example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b/",
      "https://example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b?utm_source=line#pass",
      // QR encoders may upper-case a whole link to fit alphanumeric mode.
      "HTTPS://EXAMPLE.ORG/P/3F2B8C1E-9A4D-4E6F-8B7A-1C2D3E4F5A6B",
      "  https://example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b\n",
      // Pasted without the scheme.
      "example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
    ]) {
      assert.deepEqual(
        resolveScan(link),
        { kind: "token", token: "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b" },
        JSON.stringify(link),
      );
    }
  });

  test("text that is not an Event Pass resolves to not-a-pass", () => {
    for (const scanned of [
      "",
      "   ",
      "hello",
      "สวัสดีครับ",
      "WIFI:S:GrandRichmond;T:WPA;P:secret;;",
      "https://www.facebook.com/stemracingthailand",
      "https://example.org/menu?table=12",
      "mailto:info@example.org",
      "javascript:alert(1)",
    ]) {
      assert.deepEqual(resolveScan(scanned), { kind: "not-a-pass" }, JSON.stringify(scanned));
    }
  });

  test("near-miss tokens, links and Pass Codes resolve to not-a-pass", () => {
    for (const scanned of [
      // Tokens: a character short, one too many, not hex, without hyphens.
      "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6",
      "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b7",
      "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6g",
      "3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b",
      // Links: another path, extra segments, no token, a Pass Code in place of the token, other schemes.
      "https://example.org/x/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "https://example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b/edit",
      "https://example.org/p/",
      "https://example.org/p/EP-7KQ2MZ9H",
      "https://example.org/?token=3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "ftp://example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b",
      "https://example.org/p/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b extra words",
      // Pass Codes: too short or long, look-alike characters (O, 0, I, 1), another prefix or separator.
      "EP-7KQ2MZ9",
      "EP-7KQ2MZ9HX",
      "7KQ2MZ9",
      "7KQ2MZ9HX",
      "EP-7KQ2MZ90",
      "EP-7KQ2MZ9O",
      "EP-7KQ2MZ9I",
      "EP-7KQ2MZ91",
      "XX-7KQ2MZ9H",
      "EP_7KQ2MZ9H",
      "EP.7KQ2MZ9H",
    ]) {
      assert.deepEqual(resolveScan(scanned), { kind: "not-a-pass" }, JSON.stringify(scanned));
    }
  });
});
