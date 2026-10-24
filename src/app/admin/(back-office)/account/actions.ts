"use server";

import { refresh } from "next/cache";
import { staffAccounts } from "@/lib/auth/server";
import { getCurrentStaff } from "@/lib/auth/session";
import type { RenameResult } from "@/lib/auth/staff-accounts";

export type RenameOwnAccountResult = RenameResult | { status: "signed-out" };

/**
 * Renames the signed-in Staff or Admin Account, from My Account. A Server Action is a public
 * endpoint, so it checks the session itself; the Accounts module applies the name rules and refuses
 * a Kiosk Account. On success the page and the sidebar's account menu are read again.
 */
export async function renameOwnAccount(name: unknown): Promise<RenameOwnAccountResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { status: "signed-out" };

  const result = await staffAccounts().rename(staff.id, typeof name === "string" ? name : "");
  if (result.status === "renamed") refresh();
  return result;
}
