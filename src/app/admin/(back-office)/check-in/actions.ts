"use server";

import { canChooseCheckInDay } from "@/lib/auth/access";
import { getCurrentCheckInAccount } from "@/lib/auth/session";
import { registrations } from "@/lib/server/registrations";
import type { CheckInScanResult } from "./check-in-result";

/** Longer text can't be an Event Pass; it's treated as unresolvable without being looked at. */
const MAX_SCAN_LENGTH = 2048;

/**
 * Checks an Attendee in from what was scanned or typed at the entrance, as the signed-in Account:
 * a Staff Account at the desk, or a Kiosk Account on the Kiosk page (ADR 0003). The Account's id
 * is recorded on the Check-In. `eventDay` is the ISO date Staff chose; leave it out to use today's
 * Event Day by the server's clock (Bangkok). A Kiosk Account always gets today's: its `eventDay`
 * is ignored. The one entry point for the typed form, the camera scanner, Kiosk mode and the
 * Kiosk page. A Server Action is a public endpoint, so it checks the session and the input itself.
 */
export async function checkInScan(request: { scan: string; eventDay?: string }): Promise<CheckInScanResult> {
  const account = await getCurrentCheckInAccount();
  if (!account) return { status: "signed-out" };

  const scan = typeof request?.scan === "string" && request.scan.length <= MAX_SCAN_LENGTH ? request.scan : "";
  const eventDay =
    canChooseCheckInDay(account.kind) && typeof request?.eventDay === "string" ? request.eventDay : undefined;

  return registrations().checkIn({ scan, eventDay, staffAccountId: account.id });
}
