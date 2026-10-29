import type { NextRequest } from "next/server";
import {
  invalidParams,
  noStoreJson,
  unauthorized,
} from "@/app/api/back-office/route-helpers";
import { getCurrentAdmin } from "@/lib/auth/session";
import { parseActivityRequest } from "@/lib/registrations/check-in-activity-view";
import { registrations } from "@/lib/server/registrations";

export async function GET(request: NextRequest) {
  if (!(await getCurrentAdmin())) return unauthorized();
  const parsed = parseActivityRequest(request.nextUrl.searchParams);
  if (!parsed.success) return invalidParams(parsed.error);
  return noStoreJson(await registrations().checkInActivity(parsed.data));
}
