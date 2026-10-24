import { type AccountKind, isAccountKind } from "./access";
import type { StaffAuth } from "./staff-auth";

export type CreateStaffAccountInput = {
  email: string;
  name: string;
  password: string;
  /** A Staff Account (the default; check-in desk only), an Admin Account, or a Kiosk Account (ADR 0003, ADR 0004). */
  kind?: AccountKind;
};
export type CreateFirstStaffAccountInput = Omit<CreateStaffAccountInput, "kind">;
export type ResetStaffPasswordInput = { email: string; password: string };

type PasswordProblem =
  | { status: "password-too-short"; minLength: number }
  | { status: "password-too-long"; maxLength: number };

type NewAccountProblem = { status: "invalid-email" } | { status: "invalid-name" } | PasswordProblem;

export type CreateStaffAccountResult =
  | { status: "created"; accountId: string; email: string; kind: AccountKind }
  | { status: "email-taken" }
  | NewAccountProblem;

export type CreateFirstStaffAccountResult = CreateStaffAccountResult | { status: "admin-account-exists" };

export type MakeAdminResult =
  | { status: "promoted"; accountId: string; from: AccountKind }
  | { status: "already-admin"; accountId: string }
  | { status: "not-found" };

export type ResetStaffPasswordResult =
  | { status: "password-reset"; accountId: string; kind: AccountKind }
  | { status: "not-found" }
  | PasswordProblem;

// Deliberately loose: the operator types the address, and Better Auth lower-cases and stores it as given.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** The internal adapter types users without our additional field; the column is never null. */
function kindOf(user: { email: string }): AccountKind {
  const { kind } = user as { kind?: unknown };
  if (!isAccountKind(kind)) throw new Error(`${user.email} has an unknown Account kind: ${String(kind)}`);
  return kind;
}

/**
 * Creates Accounts of every kind (Admin, Staff, Kiosk), promotes them to Admin, and resets their
 * passwords. This is the code path behind
 * `npm run staff` and `npm run seed`. Public sign-up is disabled (ADR 0001), so this writes
 * through Better Auth's server-side context (`auth.$context`), with the same steps as its sign-up
 * endpoint: hash, create user, link credential. It is also the only way to set an Account's kind,
 * which Better Auth refuses from requests. Password length limits come from the auth config, so
 * the commands and sign-in always agree, for both kinds.
 */
export function createStaffAccounts(auth: StaffAuth) {
  async function checkPassword(password: string): Promise<PasswordProblem | null> {
    const { minPasswordLength, maxPasswordLength } = (await auth.$context).password.config;
    if (password.length < minPasswordLength) {
      return { status: "password-too-short", minLength: minPasswordLength };
    }
    if (password.length > maxPasswordLength) {
      return { status: "password-too-long", maxLength: maxPasswordLength };
    }
    return null;
  }

  async function checkNewAccount(input: CreateStaffAccountInput): Promise<NewAccountProblem | null> {
    if (!EMAIL_PATTERN.test(normaliseEmail(input.email))) return { status: "invalid-email" };
    if (!input.name.trim()) return { status: "invalid-name" };
    return checkPassword(input.password);
  }

  const staffAccounts = {
    /**
     * Creates an Admin Account only while none exists, for `npm run seed` on a fresh deploy. Staff
     * and Kiosk Accounts don't count, so a database without an Admin still gets one. Never changes
     * an Account: an email that is already taken (by any kind) is reported, not promoted.
     */
    async createFirst(input: CreateFirstStaffAccountInput): Promise<CreateFirstStaffAccountResult> {
      const account = { ...input, kind: "admin" } satisfies CreateStaffAccountInput;
      // Checked first, so a wrong `.env` is reported even when there is nothing to create.
      const problem = await checkNewAccount(account);
      if (problem) return problem;

      const ctx = await auth.$context;
      if ((await ctx.internalAdapter.countTotalUsers([{ field: "kind", value: account.kind }])) > 0) {
        return { status: "admin-account-exists" };
      }
      return staffAccounts.create(account);
    },

    async create(input: CreateStaffAccountInput): Promise<CreateStaffAccountResult> {
      const problem = await checkNewAccount(input);
      if (problem) return problem;
      const email = normaliseEmail(input.email);
      const name = input.name.trim();
      const kind = input.kind ?? "staff";

      const ctx = await auth.$context;
      if (await ctx.internalAdapter.findUserByEmail(email)) return { status: "email-taken" };

      const hash = await ctx.password.hash(input.password);
      const user = await ctx.internalAdapter.createUser({ email, name, kind }, { method: "email-password" });
      try {
        await ctx.internalAdapter.linkAccount({
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hash,
        });
      } catch (error) {
        // Don't leave an Account behind that has no password and can never sign in.
        await ctx.internalAdapter.deleteUser(user.id);
        throw error;
      }
      return { status: "created", accountId: user.id, email: user.email, kind };
    },

    /**
     * Makes an existing Account an Admin Account and signs it out everywhere, so no open session
     * keeps its old kind. For `npm run staff -- make-admin`: the way to appoint Admins on a database
     * that already has Accounts, and back in when no Admin can sign in.
     */
    async makeAdmin(email: string): Promise<MakeAdminResult> {
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(normaliseEmail(email));
      if (!found) return { status: "not-found" };
      const userId = found.user.id;
      const from = kindOf(found.user);
      if (from === "admin") return { status: "already-admin", accountId: userId };

      await ctx.internalAdapter.updateUser(userId, { kind: "admin" });
      await ctx.internalAdapter.deleteUserSessions(userId);
      return { status: "promoted", accountId: userId, from };
    },

    /** Sets a new password and signs the Account out everywhere, Kiosks included. Its kind stays. */
    async resetPassword(input: ResetStaffPasswordInput): Promise<ResetStaffPasswordResult> {
      const passwordProblem = await checkPassword(input.password);
      if (passwordProblem) return passwordProblem;

      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(normaliseEmail(input.email));
      if (!found) return { status: "not-found" };
      const userId = found.user.id;
      const kind = kindOf(found.user);

      const hash = await ctx.password.hash(input.password);
      if (await ctx.internalAdapter.findCredentialAccount(userId)) {
        await ctx.internalAdapter.updatePassword(userId, hash);
      } else {
        await ctx.internalAdapter.linkAccount({
          userId,
          providerId: "credential",
          accountId: userId,
          password: hash,
        });
      }
      await ctx.internalAdapter.deleteUserSessions(userId);
      return { status: "password-reset", accountId: userId, kind };
    },
  };
  return staffAccounts;
}

export type StaffAccounts = ReturnType<typeof createStaffAccounts>;
