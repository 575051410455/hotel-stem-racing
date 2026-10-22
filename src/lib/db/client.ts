import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

const schema = { ...appSchema, ...authSchema };

export function createDatabase(url: string) {
  const client = postgres(url, { max: 10, onnotice: () => {} });
  const db = drizzle({ client, schema, casing: "snake_case" });
  return { db, close: () => client.end() };
}

export type Database = ReturnType<typeof createDatabase>["db"];
