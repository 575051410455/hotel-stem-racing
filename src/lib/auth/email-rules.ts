// The Account email rule, shared by the Accounts module and the New Account form in the browser.
// Pure: no server code, so the browser form can import it.

// Deliberately loose: whoever creates the Account types the address, and Better Auth lower-cases
// and stores it as given.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Something that looks like an email address once trimmed: a local part, an @, and a domain with a dot. */
export function isValidAccountEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
