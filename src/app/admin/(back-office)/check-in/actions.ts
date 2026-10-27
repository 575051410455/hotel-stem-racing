"use server";

import { canChooseCheckInDay, canUseCheckInDesk } from "@/lib/auth/access";
import { getCurrentCheckInAccount } from "@/lib/auth/session";
import type { StaffConfirmationResult, StaffInspectionResult } from "@/lib/check-in/staff-flow";
import { registrations } from "@/lib/server/registrations";
import type { CheckInScanResult } from "./check-in-result";

/** Longer text can't be an Event Pass; it's treated as unresolvable without being looked at. */
const MAX_SCAN_LENGTH = 2048;

function scanText(scan: unknown): string {
  return typeof scan === "string" && scan.length <= MAX_SCAN_LENGTH ? scan : "";
}

/** Staff-only lookup: a preview never records arrival or refreshes a session cookie. */
export async function inspectCheckInScan(request: {
  scan: string;
  eventDay?: string;
}): Promise<StaffInspectionResult> {
  const account = await getCurrentCheckInAccount();
  if (!account || !canUseCheckInDesk(account.kind)) return { status: "signed-out" };
  return registrations().inspectCheckIn({
    scan: scanText(request?.scan),
    eventDay: typeof request?.eventDay === "string" ? request.eventDay : undefined,
  });
}

/** Explicit Staff confirmation; the reviewed day is required, and the server rechecks the pass. */
export async function confirmCheckInScan(request: {
  scan: string;
  eventDay: string;
}): Promise<StaffConfirmationResult> {
  const account = await getCurrentCheckInAccount();
  if (!account || !canUseCheckInDesk(account.kind)) return { status: "signed-out" };
  if (typeof request?.eventDay !== "string") return { status: "not-an-event-day" };
  return registrations().checkIn({
    scan: scanText(request?.scan),
    eventDay: request.eventDay,
    staffAccountId: account.id,
  });
}

/**
 * Immediate Check-In for the separate Kiosk (ADR 0003). Kiosk Accounts always use today's
 * Event Day by the server's Bangkok clock; their supplied day is ignored. The Staff desk uses
 * inspection and explicit confirmation above. Every entry point checks its own session/input.
 */
export async function checkInScan(request: { scan: string; eventDay?: string }): Promise<CheckInScanResult> {
  const account = await getCurrentCheckInAccount();
  if (!account) return { status: "signed-out" };

  const scan = scanText(request?.scan);
  const eventDay =
    canChooseCheckInDay(account.kind) && typeof request?.eventDay === "string" ? request.eventDay : undefined;

  return registrations().checkIn({ scan, eventDay, staffAccountId: account.id });
}
