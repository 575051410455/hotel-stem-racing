// What each kind of Account may do (ADR 0003, ADR 0004). Pure, so the server, the browser and the Staff
// command all read the same rules. Fails closed: anything that isn't exactly a known kind gets
// nothing.

/** Every Account is one of these (GLOSSARY: Admin Account, Staff Account, Kiosk Account). Stored as `users.kind`. */
export const ACCOUNT_KINDS = ["admin", "staff", "kiosk"] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export function isAccountKind(value: unknown): value is AccountKind {
  return (ACCOUNT_KINDS as readonly unknown[]).includes(value);
}

/**
 * The Back Office beyond the check-in desk: the overview, the Registration list and detail, email,
 * and every `/api/back-office/*` route (export and resend included).
 */
export function canUseBackOffice(kind: AccountKind): boolean {
  return kind === "admin";
}

/** The check-in desk (`/admin/check-in`, with Kiosk mode) and the Back Office frame around it. */
export function canUseCheckInDesk(kind: AccountKind): boolean {
  return kind === "admin" || kind === "staff";
}

/** Recording Check-Ins: the Kiosk page and the check-in Server Action. */
export function canCheckIn(kind: AccountKind): boolean {
  return kind === "admin" || kind === "staff" || kind === "kiosk";
}

/**
 * Recording a Check-In for an Event Day other than today's, e.g. to rehearse before the Event.
 * A Kiosk always records today's Event Day, by the server's clock.
 */
export function canChooseCheckInDay(kind: AccountKind): boolean {
  return kind === "admin" || kind === "staff";
}

/**
 * Changing the Account's own password, at /admin/password or through Better Auth's endpoint. A Kiosk
 * Account's password is changed only with the server command (`npm run staff -- reset-password`).
 */
export function canChangeOwnPassword(kind: AccountKind): boolean {
  return kind === "admin" || kind === "staff";
}

/** Changing the Account's own display name. A Kiosk Account's name is set when it is created. */
export function canEditOwnName(kind: AccountKind): boolean {
  return kind === "admin" || kind === "staff";
}

/** Creating, editing, disabling and enabling Accounts, and reading the Account History. */
export function canManageAccounts(kind: AccountKind): boolean {
  return kind === "admin";
}

/** The sign-in page for every Account. */
export const SIGN_IN_PATH = "/admin/login";

/** The Kiosk page: the whole of what a Kiosk Account can open. Staff and Admin Accounts may open it too. */
export const KIOSK_PATH = "/kiosk";

const BACK_OFFICE_HOME_PATH = "/admin";

const CHECK_IN_DESK_PATH = "/admin/check-in";

/**
 * Where an Account belongs: where it lands after signing in, and where a Back Office page sends an
 * Account it refuses (a Staff Account to the desk, a Kiosk Account to the Kiosk), so a signed-in
 * Account never shows the sign-in page.
 */
export function homePath(kind: AccountKind): string {
  if (canUseBackOffice(kind)) return BACK_OFFICE_HOME_PATH;
  if (canUseCheckInDesk(kind)) return CHECK_IN_DESK_PATH;
  return KIOSK_PATH;
}
