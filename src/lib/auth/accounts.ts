import { type AccountKind, canEditOwnName, isAccountKind } from "./access";
import { MAX_NAME_LENGTH } from "./name-rules";
import type { StaffAuth } from "./staff-auth";

export type CreateAccountInput = {
  email: string;
  name: string;
  password: string;
  /** A Staff Account (the default; check-in desk only), an Admin Account, or a Kiosk Account (ADR 0003, ADR 0004). */
  kind?: AccountKind;
};
export type CreateFirstAdminAccountInput = Omit<CreateAccountInput, "kind">;
export type ResetPasswordInput = { email: string; password: string };

type PasswordProblem =
  | { status: "password-too-short"; minLength: number }
  | { status: "password-too-long"; maxLength: number };

type NewAccountProblem = { status: "invalid-email" } | { status: "invalid-name" } | PasswordProblem;

export type CreateAccountResult =
  | { status: "created"; accountId: string; email: string; kind: AccountKind }
  | { status: "email-taken" }
  | NewAccountProblem;

export type CreateFirstAdminAccountResult = CreateAccountResult | { status: "admin-account-exists" };

export type MakeAdminResult =
  | { status: "promoted"; accountId: string; from: AccountKind }
  | { status: "already-admin"; accountId: string }
  | { status: "not-found" };

export type RenameResult =
  | { status: "renamed"; name: string }
  | { status: "invalid-name" }
  | { status: "name-too-long"; maxLength: number }
  | { status: "not-allowed" }
  | { status: "not-found" };

export type ResetPasswordResult =
  | { status: "password-reset"; accountId: string; kind: AccountKind }
  | { status: "not-found" }
  | PasswordProblem;

/** An Account as the Accounts pages show it (GLOSSARY: Account). Never a password or its hash. */
export type Account = {
  id: string;
  name: string;
  email: string;
  kind: AccountKind;
  /** When an Admin disabled it; null while it is enabled. */
  disabledAt: Date | null;
  /** Its owner must choose their own password at the next sign-in. */
  mustChangePassword: boolean;
  /** When it last signed in; null if it never has ("Never"). */
  lastSignedInAt: Date | null;
  createdAt: Date;
};

/** One place an Account is signed in (a Better Auth session), as its owner sees it on My Account. */
export type SignedInDevice = {
  /** The session's id: not secret, unlike its token, which this never carries. */
  id: string;
  /** As the browser sent it at sign-in; null when it sent none. `deviceLabel()` names it. */
  userAgent: string | null;
  /** The visitor IP at sign-in (ADR 0005); null when unknown. */
  ipAddress: string | null;
  /** When it signed in. */
  createdAt: Date;
  /** The device this request comes from. */
  isCurrent: boolean;
};

/** Not found: no such session on this Account, or it is the device asking (it signs out from the account menu). */
export type SignOutDeviceResult = { status: "device-signed-out" } | { status: "not-found" };

export type SignOutOtherDevicesResult = { status: "other-devices-signed-out"; count: number };

// Deliberately loose: the operator types the address, and Better Auth lower-cases and stores it as given.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** The internal adapter types users without our additional field; the column is never null. */
function kindOf(user: { email: string }): AccountKind {
  const { kind } = user as { kind?: unknown };
  if (!isAccountKind(kind)) throw new Error(`${user.email} has an unknown Account kind: ${String(kind)}`);
  return kind;
}

/** The internal adapter's user, typed without our additional fields, as an `Account`. */
function toAccount(user: { id: string; name: string; email: string; createdAt: Date }): Account {
  const { mustChangePassword, disabledAt, lastSignedInAt } = user as {
    mustChangePassword?: unknown;
    disabledAt?: unknown;
    lastSignedInAt?: unknown;
  };
  const dateOrNull = (value: unknown) => (value instanceof Date ? value : null);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    kind: kindOf(user),
    disabledAt: dateOrNull(disabledAt),
    mustChangePassword: mustChangePassword === true,
    lastSignedInAt: dateOrNull(lastSignedInAt),
    createdAt: user.createdAt,
  };
}

/**
 * Names in Thai dictionary order, like the Registration list's (a leading vowel such as เ files under
 * the consonant after it), with Latin letters ignoring case.
 */
const nameOrder = new Intl.Collator("th");

/** The Accounts list's order: enabled Accounts first, then disabled ones, each group by name. */
function enabledFirstByName(a: Account, b: Account): number {
  return (
    Number(a.disabledAt !== null) - Number(b.disabledAt !== null) ||
    nameOrder.compare(a.name, b.name) ||
    a.email.localeCompare(b.email)
  );
}

/**
 * The Accounts module (ADR 0004): creates Accounts of every kind (Admin, Staff, Kiosk), promotes
 * them to Admin, renames them and resets their passwords. It is the code path behind `npm run staff`,
 * `npm run seed` and My Account, and the one place that writes Accounts. Public sign-up is disabled
 * (ADR 0001), so this writes through Better Auth's server-side context (`auth.$context`), with the
 * same steps as its sign-up endpoint: hash, create user, link credential. It is also the only way
 * to set an Account's kind or name, which Better Auth refuses from requests. Password length
 * limits come from the auth config, so the commands and sign-in always agree, for every kind.
 */
export function createAccounts(auth: StaffAuth) {
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

  async function checkNewAccount(input: CreateAccountInput): Promise<NewAccountProblem | null> {
    if (!EMAIL_PATTERN.test(normaliseEmail(input.email))) return { status: "invalid-email" };
    if (!input.name.trim()) return { status: "invalid-name" };
    return checkPassword(input.password);
  }

  const accounts = {
    /**
     * Creates an Admin Account only while none exists, for `npm run seed` on a fresh deploy. Staff
     * and Kiosk Accounts don't count, so a database without an Admin still gets one. Never changes
     * an Account: an email that is already taken (by any kind) is reported, not promoted.
     */
    async createFirst(input: CreateFirstAdminAccountInput): Promise<CreateFirstAdminAccountResult> {
      const account = { ...input, kind: "admin" } satisfies CreateAccountInput;
      // Checked first, so a wrong `.env` is reported even when there is nothing to create.
      const problem = await checkNewAccount(account);
      if (problem) return problem;

      const ctx = await auth.$context;
      if ((await ctx.internalAdapter.countTotalUsers([{ field: "kind", value: account.kind }])) > 0) {
        return { status: "admin-account-exists" };
      }
      return accounts.create(account);
    },

    async create(input: CreateAccountInput): Promise<CreateAccountResult> {
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

    /**
     * The owner's own rename, from My Account. The only way a name changes: Better Auth's own
     * `/update-user` is refused (see staff-auth.ts). Sessions stay; they read the name afresh.
     */
    async rename(accountId: string, name: string): Promise<RenameResult> {
      const trimmed = name.trim();
      if (!trimmed) return { status: "invalid-name" };
      if (trimmed.length > MAX_NAME_LENGTH) return { status: "name-too-long", maxLength: MAX_NAME_LENGTH };

      const ctx = await auth.$context;
      const user = await ctx.internalAdapter.findUserById(accountId);
      if (!user) return { status: "not-found" };
      // A Kiosk's name is set by whoever creates it; the Kiosk can't change it (ADR 0003).
      if (!canEditOwnName(kindOf(user))) return { status: "not-allowed" };
      await ctx.internalAdapter.updateUser(accountId, { name: trimmed });
      return { status: "renamed", name: trimmed };
    },

    /** Sets a new password and signs the Account out everywhere, Kiosks included. Its kind stays. */
    async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
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

    /** Every Account, of every kind, for the Accounts list: enabled first, then disabled, each by name. */
    async list(): Promise<Account[]> {
      const ctx = await auth.$context;
      // Better Auth returns at most 100 rows unless told how many to read.
      const users = await ctx.internalAdapter.listUsers(await ctx.internalAdapter.countTotalUsers());
      return users.map(toAccount).sort(enabledFirstByName);
    },

    /** One Account by its id, for its page; null when there is none. */
    async get(accountId: string): Promise<Account | null> {
      const ctx = await auth.$context;
      const user = await ctx.internalAdapter.findUserById(accountId);
      return user ? toAccount(user) : null;
    },

    /**
     * Where the Account is signed in, for its owner on My Account: each unexpired session, the one
     * `currentSessionId` names first, then newest first. Never the session token, which is what
     * signs a browser in; a session's id doesn't. Records no Account Change.
     */
    async listDevices(accountId: string, currentSessionId: string): Promise<SignedInDevice[]> {
      const ctx = await auth.$context;
      const sessions = await ctx.internalAdapter.listSessions(accountId, { onlyActiveSessions: true });
      return sessions
        .map(
          ({ id, userAgent, ipAddress, createdAt }): SignedInDevice => ({
            id,
            // Better Auth stores "" when the request had no such header.
            userAgent: userAgent || null,
            ipAddress: ipAddress || null,
            createdAt,
            isCurrent: id === currentSessionId,
          }),
        )
        .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.createdAt.getTime() - a.createdAt.getTime());
    },

    /**
     * Signs one of the Account's other devices out, for its owner on My Account: it ends on its next
     * request. Takes the session's id, as `listDevices` gives it; the token it is deleted by is looked
     * up here and never leaves the server. Records no Account Change.
     */
    async signOutDevice(accountId: string, sessionId: string, currentSessionId: string): Promise<SignOutDeviceResult> {
      // This device signs out from the account menu, which also clears its cookie.
      if (sessionId === currentSessionId) return { status: "not-found" };
      const ctx = await auth.$context;
      const sessions = await ctx.internalAdapter.listSessions(accountId);
      const session = sessions.find(({ id }) => id === sessionId);
      if (!session) return { status: "not-found" };
      await ctx.internalAdapter.deleteSession(session.token);
      return { status: "device-signed-out" };
    },

    /**
     * Signs out every device of the Account except the one `currentSessionId` names, for its owner on
     * My Account (after losing a phone, say). `count` is how many were signed out. Records no Account
     * Change.
     */
    async signOutOtherDevices(accountId: string, currentSessionId: string): Promise<SignOutOtherDevicesResult> {
      const ctx = await auth.$context;
      const others = (await ctx.internalAdapter.listSessions(accountId)).filter(({ id }) => id !== currentSessionId);
      if (others.length > 0) await ctx.internalAdapter.deleteSessions(others.map(({ token }) => token));
      return { status: "other-devices-signed-out", count: others.length };
    },
  };
  return accounts;
}

export type Accounts = ReturnType<typeof createAccounts>;
