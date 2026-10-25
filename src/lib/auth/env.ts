import { databaseUrlFrom } from "@/lib/db/client";

/** The placeholder in .env.example; never a usable secret. */
const EXAMPLE_SECRET = "replace-with-output-of-openssl-rand-hex-32";

export type StaffAuthEnv = { databaseUrl: string; secret: string; baseURL: string };

/**
 * Reads what Staff sign-in needs from the environment, failing loudly instead of running with a weak
 * or missing secret. Shared by the app (`server.ts`) and the Staff management command (`scripts/staff.ts`).
 */
export function readStaffAuthEnv(env: NodeJS.ProcessEnv = process.env): StaffAuthEnv {
  const databaseUrl = databaseUrlFrom(env);
  const secret = env.BETTER_AUTH_SECRET;
  const baseURL = env.BETTER_AUTH_URL;
  if (!baseURL) throw new Error("BETTER_AUTH_URL is not set (the site's public origin, e.g. https://example.org)");
  if (!secret || secret === EXAMPLE_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not set: use the output of `openssl rand -hex 32`");
  }
  if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  return { databaseUrl, secret, baseURL };
}
