# 01: Admin Accounts get the whole Back Office; Staff Accounts get only the check-in desk

**What to build:** a third Account kind, `admin`, which gets everything the Back Office offers today.

**Staff Accounts:**
- land on `/admin/check-in` and see only "Check-In" in the sidebar;
- are redirected there from every other Back Office page;
- are refused by every Back Office API (Registrations, export, email, resend).

They still scan, type Pass Codes, choose the Event Day and use Kiosk mode.

**Commands:**
- `npm run seed` creates the first Admin Account;
- `npm run staff -- create-admin` creates more;
- `npm run staff -- make-admin` promotes an existing Account.

Kiosk Accounts are unchanged.

See the spec (Part 1, "Account kinds and access rules").

**Part:** 1, before the Event. Branch from `main`, merge `--no-ff` into `main` by 28 October 2026.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] **`access.ts`:**
  - `ACCOUNT_KINDS` is `["admin", "staff", "kiosk"]`.
  - `canUseBackOffice` allows Admin only.
  - **New:** `canUseCheckInDesk`, `canEditOwnName` and `canManageAccounts`.
  - `canChooseCheckInDay` and `canChangeOwnPassword` allow Admin and Staff; `canCheckIn` allows all three.
  - `homePath`: Admin to `/admin`, Staff to `/admin/check-in`, Kiosk to `/kiosk`.
  - Unit tests cover every rule per kind, plus fail-closed.
- [ ] **Schema:**
  - `users.kind` accepts `admin` (enum and `users_kind_check`); the default stays `staff`;
  - Better Auth's `kind` field accepts it (`input: false` kept);
  - migration from `npm run db:generate -- --name admin-accounts`.
- [ ] **Session helpers:**
  - **New:** `requireAdmin()` / `getCurrentAdmin()`.
  - `requireStaff()` / `getCurrentStaff()` mean a Staff or Admin Account.
  - Redirects go by `homePath`.
- [ ] **Every guard switched:**
  - the overview and list (`/admin`), Registration detail, `/admin/email`, every `/api/back-office/*` Route Handler and their Server Actions use the Admin helpers;
  - the check-in page uses `requireStaff()`;
  - the check-in Server Action keeps `getCurrentCheckInAccount()`.
  - The hand-off lists each page, Route Handler and Server Action with its guard.
- [ ] **Sidebar by kind:** Admin sees Registrations, Check-In, Email; Staff see Check-In. The layout passes the kind.
- [ ] **Accounts module:**
  - `create` accepts `admin`;
  - `createFirst` creates an Admin Account and skips when any Admin exists;
  - **new:** `makeAdmin(email)` sets `admin` and deletes the Account's sessions. It reports not-found, already-Admin, or promoted from a kind.
  - Tests against a real database.
- [ ] **Commands:**
  - `create-admin <email> <name>` and `make-admin <email>` are added to `scripts/staff.ts`, with the usage updated;
  - `scripts/seed.ts` creates an Admin Account (same env names) and says so.
- [ ] **Docs:**
  - `docs/deploy.md`: the first Admin via `seed`; `create-admin` / `create` / `create-kiosk`; `make-admin` for databases with existing Staff Accounts, which see only the desk until promoted;
  - `.env.example` comments.
- [ ] **Local demo database:** migrated, then `make-admin staff@local.test`.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start` on a scratch database, with Admin, Staff and Kiosk Accounts in separate browser contexts:
  - Staff land on the desk with a one-item sidebar;
  - Staff are redirected from `/admin`, a Registration detail and `/admin/email`;
  - Staff are refused by `/api/back-office/registrations` and the CSV export;
  - Staff check in by scan and by typing, choose the Event Day, and use Kiosk mode;
  - the Admin sees everything as before;
  - the Kiosk is unchanged;
  - 375 and 1280 px.
