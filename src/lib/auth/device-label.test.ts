import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { deviceLabel } from "./device-label";

// Real user-agent strings, as each browser sent them in 2025–2026.
const USER_AGENTS: [label: string, userAgent: string][] = [
  [
    "Safari on iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  ],
  [
    "Safari on iPad",
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  ],
  [
    "Safari on macOS",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
  ],
  [
    "Chrome on Android",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  ],
  [
    "Chrome on Windows",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  ],
  [
    "Chrome on macOS",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  ],
  [
    "Chrome on iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1",
  ],
  [
    "Chrome on ChromeOS",
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  ],
  [
    "Edge on Windows",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  ],
  [
    "Edge on Android",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 EdgA/141.0.0.0",
  ],
  [
    "Edge on iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/141.0.3537.71 Mobile/15E148 Safari/605.1.15",
  ],
  ["Firefox on Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0"],
  ["Firefox on Linux", "Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0"],
  ["Firefox on Android", "Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0"],
  [
    "Firefox on iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/144.0 Mobile/15E148 Safari/605.1.15",
  ],
  [
    "Samsung Internet on Android",
    "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  ],
];

describe("Device label", () => {
  for (const [label, userAgent] of USER_AGENTS) {
    test(`reads "${label}"`, () => {
      assert.equal(deviceLabel(userAgent), label);
    });
  }

  test('reads "Unknown browser" for an empty or missing user agent', () => {
    assert.equal(deviceLabel(""), "Unknown browser");
    assert.equal(deviceLabel(null), "Unknown browser");
  });

  test('reads "Unknown browser" for a user agent it doesn\'t know', () => {
    assert.equal(deviceLabel("curl/8.7.1"), "Unknown browser");
  });

  test("names the system when only the browser is unknown (LINE's in-app browser)", () => {
    const line =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0";

    assert.equal(deviceLabel(line), "Unknown browser on iPhone");
  });

  test("names only the browser when the system is unknown", () => {
    const freeBsd = "Mozilla/5.0 (X11; FreeBSD amd64; rv:144.0) Gecko/20100101 Firefox/144.0";

    assert.equal(deviceLabel(freeBsd), "Firefox");
  });
});
