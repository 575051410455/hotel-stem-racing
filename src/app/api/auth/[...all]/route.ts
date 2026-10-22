import { staffAuth } from "@/lib/auth/server";

// Better Auth's HTTP API (sign-in, sign-out, get-session, ...). Same as `toNextJsHandler(auth)`, but the
// instance is resolved per request so `next build` doesn't need DATABASE_URL or BETTER_AUTH_SECRET.

export function GET(request: Request) {
  return staffAuth().handler(request);
}

export function POST(request: Request) {
  return staffAuth().handler(request);
}
