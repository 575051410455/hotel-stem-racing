// Bulk send of Event Pass emails (ticket 17): the summary Staff confirm, and the batches that
// send it. Part of the Registration module; exposed as `bulkSendSummary` on `createRegistrations`.

import { and, asc, eq, gt, lte, type SQL, sql } from "drizzle-orm";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { event } from "@/lib/event";
import type { BulkSendMode } from "./bulk-send-params";
import { type EventPassEmailDependencies, eventPassEmailColumns, sendEventPassEmail } from "./send-event-pass";

/** The most Event Pass emails one batch (one request) sends. */
export const MAX_BATCH_MESSAGES = 25;

/**
 * No new send starts once a batch has run this long. Cloudflare ends a request at 100 s (ticket
 * 03), and one send is capped at SEND_DEADLINE_MS (20 s) by the SMTP sender, so the worst case
 * is about 60 s.
 */
export const BATCH_TIME_BUDGET_MS = 40_000;

export type BulkSendSummary = {
  mode: BulkSendMode;
  /** False when SMTP isn't configured: nothing can be sent. */
  emailConfigured: boolean;
  /** Emails that would go out: one per Registration, however many Event Days it chose. */
  emails: number;
  /**
   * Per configured Event Day, in Event order: how many of those Registrations chose it. A
   * Registration for both days is counted on each, so these can add up to more than `emails`.
   */
  eventDays: { eventDay: string; registrations: number }[];
  /**
   * The highest Registration id in the summary, or null when there is nothing to send. Pass it to
   * `sendEventPassBatch` so the send covers what Staff confirmed and not later Registrations.
   */
  throughId: number | null;
};

/** The Registrations a bulk send in `mode` covers. */
function inMode(mode: BulkSendMode): SQL | undefined {
  return mode === "unsent" ? eq(registrationsTable.emailSentCount, 0) : undefined;
}

/** How many Event Pass emails a bulk send in `mode` would send, in total and per Event Day. */
export async function bulkSendSummary(
  deps: EventPassEmailDependencies,
  mode: BulkSendMode,
): Promise<BulkSendSummary> {
  // One statement, so the total, the days and `throughId` describe the same Registrations.
  // `perDay` holds one count per configured Event Day, in Event order.
  const dayCounts = event.eventDays.map(
    ({ date }) => sql`count(*) filter (where ${date}::date = any(${registrationsTable.eventDays}))::int`,
  );
  const [row] = await deps.db
    .select({
      emails: sql<number>`count(*)::int`.mapWith(Number),
      throughId: sql<number | null>`max(${registrationsTable.id})`,
      perDay: sql<number[]>`array[${sql.join(dayCounts, sql`, `)}]::int[]`,
    })
    .from(registrationsTable)
    .where(inMode(mode));

  return {
    mode,
    emailConfigured: deps.emailSender.configured,
    emails: row.emails,
    eventDays: event.eventDays.map(({ date }, i) => ({ eventDay: date, registrations: Number(row.perDay[i]) })),
    throughId: row.throughId === null ? null : Number(row.throughId),
  };
}

export type EventPassBatchRequest = {
  mode: BulkSendMode;
  /** The cursor: the batch covers Registrations with a higher id. 0 to start. */
  afterId: number;
  /** The summary's `throughId`: Registrations with a higher id (made later) are left out. */
  throughId?: number;
  /** At most this many sends; capped at MAX_BATCH_MESSAGES. */
  maxMessages?: number;
  /** No new send starts once the batch has run longer than this, by the clock. */
  timeBudgetMs?: number;
};

/** Who a batch emailed, and how it went. */
export type BulkSendMessageResult = {
  id: number;
  passCode: string;
  givenName: string;
  familyName: string;
  email: string;
} & ({ status: "sent" } | { status: "failed"; reason: string });

export type EventPassBatchResult =
  /** SMTP isn't configured: nothing was looked at or sent. */
  | { status: "email-not-configured" }
  | EventPassBatchProcessed;

export type EventPassBatchProcessed = {
  status: "processed";
  /** One per Registration the batch tried, in id order. */
  results: BulkSendMessageResult[];
  /** The cursor for the next batch: the last id tried, or `afterId` when none was. */
  nextAfterId: number;
  /**
   * True when no Registration in the mode is left after `nextAfterId`. False after a full batch,
   * or one the time budget ended early: request the next batch from `nextAfterId`.
   */
  done: boolean;
};

/**
 * Sends the next batch of a bulk send, one email at a time through `sendEventPassEmail`, which
 * records each sent email on its Registration. Stops after `maxMessages`, or before starting a
 * send (after the first) once the batch has run past `timeBudgetMs`. A failed send is recorded
 * in the results and the batch goes on. With SMTP not configured, nothing is looked at.
 */
export async function sendEventPassBatch(
  deps: EventPassEmailDependencies,
  request: EventPassBatchRequest,
): Promise<EventPassBatchResult> {
  if (!deps.emailSender.configured) return { status: "email-not-configured" };

  const startedAt = deps.clock().getTime();
  const timeBudgetMs = request.timeBudgetMs ?? BATCH_TIME_BUDGET_MS;
  const limit = Math.min(Math.max(1, Math.floor(request.maxMessages ?? MAX_BATCH_MESSAGES)), MAX_BATCH_MESSAGES);
  // One extra row says whether anything is left after this batch.
  const rows = await deps.db
    .select({ id: registrationsTable.id, ...eventPassEmailColumns })
    .from(registrationsTable)
    .where(
      and(
        gt(registrationsTable.id, request.afterId),
        request.throughId === undefined ? undefined : lte(registrationsTable.id, request.throughId),
        inMode(request.mode),
      ),
    )
    .orderBy(asc(registrationsTable.id))
    .limit(limit + 1);

  const results: BulkSendMessageResult[] = [];
  for (const row of rows.slice(0, limit)) {
    // The first send always goes, so every batch moves the cursor and the client's loop ends.
    if (results.length > 0 && deps.clock().getTime() - startedAt > timeBudgetMs) break;
    const outcome = await sendEventPassEmail(deps, row);
    const recipient = {
      id: row.id,
      passCode: row.passCode,
      givenName: row.givenName,
      familyName: row.familyName,
      email: row.email,
    };
    results.push(
      outcome.sent ? { ...recipient, status: "sent" } : { ...recipient, status: "failed", reason: outcome.error },
    );
  }

  return {
    status: "processed",
    results,
    nextAfterId: results.at(-1)?.id ?? request.afterId,
    done: results.length === rows.length,
  };
}
