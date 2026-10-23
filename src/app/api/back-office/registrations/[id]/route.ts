import type { NextRequest } from "next/server";
import { noStoreJson, rejectUnlessSameOrigin, unauthorized } from "@/app/api/back-office/route-helpers";
import { getCurrentStaff } from "@/lib/auth/session";
import type { DeleteRegistrationResult } from "@/lib/registrations/detail";
import { registrationIdFromPath } from "@/lib/registrations/registration-id";
import { registrations } from "@/lib/server/registrations";

// DELETE /api/back-office/registrations/{id}
// Deletes one Registration and its Check-Ins (Staff only), for spam or a Duplicate Registration.
// The body is a DeleteRegistrationResult: {"status":"deleted","passCode":"EP-…"}, or
// {"status":"not-found"} with HTTP 404 (also for an id that isn't digits). 401
// {"error":"unauthorized"} when signed out.
// CSRF: rejectUnlessSameOrigin, since SameSite=Lax alone lets sibling subdomains send it.

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/back-office/registrations/[id]">) {
  // Before reading the request or the database (see getCurrentStaff).
  const crossSite = rejectUnlessSameOrigin(request);
  if (crossSite) return crossSite;
  const staff = await getCurrentStaff();
  if (!staff) return unauthorized();

  const { id } = await ctx.params;
  const result: DeleteRegistrationResult = await registrations().deleteRegistration(registrationIdFromPath(id));
  // There is no undo, so leave a trace for the operator: which Pass Code, and which Staff Account.
  if (result.status === "deleted") console.info(`Registration ${result.passCode} deleted by Staff Account ${staff.id}`);
  return noStoreJson(result, { status: result.status === "not-found" ? 404 : 200 });
}
