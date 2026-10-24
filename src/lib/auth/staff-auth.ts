import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import * as authSchema from "@/lib/db/auth-schema";
import { ACCOUNT_KINDS, canChangeOwnPassword, isAccountKind } from "./access";
import { recordAccountChange } from "./account-history";
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
 * Builds the Better Auth instance for Account sign-in (Admin, Staff and Kiosk Accounts) on the given database.
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
      // No sign-up: Accounts are created only through the Accounts module, by an Admin on the Back
      // Office's New Account page or with the server command (ADR 0001, ADR 0004).
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
    },
    user: {
      additionalFields: {
        // Admin, Staff or Kiosk Account (`users.kind`, ADR 0003, ADR 0004), returned on every session.
        // `input: false`: no request can set it, not even /update-user from a signed-in Kiosk.
        kind: { type: [...ACCOUNT_KINDS], required: true, defaultValue: "staff", input: false },
        // Part 2 (account-management ticket 03), also returned on every session and never set from
        // a request. Only the Accounts module and the hooks below write them.
        mustChangePassword: { type: "boolean", required: true, defaultValue: false, input: false },
        disabledAt: { type: "date", required: false, input: false },
        lastSignedInAt: { type: "date", required: false, input: false },
      },
    },
    session: {
      expiresIn: SESSION_LIFETIME_SECONDS,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      session: {
        create: {
          // A disabled Account can't sign in (account-management ticket 08): its new session is
          // refused. Better Auth creates it only after the password matched, so a wrong password
          // still gets the usual "wrong email or password", and only someone who knows the password
          // learns that the Account is disabled (ADR 0004). Every new session comes through here, a
          // password change's fresh one too. Read straight from the table, like `.after`.
          before: async (session) => {
            const [user] = await db
              .select({ disabledAt: authSchema.users.disabledAt })
              .from(authSchema.users)
              .where(eq(authSchema.users.id, session.userId));
            if (user?.disabledAt) {
              throw APIError.from("FORBIDDEN", {
                message: "This Account is disabled. Ask an Admin to turn it back on.",
                code: "ACCOUNT_DISABLED",
              });
            }
          },
          // Last sign-in (account-management ticket 03): set as each session is created, for every
          // kind of Account, so an unused Kiosk iPad shows up like an unused helper. A wrong password
          // never gets here, and neither does a disabled Account, refused in `.before`. Changing a
          // password starts a fresh session too, which counts: its owner is there. Written straight
          // to the table: the endpoint context, and with it the internal adapter, can be null here.
          after: async (session) => {
            await db
              .update(authSchema.users)
              .set({ lastSignedInAt: session.createdAt })
              .where(eq(authSchema.users.id, session.userId));
          },
        },
      },
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
      // Names change only through the Accounts module (My Account, an Account's page; ADR 0004), so
      // this refuses the endpoint for everyone, signed in or not.
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
            message: "This Account's password is set by an Admin",
            code: "PASSWORD_CHANGE_NOT_ALLOWED",
          });
        }
      }),
      // The owner's own password change (My Account). Now only its owner knows the password, so it
      // no longer has to choose its own (`must_change_password`, account-management 05): cleared
      // first, so its owner isn't held at My Account even if recording fails. It is then an Account
      // Change like any other: recorded as `password-changed`, with the owner as actor. A refused or
      // failed change (wrong current password, a Kiosk Account, signed out) returns an error, so the
      // flag stays and nothing is recorded. Never the password.
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/change-password") return;
        const returned: unknown = ctx.context.returned;
        if (!returned || isAPIError(returned)) return;
        const ownerId = (returned as { user?: { id?: unknown } }).user?.id;
        if (typeof ownerId !== "string") throw new Error("The changed password's Account is unknown, so it isn't recorded");
        await db.update(authSchema.users).set({ mustChangePassword: false }).where(eq(authSchema.users.id, ownerId));
        await recordAccountChange(db, ownerId, { action: "password-changed" }, { accountId: ownerId });
      }),
    },
    telemetry: { enabled: false },
    // Must stay last: lets Server Actions that call `auth.api.*` set and clear the session cookie.
    plugins: writesCookies ? [nextCookies()] : [],
  });
}

export type StaffAuth = ReturnType<typeof createStaffAuth>;
