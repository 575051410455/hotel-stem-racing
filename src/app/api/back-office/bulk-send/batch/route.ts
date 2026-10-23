import { z } from "zod";
import { rejectUnlessSameOrigin } from "@/app/api/back-office/same-origin";
import { getCurrentStaff } from "@/lib/auth/session";
import { bulkSendBatchRequestSchema } from "@/lib/registrations/bulk-send-params";
import { registrations } from "@/lib/server/registrations";

// POST /api/back-office/bulk-send/batch with JSON { mode, afterId, throughId? }
// Sends the next batch of a bulk send (Staff only): up to 25 Event Pass emails, one at a time,
// and no new send after 40 s (each send capped at 20 s), so the request ends inside Cloudflare's 100 s limit.
// Answers `EventPassBatchResult` as JSON; the client posts again from `nextAfterId` until `done`.
// 401 when signed out, 415 unless the body is JSON, 400 when it is invalid.

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const crossSite = rejectUnlessSameOrigin(request);
  if (crossSite) return crossSite;
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });

  // JSON only: a cross-site HTML form can't send it, and the session cookie is SameSite=Lax.
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    return Response.json({ error: "unsupported-media-type" }, { status: 415, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid-json" }, { status: 400, headers: noStore });
  }
  const parsed = bulkSendBatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid-params", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400, headers: noStore },
    );
  }

  const result = await registrations().sendEventPassBatch(parsed.data);
  return Response.json(result, { headers: noStore });
}
