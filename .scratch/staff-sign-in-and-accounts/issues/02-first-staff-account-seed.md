# 02: `npm run seed` creates the first Staff Account

**What to build:** after a fresh deploy, the operator runs `npm run seed` once (in Docker: `docker compose exec app npm run seed`).
- It creates the first Staff Account from `SEED_STAFF_EMAIL`, with the name `SEED_STAFF_NAME` or "เจ้าหน้าที่", and a strong random password it prints once.
- If a Staff Account already exists (Kiosk Accounts don't count), it creates nothing and says to use `npm run staff`.
- It never stores the password anywhere and creates no other data.

See the spec ("First Staff Account").

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] **The Staff Accounts module** (`createStaffAccounts`) gains an operation that creates the first Staff Account only when no Account of kind `staff` exists.
  - It reuses the existing create rules: email, name, and 12–128 characters.
  - It returns created (with the Account), skipped (a Staff Account exists), or the existing create problems.
- [x] **Module tests, against a real database** (prior art: `staff-accounts.test.ts`):
  - it creates an Account that can sign in with the given password
  - it creates one when only Kiosk Accounts exist
  - it skips, creating and changing nothing, when a Staff Account exists
  - it refuses an invalid email or a password out of range
- [x] **`npm run seed`** (a new script plus a `package.json` entry, like `npm run staff`):
  - It reads `SEED_STAFF_EMAIL` (required) and `SEED_STAFF_NAME` (default "เจ้าหน้าที่").
  - It generates a random password with `crypto.getRandomValues` (24+ characters) and prints the email and password once, with a line saying to change it at "เปลี่ยนรหัสผ่าน" after signing in.
  - It never takes the password from env or arguments, and never writes it to a file or log.
- [x] **Exit codes:** 0 when created or skipped, with a message saying which. Non-zero, with a clear message, when `SEED_STAFF_EMAIL` is missing or invalid.
- [x] **Not automatic:** the command is not run on container start or by the migrations.
- [x] **It follows the script rules in the deploy ticket:**
  - it runs under tsx in the image
  - its runtime imports are in `dependencies`
  - it uses no top-level `await`
  - it doesn't import `server-only`
- [x] **Docs:** `.env.example` documents `SEED_STAFF_EMAIL` and `SEED_STAFF_NAME`. `docs/deploy.md` section 6 creates the first Staff Account with `docker compose exec app npm run seed` and keeps `npm run staff` for further Accounts, Kiosk Accounts and resets.
- [x] typecheck, lint, test and build pass. The hand-off records the command run against a scratch database:
  - create
  - run again (skip)
  - missing email
  - a Kiosk-only database
  - signing in at `/admin/login` with the printed password

## Answer

Done on branch `staff-02-seed`.

### What's where

| What | Where |
| --- | --- |
| `createFirst({ email, name, password })`: checks the input with the same rules as `create`, then returns `staff-account-exists` if any Account of kind `staff` exists (`internalAdapter.countTotalUsers` filtered by `kind`), else creates a Staff Account through `create` | `src/lib/auth/staff-accounts.ts` |
| `randomPassword()`: 24 characters from a 32-character lower-case alphabet with no look-alikes (no o, 0, i or 1), via `crypto.getRandomValues`. 120 bits. | `src/lib/auth/random-password.ts` |
| The command, `npm run seed` | `scripts/seed.ts`, `package.json` |
| `SEED_STAFF_EMAIL`, `SEED_STAFF_NAME` | `.env.example`, `docs/deploy.md` section 4 table |
| Section 6 creates the first Staff Account with `docker compose exec app npm run seed`, then signs in and changes the password; `npm run staff` stays for further Accounts and resets | `docs/deploy.md` |

### Decisions

- **Input is checked before the existence check.** A missing or invalid `SEED_STAFF_EMAIL` is reported every time, even on a database that already has a Staff Account, so a wrong `.env` never passes silently.
- **Exit codes:** 0 for created or skipped. 1 for an invalid email, or an email a Kiosk Account already uses. 2 for a usage problem: `SEED_STAFF_EMAIL` missing or empty, or any argument passed (the command takes none, so a password can't be passed as one).
- **`email-taken` means a Kiosk Account.** The Staff check runs first, so the message says "A Kiosk Account already uses …".
- **An empty `SEED_STAFF_NAME`** (as in `.env.example`) falls back to เจ้าหน้าที่, so `invalid-name` can't happen. Neither can a password out of range; the command throws if either ever does.
- **Lower-case password:** quick to type on a phone at the entrance, and still 120 bits. The operator is told to change it at "เปลี่ยนรหัสผ่าน" (ticket 03).
- **Not automatic:** nothing in the Dockerfile, Compose or migrations runs it. Output of `docker compose exec` goes to the operator's terminal, not to `docker compose logs`.

### Verified

- typecheck, lint, the 218 tests (8 new) and build pass.
- **Module tests (real database):**
  - the first Staff Account signs in with its password, as `staff`
  - it is created when only Kiosk Accounts exist
  - it is skipped, creating nothing and keeping the existing session, when a Staff Account exists
  - it is skipped, not reset, when its own email is already a Staff Account
  - an invalid email and a password too short or too long are refused
  - an invalid email is still reported when a Staff Account exists
  - A mutation check: dropping the `kind` filter makes the Kiosk-only test fail.
- **The command against the scratch database `stem_racing_s02`** (dropped afterwards):
  - missing and empty `SEED_STAFF_EMAIL`: message, exit 2
  - invalid email: message, exit 1
  - an argument passed: message, exit 2
  - Kiosk-only database (one Kiosk Account from `npm run staff -- create-kiosk`): `npm run seed` created `organiser@example.org` (`เจ้าหน้าที่`, `staff`) from `" Organiser@Example.org "`, printed the password once, exit 0
  - an email a Kiosk Account uses: message, exit 1
  - run again with another email: "A Staff Account already exists…", exit 0. Still 2 users, 0 Registrations.
  - `SEED_STAFF_NAME` of only spaces falls back to เจ้าหน้าที่.
- **Headless Chrome against `next start`** (port 3142, the scratch database): signing in at `/admin/login` with the printed password lands on `/admin`, and the sidebar shows เจ้าหน้าที่ · organiser@example.org.
- **Not checked:** the command inside the Docker image. It uses only what `npm run staff` already uses in the image (tsx, the `@/` alias, `drizzle-orm`, `postgres`, `better-auth`), and imports no `server-only` code.

## Comments

- **2026-10-23, review follow-up (no Docker on the dev machine):** the image's runtime was simulated instead.
  - **Setup:**
    - `git archive HEAD` of the files the runner stage copies: `package.json`, the lockfile, `tsconfig.json`, `drizzle/`, `scripts/` and `src/`
    - `npm ci --omit=dev`, with `@next/swc-*` removed as the Dockerfile does
    - `NODE_ENV=production`, and no `.env`
  - **Results:**
    - `npm run migrate` applied 3 migrations.
    - `npm run seed` with no email: message, exit 2.
    - With `SEED_STAFF_EMAIL`: it printed ".env not found. Continuing without it." (as `docs/deploy.md` says), created the Account and printed the password.
    - Run again: skipped.
  - **Still to do on the server:** run `docker compose exec app npm run seed` once against the real image, and check that the password is not in `docker compose logs app`.
- 2026-10-25: Done on the real image: `docker compose exec app npm run seed` creates the first Admin Account, a second run creates nothing, and `docker compose logs app` doesn't contain the password (checked in Docker in the CI/CD review: the production image built with `docker compose build` and run with `db`, `app` and `nginx`, with requests sent as `cloudflared` would (no Cloudflare)). The operator guide now gives that log check.
