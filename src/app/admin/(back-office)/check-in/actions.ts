"use server";

import { getCurrentStaff } from "@/lib/auth/session";
import { registrations } from "@/lib/server/registrations";
import type { CheckInScanResult } from "./check-in-result";

/** Longer text can't be an Event Pass; it's treated as unresolvable without being looked at. */
const MAX_SCAN_LENGTH = 2048;

/**
 * Checks an Attendee in from what was scanned or typed at the entrance, as the signed-in Staff
 * Account. `eventDay` is the ISO date Staff chose; leave it out to use today's Event Day by the
 * server's clock (Bangkok). The one entry point for the typed form, the camera scanner and Kiosk
 * mode. A Server Action is a public endpoint, so it checks the session and the input itself.
 */
export async function checkInScan(request: { scan: string; eventDay?: string }): Promise<CheckInScanResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { status: "signed-out" };

  const scan = typeof request?.scan === "string" && request.scan.length <= MAX_SCAN_LENGTH ? request.scan : "";
  const eventDay = typeof request?.eventDay === "string" ? request.eventDay : undefined;

  return registrations().checkIn({ scan, eventDay, staffAccountId: staff.id });
}
