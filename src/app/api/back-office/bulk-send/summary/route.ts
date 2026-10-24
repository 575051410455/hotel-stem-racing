import type { NextRequest } from "next/server";
import { invalidParams, noStoreJson, unauthorized } from "@/app/api/back-office/route-helpers";
import { getCurrentAdmin } from "@/lib/auth/session";
import { bulkSendSummaryParamsSchema } from "@/lib/registrations/bulk-send-params";
import { registrations } from "@/lib/server/registrations";

// GET /api/back-office/bulk-send/summary?mode=all|unsent
// How many Event Pass emails a bulk send would send, in total and per Event Day (Staff only):
// `BulkSendSummary` as JSON. 401 when signed out, 400 when the mode is missing or unknown.

export async function GET(request: NextRequest) {
  // Before reading the request or the database (see getCurrentAdmin).
  const admin = await getCurrentAdmin();
  if (!admin) return unauthorized();

  const parsed = bulkSendSummaryParamsSchema.safeParse({ mode: request.nextUrl.searchParams.get("mode") });
  if (!parsed.success) return invalidParams(parsed.error);

  const summary = await registrations().bulkSendSummary(parsed.data.mode);
  return noStoreJson(summary);
}
