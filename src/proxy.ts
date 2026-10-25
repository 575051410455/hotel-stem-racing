import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import { defaultLanguage, homeLanguage, type Language, languagePath, splitLanguagePath } from "@/lib/language";
import { registrations } from "@/lib/server/registrations";

const STAFF_AREAS = ["/admin", "/kiosk"];
const EVENT_PASS_PREFIX = "/p/";
/** No page answers this path, so Next serves the bilingual global-not-found page with a 404. */
const UNKNOWN_EVENT_PASS_PATH = "/p/unknown/not-found";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (STAFF_AREAS.some((area) => pathname === area || pathname.startsWith(`${area}/`))) {
    return requireSessionCookie(request);
  }
  return routePublicPage(request);
}

/**
 * Public pages live under src/app/[lang]. Thai keeps the unprefixed addresses: they are rewritten
 * to /th/… internally, and a typed /th/… redirects to its unprefixed form. English addresses
 * (/en/…) already name their segment. The home page is the exception: `/` redirects to it in
 * `homeLanguage` (/en), and Thai's is /th itself.
 */
async function routePublicPage(request: NextRequest) {
  const { language, path, prefixed } = splitLanguagePath(request.nextUrl.pathname);
  if (path === "/") return prefixed ? NextResponse.next() : redirectTo(request, languagePath(homeLanguage, path));
  if (prefixed && language === defaultLanguage) return redirectTo(request, path);
  if (path.startsWith(EVENT_PASS_PREFIX)) {
    return requireEventPass(request, language, path, path.slice(EVENT_PASS_PREFIX.length));
  }
  return prefixed ? NextResponse.next() : rewriteTo(request, language, path);
}

/** Redirects to `pathname` on this site, keeping the query string (tracking parameters included). */
function redirectTo(request: NextRequest, pathname: string) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  return NextResponse.redirect(target);
}

/** Serves `path` from the `[lang]` segment of `language`; the address bar keeps the request's URL. */
function rewriteTo(request: NextRequest, language: Language, path: string) {
  const internal = request.nextUrl.clone();
  internal.pathname = path === "/" ? `/${language}` : `/${language}${path}`;
  return NextResponse.rewrite(internal);
}

/**
 * Gives an unknown or malformed Event Pass token a real 404, in either language. The page's own
 * notFound() comes too late: its 200 has already been sent. So this looks the token up first and
 * rewrites misses to a path no page answers (served by src/app/global-not-found.tsx, with its HTML
 * rendered on the server), and a real token pays one extra indexed read.
 */
async function requireEventPass(request: NextRequest, language: Language, path: string, token: string) {
  const lookup = await registrations().getEventPass(token);
  if (lookup.status !== "found") return rewriteTo(request, language, UNKNOWN_EVENT_PASS_PATH);
  return language === defaultLanguage ? rewriteTo(request, language, path) : NextResponse.next();
}

/**
 * Optimistic gate for the Back Office and the Kiosk page: sends visitors without a session cookie
 * to the sign-in page with a real redirect. It only checks that the cookie exists, not whose it is
 * or what kind of Account it belongs to. Pages, Server Actions and Route Handlers still validate
 * the session themselves (`requireAdmin` / `requireStaff` / `requireCheckInAccount` and their
 * `getCurrent…` twins in src/lib/auth/session.ts), and they are what keeps a Staff Account at the
 * check-in desk and a Kiosk Account on the Kiosk page.
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
  matcher: [
    // Every page address: not /api, not Next's own files, and not files served from public/ or by
    // app/ (images, icons, text). Any other dotted path (/index.html) still gets the public 404.
    "/((?!api/|_next/|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|json|webmanifest)$).*)",
    // Event Pass links whatever the token holds, dots included, so a malformed one still gets a 404.
    "/p/:token",
    "/:lang(th|en)/p/:token",
  ],
};
