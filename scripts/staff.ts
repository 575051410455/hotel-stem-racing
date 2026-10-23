// Account management command: creates Staff Accounts (ticket 04) and check-in-only Kiosk Accounts
// (ticket 23, ADR 0003), and resets the password of either kind.
//
//   npm run staff -- create <email> <display name>
//   npm run staff -- create-kiosk <email> <display name>
//   npm run staff -- reset-password <email>
//
// The password is read from a hidden prompt (typed twice), or from STAFF_PASSWORD when set, for
// non-interactive use: `STAFF_PASSWORD=... npm run staff -- create ...`. Passwords need at least
// 12 characters for both kinds; there are no other rules. A reset signs that Account out everywhere.
// An Account's kind is fixed when it is created.
//
// Runs in the production image (`docker compose exec app npm run staff -- ...`), so it imports only
// runtime dependencies and nothing that uses `server-only`. CommonJS: no top-level await.

import { createDatabase } from "@/lib/db/client";
import type { AccountKind } from "@/lib/auth/access";
import { readStaffAuthEnv } from "@/lib/auth/env";
import { createStaffAccounts } from "@/lib/auth/staff-accounts";
import { createStaffAuth } from "@/lib/auth/staff-auth";

const USAGE = `Usage:
  npm run staff -- create <email> <display name>          a Staff Account (full Back Office)
  npm run staff -- create-kiosk <email> <display name>    a Kiosk Account (Kiosk and Check-In only)
  npm run staff -- reset-password <email>                 either kind

The password is prompted for (hidden), or read from STAFF_PASSWORD if set.`;

const KIND_LABELS: Record<AccountKind, string> = { staff: "Staff Account", kiosk: "Kiosk Account" };

class UsageError extends Error {}

type Command =
  | { action: "create"; accountKind: AccountKind; email: string; name: string }
  | { action: "reset-password"; email: string };

function parseCommand(args: string[]): Command {
  const [subcommand, email, ...nameParts] = args;
  if ((subcommand === "create" || subcommand === "create-kiosk") && email && nameParts.length > 0) {
    const accountKind = subcommand === "create-kiosk" ? "kiosk" : "staff";
    return { action: "create", accountKind, email, name: nameParts.join(" ") };
  }
  if (subcommand === "reset-password" && email && nameParts.length === 0) {
    return { action: "reset-password", email };
  }
  throw new UsageError(USAGE);
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

async function main(): Promise<number> {
  let command: Command;
  try {
    command = parseCommand(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 2;
  }

  const { databaseUrl, secret, baseURL } = readStaffAuthEnv();
  const password = await readPassword();
  const { db, close } = createDatabase(databaseUrl);
  try {
    const staffAccounts = createStaffAccounts(createStaffAuth({ db, secret, baseURL }));

    if (command.action === "create") {
      const result = await staffAccounts.create({
        email: command.email,
        name: command.name,
        password,
        kind: command.accountKind,
      });
      switch (result.status) {
        case "created":
          console.log(
            result.kind === "kiosk"
              ? `Created the Kiosk Account ${result.email}. Sign a Kiosk iPad in with it at ${baseURL}/admin/login: ` +
                  `it opens only ${baseURL}/kiosk and records Check-Ins.`
              : `Created the Staff Account ${result.email}. They can sign in at ${baseURL}/admin/login`,
          );
          return 0;
        case "invalid-email":
          console.error(`"${command.email}" is not a valid email address. Nothing was changed.`);
          return 1;
        case "invalid-name":
          console.error("The display name is empty. Nothing was changed.");
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

    const result = await staffAccounts.resetPassword({ email: command.email, password });
    switch (result.status) {
      case "password-reset":
        console.log(
          `Reset the password for the ${KIND_LABELS[result.kind]} ${command.email} and signed it out of every device.`,
        );
        return 0;
      case "not-found":
        console.error(`There is no Account for ${command.email}. Nothing was changed.`);
        return 1;
      default:
        console.error(passwordProblemMessage(result));
        return 1;
    }
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
