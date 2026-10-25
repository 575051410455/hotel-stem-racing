# 04: Every Account Change is recorded, and Admins can read the Account History

**What to build:** an `account_changes` table, recording every Account write so far:
- `create`, `createFirst`, `resetPassword` and `makeAdmin`;
- the owner's `rename` from My Account;
- the owner changing their own password.

Each record names the actor: an Account, or the server command. A History page at `/admin/accounts/history` lists them newest first, 50 per page, optionally for one Account. Later tickets record their own changes the same way.

See the spec (Part 2, "The Accounts module grows", "schema").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 03

**Status:** resolved

- [x] **Table:** `account_changes`:
  - `id`, `account_id` (references `users.id`, no cascade), `actor_account_id` (null for the server command), `action`, `details` jsonb, `changed_at`;
  - indexes on `(account_id, changed_at desc)` and `changed_at desc`;
  - a new migration.
- [x] **Actor:** the module's operations take an `actor` (`{ accountId }` or `"server-command"`); the commands pass `"server-command"`.
- [x] **Recording:**

  | Operation | Records |
  | --- | --- |
  | `create` / `createFirst` | `created { kind }` |
  | `resetPassword` | `password-set` |
  | `makeAdmin` | `kind-changed { from, to }`, only when the kind changed |
  | `rename` | `name-changed { from, to }`, with the owner as actor |

  Never a password or hash.
- [x] **Owner's password change:** a Better Auth `hooks.after` on a successful `/change-password` records `password-changed`, with the owner as actor. The existing `hooks.before` guards stay.
- [x] **Reading:** `history({ accountId?, page })` returns changes newest first, 50 per page, with the total.
- [x] **Formatter:** a pure formatter writes each action's English line, for example:
  - "Created as Kiosk"
  - "Name changed: A → B"
  - "Kind changed: Staff → Admin"
  - "Password set"
  - "Password changed by owner"
  - "Disabled" / "Enabled"

  Its unit tests cover every action.
- [x] **`/admin/accounts/history`:**
  - behind `requireAdmin()`, server-rendered;
  - **table:** When (Bangkok time), Account (current name and email; a link once 07 exists), Change, By (an Account's name or "Server command");
  - Previous/Next paging;
  - `?account=<id>` narrows the list and shows "Showing changes to {name}", with a link back to all.
- [x] **Links:** a "History" link in the Accounts list header.
- [x] **Tests against a real database:**
  - each operation's record and actor;
  - the owner's rename and password change;
  - ordering, paging and the filter;
  - no password in any record.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - commands show as "Server command";
  - a rename and a password change on My Account show the owner;
  - paging past 50;
  - the filter;
  - 375 and 1280 px.

## Answer

Done on branch `am-04`, off `account-management`.

### What's where

| What | Where |
| --- | --- |
| `Actor` (`{ accountId }` or `"server-command"`), `ACCOUNT_CHANGE_ACTIONS` (all 8), the `AccountChange` union, and `accountChangeLine()`, the pure English formatter | `src/lib/auth/account-changes.ts` (+ `account-changes.test.ts`, 6 tests, every action) |
| `KIND_LABELS`, moved out of the Accounts page so the formatter can use it | `src/lib/auth/kind-labels.ts` |
| `account_changes`: identity `id`, `account_id` and `actor_account_id` (both reference `users.id`, no cascade), `action` (with a check constraint), `details` jsonb, `changed_at` (default now); indexes `(account_id, changed_at desc)` and `(changed_at desc)` | `src/lib/db/schema.ts`; migration `drizzle/0005_account-history.sql` |
| `recordAccountChange(db, accountId, change, actor)` (the one writer) and `readAccountHistory(db, { accountId?, page })` (newest first, 50 a page, with the total; current names through joins) | `src/lib/auth/account-history.ts` |
| `createAccounts(auth, db)`; a private `record()`; `create`, `createFirst`, `resetPassword` and `makeAdmin` take an `actor`; `rename` records with the owner as actor; `history({ accountId?, page })` | `src/lib/auth/accounts.ts` (+ a new `describe("Accounts: Account History")` in `accounts.test.ts`, between the two existing ones, 9 tests) |
| The owner's own password change: `hooks.after` on `/change-password` records `password-changed` | `src/lib/auth/staff-auth.ts` |
| One database for both auth instances and the module (`staffAuthDatabase()`) | `src/lib/auth/server.ts` |
| The commands pass `"server-command"` | `scripts/staff.ts`, `scripts/seed.ts` |
| The page: breadcrumb "Accounts › Account History" (the `h1` is the last crumb), `requireAdmin()` behind `<Suspense>`, the filter line, the empty and past-the-end notes, "Showing 1–50 of 63", "Page 1 of 2", Previous/Next | `(back-office)/accounts/history/page.tsx` |
| Table and stacked list (Server Component, container query at 48rem) | `(back-office)/accounts/history/account-history-list.tsx` |
| `accountHistoryHref({ accountId?, page? })` | `(back-office)/accounts/history/links.ts` |
| "History" (lucide `HistoryIcon`) in the Accounts page header, on the right | `(back-office)/accounts/page.tsx` |

### Decisions

- **Every write takes `actor` as its last, required parameter:** `create`, `createFirst`, `resetPassword`, `makeAdmin`. The spec writes `makeAdmin(email)`; the ticket says the commands pass `"server-command"`, so `make-admin` passes it like the rest.
  - **`rename(accountId, name)` keeps its signature.** It is the owner's own rename, so the owner is the actor by definition (spec: "owner as actor"), and a caller can't record someone else.
  - Reads (`list`, `get`, `listDevices`, `history`) take no actor.
- **`createAccounts(auth, db)`.** The module needs the database for the History: Better Auth's adapter knows only its own tables. The composition root, both commands and the tests pass the same database the auth instance uses.
- **One writer.** `recordAccountChange` is the only code that inserts into `account_changes`. The module calls it through its private `record()`, and the hook calls it directly (the hook can't reach the module).
- **Never a password, by construction:**
  - `AccountChange` is a union whose `details` hold only `kind` or `from`/`to`.
  - `recordAccountChange` copies those fields one by one, so whatever else an object carries is never stored.
  - A test runs every write path with known passwords and checks that no record holds any of them or any hash in the `accounts` table, before or after the owner's change.
- **Table details:**
  - **`id`:** an integer identity, like `registrations`. Changes in the same instant then order by `id`.
  - **`actor_account_id`:** also references `users.id` with no cascade, since Accounts are never deleted (ADR 0004).
  - **Actions:** `action` is checked against all 8 actions now, so 05–08 need no migration.
  - **`details`:** null for actions without details.
  - **`changed_at`:** the database's `now()`.
- **No-ops record nothing:**
  - a rename to the same name still answers `renamed` but records nothing;
  - `makeAdmin` on an Admin records nothing;
  - every refusal (bad name, Kiosk, short password, unknown email) records nothing.
- **The hook reads `ctx.context.returned`:**
  - an `APIError` (wrong current password, a Kiosk refused by `hooks.before`, signed out) records nothing;
  - on success it takes the owner's id from the returned `user`, and throws if that's missing, so a Better Auth change surfaces instead of silently skipping a record.
  - `hooks.before` is unchanged.
- **Names are current, not stored.** The History joins `users` for the Account's and the actor's name and email, so a rename shows everywhere at once. The `from`/`to` of a `name-changed` keep the old names.
- **`history()` returns `{ changes, total, page, pageSize }`.** A page below 1, or not a whole number, reads as 1, so the page doesn't repeat the rule. Past the last page, `changes` is empty and `total` is still there.
- **The page:**
  - **Header:** a breadcrumb back to Accounts, like a Registration's detail, with the `h1` as the last crumb (an `h1` in an `li`, since `BreadcrumbPage` is a `span`).
  - **Table or stacked list:** a container query at 48rem. With the sidebar open, 1280 px shows the table; phones, tablets and narrow windows get the stacked list (the change as its title, then Account, When, By).
  - **Unknown `?account=`:** shows "There's no Account with this id. Show all changes" inside the Back Office, not `notFound()`, which would drop to the global not-found page without the shell.
  - **Past the last page:** "There are no changes on page 9. Go to the first page".
  - **Empty:** "No changes are recorded yet."
  - **Paging:** shown only with more than one page. Previous/Next are links, or disabled buttons at either end.
  - **Account cell:** not a link yet (07).
  - **"Server command":** shown muted, so it reads differently from a name.

### Guards (audit)

| Page / handler | Guard |
| --- | --- |
| `/admin/accounts/history` | `requireAdmin()` in `AdminOnlyAccountHistory`, below `<Suspense>`, before `searchParams` or the database are read. Checked: Staff → `/admin/check-in`, Kiosk → `/kiosk`, signed out → `/admin/login`. |
| "History" link (Accounts header) | display only; the page guards itself |
| `hooks.after` on `/change-password` | records only a successful change, for the Account Better Auth changed, with that Account as actor. The `hooks.before` guards (Kiosk refused, `/update-user` refused for all) are unchanged. |
| Other Better Auth endpoints that could change an Account unrecorded | `/update-user`: refused (unchanged). `/change-email` and `/delete-user`: off (not enabled). `/reset-password`: needs `sendResetPassword`, not configured. `setPassword`: server-only, unused. |

No Server Actions or Route Handlers were added. `renameOwnAccount` is unchanged: it still calls `rename(staff.id, name)`, which now records.

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (296 pass; 15 new: 6 formatter, 9 Accounts module) and `npm run build` pass. `/admin/accounts/history` builds as a partial prerender.
- **Setup:**
  - `next start` on :3104 on the scratch database `stem_racing_am04`, migrated to 0005, email off;
  - headless Chrome on :9304, one browser context and `X-Real-IP` per Account.
- **Commands show as "Server command":**
  - `create-admin` (Napat Wongsa), `create` ×2, `create-kiosk`, `reset-password` (Kiosk 1) and `make-admin` (Mary-Jane O'Neil) were each recorded once, with a null actor;
  - a second `make-admin` printed "already an Admin Account" and recorded nothing;
  - the page shows "Created as Admin", "Created as Staff", "Created as Kiosk", "Password set" and "Kind changed: Staff → Admin", each by "Server command".
- **My Account shows the owner:**
  - Staff "Somchai J" renamed itself to "Somchai Jaidee" (toast "Name saved"), then changed its password (toast "Password changed");
  - the History shows "Name changed: Somchai J → Somchai Jaidee" and "Password changed by owner", both by "Somchai Jaidee".
- **Paging past 50:**
  - I added 55 older `name-changed` rows for one Account by SQL (actor: the Admin), 63 in all;
  - **page 1:** 50 rows newest first, "Showing 1–50 of 63", "Page 1 of 2", Previous disabled, Next → `?page=2`;
  - **page 2:** 13 rows, "Showing 51–63 of 63", Previous → the plain path, Next disabled;
  - `?page=abc` and `?page=0` show page 1; `?page=9` says there are no changes on page 9, with a link to the first page.
- **The filter:**
  - `?account=<Somchai's id>` shows "Showing changes to Somchai Jaidee. Show all changes" and its 3 changes, without paging;
  - "Show all changes" goes back to `/admin/accounts/history`;
  - `?account=no-such-account` shows "There's no Account with this id."
- **Header link:** the Accounts page header has "History" → `/admin/accounts/history`, and the title reads "Account History · Back Office · …".
- **Widths:**
  - 1280 px: the History and the Accounts list are tables, with no horizontal scroll;
  - 375 px: both are stacked lists, with no horizontal scroll; the paging footer wraps under "Showing 51–63 of 63";
  - checked with screenshots at both widths.
- **Database:** none of the 63 rows contains any of the three passwords used or any stored hash.

### Noticed, not changed

- **No backfill, as the spec says.** Accounts that existed before 0005 have no `created` record. On the live database, the History starts empty and fills from the upgrade on. Their filtered view says "No changes are recorded yet."
- **No transaction.** A change and its record are separate writes, as the spec accepts. If the record fails, the change stays and the caller sees an error. For example, the command would report a failure for an Account that was in fact created.
- **`scripts/staff.ts` keeps its own `KIND_LABELS`** ("Admin Account", "Staff Account"), worded for full sentences. The Back Office's labels are the short ones.
- **Stale comments in `staff-auth.ts`** (noted in 03): `emailAndPassword` still says "Accounts are created only by the server command", and so does `createStaffAuth`'s doc.
- **Merging with ticket 10:**
  - `createAccounts` now needs `db`, and `create`/`makeAdmin`/`resetPassword`/`createFirst` need an actor.
  - I updated every call in `accounts.test.ts`, including the devices `describe`'s `before` and `createStaff` helper.
  - Any new call in 10's appended tests needs `, database.db` or `, "server-command"`.
  - The import line `import { accounts as credentials, sessions } from "@/lib/db/auth-schema";` changed too.

### For later tickets

- **Recording:**
  - Every write operation takes `actor: Actor` as its last parameter.
  - Right after the change succeeds, it calls the module's private `record(accountId, change, actor)`.
  - A no-op or a refusal records nothing.
  - Never write to `account_changes` any other way. Outside the module (a Better Auth hook), call `recordAccountChange(db, …)` from `account-history.ts`.
- **Already in place:** the `AccountChange` union, the check constraint and `accountChangeLine()` already cover `email-changed`, `kind-changed`, `password-set`, `password-changed`, `disabled` and `enabled`. No migration and no formatter change are needed.
- **Back Office actors:** a Server Action passes `{ accountId: admin.id }` from `getCurrentAdmin()`, never an id from the browser.
- **Tests:** add them to `describe("Accounts: Account History")`, which has helpers:
  - `createAccount(email, name, kind?)`;
  - `changes(accountId?)`, page 1 without ids and times;
  - `changeOwnPassword(email, current, next)`.
- **05:** extend the existing `hooks.after` branch for `/change-password` to clear `must_change_password`. It already records `password-changed`.
- **06:** `create(input, { accountId: admin.id })`. "New Account" goes next to "History" in the Accounts page header.
- **07:**
  - `update(id, fields, actor)` records one change per field that actually changed (`name-changed`, `email-changed`, `kind-changed`, with `from`/`to`);
  - `rename` becomes `update(accountId, { name }, { accountId })`; keep the same-name no-op;
  - `setPassword(id, password, actor)` records `password-set` and replaces `resetPassword`; the command's `reset-password` passes `"server-command"`;
  - link the History's Account cell to `/admin/accounts/[id]`, and point "View history" at `accountHistoryHref({ accountId })`.
- **08:** `disable`/`enable` record `disabled`/`enabled`, and a repeat records nothing. When `makeAdmin` also enables a disabled Account, record `enabled` as well as `kind-changed`. That's my reading of "records with actor server-command".
