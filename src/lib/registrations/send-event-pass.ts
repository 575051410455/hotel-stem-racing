// Sends one Registration its Event Pass email and records the result. Shared by every path that
// emails a pass: on registration (10), the Duplicate Registration re-send (06), the Back Office
// single resend (16) and bulk send (17).

import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { passLink } from "./event-pass-codec";
import type { Clock, EventPassEmailSender, SendResult } from "./ports";
import type { EventPass } from "./registrations";

export type EventPassEmailDependencies = {
  db: Database;
  emailSender: EventPassEmailSender;
  /** Stamps `last_email_sent_at`. */
  clock: Clock;
  /** Base of the Event Pass link. When undefined, `passLink` falls back to APP_URL. */
  appUrl?: string;
};

/** The Registration to email: its Event Pass plus the address it was registered with. */
export type EventPassEmailRecipient = EventPass & { email: string };

/** Columns to select for an `EventPassEmailRecipient`, e.g. for a bulk-send batch. */
export const eventPassEmailColumns = {
  token: registrationsTable.token,
  passCode: registrationsTable.passCode,
  givenName: registrationsTable.givenName,
  familyName: registrationsTable.familyName,
  eventDays: registrationsTable.eventDays,
  email: registrationsTable.email,
};

export type EventPassEmailOutcome = { sent: true } | { sent: false; error: string };

/**
 * Emails `recipient` their Event Pass and records the result on their Registration (found by
 * token). A sent email increments `email_sent_count` and sets `last_email_sent_at` from the
 * clock; a failed one changes nothing, so the Registration still reads as unsent.
 *
 * Never throws: every failure, including a missing APP_URL or a sender that throws, comes back
 * as `{ sent: false, error }` and is logged. With SMTP not configured nothing is attempted or
 * logged, and the outcome is `{ sent: false, error: "Email is not configured" }`.
 */
export async function sendEventPassEmail(
  deps: EventPassEmailDependencies,
  recipient: EventPassEmailRecipient,
): Promise<EventPassEmailOutcome> {
  const { email, token, passCode, givenName, familyName, eventDays } = recipient;
  // Picked field by field, so extra columns on a caller's row (e.g. `id`) stay out of the email.
  const pass: EventPass = { token, passCode, givenName, familyName, eventDays };

  if (!deps.emailSender.configured) return { sent: false, error: "Email is not configured" };

  let result: SendResult;
  try {
    result = await deps.emailSender.send({ to: email, passLink: passLink(pass.token, deps.appUrl), pass });
  } catch (error) {
    // The port promises never to throw; a sender that does anyway still fails only the email.
    result = { success: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (!result.success) {
    console.error(`Event Pass email not sent for ${pass.passCode}: ${result.error}`);
    return { sent: false, error: result.error };
  }

  try {
    await deps.db
      .update(registrationsTable)
      .set({
        emailSentCount: sql`${registrationsTable.emailSentCount} + 1`,
        lastEmailSentAt: deps.clock(),
      })
      .where(eq(registrationsTable.token, pass.token));
  } catch (error) {
    // The Attendee has the email; only the bookkeeping is lost.
    console.error(`Event Pass email sent for ${pass.passCode} but not recorded:`, error);
  }
  return { sent: true };
}
