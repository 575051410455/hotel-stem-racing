import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type AccountKind, canCheckIn, canUseBackOffice, homePath } from "./access";
import { staffAuth } from "./server";

/** The signed-in Staff member, narrowed to what Back Office pages need. */
export type CurrentStaff = {
  /** Better Auth user id; store it as the Account on Check-Ins (`check_ins.staff_account_id`). */
  id: string;
  name: string;
  email: string;
};

/** The signed-in Account on the Check-In path: a Staff Account or a Kiosk Account. */
export type CurrentCheckInAccount = CurrentStaff & { kind: AccountKind };

export const BACK_OFFICE_SIGN_IN_PATH = "/admin/login";

/**
 * Reads and validates the session from the request cookies (a database lookup, no cookie cache),
 * whatever kind of Account it is. Returns null when nobody is signed in. Request-time: in a Server
 * Component, call it below a `<Suspense>` boundary. Deduplicated within one render; Server Actions
 * and Route Handlers re-check. Not exported: callers ask for what they need through the helpers below.
 */
const getSignedInAccount = cache(async (): Promise<CurrentCheckInAccount | null> => {
  // Read the request first: during prerender this suspends, so the auth instance (which needs the
  // runtime env) is never built at build time.
  const requestHeaders = await headers();
  const session = await staffAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, kind } = session.user;
  return { id, name, email, kind };
});

/**
 * The signed-in Staff member, or null when nobody is signed in or the Account may not use the Back
 * Office (a Kiosk Account, ADR 0003). Every Back Office page, Route Handler and Server Action
 * checks with this or `requireStaff()`, so a Kiosk Account is refused exactly like a signed-out
 * request. Request-time: see `getSignedInAccount`.
 */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const account = await getSignedInAccount();
  if (!account || !canUseBackOffice(account.kind)) return null;
  return { id: account.id, name: account.name, email: account.email };
}

/**
 * Like `getCurrentStaff`, but redirects when there's no Staff member: to the sign-in page when
 * nobody is signed in, and to the Kiosk page for a Kiosk Account, so a Kiosk never shows the
 * sign-in page while it is signed in.
 */
export async function requireStaff(): Promise<CurrentStaff> {
  const account = await getSignedInAccount();
  if (!account) redirect(BACK_OFFICE_SIGN_IN_PATH);
  if (!canUseBackOffice(account.kind)) redirect(homePath(account.kind));
  return { id: account.id, name: account.name, email: account.email };
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
  if (!account) redirect(BACK_OFFICE_SIGN_IN_PATH);
  return account;
}
