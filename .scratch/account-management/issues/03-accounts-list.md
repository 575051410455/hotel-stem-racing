# 03: Admins see every Account in an Accounts list

**What to build:** Admins see "Accounts" in the sidebar and a read-only list of every Account at `/admin/accounts`:
- Name, Email, Kind, Status, Last sign-in and Created;
- enabled first, then by name;
- a stacked list at 375 px.

This ticket also adds the user columns Part 2 needs, `must_change_password`, `disabled_at` and `last_signed_in_at`, so there is one migration for the user table. Every sign-in, of every kind, now sets `last_signed_in_at`; the migration backfills it from each Account's newest session.

Kind and Status are plain text here. Ticket 13 turns them into Badges and adds the initials avatar.

See the spec (Part 2, "schema", "pages").

**Part:** 2, after the Event. Work on the integration branch `account-management` (branched from `main` on 24 October 2026). Nothing reaches `main` before 2 November 2026.

**Blocked by:** 01, 02

**Status:** resolved

- [x] **Schema:**
  - `users.must_change_password` (boolean, not null, default false), `users.disabled_at` (timestamptz, null) and `users.last_signed_in_at` (timestamptz, null);
  - all three Better Auth `additionalFields` with `input: false`, returned on the session;
  - migration via `npm run db:generate -- --name account-management`;
  - **backfill** in the same migration: `last_signed_in_at` = the newest `sessions.created_at` of each Account that has a session; the rest stay null.
- [x] **Last sign-in:** a Better Auth `databaseHooks.session.create.after` sets `last_signed_in_at` to now, for every kind. (Ticket 08 adds the disabled check in `.before`, so a refused sign-in won't count.)
- [x] **Accounts module:** `list()` and `get(id)`, with id, name, email, kind, `disabledAt`, `mustChangePassword`, `lastSignedInAt` and `createdAt`, tested against a real database:
  - `lastSignedInAt` is null for a new Account;
  - a successful `auth.api.signInEmail` sets it, for each kind.
- [x] **Sidebar:** an "Accounts" item (lucide `UsersRound`) only when the Account `canManageAccounts`.
- [x] **`/admin/accounts`:**
  - behind `requireAdmin()`;
  - `PageHeader` "Accounts";
  - **table:** Name, Email, Kind, Status ("Enabled" / "Disabled", plus "Must change password"), Last sign-in ("22 Oct 2026, 14:05" in Bangkok time with the shared `bangkokEnglishDateTime`, or "Never"), Created (Bangkok date).
  - **Order:** enabled first, then by name.
  - **Phones:** a stacked list at 375 px.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - an Admin sees the item and the list;
  - Staff see no item and are redirected to the desk;
  - a Kiosk Account goes to `/kiosk`;
  - Last sign-in: "Never" for a fresh Account, a time after signing in;
  - the backfill on a copy of the local demo database;
  - 375 and 1280 px.

## Answer

Done on branch `am-03`.

### What's where

| What | Where |
| --- | --- |
| `users.must_change_password`, `users.disabled_at`, `users.last_signed_in_at` | `src/lib/db/auth-schema.ts` |
| One migration, with the `last_signed_in_at` backfill appended by hand (newest `sessions.created_at` per Account) | `drizzle/0004_account-management.sql` |
| The three as Better Auth `additionalFields` (`input: false`, returned on the session) | `src/lib/auth/staff-auth.ts` `user.additionalFields` |
| Last sign-in: `databaseHooks.session.create.after` sets `last_signed_in_at` to the new session's `createdAt` | `src/lib/auth/staff-auth.ts` |
| `Account` type; `list()` (enabled first, then by name); `get(id)` (`Account \| null`) | `src/lib/auth/accounts.ts` (+ 6 tests in `accounts.test.ts`) |
| `bangkokEnglishDate()` → "22 Oct 2026"; `bangkokEnglishDateTime()` now builds on it | `src/lib/bangkok-time.ts` (+ test) |
| Sidebar "Accounts" (lucide `UsersRoundIcon`), shown when `canManageAccounts`; current on `/admin/accounts` and below | `(back-office)/_shell/back-office-nav.tsx` |
| The page: `PageHeader` "Accounts", `requireAdmin()` behind `<Suspense>`, then `accounts().list()` | `(back-office)/accounts/page.tsx` |
| Table and stacked list (Server Component, no client JS of its own) | `(back-office)/accounts/account-list.tsx` |
| English labels: kind, status, last sign-in ("Never"), created | `(back-office)/accounts/format.ts` |

### Decisions

- **The hook writes with Drizzle, not the internal adapter.** Better Auth passes the endpoint context to database hooks, but it can be null, and the internal adapter comes from it. The update is one statement on `users`.
- **"Now" is the new session's `createdAt`.** Better Auth sets it to `new Date()` just before the hook runs, so it is the sign-in time. The backfill uses the same column, so old and new values mean the same thing.
- **Every new session counts, as the spec says.** That includes the fresh session Better Auth starts when someone changes their own password with other devices signed out (My Account, and ticket 05's forced change). Its owner is there, so it is a real use of the Account.
- **`list()` sorts in JavaScript with `Intl.Collator("th")`.** That gives the same Thai dictionary order as the Registration list's `th-TH-x-icu`, with Latin letters ignoring case ("anna" before "Kiosk 1"). Ties go by email. One side effect: Thai names come before Latin ones. Once ticket 11 lands, new names are English, so this only affects old Thai names.
- **`list()` asks for exactly as many rows as there are Accounts.** Better Auth's `findMany` stops at 100 rows unless told otherwise. A test with 101 Accounts covers it.
- **`get(id)` returns `Account | null`**, not a status union, because it is a read. Ticket 07's page can `notFound()` on null.
- **Tests:** "a successful `signInEmail`" uses the file's existing `signIn` helper, which posts to `/sign-in/email` as the browser does. The ordering test disables two Accounts through `auth.$context.internalAdapter.updateUser`, because there is no `disable()` yet. Ticket 08 can switch it.
- **Guard:** the page uses `requireAdmin()`, as the ticket says. `canManageAccounts` and `canUseBackOffice` both mean Admin today. If they ever differ, add a `requireAccountManager()` to `session.ts`.
- **Table or stacked list:** this uses a container query on the list's own width (`@4xl/accounts`, 56rem), like the overview's `@container/overview`, instead of the `tab:` screen breakpoint. With the sidebar open, six columns need about 900 px.
  - With the sidebar open, the table shows from about 1240 px wide.
  - Phones, tablets and narrower windows get the stacked list.
  - Long names and emails wrap. Names wrap only between words.
  - Status wraps only between "Enabled" and "Must change password".
- **Labels are local to the page** (`accounts/format.ts`). Ticket 04's change formatter ("Kind changed: Staff → Admin") may want to move `KIND_LABELS` into `src/lib/auth/`. Ticket 13 replaces the Kind and Status text with Badges.

### Guards (audit)

| Page / handler | Guard |
| --- | --- |
| `/admin/accounts` | `requireAdmin()` in `AdminOnlyAccountList`, below `<Suspense>`. Signed out → `/admin/login`, Staff → `/admin/check-in`, Kiosk → `/kiosk`. The list is read after the guard. |
| Sidebar "Accounts" item | only when `canManageAccounts(kind)`. Display only; the page guards itself. |
| `databaseHooks.session.create.after` | runs only after Better Auth has created a session, i.e. after the password matched. It writes only the signing-in Account's own `last_signed_in_at`. |

No Server Actions or Route Handlers were added. Better Auth refuses the three new fields from requests (`input: false`), and `/update-user` stays refused for everyone.

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (258 pass) and `npm run build` pass.
- **Setup:**
  - `next start` on :3103 against the scratch database `stem_racing_am03`, migrated to 0004.
  - Accounts made with `npm run staff`: an Admin; Staff "Somchai Jaidee"; a Thai-named Staff; a Staff with a 70-character email; "alex Brown"; Kiosk 1 and Kiosk 2.
  - Two Accounts disabled and two flagged with SQL, since no UI sets them before 07 and 08.
  - Headless Chrome, one browser context per Account.
- **Admin:**
  - lands on `/admin`, and the sidebar shows Registrations, Check-In, Email, Accounts;
  - `/admin/accounts` has the title "Accounts · Back Office · …", the h1 "Accounts", and "Accounts" marked current;
  - **Order:** the enabled Accounts by name (the Thai name first), then the disabled "alex Brown" and "Kiosk 2";
  - **Status:** "Enabled", "Enabled · Must change password", "Disabled · Must change password" and "Disabled";
  - **Created:** "24 Oct 2026".
- **Staff:** lands on `/admin/check-in`, the sidebar shows only "Check-In", and `/admin/accounts` redirects to `/admin/check-in`.
- **Kiosk:** lands on `/kiosk`, and `/admin/accounts` redirects to `/kiosk`.
- **Last sign-in:**
  - Staff and Kiosk 1 showed "Never", then "24 Oct 2026, 21:06" after signing in.
  - A new Account, "Fresh Helper", showed "Never", then "24 Oct 2026, 21:10" (Bangkok time then: 21:10).
- **Widths:**
  - 1440, 1280 and 1240 px show the table, with no scrolling inside it or on the page;
  - 1200, 1100, 1024, 900, 768, 735 and 375 px show the stacked list, with no horizontal scroll;
  - checked with screenshots at 375, 1024, 1240 and 1280.
- **Backfill on a copy of the local demo database (`stem_racing_am03_demo`):**
  - The demo's only Account, `staff@local.test`, has no sessions, so unchanged it would stay "Never".
  - To exercise both paths, I added to the copy only:
    - two sessions for that Account, an expired one at 20 Oct 09:00 and one at 23 Oct 14:05;
    - a Kiosk Account with one session at 22 Oct 08:00;
    - an Account with no session.
  - **After `npm run migrate`:**
    - `staff@local.test` shows 23 Oct 2026 14:05 +07, its newest session;
    - the Kiosk shows 22 Oct 08:00 +07;
    - the Account without sessions stays null;
    - `must_change_password` is false and `disabled_at` is null for all of them.
- **Not checked:** a signed-out visit to `/admin/accounts`. It uses the same `requireAdmin()` path as every other Admin page.

### Noticed, not changed

- **Stale comments in `staff-auth.ts`:**
  - `emailAndPassword` still says "Accounts are created only by the server command (ADR 0001)";
  - `createStaffAuth`'s doc still says "(Staff and Kiosk Accounts)".

  Ticket 06 is the natural place to update both.
- **Disabled Accounts can still sign in** until ticket 08 adds the `.before` check. For now, "Disabled" in the list only reflects the column.
- **`users.updated_at` changes on every sign-in,** through Drizzle's `$onUpdate` on the hook's update. Nothing reads it.
