import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const SIGN_IN_PATH = "/admin/login";

/**
 * Optimistic Back Office gate: sends visitors without a session cookie to the sign-in page with a
 * real redirect. It only checks that the cookie exists. Pages, Server Actions and Route Handlers
 * still validate the session themselves (`requireStaff` / `getCurrentStaff` in src/lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === SIGN_IN_PATH || getSessionCookie(request)) {
    return NextResponse.next();
  }
  const signIn = request.nextUrl.clone();
  signIn.pathname = SIGN_IN_PATH;
  signIn.search = "";
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/admin/:path*"],
};
