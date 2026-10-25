import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

const schema = { ...appSchema, ...authSchema };

/**
 * DATABASE_URL, failing loudly when it is missing. Call it when building a connection, never at
 * import: the Docker build has no database. `scripts/migrate.mjs` keeps its own check: it is plain
 * ESM and can't load this TypeScript.
 */
export function databaseUrlFrom(env: NodeJS.ProcessEnv): string {
  const url = env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function createDatabase(url: string) {
  const client = postgres(url, { max: 10, onnotice: () => {} });
  const db = drizzle({ client, schema, casing: "snake_case" });
  return { db, close: () => client.end() };
}

export type Database = ReturnType<typeof createDatabase>["db"];
