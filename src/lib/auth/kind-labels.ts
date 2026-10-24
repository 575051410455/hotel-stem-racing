// The kinds' English names in the Back Office: the Accounts list and the Account History. Pure; safe
// in browser and server. Relative imports only: the database schema loads it through drizzle-kit.

import type { AccountKind } from "./access";

/** The kind's name (GLOSSARY: Admin Account, Staff Account, Kiosk Account). */
export const KIND_LABELS = {
  admin: "Admin",
  staff: "Staff",
  kiosk: "Kiosk",
} satisfies Record<AccountKind, string>;
