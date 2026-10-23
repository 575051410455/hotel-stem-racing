// The browser side of the bulk send endpoints under /api/back-office/bulk-send. Both answers are
// plain JSON with no dates, so the Registration module's types describe them as they are.

import { queryOptions } from "@tanstack/react-query";
import type { BulkSendSummary, EventPassBatchResult } from "@/lib/registrations/bulk-send";
import type { BulkSendBatchRequest, BulkSendMode } from "@/lib/registrations/bulk-send-params";
import { BackOfficeRequestError } from "../query-provider";

const SUMMARY_ENDPOINT = "/api/back-office/bulk-send/summary";
const BATCH_ENDPOINT = "/api/back-office/bulk-send/batch";

/** Every cached summary, to refresh after a bulk send: `invalidateQueries({ queryKey })`. */
export const bulkSendSummaryKey = ["back-office", "bulk-send", "summary"] as const;

export function bulkSendSummaryQuery(mode: BulkSendMode) {
  return queryOptions({
    queryKey: [...bulkSendSummaryKey, mode] as const,
    queryFn: async ({ signal }): Promise<BulkSendSummary> => {
      const response = await fetch(`${SUMMARY_ENDPOINT}?mode=${mode}`, {
        signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new BackOfficeRequestError(response.status);
      return response.json();
    },
    // What Staff confirm should be current; the count changes whenever someone registers.
    staleTime: 0,
  });
}

/** Sends one batch. Not aborted on Stop: the server finishes it either way, and its cursor is needed. */
export async function postEventPassBatch(request: BulkSendBatchRequest): Promise<EventPassBatchResult> {
  const response = await fetch(BATCH_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new BackOfficeRequestError(response.status);
  return response.json();
}
