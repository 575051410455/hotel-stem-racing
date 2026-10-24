import type { NextRequest } from "next/server";
import { invalidParams, noStoreJson, unauthorized } from "@/app/api/back-office/route-helpers";
import { getCurrentAdmin } from "@/lib/auth/session";
import { parseRegistrationSearchParams } from "@/lib/registrations/search-params";
import { registrations } from "@/lib/server/registrations";

// GET /api/back-office/registrations?q&day&role&sort&page&pageSize
// One page of the Back Office Registration list (Staff only): `RegistrationSearchResult` as JSON,
// with `createdAt` as an ISO string. 401 when signed out, 400 when a parameter is invalid.
// Under /api, not /admin: the proxy would redirect a signed-out JSON request to the sign-in page.

export async function GET(request: NextRequest) {
  // Before reading the request or the database (see getCurrentAdmin).
  const admin = await getCurrentAdmin();
  if (!admin) return unauthorized();

  const parsed = parseRegistrationSearchParams(request.nextUrl.searchParams);
  if (!parsed.success) return invalidParams(parsed.error);

  const result = await registrations().search(parsed.data);
  return noStoreJson(result);
}
