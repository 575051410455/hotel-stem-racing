// What the Accounts pages' forms (New Account, an Account's page) say about a name, an email, a
// kind and a password someone else sets, and the checks the browser makes before sending them.
// The Accounts module enforces the same rules, except the confirmation, which only guards against
// a typo. Pure; safe in browser and server.

import type { AccountKind } from "@/lib/auth/access";
import { isValidAccountEmail } from "@/lib/auth/email-rules";
import { ENGLISH_NAME_MESSAGE, MAX_NAME_LENGTH, nameProblem } from "@/lib/auth/name-rules";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";

/** The kinds on offer, in this order, each with what it opens (ADR 0003, ADR 0004). */
export const KIND_CHOICES = [
  { kind: "staff", explanation: "Check-In desk only" },
  { kind: "admin", explanation: "The whole Back Office, including Accounts" },
  { kind: "kiosk", explanation: "Kiosk only, for an unattended iPad" },
] as const satisfies readonly { kind: AccountKind; explanation: string }[];

/** Under Name, before anything is typed. */
export const NAME_HINT = "In English";
export const NAME_EMPTY = "Please enter a name";
export const NAME_TOO_LONG = `The name can be at most ${MAX_NAME_LENGTH} characters`;
/** Also shown as a toast (`updateNameToast`). */
export const NAME_NOT_ENGLISH = ENGLISH_NAME_MESSAGE;
export const EMAIL_INVALID = "Please enter a valid email";
export const EMAIL_TAKEN = "This email already belongs to an Account";
/** Only a bug or a forged request lands here: the radio group always sends one of the three. */
export const KIND_INVALID = "Choose a kind of Account";
export const PASSWORD_TOO_SHORT = `The password needs at least ${MIN_PASSWORD_LENGTH} characters`;
export const PASSWORD_TOO_LONG = `The password can be at most ${MAX_PASSWORD_LENGTH} characters`;

// Each check below gives a message per field that has a problem, and leaves out the fields that
// have none, so a form can spread them into its problems and count them.

/** A typed name (already trimmed). */
export function nameProblems(name: string): { name?: string } {
  switch (nameProblem(name)) {
    case "empty":
      return { name: NAME_EMPTY };
    case "too-long":
      return { name: NAME_TOO_LONG };
    case "not-english":
      return { name: NAME_NOT_ENGLISH };
    case null:
      return {};
  }
}

/** A typed email (already trimmed). */
export function emailProblems(email: string): { email?: string } {
  if (!email) return { email: "Please enter an email" };
  if (!isValidAccountEmail(email)) return { email: EMAIL_INVALID };
  return {};
}

/** A password typed twice for someone else. */
export function passwordProblems(password: string, confirmation: string): { password?: string; confirmation?: string } {
  const problems: { password?: string; confirmation?: string } = {};
  if (password.length < MIN_PASSWORD_LENGTH) problems.password = PASSWORD_TOO_SHORT;
  else if (password.length > MAX_PASSWORD_LENGTH) problems.password = PASSWORD_TOO_LONG;
  if (!confirmation) problems.confirmation = "Please enter the password again";
  else if (confirmation !== password) problems.confirmation = "The passwords don't match";
  return problems;
}
