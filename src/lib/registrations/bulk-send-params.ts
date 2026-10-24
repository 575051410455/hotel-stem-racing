// Bulk send of Event Pass emails: the modes an Admin chooses from, and what the Admin-only endpoints
// accept. Pure, so the Back Office page, the endpoints and the Registration module all share it.

import { z } from "zod";

/** `all`: every Registration. `unsent`: only Registrations whose Event Pass email was never sent. */
export const bulkSendModes = ["all", "unsent"] as const;

export type BulkSendMode = (typeof bulkSendModes)[number];

/** A Registration id or cursor: Postgres `integer`, so at most 2^31 − 1. */
const registrationId = z.int().min(0).max(2_147_483_647);

/** GET /api/back-office/bulk-send/summary?mode= */
export const bulkSendSummaryParamsSchema = z.object({ mode: z.enum(bulkSendModes) });

/**
 * POST /api/back-office/bulk-send/batch, as JSON. The batch size and time budget aren't part of
 * it: the server always uses its own limits, so no request can run longer than they allow.
 * Unknown keys are dropped.
 */
export const bulkSendBatchRequestSchema = z.object({
  mode: z.enum(bulkSendModes),
  afterId: registrationId,
  throughId: registrationId.optional(),
});

export type BulkSendBatchRequest = z.infer<typeof bulkSendBatchRequestSchema>;
