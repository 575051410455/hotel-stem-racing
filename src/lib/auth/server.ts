import "server-only";
import { createDatabase, type Database } from "@/lib/db/client";
import { readStaffAuthEnv } from "./env";
import { createAccounts, type Accounts } from "./accounts";
import { createStaffAuth, type StaffAuth } from "./staff-auth";

// Composition root for Staff sign-in: the one place in the app that turns env into the auth instance.
// Built lazily, so `next build` never needs the database or the secret.

const globalForStaffAuth = globalThis as unknown as {
  staffAuth?: StaffAuth;
  staffSessionReader?: StaffAuth;
  staffAuthDatabase?: Database;
};

function buildStaffAuth(writesCookies: boolean): StaffAuth {
  const { databaseUrl, secret, baseURL } = readStaffAuthEnv();
  // Both instances share one connection pool.
  globalForStaffAuth.staffAuthDatabase ??= createDatabase(databaseUrl).db;
  return createStaffAuth({ db: globalForStaffAuth.staffAuthDatabase, secret, baseURL, writesCookies });
}

export function staffAuth(): StaffAuth {
  globalForStaffAuth.staffAuth ??= buildStaffAuth(true);
  return globalForStaffAuth.staffAuth;
}

/**
 * The same sign-in without `nextCookies()`: a session read through it never writes a cookie, even
 * in a Server Action. For reads only; sign-in, sign-out and password changes go through `staffAuth()`.
 */
export function staffSessionReader(): StaffAuth {
  globalForStaffAuth.staffSessionReader ??= buildStaffAuth(false);
  return globalForStaffAuth.staffSessionReader;
}

/** The Accounts module on the app's auth instance, for Back Office Server Actions. */
export function accounts(): Accounts {
  return createAccounts(staffAuth());
}
