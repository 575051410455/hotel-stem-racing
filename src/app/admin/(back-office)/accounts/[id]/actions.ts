"use server";

import { refresh } from "next/cache";
import { isAccountKind } from "@/lib/auth/access";
import type { SetPasswordResult, UpdateAccountResult } from "@/lib/auth/accounts";
import { accounts } from "@/lib/auth/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { text } from "../action-input";

// An Account's page saves through these. A Server Action is a public endpoint, so each checks the
// session itself: anyone but an Admin (signed out, Staff, Kiosk, or an Admin who must choose their
// own password first) is refused like a signed-out request. The actor is the signed-in Admin, from
// the session, never from the browser. The Accounts module applies every rule, including the ones
// about the Admin's own Account. On success the page and the sidebar's account menu are read again.

export type UpdateAccountActionResult = UpdateAccountResult | { status: "invalid-kind" } | { status: "signed-out" };

/**
 * Saves the details form: name, email and kind, all three sent each time; the module saves and
 * records only what changed. The kind must be one of the three.
 */
export async function updateAccount(accountId: unknown, input: unknown): Promise<UpdateAccountActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { status: "signed-out" };
  if (typeof accountId !== "string") return { status: "not-found" };

  const kind = text(input, "kind");
  if (!isAccountKind(kind)) return { status: "invalid-kind" };
  const result = await accounts().update(
    accountId,
    { name: text(input, "name"), email: text(input, "email"), kind },
    { accountId: admin.id },
  );
  if (result.status === "updated") refresh();
  return result;
}

export type SetAccountPasswordActionResult = SetPasswordResult | { status: "signed-out" };

/**
 * "Set a new password": signs the Account out everywhere, and a Staff or Admin Account's owner must
 * choose their own at the next sign-in. The browser checks the confirmation; only the password is
 * sent.
 */
export async function setAccountPassword(accountId: unknown, password: unknown): Promise<SetAccountPasswordActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { status: "signed-out" };
  if (typeof accountId !== "string") return { status: "not-found" };

  const result = await accounts().setPassword(accountId, typeof password === "string" ? password : "", {
    accountId: admin.id,
  });
  if (result.status === "password-set") refresh();
  return result;
}
