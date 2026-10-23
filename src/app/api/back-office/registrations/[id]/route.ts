import type { NextRequest } from "next/server";
import { rejectUnlessSameOrigin } from "@/app/api/back-office/same-origin";
import { getCurrentStaff } from "@/lib/auth/session";
import { type DeleteRegistrationResult, registrationIdFromPath } from "@/lib/registrations/detail";
import { registrations } from "@/lib/server/registrations";

// DELETE /api/back-office/registrations/{id}
// Deletes one Registration and its Check-Ins (Staff only), for spam or a Duplicate Registration.
// The body is a DeleteRegistrationResult: {"status":"deleted","passCode":"EP-…"}, or
// {"status":"not-found"} with HTTP 404 (also for an id that isn't digits). 401
// {"error":"unauthorized"} when signed out.
// CSRF: a cross-site DELETE needs a CORS preflight, which this route never grants, and the Staff
// session cookie is SameSite=Lax.

/** Attendees' personal data: never store it in a shared or browser cache. */
const noStore = { "Cache-Control": "private, no-store" };

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/back-office/registrations/[id]">) {
  // Before reading the request or the database (see getCurrentStaff).
  const crossSite = rejectUnlessSameOrigin(request);
  if (crossSite) return crossSite;
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const { id } = await ctx.params;
  const result: DeleteRegistrationResult = await registrations().deleteRegistration(registrationIdFromPath(id));
  // There is no undo, so leave a trace for the operator: which Pass Code, and which Staff Account.
  if (result.status === "deleted") console.info(`Registration ${result.passCode} deleted by Staff Account ${staff.id}`);
  return Response.json(result, { status: result.status === "not-found" ? 404 : 200, headers: noStore });
}
