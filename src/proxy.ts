import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import { registrations } from "@/lib/server/registrations";

const EVENT_PASS_PREFIX = "/p/";
const UNKNOWN_EVENT_PASS_PATH = "/p/unknown";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(EVENT_PASS_PREFIX)) {
    return requireEventPass(request, pathname.slice(EVENT_PASS_PREFIX.length));
  }
  return requireSessionCookie(request);
}

/**
 * Gives an unknown or malformed Event Pass token a real 404. The page's own notFound() comes too
 * late: its 200 has already been sent. So this looks the token up first and rewrites misses to a
 * route prerendered as 404, and a real token pays one extra indexed read.
 */
async function requireEventPass(request: NextRequest, token: string) {
  const lookup = await registrations().getEventPass(token);
  if (lookup.status === "found") return NextResponse.next();
  return NextResponse.rewrite(new URL(UNKNOWN_EVENT_PASS_PATH, request.url));
}

/**
 * Optimistic gate for the Back Office and the Kiosk page: sends visitors without a session cookie
 * to the sign-in page with a real redirect. It only checks that the cookie exists, not whose it is
 * or what kind of Account it belongs to. Pages, Server Actions and Route Handlers still validate
 * the session themselves (`requireStaff` / `getCurrentStaff` / `requireCheckInAccount` in
 * src/lib/auth/session.ts), and they are what refuses a Kiosk Account outside the Kiosk page.
 */
function requireSessionCookie(request: NextRequest) {
  if (request.nextUrl.pathname === SIGN_IN_PATH || getSessionCookie(request)) {
    return NextResponse.next();
  }
  const signIn = request.nextUrl.clone();
  signIn.pathname = SIGN_IN_PATH;
  signIn.search = "";
  return NextResponse.redirect(signIn);
}

export const config = {
  // `:path*` also matches the bare path, so /kiosk itself is covered. `/p/:token` is one segment.
  matcher: ["/admin/:path*", "/kiosk/:path*", "/p/:token"],
};
