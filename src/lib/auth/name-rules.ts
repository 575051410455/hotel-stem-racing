// The Account name rules, shared by the Accounts module and the forms in the browser (My Account,
// New Account, an Account's page). Pure: no server code, so the browser forms can import it.

/** Counted like the browser's `maxLength`, in UTF-16 code units. */
export const MAX_NAME_LENGTH = 100;

/**
 * What a name that isn't in English gets, in the forms (under Name, and as a toast) and from the
 * commands.
 */
export const ENGLISH_NAME_MESSAGE = "Use English letters for the name, for example Somchai Jaidee.";

/** Only English letters, digits, spaces, `-`, `'` and `.`, and at least one letter. */
const ENGLISH_NAME = /^[A-Za-z0-9 '.-]*[A-Za-z][A-Za-z0-9 '.-]*$/;

/**
 * What's wrong with a name for an Account, once trimmed as it is stored: empty, over 100
 * characters, or not in English (only English letters, digits, spaces, `-`, `'` and `.`, with at
 * least one letter), so it matches the English Back Office and makes readable initials. Null when
 * it can be saved.
 */
export function nameProblem(name: string): "empty" | "too-long" | "not-english" | null {
  const trimmed = name.trim();
  if (!trimmed) return "empty";
  if (trimmed.length > MAX_NAME_LENGTH) return "too-long";
  if (!ENGLISH_NAME.test(trimmed)) return "not-english";
  return null;
}
