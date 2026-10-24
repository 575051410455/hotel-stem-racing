// First Admin Account command, run once after a fresh deploy:
//
//   npm run seed                                  locally
//   docker compose exec app npm run seed          on the server
//
// Creates an Admin Account (the whole Back Office, ADR 0004) from SEED_STAFF_EMAIL (required) and
// SEED_STAFF_NAME (default "เจ้าหน้าที่") with a random password, and prints the password once. The
// password is never read from env or arguments and never written anywhere else, and the operator
// must choose their own at the first sign-in (account-management 05). Does nothing if an
// Admin Account already exists (Staff and Kiosk Accounts don't count); further Accounts, make-admin
// and resets use `npm run staff`. The env names predate Admin Accounts and are kept for `.env`.
// Creates no other data.
//
// Deliberately not run on container start or by the migrations: the printed password would land in
// `docker compose logs`. Output of `docker compose exec` goes only to the operator's terminal.
//
// Runs in the production image, so it imports only runtime dependencies and nothing that uses
// `server-only`. CommonJS: no top-level await.

import { createDatabase } from "@/lib/db/client";
import { readStaffAuthEnv } from "@/lib/auth/env";
import { randomPassword } from "@/lib/auth/random-password";
import { createAccounts } from "@/lib/auth/accounts";
import { createStaffAuth } from "@/lib/auth/staff-auth";

const DEFAULT_NAME = "เจ้าหน้าที่";

class UsageError extends Error {}

function readSeedEnv(env: NodeJS.ProcessEnv = process.env) {
  const email = env.SEED_STAFF_EMAIL?.trim();
  if (!email) {
    throw new UsageError(
      "SEED_STAFF_EMAIL is not set: add the first Admin Account's email to .env, then run `npm run seed` again.",
    );
  }
  return { email, name: env.SEED_STAFF_NAME?.trim() || DEFAULT_NAME };
}

async function main(): Promise<number> {
  if (process.argv.length > 2) {
    throw new UsageError("npm run seed takes no arguments: it reads SEED_STAFF_EMAIL and SEED_STAFF_NAME from .env.");
  }
  const { email, name } = readSeedEnv();
  const { databaseUrl, secret, baseURL } = readStaffAuthEnv();
  const { db, close } = createDatabase(databaseUrl);
  try {
    const password = randomPassword();
    const result = await createAccounts(createStaffAuth({ db, secret, baseURL }), db).createFirst(
      { email, name, password },
      "server-command",
    );
    switch (result.status) {
      case "created":
        console.log(
          [
            `Created the first Admin Account. This password is shown only now and isn't stored anywhere:`,
            "",
            `  Email:     ${result.email}`,
            `  Password:  ${password}`,
            "",
            `Sign in at ${baseURL}/admin/login with it: you'll be asked to choose your own password before anything else.`,
          ].join("\n"),
        );
        return 0;
      case "admin-account-exists":
        console.log(
          "An Admin Account already exists, so nothing was created. Use `npm run staff -- create-admin|create|create-kiosk " +
            "<email> <display name>` for another Account, or `npm run staff -- reset-password <email>` for a new password.",
        );
        return 0;
      case "invalid-email":
        console.error(`SEED_STAFF_EMAIL "${email}" is not a valid email address. Nothing was changed.`);
        return 1;
      case "email-taken":
        console.error(
          `An Account already uses ${email}. To make it the first Admin Account, run ` +
            `\`npm run staff -- make-admin ${email}\`; or set SEED_STAFF_EMAIL to another email. Nothing was changed.`,
        );
        return 1;
      default:
        // An empty name falls back to the default, and the generated password is always in range.
        throw new Error(`Unexpected result: ${result.status}. Nothing was changed.`);
    }
  } finally {
    await close();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  },
);
