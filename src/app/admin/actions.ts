"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { staffAuth } from "@/lib/auth/server";
import { BACK_OFFICE_SIGN_IN_PATH } from "@/lib/auth/session";

/**
 * Ends the current session, Staff or Kiosk Account (database row and cookie), and returns to the
 * sign-in page. Used by the Back Office header and the Kiosk page's Staff corner.
 */
export async function signOut() {
  // Safe without a session: Better Auth then just clears the cookie.
  await staffAuth().api.signOut({ headers: await headers() });
  redirect(BACK_OFFICE_SIGN_IN_PATH);
}
