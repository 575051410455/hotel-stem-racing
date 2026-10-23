// What each kind of Account may do (ADR 0003). Pure, so the server, the browser and the Staff
// command all read the same rules. Fails closed: anything that isn't exactly a known kind gets
// nothing.

/** Every Account is one of these (GLOSSARY: Staff Account, Kiosk Account). Stored as `users.kind`. */
export const ACCOUNT_KINDS = ["staff", "kiosk"] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export function isAccountKind(value: unknown): value is AccountKind {
  return (ACCOUNT_KINDS as readonly unknown[]).includes(value);
}

/** The Back Office: Registration list and detail, the check-in desk, email, and every `/api/back-office/*` route. */
export function canUseBackOffice(kind: AccountKind): boolean {
  return kind === "staff";
}

/** Recording Check-Ins: the Kiosk page and the check-in Server Action. */
export function canCheckIn(kind: AccountKind): boolean {
  return kind === "staff" || kind === "kiosk";
}

/**
 * Recording a Check-In for an Event Day other than today's, e.g. to rehearse before the Event.
 * A Kiosk always records today's Event Day, by the server's clock.
 */
export function canChooseCheckInDay(kind: AccountKind): boolean {
  return canUseBackOffice(kind);
}

/** The Kiosk page: the whole of what a Kiosk Account can open. Staff Accounts may open it too. */
export const KIOSK_PATH = "/kiosk";

const BACK_OFFICE_HOME_PATH = "/admin";

/**
 * Where an Account belongs: where it lands after signing in, and where a Back Office page sends a
 * Kiosk Account it refuses, so a signed-in Kiosk never shows the sign-in page.
 */
export function homePath(kind: AccountKind): string {
  return canUseBackOffice(kind) ? BACK_OFFICE_HOME_PATH : KIOSK_PATH;
}
