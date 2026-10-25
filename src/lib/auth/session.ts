import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  type AccountKind,
  canCheckIn,
  canUseBackOffice,
  canUseCheckInDesk,
  homePath,
  MY_ACCOUNT_PATH,
  mustChooseOwnPassword,
  SIGN_IN_PATH,
} from "./access";
import { staffAuth, staffSessionReader } from "./server";

/** The signed-in Account, narrowed to what Back Office pages need. */
export type CurrentAccount = {
  /** Better Auth user id; store it as the Account on Check-Ins (`check_ins.staff_account_id`). */
  id: string;
  name: string;
  email: string;
  kind: AccountKind;
  /**
   * The id of the session this request is signed in with: "This device" on My Account. Read from the
   * session, never from the browser. Not its token, which signs a browser in and never leaves the
   * cookie. Pass Client Components only the fields they show, never the whole Account.
   */
  sessionId: string;
  /**
   * Someone else set the password, so its owner must choose their own before anything else
   * (`mustChooseOwnPassword`; always false for a Kiosk Account). Only the helpers for the Account's
   * own things (`requireStaffForOwnAccount`, `getStaffForOwnAccount`) let such an Account through:
   * every other helper below refuses it or sends it to My Account.
   */
  mustChangePassword: boolean;
};

/** A Staff member, signed in with a Staff Account or an Admin Account (GLOSSARY: Staff). */
export type CurrentStaff = CurrentAccount & { kind: "admin" | "staff" };

/** The signed-in Admin Account. */
export type CurrentAdmin = CurrentAccount & { kind: "admin" };

/** The signed-in Account on the Check-In path: any kind of Account. */
export type CurrentCheckInAccount = CurrentAccount;

/** An access rule from access.ts that also narrows the kind it lets through. */
type KindRule<Kind extends AccountKind> = (kind: AccountKind) => kind is Kind;

/**
 * `forOwnAccount`: for the Account's own things only (My Account and the account menu), where an
 * Account that must choose its own password is let through. Everywhere else it is held back.
 */
type GuardOptions = { forOwnAccount?: boolean };

/**
 * The session's user and session id as a `CurrentAccount`, or null for a disabled Account, which is
 * signed out wherever it is. A backstop: disabling an Account also ends its sessions, and it can't
 * start new ones (staff-auth.ts).
 */
function currentAccount(
  user: {
    id: string;
    name: string;
    email: string;
    kind: AccountKind;
    mustChangePassword: boolean;
    disabledAt?: Date | null;
  },
  sessionId: string,
): CurrentAccount | null {
  if (user.disabledAt) return null;
  const { id, name, email, kind } = user;
  return { id, name, email, kind, sessionId, mustChangePassword: mustChooseOwnPassword(kind, user.mustChangePassword) };
}

/**
 * Reads and validates the session from the request cookies (a database lookup, no cookie cache),
 * whatever kind of Account it is. Returns null when nobody is signed in, or the Account is disabled
 * (`currentAccount`). Request-time: in a Server Component, call it below a `<Suspense>` boundary.
 * Deduplicated within one render; Server Actions and Route Handlers re-check. Not exported: callers
 * ask for what they need through the helpers below.
 */
const getSignedInAccount = cache(async (): Promise<CurrentAccount | null> => {
  // Read the request first: during prerender this suspends, so the auth instance (which needs the
  // runtime env) is never built at build time.
  const requestHeaders = await headers();
  const session = await staffAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  return currentAccount(session.user, session.session.id);
});

/**
 * The signed-in Account if `rule` lets its kind through, else null. Also null for an Account that
 * must choose its own password, unless `forOwnAccount`.
 */
async function signedInAccountThat<Kind extends AccountKind>(
  rule: KindRule<Kind>,
  { forOwnAccount = false }: GuardOptions = {},
): Promise<(CurrentAccount & { kind: Kind }) | null> {
  const account = await getSignedInAccount();
  if (!account || !rule(account.kind)) return null;
  if (account.mustChangePassword && !forOwnAccount) return null;
  return { ...account, kind: account.kind };
}

/**
 * Like `signedInAccountThat`, but redirects instead of returning null: to the sign-in page when
 * nobody is signed in; to My Account when the Account must choose its own password first (unless
 * `forOwnAccount`); and otherwise to where the Account belongs (`homePath`), so a signed-in Account
 * never shows the sign-in page.
 */
async function requireAccountThat<Kind extends AccountKind>(
  rule: KindRule<Kind>,
  { forOwnAccount = false }: GuardOptions = {},
): Promise<CurrentAccount & { kind: Kind }> {
  const account = await getSignedInAccount();
  if (!account) redirect(SIGN_IN_PATH);
  // Before the kind: a Staff Account opening an Admin page goes straight there, not via the desk.
  if (account.mustChangePassword && !forOwnAccount) redirect(MY_ACCOUNT_PATH);
  if (!rule(account.kind)) redirect(homePath(account.kind));
  return { ...account, kind: account.kind };
}

/**
 * The signed-in Admin Account, or null when nobody is signed in, the Account is a Staff or Kiosk
 * Account (ADR 0004), or it must choose its own password first. The overview, the Registration list
 * and detail, email and every `/api/back-office/*` Route Handler check with this or
 * `requireAdmin()`, so any other Account is refused exactly like a signed-out request.
 * Request-time: see `getSignedInAccount`.
 */
export function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  return signedInAccountThat(canUseBackOffice);
}

/**
 * Like `getCurrentAdmin`, but redirects when there's no Admin: to the sign-in page, My Account for
 * an Account that must choose its own password, the check-in desk for a Staff Account, or the
 * Kiosk for a Kiosk Account.
 */
export function requireAdmin(): Promise<CurrentAdmin> {
  return requireAccountThat(canUseBackOffice);
}

/**
 * The signed-in Staff member (a Staff or Admin Account), or null when nobody is signed in, the
 * Account is a Kiosk Account (ADR 0003), or it must choose its own password first. For the check-in
 * desk, the sidebar's page links and My Account's Signed-in devices. Request-time: see
 * `getSignedInAccount`.
 */
export function getCurrentStaff(): Promise<CurrentStaff | null> {
  return signedInAccountThat(canUseCheckInDesk);
}

/**
 * Like `getCurrentStaff`, but redirects when there's no Staff member: to the sign-in page when
 * nobody is signed in, to My Account when the Account must choose its own password first, and to
 * the Kiosk page for a Kiosk Account, so a Kiosk never shows the sign-in page while it is signed in.
 */
export function requireStaff(): Promise<CurrentStaff> {
  return requireAccountThat(canUseCheckInDesk);
}

/**
 * Like `getCurrentStaff`, but also lets through an Account that must choose its own password
 * (`mustChangePassword` says so). Only for the Account's own things, which it needs while it does:
 * My Account's name (the rename Server Action) and the sidebar's account menu (My Account, Sign out).
 */
export function getStaffForOwnAccount(): Promise<CurrentStaff | null> {
  return signedInAccountThat(canUseCheckInDesk, { forOwnAccount: true });
}

/**
 * Like `requireStaff`, but lets through an Account that must choose its own password: for My
 * Account, where it does. A Kiosk Account is still sent to the Kiosk, and a signed-out request to
 * the sign-in page.
 */
export function requireStaffForOwnAccount(): Promise<CurrentStaff> {
  return requireAccountThat(canUseCheckInDesk, { forOwnAccount: true });
}

/**
 * The signed-in Account that may record Check-Ins (Staff or Kiosk), or null; null too for a disabled
 * Account, or one that must choose its own password first. For the check-in Server Action; record
 * its `id` on the Check-In.
 *
 * Unlike the helpers above, it never writes a cookie, so it never extends the session either (30
 * days is enough for the Event). In a Server Action, Better Auth clears the cookie of a session
 * that has ended, and any cookie write makes Next re-render the page. The page's guard then sent
 * the desk and the Kiosk to the sign-in page, so "Session expired" and "Staff must sign in again"
 * only flashed, and an unattended Kiosk was left on the sign-in page.
 */
export async function getCurrentCheckInAccount(): Promise<CurrentCheckInAccount | null> {
  const session = await staffSessionReader().api.getSession({
    headers: await headers(),
    query: { disableRefresh: true },
  });
  if (!session) return null;
  const account = currentAccount(session.user, session.session.id);
  return account && canCheckIn(account.kind) && !account.mustChangePassword ? account : null;
}

/**
 * For the Kiosk page: the signed-in Account that may record Check-Ins, else to the sign-in page. A
 * Staff or Admin Account that must choose its own password goes to My Account (a Kiosk Account
 * never has to).
 */
export async function requireCheckInAccount(): Promise<CurrentCheckInAccount> {
  const account = await getSignedInAccount();
  if (!account || !canCheckIn(account.kind)) redirect(SIGN_IN_PATH);
  if (account.mustChangePassword) redirect(MY_ACCOUNT_PATH);
  return account;
}
