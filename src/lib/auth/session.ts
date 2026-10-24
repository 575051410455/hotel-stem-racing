import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type AccountKind, canCheckIn, canUseBackOffice, canUseCheckInDesk, homePath, SIGN_IN_PATH } from "./access";
import { staffAuth } from "./server";

/** The signed-in Account, narrowed to what Back Office pages need. */
export type CurrentAccount = {
  /** Better Auth user id; store it as the Account on Check-Ins (`check_ins.staff_account_id`). */
  id: string;
  name: string;
  email: string;
  kind: AccountKind;
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
 * Reads and validates the session from the request cookies (a database lookup, no cookie cache),
 * whatever kind of Account it is. Returns null when nobody is signed in. Request-time: in a Server
 * Component, call it below a `<Suspense>` boundary. Deduplicated within one render; Server Actions
 * and Route Handlers re-check. Not exported: callers ask for what they need through the helpers below.
 */
const getSignedInAccount = cache(async (): Promise<CurrentAccount | null> => {
  // Read the request first: during prerender this suspends, so the auth instance (which needs the
  // runtime env) is never built at build time.
  const requestHeaders = await headers();
  const session = await staffAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, kind } = session.user;
  return { id, name, email, kind };
});

/** The signed-in Account if `rule` lets its kind through, else null. */
async function signedInAccountThat<Kind extends AccountKind>(
  rule: KindRule<Kind>,
): Promise<(CurrentAccount & { kind: Kind }) | null> {
  const account = await getSignedInAccount();
  if (!account || !rule(account.kind)) return null;
  return { ...account, kind: account.kind };
}

/**
 * Like `signedInAccountThat`, but redirects instead of returning null: to the sign-in page when
 * nobody is signed in, and otherwise to where the Account belongs (`homePath`), so a signed-in
 * Account never shows the sign-in page.
 */
async function requireAccountThat<Kind extends AccountKind>(
  rule: KindRule<Kind>,
): Promise<CurrentAccount & { kind: Kind }> {
  const account = await getSignedInAccount();
  if (!account) redirect(SIGN_IN_PATH);
  if (!rule(account.kind)) redirect(homePath(account.kind));
  return { ...account, kind: account.kind };
}

/**
 * The signed-in Admin Account, or null when nobody is signed in or the Account is a Staff or Kiosk
 * Account (ADR 0004). The overview, the Registration list and detail, email and every
 * `/api/back-office/*` Route Handler check with this or `requireAdmin()`, so any other Account is
 * refused exactly like a signed-out request. Request-time: see `getSignedInAccount`.
 */
export function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  return signedInAccountThat(canUseBackOffice);
}

/**
 * Like `getCurrentAdmin`, but redirects when there's no Admin: to the sign-in page, the check-in
 * desk for a Staff Account, or the Kiosk for a Kiosk Account.
 */
export function requireAdmin(): Promise<CurrentAdmin> {
  return requireAccountThat(canUseBackOffice);
}

/**
 * The signed-in Staff member (a Staff or Admin Account), or null when nobody is signed in or the
 * Account is a Kiosk Account (ADR 0003). For the check-in desk and the Account's own pages.
 * Request-time: see `getSignedInAccount`.
 */
export function getCurrentStaff(): Promise<CurrentStaff | null> {
  return signedInAccountThat(canUseCheckInDesk);
}

/**
 * Like `getCurrentStaff`, but redirects when there's no Staff member: to the sign-in page when
 * nobody is signed in, and to the Kiosk page for a Kiosk Account, so a Kiosk never shows the
 * sign-in page while it is signed in.
 */
export function requireStaff(): Promise<CurrentStaff> {
  return requireAccountThat(canUseCheckInDesk);
}

/**
 * The signed-in Account that may record Check-Ins (Staff or Kiosk), or null. For the Kiosk page and
 * the check-in Server Action; record its `id` on the Check-In. Request-time: see `getSignedInAccount`.
 */
export async function getCurrentCheckInAccount(): Promise<CurrentCheckInAccount | null> {
  const account = await getSignedInAccount();
  return account && canCheckIn(account.kind) ? account : null;
}

/** Like `getCurrentCheckInAccount`, but redirects to the sign-in page when there's none. */
export async function requireCheckInAccount(): Promise<CurrentCheckInAccount> {
  const account = await getCurrentCheckInAccount();
  if (!account) redirect(SIGN_IN_PATH);
  return account;
}
