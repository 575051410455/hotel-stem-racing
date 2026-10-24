"use server";

import { refresh } from "next/cache";
import { accounts } from "@/lib/auth/server";
import { getCurrentStaff } from "@/lib/auth/session";
import type { RenameResult, SignOutDeviceResult, SignOutOtherDevicesResult } from "@/lib/auth/accounts";

export type RenameOwnAccountResult = RenameResult | { status: "signed-out" };

/**
 * Renames the signed-in Staff or Admin Account, from My Account. A Server Action is a public
 * endpoint, so it checks the session itself; the Accounts module applies the name rules and refuses
 * a Kiosk Account. On success the page and the sidebar's account menu are read again.
 */
export async function renameOwnAccount(name: unknown): Promise<RenameOwnAccountResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { status: "signed-out" };

  const result = await accounts().rename(staff.id, typeof name === "string" ? name : "");
  if (result.status === "renamed") refresh();
  return result;
}

export type SignOutDeviceActionResult = SignOutDeviceResult | { status: "signed-out" };

/**
 * Signs one of the owner's other devices out, from My Account's Signed-in devices. The browser sends
 * only the device's id; whose Account it is and which device is asking come from the session.
 * Signed-in devices is read again either way: not found mostly means the device was already gone.
 */
export async function signOutDevice(deviceId: unknown): Promise<SignOutDeviceActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { status: "signed-out" };

  const result =
    typeof deviceId === "string"
      ? await accounts().signOutDevice(staff.id, deviceId, staff.sessionId)
      : ({ status: "not-found" } as const);
  refresh();
  return result;
}

export type SignOutOtherDevicesActionResult = SignOutOtherDevicesResult | { status: "signed-out" };

/** Signs out every device of the owner's Account but this one, from My Account. Takes nothing from the browser. */
export async function signOutOtherDevices(): Promise<SignOutOtherDevicesActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { status: "signed-out" };

  const result = await accounts().signOutOtherDevices(staff.id, staff.sessionId);
  refresh();
  return result;
}
