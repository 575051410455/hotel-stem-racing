import type { Database } from "@/lib/db/client";
import { type AccountKind, canChangeOwnPassword, canEditOwnName, isAccountKind } from "./access";
import type { AccountChange, Actor } from "./account-changes";
import { type AccountHistoryPage, readAccountHistory, recordAccountChange } from "./account-history";
import { isValidAccountEmail } from "./email-rules";
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

/** What an Admin may change on an Account's page. A field left out stays as it is. */
export type AccountUpdate = { name?: string; email?: string; kind?: AccountKind };

type PasswordProblem =
  | { status: "password-too-short"; minLength: number }
  | { status: "password-too-long"; maxLength: number };

type NameProblem = { status: "invalid-name" } | { status: "name-too-long"; maxLength: number };

type NewAccountProblem = { status: "invalid-email" } | NameProblem | PasswordProblem;

export type CreateAccountResult =
  | { status: "created"; accountId: string; email: string; kind: AccountKind }
  | { status: "email-taken" }
  | NewAccountProblem;

export type CreateFirstAdminAccountResult = CreateAccountResult | { status: "admin-account-exists" };

export type MakeAdminResult =
  | { status: "promoted"; accountId: string; from: AccountKind }
  | { status: "already-admin"; accountId: string }
  | { status: "not-found" };

export type UpdateAccountResult =
  /** Saved, or nothing to save; `account` is as it is now. */
  | { status: "updated"; account: Account }
  | { status: "not-found" }
  | NameProblem
  | { status: "invalid-email" }
  | { status: "email-taken" }
  /** An Admin changing their own kind (rules about yourself apply only to an Account actor). */
  | { status: "own-kind" }
  /** Demoting the only enabled Admin Account: there is always at least one (ADR 0004). */
  | { status: "last-enabled-admin" };

export type RenameResult =
  | { status: "renamed"; name: string }
  | NameProblem
  | { status: "not-allowed" }
  | { status: "not-found" };

export type SetPasswordResult =
  /** `staysDisabled`: the Account was disabled, and setting its password doesn't enable it. */
  | { status: "password-set"; accountId: string; email: string; kind: AccountKind; staysDisabled: boolean }
  /** An Admin's own password is changed on My Account, by confirming the current one. */
  | { status: "own-account" }
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
 * The Accounts module (ADR 0004): creates Accounts of every kind (Admin, Staff, Kiosk), edits their
 * name, email and kind, promotes them to Admin and sets their passwords. It is the code path behind
 * `npm run staff`, `npm run seed`, My Account and the Accounts pages, and the one place that writes
 * Accounts. Public sign-up is disabled (ADR 0001), so this writes through Better Auth's server-side
 * context (`auth.$context`), with the same steps as its sign-up endpoint: hash, create user, link
 * credential. It is also the only way to set an Account's kind, name or email, which Better Auth
 * refuses from requests. Password length limits come from the auth config, so the commands and
 * sign-in always agree, for every kind.
 * Every write takes an `actor` and records an Account Change (the Account History) on `db`; a
 * no-op or a refusal records nothing. Rules about yourself (your own kind, your own password) apply
 * only to an Account actor, never to the server command. A password it sets (`create`,
 * `createFirst`, `setPassword`) is someone else's choice, so a Staff or Admin Account's owner must
 * choose their own at the next sign-in (`mustChangePassword`); the owner's own change clears it (a
 * hook in staff-auth.ts). Kiosk Accounts are never flagged.
 */
export function createAccounts(auth: StaffAuth, db: Database) {
  /**
   * Records an Account Change (the Account History), right after the change. Every write below
   * calls it with the `actor` it was given; the owner's own password change is recorded by a hook
   * in staff-auth.ts.
   */
  function record(accountId: string, change: AccountChange, actor: Actor): Promise<void> {
    return recordAccountChange(db, accountId, change, actor);
  }

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

  /** A name as it will be stored (already trimmed): not empty, at most 100 characters. */
  function checkName(name: string): NameProblem | null {
    if (!name) return { status: "invalid-name" };
    if (name.length > MAX_NAME_LENGTH) return { status: "name-too-long", maxLength: MAX_NAME_LENGTH };
    return null;
  }

  async function checkNewAccount(input: CreateAccountInput): Promise<NewAccountProblem | null> {
    if (!isValidAccountEmail(input.email)) return { status: "invalid-email" };
    // The same rule as an edit or the owner's rename, so an Account never starts with a name its owner couldn't save.
    return checkName(input.name.trim()) ?? checkPassword(input.password);
  }

  /** Whether `actor` is the Account itself: an Admin on their own Account's page, or the owner. */
  const isOwnAccount = (accountId: string, actor: Actor) => actor !== "server-command" && actor.accountId === accountId;

  /**
   * How many enabled Admin Accounts there are besides this one. None means this one is the last
   * enabled Admin, which must stay one (ADR 0004). Two Admins demoting each other in the same
   * instant could both pass: accepted (spec), and `make-admin` is the way back.
   */
  async function otherEnabledAdmins(accountId: string): Promise<number> {
    const ctx = await auth.$context;
    return ctx.internalAdapter.countTotalUsers([
      { field: "kind", value: "admin" },
      { field: "disabledAt", value: null },
      { field: "id", operator: "ne", value: accountId },
    ]);
  }

  const accounts = {
    /**
     * Creates an Admin Account only while none exists, for `npm run seed` on a fresh deploy. Staff
     * and Kiosk Accounts don't count, so a database without an Admin still gets one. Never changes
     * an Account: an email that is already taken (by any kind) is reported, not promoted.
     */
    async createFirst(input: CreateFirstAdminAccountInput, actor: Actor): Promise<CreateFirstAdminAccountResult> {
      const account = { ...input, kind: "admin" } satisfies CreateAccountInput;
      // Checked first, so a wrong `.env` is reported even when there is nothing to create.
      const problem = await checkNewAccount(account);
      if (problem) return problem;

      const ctx = await auth.$context;
      if ((await ctx.internalAdapter.countTotalUsers([{ field: "kind", value: account.kind }])) > 0) {
        return { status: "admin-account-exists" };
      }
      return accounts.create(account, actor);
    },

    /**
     * Creates an Account of any kind, for an Admin on the Back Office's New Account page or the
     * commands. An email that any Account already has, enabled or disabled, is taken: one person,
     * one Account.
     */
    async create(input: CreateAccountInput, actor: Actor): Promise<CreateAccountResult> {
      const problem = await checkNewAccount(input);
      if (problem) return problem;
      const email = normaliseEmail(input.email);
      const name = input.name.trim();
      const kind = input.kind ?? "staff";

      const ctx = await auth.$context;
      if (await ctx.internalAdapter.findUserByEmail(email)) return { status: "email-taken" };

      const hash = await ctx.password.hash(input.password);
      // Whoever creates it chose the password, so its owner chooses their own at the first sign-in.
      const mustChangePassword = canChangeOwnPassword(kind);
      const user = await ctx.internalAdapter.createUser(
        { email, name, kind, mustChangePassword },
        { method: "email-password" },
      );
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
      await record(user.id, { action: "created", details: { kind } }, actor);
      return { status: "created", accountId: user.id, email: user.email, kind };
    },

    /**
     * Makes an existing Account an Admin Account and signs it out everywhere, so no open session
     * keeps its old kind. For `npm run staff -- make-admin`: the way to appoint Admins on a database
     * that already has Accounts, and back in when no Admin can sign in.
     */
    async makeAdmin(email: string, actor: Actor): Promise<MakeAdminResult> {
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(normaliseEmail(email));
      if (!found) return { status: "not-found" };
      const userId = found.user.id;
      const from = kindOf(found.user);
      if (from === "admin") return { status: "already-admin", accountId: userId };

      await ctx.internalAdapter.updateUser(userId, { kind: "admin" });
      await ctx.internalAdapter.deleteUserSessions(userId);
      await record(userId, { action: "kind-changed", details: { from, to: "admin" } }, actor);
      return { status: "promoted", accountId: userId, from };
    },

    /**
     * Changes an Account's name, email or kind, for an Admin on the Account's page. A field that is
     * left out or stays the same is neither checked nor recorded, so an Account keeps a name or email
     * that today's rules wouldn't allow until someone changes it. All or nothing: any refusal
     * changes nothing. Each field that changes is recorded on its own, with its old and new value.
     * The name is trimmed, not empty and at most 100 characters. The email is trimmed and
     * lower-cased, and refused when any other Account has it, enabled or disabled. Sessions stay
     * through both; they read them afresh. A kind change signs the Account out everywhere, so no
     * open session keeps its old kind; an Admin can't change their own, and the last enabled Admin
     * can't be demoted, by anyone.
     */
    async update(accountId: string, fields: AccountUpdate, actor: Actor): Promise<UpdateAccountResult> {
      const ctx = await auth.$context;
      const user = await ctx.internalAdapter.findUserById(accountId);
      if (!user) return { status: "not-found" };
      const account = toAccount(user);

      const name = fields.name?.trim();
      const nameChanges = name !== undefined && name !== account.name;
      if (nameChanges) {
        const problem = checkName(name);
        if (problem) return problem;
      }

      const email = fields.email === undefined ? undefined : normaliseEmail(fields.email);
      const emailChanges = email !== undefined && email !== account.email;
      if (emailChanges) {
        if (!isValidAccountEmail(email)) return { status: "invalid-email" };
        if (await ctx.internalAdapter.findUserByEmail(email)) return { status: "email-taken" };
      }

      const { kind } = fields;
      const kindChanges = kind !== undefined && kind !== account.kind;
      if (kindChanges) {
        if (isOwnAccount(accountId, actor)) return { status: "own-kind" };
        // A disabled Admin isn't one of the enabled Admins, so demoting one leaves them as they are.
        if (account.kind === "admin" && account.disabledAt === null && (await otherEnabledAdmins(accountId)) === 0) {
          return { status: "last-enabled-admin" };
        }
      }

      if (!nameChanges && !emailChanges && !kindChanges) return { status: "updated", account };
      const updated = await ctx.internalAdapter.updateUser(accountId, {
        ...(nameChanges && { name }),
        ...(emailChanges && { email }),
        ...(kindChanges && { kind }),
      });
      if (kindChanges) await ctx.internalAdapter.deleteUserSessions(accountId);
      if (nameChanges) await record(accountId, { action: "name-changed", details: { from: account.name, to: name } }, actor);
      if (emailChanges) await record(accountId, { action: "email-changed", details: { from: account.email, to: email } }, actor);
      if (kindChanges) await record(accountId, { action: "kind-changed", details: { from: account.kind, to: kind } }, actor);
      return { status: "updated", account: toAccount(updated) };
    },

    /**
     * The owner's own rename, from My Account: `update` with only the name, and the owner as actor.
     * Better Auth's own `/update-user` is refused (see staff-auth.ts), so names change only here and
     * on the Account's page. A Kiosk can't rename itself.
     */
    async rename(accountId: string, name: string): Promise<RenameResult> {
      const account = await accounts.get(accountId);
      if (!account) return { status: "not-found" };
      // A Kiosk's name is set by an Admin or the command; the Kiosk can't change it (ADR 0003).
      if (!canEditOwnName(account.kind)) return { status: "not-allowed" };

      const result = await accounts.update(accountId, { name }, { accountId });
      switch (result.status) {
        case "updated":
          return { status: "renamed", name: result.account.name };
        case "invalid-name":
        case "name-too-long":
        case "not-found":
          return result;
        default:
          // Only the name was given, so nothing else can be refused.
          throw new Error(`Renaming ${accountId} was refused as ${result.status}`);
      }
    },

    /**
     * Sets a new password, for an Admin on the Account's page or `npm run staff -- reset-password`,
     * and signs the Account out everywhere, Kiosks included. Its kind stays. A Staff or Admin
     * Account's owner must then choose their own password at the next sign-in; a Kiosk Account's
     * needn't, so the Kiosk keeps working. A disabled Account stays disabled (`staysDisabled`), so a
     * reset never quietly lets it back in. An Admin's own password is refused here: they change it
     * on My Account, by confirming the current one.
     */
    async setPassword(accountId: string, password: string, actor: Actor): Promise<SetPasswordResult> {
      if (isOwnAccount(accountId, actor)) return { status: "own-account" };
      const passwordProblem = await checkPassword(password);
      if (passwordProblem) return passwordProblem;

      const ctx = await auth.$context;
      const user = await ctx.internalAdapter.findUserById(accountId);
      if (!user) return { status: "not-found" };
      const { email, kind, disabledAt } = toAccount(user);

      const hash = await ctx.password.hash(password);
      if (await ctx.internalAdapter.findCredentialAccount(accountId)) {
        await ctx.internalAdapter.updatePassword(accountId, hash);
      } else {
        await ctx.internalAdapter.linkAccount({
          userId: accountId,
          providerId: "credential",
          accountId,
          password: hash,
        });
      }
      // Someone else chose it, so a Staff or Admin Account's owner chooses their own at the next sign-in.
      if (canChangeOwnPassword(kind)) await ctx.internalAdapter.updateUser(accountId, { mustChangePassword: true });
      await ctx.internalAdapter.deleteUserSessions(accountId);
      await record(accountId, { action: "password-set" }, actor);
      return { status: "password-set", accountId, email, kind, staysDisabled: disabledAt !== null };
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

    /** One Account by its email, in any case, for the commands; null when there is none. */
    async getByEmail(email: string): Promise<Account | null> {
      const ctx = await auth.$context;
      const found = await ctx.internalAdapter.findUserByEmail(normaliseEmail(email));
      return found ? toAccount(found.user) : null;
    },

    /**
     * The Account History: every Account Change, or one Account's (`accountId`), newest first, 50 a
     * page, with how many there are. Each names the Account and who made it by their names as they
     * are now. Never a password.
     */
    history({ accountId, page }: { accountId?: string; page: number }): Promise<AccountHistoryPage> {
      return readAccountHistory(db, { accountId, page });
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
