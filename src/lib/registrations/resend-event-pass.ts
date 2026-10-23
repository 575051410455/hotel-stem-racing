// Back Office single resend: Staff email one Registration its Event Pass again, for example while
// helping an Attendee on the phone. Part of the Registration module; exposed as `resendEventPass`
// on `createRegistrations`. Unlike the Duplicate Registration re-send (06), it is not throttled:
// Staff asked for it, and each click sends one email.

import { eq } from "drizzle-orm";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { isRegistrationId } from "./registration-id";
import {
  type EventPassEmailDependencies,
  type EventPassEmailRecipient,
  eventPassEmailColumns,
  sendEventPassEmail,
} from "./send-event-pass";

export type ResendEventPassResult =
  /** The email went out; the Registration's sent count and last-sent time are updated. */
  | { status: "sent" }
  /** Nothing was recorded. `reason` is the sender's English error, e.g. "EAUTH: Invalid login…". */
  | { status: "failed"; reason: string }
  /** SMTP is not set up (SMTP_USER empty), so nothing was attempted. */
  | { status: "email-not-configured" }
  /** No Registration has this id, for example because it was deleted. */
  | { status: "not-found" };

export function createResendEventPass(deps: EventPassEmailDependencies) {
  /**
   * Emails the Registration with this id its Event Pass, at the address it was registered with.
   * Never throws: every failure, including a database error, comes back as a result.
   */
  return async function resendEventPass(id: number): Promise<ResendEventPassResult> {
    // Anything else would make Postgres throw (out of range) or can't be a Registration anyway.
    if (!isRegistrationId(id)) return { status: "not-found" };

    let recipient: EventPassEmailRecipient | undefined;
    try {
      [recipient] = await deps.db
        .select(eventPassEmailColumns)
        .from(registrationsTable)
        .where(eq(registrationsTable.id, id))
        .limit(1);
    } catch (error) {
      console.error(`Event Pass resend: Registration ${id} could not be read:`, error);
      return { status: "failed", reason: "Registration could not be read" };
    }
    if (!recipient) return { status: "not-found" };
    if (!deps.emailSender.configured) return { status: "email-not-configured" };

    // Never throws, and records the send (count and time) by token on success.
    const outcome = await sendEventPassEmail(deps, recipient);
    return outcome.sent ? { status: "sent" } : { status: "failed", reason: outcome.error };
  };
}
