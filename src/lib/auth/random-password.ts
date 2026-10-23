// Random passwords (pure), for the first Staff Account that `npm run seed` creates.

/**
 * 32 characters with no look-alikes (no o, 0, i or 1), lower-case so it is quick to type on a phone.
 * A power of two, so picks are unbiased.
 */
const ALPHABET = "abcdefghjklmnpqrstuvwxyz23456789";

/** 24 characters of 5 bits each: 120 bits, well inside the 12–128 character limits. */
const LENGTH = 24;

/** A fresh random password such as "k7mq2xh9wd4rtp8sznb3ejc6". */
export function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let password = "";
  for (const byte of bytes) password += ALPHABET[byte % ALPHABET.length];
  return password;
}
