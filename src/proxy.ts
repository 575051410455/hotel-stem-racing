import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const SIGN_IN_PATH = "/admin/login";

/**
 * Optimistic gate for the Back Office and the Kiosk page: sends visitors without a session cookie
 * to the sign-in page with a real redirect. It only checks that the cookie exists, not whose it is
 * or what kind of Account it belongs to. Pages, Server Actions and Route Handlers still validate
 * the session themselves (`requireStaff` / `getCurrentStaff` / `requireCheckInAccount` in
 * src/lib/auth/session.ts), and they are what refuses a Kiosk Account outside the Kiosk page.
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
  // `:path*` also matches the bare path, so /kiosk itself is covered.
  matcher: ["/admin/:path*", "/kiosk/:path*"],
};
