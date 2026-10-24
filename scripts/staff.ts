// Account management command (ADR 0003, ADR 0004): creates Admin Accounts (the whole Back Office),
// Staff Accounts (the check-in desk only) and Kiosk Accounts (the Kiosk only), makes an existing
// Account an Admin Account, and resets the password of any kind.
//
//   npm run staff -- create <email> <display name>
//   npm run staff -- create-admin <email> <display name>
//   npm run staff -- create-kiosk <email> <display name>
//   npm run staff -- make-admin <email>
//   npm run staff -- reset-password <email>
//
// The password is read from a hidden prompt (typed twice), or from STAFF_PASSWORD when set, for
// non-interactive use: `STAFF_PASSWORD=... npm run staff -- create ...`. Passwords need at least
// 12 characters for every kind; there are no other rules. A reset or make-admin signs that Account
// out everywhere. make-admin is also the way back in when no Admin can sign in. A Staff or Admin
// Account created or reset here must choose its own password at its next sign-in; a Kiosk Account
// needn't. Every change is recorded in the Account History as made by "Server command".
//
// Runs in the production image (`docker compose exec app npm run staff -- ...`), so it imports only
// runtime dependencies and nothing that uses `server-only`. CommonJS: no top-level await.

import { createDatabase } from "@/lib/db/client";
import { type AccountKind, canChangeOwnPassword } from "@/lib/auth/access";
import { readStaffAuthEnv } from "@/lib/auth/env";
import { type Accounts, createAccounts } from "@/lib/auth/accounts";
import { createStaffAuth } from "@/lib/auth/staff-auth";

const USAGE = `Usage:
  npm run staff -- create <email> <display name>          a Staff Account (the check-in desk only)
  npm run staff -- create-admin <email> <display name>    an Admin Account (the whole Back Office)
  npm run staff -- create-kiosk <email> <display name>    a Kiosk Account (the Kiosk only, for an iPad)
  npm run staff -- make-admin <email>                     makes an existing Account an Admin Account
  npm run staff -- reset-password <email>                 any kind

The password is prompted for (hidden), or read from STAFF_PASSWORD if set.`;

const KIND_LABELS: Record<AccountKind, string> = {
  admin: "Admin Account",
  staff: "Staff Account",
  kiosk: "Kiosk Account",
};

const CREATE_SUBCOMMANDS: Record<string, AccountKind> = {
  create: "staff",
  "create-admin": "admin",
  "create-kiosk": "kiosk",
};

class UsageError extends Error {}

type Command =
  | { action: "create"; accountKind: AccountKind; email: string; name: string }
  | { action: "make-admin"; email: string }
  | { action: "reset-password"; email: string };

function parseCommand(args: string[]): Command {
  const [subcommand, email, ...nameParts] = args;
  const accountKind = Object.hasOwn(CREATE_SUBCOMMANDS, subcommand) ? CREATE_SUBCOMMANDS[subcommand] : undefined;
  if (accountKind && email && nameParts.length > 0) {
    return { action: "create", accountKind, email, name: nameParts.join(" ") };
  }
  if ((subcommand === "make-admin" || subcommand === "reset-password") && email && nameParts.length === 0) {
    return { action: subcommand, email };
  }
  throw new UsageError(USAGE);
}

/** Said after a password this command set, when the Account's owner must then choose their own. */
function chooseOwnPasswordNote(kind: AccountKind, when: "first" | "next") {
  return canChangeOwnPassword(kind) ? ` At their ${when} sign-in they must choose their own password.` : "";
}

/** What the new Account can open, said once it is created. */
function createdMessage(kind: AccountKind, email: string, baseURL: string) {
  switch (kind) {
    case "admin":
      return (
        `Created the Admin Account ${email}. They can sign in at ${baseURL}/admin/login and use the whole Back Office.` +
        chooseOwnPasswordNote(kind, "first")
      );
    case "staff":
      return (
        `Created the Staff Account ${email}. They can sign in at ${baseURL}/admin/login: it opens only the check-in desk.` +
        chooseOwnPasswordNote(kind, "first")
      );
    case "kiosk":
      return (
        `Created the Kiosk Account ${email}. Sign a Kiosk iPad in with it at ${baseURL}/admin/login: ` +
        `it opens only ${baseURL}/kiosk and records Check-Ins.`
      );
  }
}

/** Reads one line from the terminal without echoing it. */
function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (done: () => void) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      done();
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") return finish(() => resolve(value));
        if (char === "\u0003") return finish(() => reject(new UsageError("Cancelled.")));
        if (char === "\u007f" || char === "\b") value = Array.from(value).slice(0, -1).join("");
        else if (char >= " ") value += char;
      }
    };
    // Raw mode before the question, so even input typed or pasted straight away isn't echoed.
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
    stdin.resume();
    stdout.write(question);
  });
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.STAFF_PASSWORD;
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  if (!process.stdin.isTTY) {
    throw new UsageError("No terminal to prompt in: set STAFF_PASSWORD to pass the password.");
  }
  const password = await promptHidden("Password (at least 12 characters): ");
  const confirmation = await promptHidden("Repeat the password: ");
  if (password !== confirmation) throw new UsageError("The passwords don't match. Nothing was changed.");
  return password;
}

function passwordProblemMessage(
  result: { status: "password-too-short"; minLength: number } | { status: "password-too-long"; maxLength: number },
) {
  return result.status === "password-too-short"
    ? `The password is too short: use at least ${result.minLength} characters. Nothing was changed.`
    : `The password is too long: use at most ${result.maxLength} characters. Nothing was changed.`;
}

/** Makes an existing Account an Admin Account. Needs no password. */
async function makeAdmin(accounts: Accounts, email: string): Promise<number> {
  const result = await accounts.makeAdmin(email, "server-command");
  switch (result.status) {
    case "promoted":
      console.log(
        `Made ${email} an Admin Account (it was a ${KIND_LABELS[result.from]}) and signed it out of ` +
          "every device. It now sees the whole Back Office.",
      );
      return 0;
    case "already-admin":
      console.log(`${email} is already an Admin Account. Nothing was changed.`);
      return 0;
    case "not-found":
      console.error(`There is no Account for ${email}. Nothing was changed.`);
      return 1;
  }
}

async function create(
  accounts: Accounts,
  command: Extract<Command, { action: "create" }>,
  password: string,
  baseURL: string,
): Promise<number> {
  const result = await accounts.create(
    { email: command.email, name: command.name, password, kind: command.accountKind },
    "server-command",
  );
  switch (result.status) {
    case "created":
      console.log(createdMessage(result.kind, result.email, baseURL));
      return 0;
    case "invalid-email":
      console.error(`"${command.email}" is not a valid email address. Nothing was changed.`);
      return 1;
    case "invalid-name":
      console.error("The display name is empty. Nothing was changed.");
      return 1;
    case "name-too-long":
      console.error(`The display name is too long: use at most ${result.maxLength} characters. Nothing was changed.`);
      return 1;
    case "email-taken":
      console.error(
        `An Account for ${command.email} already exists. Use reset-password to change its password, ` +
          "or another email for a new Account. Nothing was changed.",
      );
      return 1;
    default:
      console.error(passwordProblemMessage(result));
      return 1;
  }
}

async function resetPassword(accounts: Accounts, email: string, password: string): Promise<number> {
  const result = await accounts.resetPassword({ email, password }, "server-command");
  switch (result.status) {
    case "password-reset":
      console.log(
        `Reset the password for the ${KIND_LABELS[result.kind]} ${email} and signed it out of every device.` +
          chooseOwnPasswordNote(result.kind, "next"),
      );
      return 0;
    case "not-found":
      console.error(`There is no Account for ${email}. Nothing was changed.`);
      return 1;
    default:
      console.error(passwordProblemMessage(result));
      return 1;
  }
}

/**
 * What the command will do with the Accounts module. A command that sets a password asks for it
 * here, before the database is opened; make-admin asks for nothing.
 */
async function prepare(command: Command, baseURL: string): Promise<(accounts: Accounts) => Promise<number>> {
  switch (command.action) {
    case "make-admin":
      return (accounts) => makeAdmin(accounts, command.email);
    case "create": {
      const password = await readPassword();
      return (accounts) => create(accounts, command, password, baseURL);
    }
    case "reset-password": {
      const password = await readPassword();
      return (accounts) => resetPassword(accounts, command.email, password);
    }
  }
}

async function main(): Promise<number> {
  let command: Command;
  try {
    command = parseCommand(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 2;
  }

  const { databaseUrl, secret, baseURL } = readStaffAuthEnv();
  const run = await prepare(command, baseURL);
  const { db, close } = createDatabase(databaseUrl);
  try {
    return await run(createAccounts(createStaffAuth({ db, secret, baseURL }), db));
  } finally {
    await close();
  }
}

main()
  .then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = error instanceof UsageError ? 2 : 1;
    },
  )
  .finally(() => {
    // A terminal stdin that was read from keeps the event loop alive after pause().
    if (process.stdin.isTTY) process.stdin.destroy();
  });
