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
