import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import { generatePassCode, passLink, resolveScan } from "@/lib/registrations/event-pass-codec";
import { looksLikeEventPass } from "./pass-recogniser";

const token = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

/** Texts the server resolves to an Event Pass, in every shape the scan resolution accepts. */
function realPasses(): string[] {
  const passes = [
    token,
    token.toUpperCase(),
    `  ${token}\n`,
    `https://register.stemracingthailand.com/p/${token}`,
    `https://old-domain.example.org/p/${token}`,
    `http://localhost:3000/p/${token}`,
    `https://example.org/registration/2026/p/${token}`,
    `https://example.org/p/${token}/`,
    `https://example.org/p/${token}?utm_source=line#pass`,
    `HTTPS://EXAMPLE.ORG/P/${token.toUpperCase()}`,
    `example.org/p/${token}`,
    // WHATWG URLs read a backslash in an http(s) link as a slash.
    `https://example.org\\p\\${token}`,
    "EP-7KQ2MZ9H",
    "ep-7kq2mz9h",
    "EP7KQ2MZ9H",
    "e p - 7 k q 2 - m z 9 h",
    "7KQ2MZ9H",
    "7kq2-mz9h",
    "EP-EPAB2345",
  ];
  for (let i = 0; i < 200; i++) {
    const randomToken = randomUUID();
    const code = generatePassCode();
    passes.push(
      randomToken,
      passLink(randomToken, "https://register.example.org"),
      passLink(randomToken, "https://register.example.org").toUpperCase(),
      code,
      code.toLowerCase().replace("-", " "),
      code.slice(3),
    );
  }
  return passes;
}

describe("Recognising an Event Pass in the browser", () => {
  test("accepts everything the server's scan resolution accepts, so no real pass is turned away early", () => {
    for (const pass of realPasses()) {
      assert.notEqual(resolveScan(pass).kind, "not-a-pass", `the corpus should be real passes: ${JSON.stringify(pass)}`);
      assert.equal(looksLikeEventPass(pass), true, JSON.stringify(pass));
    }
  });

  test("is looser than the server: pass-shaped text the server rejects still goes to the server", () => {
    for (const nearMiss of [
      // A pass link with a damaged or truncated token, or an extra segment.
      "https://example.org/p/3f2b8c1e-9a4d",
      "HTTPS://EXAMPLE.ORG/P/3F2B8C1E9A4D",
      `https://example.org/p/${token}/edit`,
      `https://example.org/?token=${token}`,
      // A Pass Code with look-alike characters or another separator.
      "EP-7KQ2MZ90",
      "EP-7KQ2MZ9O",
      "EP_7KQ2MZ9H",
      "EP.7KQ2MZ9H",
    ]) {
      assert.equal(resolveScan(nearMiss).kind, "not-a-pass", `the server should reject ${JSON.stringify(nearMiss)}`);
      assert.equal(looksLikeEventPass(nearMiss), true, JSON.stringify(nearMiss));
    }
  });

  test("turns away the stray QR codes found at a venue", () => {
    for (const stray of [
      "",
      "hello",
      "สวัสดีครับ",
      "https://www.facebook.com/stemracingthailand",
      "https://www.instagram.com/p/C9xYzAbCdEf/",
      "https://line.me/R/ti/p/@stemracingth",
      "https://line.me/R/ti/p/%40stemracingth",
      "https://example.org/menu?table=12",
      "https://register.stemracingthailand.com/",
      "WIFI:S:GrandRichmond;T:WPA;P:secret;;",
      "mailto:info@example.org",
      "tel:+6621234567",
      "BEGIN:VCARD\nVERSION:3.0\nFN:Grand Richmond\nTEL:+6621234567\nEND:VCARD",
      "00020101021129370016A000000677010111011300668123456785802TH530376463041234",
    ]) {
      assert.equal(looksLikeEventPass(stray), false, JSON.stringify(stray));
    }
  });
});
