# 02: `npm run seed` creates the first Staff Account

**What to build:** after a fresh deploy, the operator runs `npm run seed` once (in Docker: `docker compose exec app npm run seed`).
- It creates the first Staff Account from `SEED_STAFF_EMAIL`, with the name `SEED_STAFF_NAME` or "เจ้าหน้าที่", and a strong random password it prints once.
- If a Staff Account already exists (Kiosk Accounts don't count), it creates nothing and says to use `npm run staff`.
- It never stores the password anywhere and creates no other data.

See the spec ("First Staff Account").

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] **The Staff Accounts module** (`createStaffAccounts`) gains an operation that creates the first Staff Account only when no Account of kind `staff` exists.
  - It reuses the existing create rules: email, name, and 12–128 characters.
  - It returns created (with the Account), skipped (a Staff Account exists), or the existing create problems.
- [ ] **Module tests, against a real database** (prior art: `staff-accounts.test.ts`):
  - it creates an Account that can sign in with the given password
  - it creates one when only Kiosk Accounts exist
  - it skips, creating and changing nothing, when a Staff Account exists
  - it refuses an invalid email or a password out of range
- [ ] **`npm run seed`** (a new script plus a `package.json` entry, like `npm run staff`):
  - It reads `SEED_STAFF_EMAIL` (required) and `SEED_STAFF_NAME` (default "เจ้าหน้าที่").
  - It generates a random password with `crypto.getRandomValues` (24+ characters) and prints the email and password once, with a line saying to change it at "เปลี่ยนรหัสผ่าน" after signing in.
  - It never takes the password from env or arguments, and never writes it to a file or log.
- [ ] **Exit codes:** 0 when created or skipped, with a message saying which. Non-zero, with a clear message, when `SEED_STAFF_EMAIL` is missing or invalid.
- [ ] **Not automatic:** the command is not run on container start or by the migrations.
- [ ] **It follows the script rules in the deploy ticket:**
  - it runs under tsx in the image
  - its runtime imports are in `dependencies`
  - it uses no top-level `await`
  - it doesn't import `server-only`
- [ ] **Docs:** `.env.example` documents `SEED_STAFF_EMAIL` and `SEED_STAFF_NAME`. `docs/deploy.md` section 6 creates the first Staff Account with `docker compose exec app npm run seed` and keeps `npm run staff` for further Accounts, Kiosk Accounts and resets.
- [ ] typecheck, lint, test and build pass. The hand-off records the command run against a scratch database:
  - create
  - run again (skip)
  - missing email
  - a Kiosk-only database
  - signing in at `/admin/login` with the printed password
