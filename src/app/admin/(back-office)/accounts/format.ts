// How the Accounts pages show an Account, in English. Pure; safe in browser and server.

import { bangkokEnglishDate, bangkokEnglishDateTime } from "@/lib/bangkok-time";

/** "22 Oct 2026, 14:05" in Bangkok time, or "Never". */
export function lastSignInLabel(lastSignedInAt: Date | null): string {
  return lastSignedInAt ? bangkokEnglishDateTime(lastSignedInAt) : "Never";
}

/** "22 Oct 2026", on Bangkok's calendar. */
export function createdLabel(createdAt: Date): string {
  return bangkokEnglishDate(createdAt);
}
