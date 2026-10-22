// Duplicate Registration: what a repeat submission for the same person gets back. Nothing new
// is saved (the unique Duplicate Registration key decides) and the Event Pass is never shown;
// instead the existing Event Pass is re-sent to the registered email, at most every 10 minutes.

import { and, eq, isNull, lte, or } from "drizzle-orm";
import { registrations as registrationsTable } from "@/lib/db/schema";
import type { SubmitResult } from "./registrations";
import {
  type EventPassEmailDependencies,
  type EventPassEmailRecipient,
  eventPassEmailColumns,
  sendEventPassEmail,
} from "./send-event-pass";

export type DuplicateResult = Extract<SubmitResult, { status: "duplicate" }>;

/** A Registration's Event Pass is re-sent at most once per this interval. */
export const RESEND_INTERVAL_MS = 10 * 60 * 1000;

/** "john.smith@gmail.com" → "j***@gmail.com": enough to recognise, not enough to reuse. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  const first = Array.from(email.slice(0, Math.max(at, 0)))[0] ?? "";
  return `${first}***${at === -1 ? "" : email.slice(at)}`;
}

/**
 * Answers a submission whose Duplicate Registration key belongs to an existing Registration:
 * the registered email, masked, and whether its Event Pass was re-sent just now. The re-send is
 * awaited so the answer is truthful. Email failures never throw; they report `passResent: false`.
 */
export async function respondToDuplicate(
  deps: EventPassEmailDependencies,
  duplicateKey: string,
): Promise<DuplicateResult> {
  const [existing] = await deps.db
    .select({
      ...eventPassEmailColumns,
      id: registrationsTable.id,
      lastEmailSentAt: registrationsTable.lastEmailSentAt,
    })
    .from(registrationsTable)
    .where(eq(registrationsTable.duplicateKey, duplicateKey))
    .limit(1);
  if (!existing) throw new Error("Duplicate Registration key is taken, but its Registration is gone");

  return {
    status: "duplicate",
    maskedEmail: maskEmail(existing.email),
    passResent: await resendIfDue(deps, existing),
    emailConfigured: deps.emailSender.configured,
  };
}

/**
 * Re-sends the Event Pass unless one went out less than RESEND_INTERVAL_MS ago. The slot is
 * claimed by a conditional update of `last_email_sent_at`, so repeats racing each other send
 * one email between them; a failed send hands the slot back. True only when the email went out.
 */
async function resendIfDue(
  deps: EventPassEmailDependencies,
  registration: EventPassEmailRecipient & { id: number; lastEmailSentAt: Date | null },
): Promise<boolean> {
  if (!deps.emailSender.configured) return false;
  const { id, lastEmailSentAt } = registration;
  const column = registrationsTable.lastEmailSentAt;
  try {
    const now = deps.clock();
    const [claimed] = await deps.db
      .update(registrationsTable)
      .set({ lastEmailSentAt: now })
      .where(
        and(
          eq(registrationsTable.id, id),
          or(isNull(column), lte(column, new Date(now.getTime() - RESEND_INTERVAL_MS))),
        ),
      )
      .returning({ id: registrationsTable.id });
    if (!claimed) return false;

    // Records the send (count + 1, last sent from the clock), or logs why it failed.
    const outcome = await sendEventPassEmail(deps, registration);
    if (outcome.sent) return true;

    await deps.db
      .update(registrationsTable)
      .set({ lastEmailSentAt })
      .where(and(eq(registrationsTable.id, id), eq(column, now)));
    return false;
  } catch (error) {
    console.error(`Event Pass re-send for Registration ${id} failed:`, error);
    return false;
  }
}
