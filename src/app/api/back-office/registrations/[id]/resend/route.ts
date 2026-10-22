import type { NextRequest } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import type { ResendEventPassResult } from "@/lib/registrations/resend-event-pass";
import { registrations } from "@/lib/server/registrations";

// POST /api/back-office/registrations/{id}/resend
// Emails one Registration its Event Pass again (Staff only). The body is a ResendEventPassResult:
// {"status":"sent"}, {"status":"failed","reason":"…"}, {"status":"email-not-configured"} or
// {"status":"not-found"} (HTTP 404). 401 {"error":"unauthorized"} when signed out.
// A failed send is still HTTP 200: the request was handled, and a 5xx could be swapped for a
// proxy's error page before the Back Office sees the reason.
// CSRF: the Staff session cookie is SameSite=Lax, so a cross-site POST arrives signed out.

/** Attendees' personal data: never store it in a shared or browser cache. */
const noStore = { "Cache-Control": "private, no-store" };

/** A Registration id as it appears in the path; anything else matches no Registration. */
function registrationId(segment: string): number {
  return /^[1-9]\d{0,9}$/.test(segment) ? Number(segment) : Number.NaN;
}

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/back-office/registrations/[id]/resend">,
) {
  // Before reading the request or the database (see getCurrentStaff).
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const { id } = await ctx.params;
  const result: ResendEventPassResult = await registrations().resendEventPass(registrationId(id));
  return Response.json(result, { status: result.status === "not-found" ? 404 : 200, headers: noStore });
}
