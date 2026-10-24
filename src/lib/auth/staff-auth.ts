import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import type { Database } from "@/lib/db/client";
import * as authSchema from "@/lib/db/auth-schema";
import { ACCOUNT_KINDS, canChangeOwnPassword, isAccountKind } from "./access";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password-rules";

/**
 * 30 days. The spec asks for at least 7. A Kiosk signed in during setup has to stay signed in through
 * the whole Event, and nothing it does extends the session: Server Components cannot write the
 * cookie (see the ticket 04 notes), and the check-in Server Action doesn't (`getCurrentCheckInAccount`).
 */
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;

export type StaffAuthConfig = {
  db: Database;
  /** BETTER_AUTH_SECRET: signs session cookies. */
  secret: string;
  /** BETTER_AUTH_URL: the public origin, e.g. https://register.example.org. Also the trusted origin for CSRF checks. */
  baseURL: string;
  /**
   * Whether `auth.api.*` calls in Server Actions write the cookies they set (Better Auth's
   * `nextCookies()`). Default true. False for an instance that only reads sessions: see
   * `staffSessionReader` in server.ts.
   */
  writesCookies?: boolean;
};

/**
 * Builds the Better Auth instance for Account sign-in (Staff and Kiosk Accounts) on the given database.
 * The app builds one from env in `src/lib/auth/server.ts`; tests, `scripts/staff.ts` and
 * `scripts/seed.ts` build their own.
 */
export function createStaffAuth({ db, secret, baseURL, writesCookies = true }: StaffAuthConfig) {
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
    hooks: {
      // Better Auth lets any signed-in Account change its own name (and image) at /update-user.
      // Names change only through the Accounts module (My Account, ADR 0004), so this refuses the
      // endpoint for everyone, signed in or not.
      //
      // Better Auth also lets any signed-in Account change its password. A Kiosk Account may not
      // (ADR 0003): My Account (/admin/account) already sends it back to the Kiosk, and this refuses the
      // endpoint. Fails closed: an unknown kind is refused too. A signed-out request falls through
      // to the endpoint's own 401.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/update-user") {
          throw APIError.from("FORBIDDEN", {
            message: "An Account's name is changed at My Account in the Back Office",
            code: "UPDATE_USER_NOT_ALLOWED",
          });
        }
        if (ctx.path !== "/change-password") return;
        const session = await getSessionFromCtx(ctx, { disableRefresh: true });
        if (!session) return;
        const { kind } = session.user as { kind?: unknown };
        if (!isAccountKind(kind) || !canChangeOwnPassword(kind)) {
          throw APIError.from("FORBIDDEN", {
            message: "This Account's password is changed with the server command",
            code: "PASSWORD_CHANGE_NOT_ALLOWED",
          });
        }
      }),
    },
    telemetry: { enabled: false },
    // Must stay last: lets Server Actions that call `auth.api.*` set and clear the session cookie.
    plugins: writesCookies ? [nextCookies()] : [],
  });
}

export type StaffAuth = ReturnType<typeof createStaffAuth>;
