// How the Accounts pages show an Account, in English. Pure; safe in browser and server.

import type { AccountKind } from "@/lib/auth/access";
import type { Account } from "@/lib/auth/accounts";
import { bangkokEnglishDate, bangkokEnglishDateTime } from "@/lib/bangkok-time";

/** The kind's name (GLOSSARY: Admin Account, Staff Account, Kiosk Account). */
export const KIND_LABELS = {
  admin: "Admin",
  staff: "Staff",
  kiosk: "Kiosk",
} satisfies Record<AccountKind, string>;

/** "Enabled" or "Disabled", then "Must change password" while its owner has to choose their own. */
export function statusLabels({ disabledAt, mustChangePassword }: Pick<Account, "disabledAt" | "mustChangePassword">) {
  return [disabledAt ? "Disabled" : "Enabled", ...(mustChangePassword ? ["Must change password"] : [])];
}

/** "22 Oct 2026, 14:05" in Bangkok time, or "Never". */
export function lastSignInLabel(lastSignedInAt: Date | null): string {
  return lastSignedInAt ? bangkokEnglishDateTime(lastSignedInAt) : "Never";
}

/** "22 Oct 2026", on Bangkok's calendar. */
export function createdLabel(createdAt: Date): string {
  return bangkokEnglishDate(createdAt);
}
