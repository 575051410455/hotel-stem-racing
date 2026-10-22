"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { staffAuth } from "@/lib/auth/server";
import { BACK_OFFICE_SIGN_IN_PATH } from "@/lib/auth/session";

/** Ends the current Staff session (database row and cookie) and returns to the sign-in page. */
export async function signOut() {
  // Safe without a session: Better Auth then just clears the cookie.
  await staffAuth().api.signOut({ headers: await headers() });
  redirect(BACK_OFFICE_SIGN_IN_PATH);
}
