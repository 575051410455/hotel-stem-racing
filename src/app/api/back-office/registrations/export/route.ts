import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentStaff } from "@/lib/auth/session";
import { registrationsCsv, registrationsCsvFileName } from "@/lib/registrations/csv";
import { parseRegistrationSearchParams } from "@/lib/registrations/search-params";
import { registrations } from "@/lib/server/registrations";

// GET /api/back-office/registrations/export?q&day&role&sort
// Every Registration matching the list's search, filters and sort, as a CSV download (Staff only).
// Takes the list's query string as is: page and pageSize are validated but ignored, since the
// export has no pages. 401 when signed out, 400 when a parameter is invalid (both JSON).

/** Attendees' personal data: never store it in a shared or browser cache. */
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  // Before reading the request, the database or the clock (see getCurrentStaff).
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  const parsed = parseRegistrationSearchParams(request.nextUrl.searchParams);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid-params", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400, headers: noStore },
    );
  }

  const rows = await registrations().exportRows(parsed.data);
  return new Response(registrationsCsv(rows), {
    headers: {
      ...noStore,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${registrationsCsvFileName(new Date())}"`,
    },
  });
}
