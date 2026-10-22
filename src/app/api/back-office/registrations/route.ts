import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/auth/session";
import { parseRegistrationSearchParams } from "@/lib/registrations/search-params";
import { registrations } from "@/lib/server/registrations";

// GET /api/back-office/registrations?q&day&role&sort&page&pageSize
// One page of the Back Office Registration list (Staff only): `RegistrationSearchResult` as JSON,
// with `createdAt` as an ISO string. 401 when signed out, 400 when a parameter is invalid.
// Under /api, not /admin: the proxy would redirect a signed-out JSON request to the sign-in page.

/** Attendees' personal data: never store it in a shared or browser cache. */
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  // Before reading the request or the database (see getCurrentStaff).
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const parsed = parseRegistrationSearchParams(request.nextUrl.searchParams);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid-params", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400, headers: noStore },
    );
  }

  const result = await registrations().search(parsed.data);
  return Response.json(result, { headers: noStore });
}
