import { createDatabase } from "@/lib/db/client";
import { createAccounts } from "./accounts";
import type { StaffAuthEnv } from "./env";
import { createStaffAuth } from "./staff-auth";

/**
 * The Accounts module as the server commands (`npm run seed`, `npm run staff`) build it, on a
 * database connection of their own that the command closes when it is done. The app builds its
 * shared instances in `server.ts`. Nothing here uses `server-only`: the commands run under tsx.
 */
export function openCommandAccounts({ databaseUrl, secret, baseURL }: StaffAuthEnv) {
  const { db, close } = createDatabase(databaseUrl);
  return { accounts: createAccounts(createStaffAuth({ db, secret, baseURL }), db), close };
}
