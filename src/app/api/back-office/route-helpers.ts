// What every Back Office route handler shares: uncached JSON answers, the 401 and 400 bodies, and
// the CSRF guard for routes that change data.

import { z } from "zod";
import { isSameOriginRequest } from "@/lib/auth/request-origin";

/** Attendees' personal data: never store it in a shared or browser cache. */
export const noStore = { "Cache-Control": "private, no-store" } as const;

/** A JSON answer that no cache keeps. */
export function noStoreJson(body: unknown, init: { status?: number } = {}): Response {
  return Response.json(body, { ...init, headers: noStore });
}

/** The answer when nobody with Back Office access is signed in. */
export function unauthorized(): Response {
  return noStoreJson({ error: "unauthorized" }, { status: 401 });
}

/** The answer when parameters fail their schema, naming each bad field. */
export function invalidParams(error: z.ZodError): Response {
  return noStoreJson({ error: "invalid-params", fields: z.flattenError(error).fieldErrors }, { status: 400 });
}

// CSRF guard for Back Office routes that change data. SameSite=Lax cookies are not enough:
// production runs on a subdomain of the organisers' domain, and sibling subdomains count as
// same-site, so a form on one of them could post here with the Staff session attached.
// Older browsers may omit Fetch Metadata, so Origin must establish trust in that case.

/** A 403 response when the request did not come from our own pages, otherwise undefined. */
export function rejectUnlessSameOrigin(request: Request): Response | undefined {
  // Use the configured public origin, never the request's Host or internal proxy URL.
  if (isSameOriginRequest(request.headers, process.env.BETTER_AUTH_URL)) return undefined;
  return noStoreJson({ error: "forbidden" }, { status: 403 });
}
