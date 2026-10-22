import type { StaffAuth } from "./staff-auth";

export type CreateStaffAccountInput = { email: string; name: string; password: string };
export type ResetStaffPasswordInput = { email: string; password: string };

type PasswordProblem =
  | { status: "password-too-short"; minLength: number }
  | { status: "password-too-long"; maxLength: number };

export type CreateStaffAccountResult =
  | { status: "created"; staffAccountId: string; email: string }
  | { status: "invalid-email" }
  | { status: "invalid-name" }
  | { status: "email-taken" }
  | PasswordProblem;

export type ResetStaffPasswordResult =
  | { status: "password-reset"; staffAccountId: string }
  | { status: "not-found" }
  | PasswordProblem;

// Deliberately loose: the operator types the address, and Better Auth lower-cases and stores it as given.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/**
 * Creates Staff Accounts and resets their passwords. This is the code path behind `npm run staff`.
 * Public sign-up is disabled (ADR 0001), so this writes through Better Auth's server-side context
 * (`auth.$context`), with the same steps as its sign-up endpoint: hash, create user, link credential.
 * Password length limits come from the auth config, so the command and sign-in always agree.
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

  return {
    async create(input: CreateStaffAccountInput): Promise<CreateStaffAccountResult> {
      const email = normaliseEmail(input.email);
      const name = input.name.trim();
      if (!EMAIL_PATTERN.test(email)) return { status: "invalid-email" };
      if (!name) return { status: "invalid-name" };
      const passwordProblem = await checkPassword(input.password);
      if (passwordProblem) return passwordProblem;

      const ctx = await auth.$context;
      if (await ctx.internalAdapter.findUserByEmail(email)) return { status: "email-taken" };

      const hash = await ctx.password.hash(input.password);
      const user = await ctx.internalAdapter.createUser({ email, name }, { method: "email-password" });
      try {
        await ctx.internalAdapter.linkAccount({
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hash,
        });
      } catch (error) {
        // Don't leave a Staff Account behind that has no password and can never sign in.
        await ctx.internalAdapter.deleteUser(user.id);
        throw error;
      }
      return { status: "created", staffAccountId: user.id, email: user.email };
    },

    /** Sets a new password and signs the Staff Account out everywhere, Kiosks included. */
    async resetPassword(input: ResetStaffPasswordInput): Promise<ResetStaffPasswordResult> {
      const passwordProblem = await checkPassword(input.password);
      if (passwordProblem) return passwordProblem;

      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(normaliseEmail(input.email));
      if (!found) return { status: "not-found" };
      const userId = found.user.id;

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
      return { status: "password-reset", staffAccountId: userId };
    },
  };
}

export type StaffAccounts = ReturnType<typeof createStaffAccounts>;
