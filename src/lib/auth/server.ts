import "server-only";
import { createDatabase } from "@/lib/db/client";
import { readStaffAuthEnv } from "./env";
import { createStaffAccounts, type StaffAccounts } from "./staff-accounts";
import { createStaffAuth, type StaffAuth } from "./staff-auth";

// Composition root for Staff sign-in: the one place in the app that turns env into the auth instance.
// Built lazily, so `next build` never needs the database or the secret.

const globalForStaffAuth = globalThis as unknown as { staffAuth?: StaffAuth };

export function staffAuth(): StaffAuth {
  if (!globalForStaffAuth.staffAuth) {
    const { databaseUrl, secret, baseURL } = readStaffAuthEnv();
    const { db } = createDatabase(databaseUrl);
    globalForStaffAuth.staffAuth = createStaffAuth({ db, secret, baseURL });
  }
  return globalForStaffAuth.staffAuth;
}

/** The Accounts module on the app's auth instance, for Back Office Server Actions. */
export function staffAccounts(): StaffAccounts {
  return createStaffAccounts(staffAuth());
}
