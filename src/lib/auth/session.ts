import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { staffAuth } from "./server";

/** The signed-in Staff member, narrowed to what Back Office pages need. */
export type CurrentStaff = {
  /** Better Auth user id; store it as the Staff Account on Check-Ins (`check_ins.staff_account_id`). */
  id: string;
  name: string;
  email: string;
};

export const BACK_OFFICE_SIGN_IN_PATH = "/admin/login";

/**
 * Reads and validates the Staff session from the request cookies (a database lookup, no cookie cache).
 * Returns null when nobody is signed in. Request-time: in a Server Component, call it below a
 * `<Suspense>` boundary. Deduplicated within one render; Server Actions and Route Handlers re-check.
 */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  // Read the request first: during prerender this suspends, so the auth instance (which needs the
  // runtime env) is never built at build time.
  const requestHeaders = await headers();
  const session = await staffAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
});

/** Like `getCurrentStaff`, but redirects to the sign-in page when nobody is signed in. */
export async function requireStaff(): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect(BACK_OFFICE_SIGN_IN_PATH);
  return staff;
}
