"use server";

import { isAccountKind } from "@/lib/auth/access";
import type { CreateAccountResult } from "@/lib/auth/accounts";
import { accounts } from "@/lib/auth/server";
import { getCurrentAdmin } from "@/lib/auth/session";

export type CreateAccountActionResult = CreateAccountResult | { status: "invalid-kind" } | { status: "signed-out" };

/** A text field of what the browser sent, or "" when it's missing or not text. */
function text(input: unknown, field: string): string {
  const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>)[field] : undefined;
  return typeof value === "string" ? value : "";
}

/**
 * Creates an Account of any kind, from the Back Office's New Account page, recorded with the
 * signed-in Admin as actor. A Server Action is a public endpoint, so it checks the session itself:
 * anyone but an Admin (signed out, Staff, Kiosk, or an Admin who must choose their own password
 * first) is refused like a signed-out request. The Accounts module applies every other rule and
 * flags a new Staff or Admin Account to choose its own password. The kind must be one of the three;
 * it never falls back to the module's default. The browser checks the password's confirmation;
 * only the password is sent.
 */
export async function createAccount(input: unknown): Promise<CreateAccountActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { status: "signed-out" };

  const kind = text(input, "kind");
  if (!isAccountKind(kind)) return { status: "invalid-kind" };
  return accounts().create(
    { name: text(input, "name"), email: text(input, "email"), password: text(input, "password"), kind },
    { accountId: admin.id },
  );
}
