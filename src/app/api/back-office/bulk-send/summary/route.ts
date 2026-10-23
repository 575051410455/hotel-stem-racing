import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/auth/session";
import { bulkSendSummaryParamsSchema } from "@/lib/registrations/bulk-send-params";
import { registrations } from "@/lib/server/registrations";

// GET /api/back-office/bulk-send/summary?mode=all|unsent
// How many Event Pass emails a bulk send would send, in total and per Event Day (Staff only):
// `BulkSendSummary` as JSON. 401 when signed out, 400 when the mode is missing or unknown.

const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  // Before reading the request or the database (see getCurrentStaff).
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const parsed = bulkSendSummaryParamsSchema.safeParse({ mode: request.nextUrl.searchParams.get("mode") });
  if (!parsed.success) {
    return Response.json(
      { error: "invalid-params", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400, headers: noStore },
    );
  }

  const summary = await registrations().bulkSendSummary(parsed.data.mode);
  return Response.json(summary, { headers: noStore });
}
