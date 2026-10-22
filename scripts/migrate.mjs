// Applies the drizzle-kit SQL migrations in drizzle/ with drizzle-orm's postgres-js migrator.
//
// Idempotent: drizzle records applied migrations in drizzle.__drizzle_migrations and only runs
// newer ones, all inside one transaction. The app container runs this before `node server.js`.
// Plain ESM (no tsx) so container start-up needs nothing beyond drizzle-orm and postgres.
//
//   npm run migrate                      # locally, reads .env if present
//   node scripts/migrate.mjs             # in the container, env comes from Compose

import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const WAIT_ATTEMPTS = 30;
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

/**
 * After a host reboot Docker starts containers without waiting for health checks, so retry for
 * about 30 seconds. Each attempt uses a fresh client: a reused postgres-js client adds its own
 * growing reconnect backoff (up to 20s) between attempts.
 */
async function waitForDatabase() {
  for (let attempt = 1; ; attempt++) {
    const probe = postgres(url, { max: 1, connect_timeout: 5, onnotice: () => {} });
    try {
      await probe`select 1`;
      return;
    } catch (error) {
      if (attempt >= WAIT_ATTEMPTS) throw error;
      console.log(`[migrate] database not reachable yet (${error.code ?? error.message}), retrying…`);
      await sleep(1000);
    } finally {
      await probe.end({ timeout: 1 });
    }
  }
}

const client = postgres(url, { max: 1, onnotice: () => {} });

async function appliedCount() {
  const [{ journal }] =
    await client`select to_regclass('drizzle.__drizzle_migrations') as journal`;
  if (!journal) return 0;
  const [{ count }] = await client`select count(*)::int as count from drizzle.__drizzle_migrations`;
  return count;
}

try {
  await waitForDatabase();
  const before = await appliedCount();
  await migrate(drizzle({ client }), { migrationsFolder });
  const after = await appliedCount();
  console.log(`[migrate] applied ${after - before} new migration(s); ${after} in total`);
} catch (error) {
  console.error("[migrate] failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
