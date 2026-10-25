// Names a signed-in device by its browser and system, for My Account's "Signed-in devices".
// Pure, with no dependency: a short list of tokens, enough for owners to recognise their phones and
// laptops. Not a full user-agent parser; anything else reads "Unknown browser".

/**
 * First match wins, so a browser that also names the one it is built on comes before it: Samsung
 * Internet and Edge send "Chrome/", and every browser on iOS and Chrome send "Safari/". Safari itself
 * is the only one that sends "Version/… Safari/" with none of the others. Other Chromium browsers
 * (Opera, Brave, Vivaldi) read as Chrome.
 */
const BROWSERS: [name: string, pattern: RegExp][] = [
  ["Samsung Internet", /SamsungBrowser\//],
  ["Edge", /\b(Edg|EdgA|EdgiOS|Edge)\//],
  ["Firefox", /\b(Firefox|FxiOS)\//],
  ["Chrome", /\b(Chrome|CriOS)\//],
  ["Safari", /Version\/[\d.]+.*Safari\//],
];

/**
 * First match wins: iPhone and iPad user agents say "like Mac OS X", Android's say "Linux". An iPad
 * that asks for desktop sites (iPadOS's default) says "Macintosh", so it reads as macOS; accepted.
 */
const SYSTEMS: [name: string, pattern: RegExp][] = [
  ["iPhone", /\biPhone\b/],
  ["iPad", /\biPad\b/],
  ["Android", /\bAndroid\b/],
  ["ChromeOS", /\bCrOS\b/],
  ["Windows", /\bWindows\b/],
  ["macOS", /\bMacintosh\b/],
  ["Linux", /\bLinux\b/],
];

const nameOf = (list: [name: string, pattern: RegExp][], userAgent: string) =>
  list.find(([, pattern]) => pattern.test(userAgent))?.[0];

/**
 * "Safari on iPhone", "Chrome on Windows": the browser and system a user agent names. Either part may
 * be missing: "Unknown browser on iPhone", "Firefox", or "Unknown browser" when neither is known.
 */
export function deviceLabel(userAgent: string | null): string {
  const browser = userAgent ? nameOf(BROWSERS, userAgent) : undefined;
  const system = userAgent ? nameOf(SYSTEMS, userAgent) : undefined;
  if (system) return `${browser ?? "Unknown browser"} on ${system}`;
  return browser ?? "Unknown browser";
}
