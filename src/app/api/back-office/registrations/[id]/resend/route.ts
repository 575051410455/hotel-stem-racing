import type { NextRequest } from "next/server";
import { noStoreJson, rejectUnlessSameOrigin, unauthorized } from "@/app/api/back-office/route-helpers";
import { getCurrentStaff } from "@/lib/auth/session";
import { registrationIdFromPath } from "@/lib/registrations/registration-id";
import type { ResendEventPassResult } from "@/lib/registrations/resend-event-pass";
import { registrations } from "@/lib/server/registrations";

// POST /api/back-office/registrations/{id}/resend
// Emails one Registration its Event Pass again (Staff only). The body is a ResendEventPassResult:
// {"status":"sent"}, {"status":"failed","reason":"…"}, {"status":"email-not-configured"} or
// {"status":"not-found"} (HTTP 404). 401 {"error":"unauthorized"} when signed out.
// A failed send is still HTTP 200: the request was handled, and a 5xx could be swapped for a
// proxy's error page before the Back Office sees the reason.
// CSRF: rejectUnlessSameOrigin, since SameSite=Lax alone lets sibling subdomains post.

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/back-office/registrations/[id]/resend">,
) {
  const crossSite = rejectUnlessSameOrigin(request);
  if (crossSite) return crossSite;
  // Before reading the request or the database (see getCurrentStaff).
  const staff = await getCurrentStaff();
  if (!staff) return unauthorized();

  const { id } = await ctx.params;
  const result: ResendEventPassResult = await registrations().resendEventPass(registrationIdFromPath(id));
  return noStoreJson(result, { status: result.status === "not-found" ? 404 : 200 });
}
