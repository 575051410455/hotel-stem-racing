import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { createDatabase } from "@/lib/db/client";

/**
 * Creates a freshly migrated database for one test file and drops it afterwards.
 * Every call gets its own database, so parallel test runs (and parallel agents) never share data.
 * Call `reset()` in `beforeEach` to give each test a clean slate.
 */
export async function createTestDatabase() {
  const adminUrl =
    process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://localhost:5432/postgres";
  const name = `stem_test_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create database "${name}"`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const { db, close } = createDatabase(url.toString());
  await migrate(db, { migrationsFolder: "drizzle" });

  const client = postgres(url.toString(), { max: 1, onnotice: () => {} });

  return {
    db,
    /** Empties every application table (migration bookkeeping lives in its own schema). */
    async reset() {
      const tables = await client<{ tablename: string }[]>`
        select tablename from pg_tables where schemaname = 'public'`;
      if (tables.length === 0) return;
      const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
      await client.unsafe(`truncate ${list} restart identity cascade`);
    },
    async drop() {
      await client.end();
      await close();
      await admin.unsafe(`drop database if exists "${name}" with (force)`);
      await admin.end();
    },
  };
}
