import { type AccountKind, isAccountKind } from "./access";
import type { StaffAuth } from "./staff-auth";

export type CreateStaffAccountInput = {
  email: string;
  name: string;
  password: string;
  /** A Staff Account (the default) or a check-in-only Kiosk Account (ADR 0003). */
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

export type CreateFirstStaffAccountResult = CreateStaffAccountResult | { status: "staff-account-exists" };

export type ResetStaffPasswordResult =
  | { status: "password-reset"; accountId: string; kind: AccountKind }
  | { status: "not-found" }
  | PasswordProblem;

// Deliberately loose: the operator types the address, and Better Auth lower-cases and stores it as given.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/**
 * Creates Accounts, Staff or Kiosk, and resets their passwords. This is the code path behind
 * `npm run staff` and `npm run seed`. Public sign-up is disabled (ADR 0001), so this writes through Better Auth's
 * server-side context (`auth.$context`), with the same steps as its sign-up endpoint: hash, create
 * user, link credential. It is also the only way to set an Account's kind, which Better Auth
 * refuses from requests. Password length limits come from the auth config, so the command and
 * sign-in always agree, for both kinds.
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
     * Creates a Staff Account only while none exists, for `npm run seed` on a fresh deploy. Kiosk
     * Accounts don't count, so a database with only Kiosks still gets one. Never changes an Account.
     */
    async createFirst(input: CreateFirstStaffAccountInput): Promise<CreateFirstStaffAccountResult> {
      const account = { ...input, kind: "staff" } satisfies CreateStaffAccountInput;
      // Checked first, so a wrong `.env` is reported even when there is nothing to create.
      const problem = await checkNewAccount(account);
      if (problem) return problem;

      const ctx = await auth.$context;
      if ((await ctx.internalAdapter.countTotalUsers([{ field: "kind", value: account.kind }])) > 0) {
        return { status: "staff-account-exists" };
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

    /** Sets a new password and signs the Account out everywhere, Kiosks included. Its kind stays. */
    async resetPassword(input: ResetStaffPasswordInput): Promise<ResetStaffPasswordResult> {
      const passwordProblem = await checkPassword(input.password);
      if (passwordProblem) return passwordProblem;

      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(normaliseEmail(input.email));
      if (!found) return { status: "not-found" };
      const userId = found.user.id;
      // The internal adapter types users without our additional field; the column is never null.
      const { kind } = found.user as { kind?: unknown };
      if (!isAccountKind(kind)) throw new Error(`${found.user.email} has an unknown Account kind: ${String(kind)}`);

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
