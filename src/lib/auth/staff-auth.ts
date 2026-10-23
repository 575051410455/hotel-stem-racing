import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import type { Database } from "@/lib/db/client";
import * as authSchema from "@/lib/db/auth-schema";
import { ACCOUNT_KINDS } from "./access";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password-rules";

/**
 * 30 days. The spec asks for at least 7. A Kiosk signed in during setup has to stay signed in through
 * the whole Event, and Server Components cannot extend the session cookie (see the ticket 04 notes).
 */
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;

export type StaffAuthConfig = {
  db: Database;
  /** BETTER_AUTH_SECRET: signs session cookies. */
  secret: string;
  /** BETTER_AUTH_URL: the public origin, e.g. https://register.example.org. Also the trusted origin for CSRF checks. */
  baseURL: string;
};

/**
 * Builds the Better Auth instance for Account sign-in (Staff and Kiosk Accounts) on the given database.
 * The app builds one from env in `src/lib/auth/server.ts`; tests and `scripts/staff.ts` build their own.
 */
export function createStaffAuth({ db, secret, baseURL }: StaffAuthConfig) {
  return betterAuth({
    appName: "STEM Racing Thailand 2026 Back Office",
    secret,
    baseURL,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema, usePlural: true }),
    emailAndPassword: {
      enabled: true,
      // Accounts are created only by the server command (ADR 0001).
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
    },
    user: {
      additionalFields: {
        // Staff Account or Kiosk Account (`users.kind`, ADR 0003), returned on every session.
        // `input: false`: no request can set it, not even /update-user from a signed-in Kiosk.
        kind: { type: [...ACCOUNT_KINDS], required: true, defaultValue: "staff", input: false },
      },
    },
    session: {
      expiresIn: SESSION_LIFETIME_SECONDS,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      // Better Auth turns this off outside production by default; keep it on everywhere so dev and
      // tests behave like production. Built-in rules apply: /sign-in/* allows 3 requests per 10 s per IP.
      enabled: true,
      // In memory: the app runs as a single container (spec: Abuse protection).
      storage: "memory",
    },
    advanced: {
      ipAddress: {
        // nginx (ticket 03) restores the client IP from Cloudflare and must send it as X-Real-IP.
        // Better Auth only trusts a single-value header, so a raw X-Forwarded-For chain is ignored.
        ipAddressHeaders: ["x-real-ip", "x-forwarded-for"],
      },
    },
    telemetry: { enabled: false },
    // Must stay last: lets Server Actions that call `auth.api.*` set and clear the session cookie.
    plugins: [nextCookies()],
  });
}

export type StaffAuth = ReturnType<typeof createStaffAuth>;
