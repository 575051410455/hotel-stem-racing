// Event Pass codec (pure): Pass Codes and Event Pass links. Safe to import from browser code.

/** 32 characters with no look-alikes: no O, 0, I or 1. A power of two, so picks are unbiased. */
export const PASS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const PASS_CODE_PREFIX = "EP-";
const PASS_CODE_LENGTH = 8;

/** A fresh random Pass Code such as "EP-7KQ2MZ9H". */
export function generatePassCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PASS_CODE_LENGTH));
  let code = PASS_CODE_PREFIX;
  for (const byte of bytes) code += PASS_CODE_ALPHABET[byte % PASS_CODE_ALPHABET.length];
  return code;
}

const COMPACT_PASS_CODE = new RegExp(`^EP([${PASS_CODE_ALPHABET}]{${PASS_CODE_LENGTH}})$`);

/**
 * The stored form of a typed or scanned Pass Code ("ep 7kq2-mz9h" → "EP-7KQ2MZ9H"):
 * upper-cased with spaces and hyphens removed. Null when the text is not a Pass Code.
 */
export function normalisePassCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]+/g, "");
  const match = COMPACT_PASS_CODE.exec(compact);
  return match ? `${PASS_CODE_PREFIX}${match[1]}` : null;
}

/**
 * The Event Pass link a QR encodes: `{APP_URL}/p/{token}`, trailing slashes trimmed.
 * Build it at render or send time and never store it, so changing the domain breaks nothing.
 * `appUrl` defaults to the server's APP_URL; pass it explicitly anywhere else.
 */
export function passLink(token: string, appUrl: string | undefined = process.env.APP_URL): string {
  const base = appUrl?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("APP_URL is not set, so Event Pass links cannot be built");
  return `${base}/p/${token}`;
}

/** What scanned or typed text identifies: an Event Pass by token or by Pass Code, or nothing. */
export type ScanResolution =
  | { kind: "token"; token: string }
  | { kind: "pass-code"; passCode: string }
  | { kind: "not-a-pass" };

const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The token in an Event Pass link: any http(s) URL, scheme optional, whose last two path segments
 * are `p/{token}`. The host is ignored, so links made under an old domain keep working.
 */
function tokenFromLink(text: string): string | null {
  if (!text.includes("/") || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const [marker, token] = url.pathname.replace(/\/$/, "").split("/").slice(-2);
  // Case-insensitive: QR encoders may upper-case a whole link to fit alphanumeric mode.
  return marker?.toLowerCase() === "p" && token && TOKEN_PATTERN.test(token) ? token.toLowerCase() : null;
}

/** Resolves what a scanner read or Staff typed at the entrance. */
export function resolveScan(text: string): ScanResolution {
  const trimmed = text.trim();
  if (TOKEN_PATTERN.test(trimmed)) return { kind: "token", token: trimmed.toLowerCase() };

  const linked = tokenFromLink(trimmed);
  if (linked) return { kind: "token", token: linked };

  // Without its prefix a Pass Code is exactly 8 characters, and with it exactly 10, so adding a
  // missing "EP" can never turn one Pass Code into another.
  const passCode = normalisePassCode(trimmed) ?? normalisePassCode(`EP${trimmed}`);
  if (passCode) return { kind: "pass-code", passCode };

  return { kind: "not-a-pass" };
}
