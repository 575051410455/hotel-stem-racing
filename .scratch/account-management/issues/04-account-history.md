# 04: Every Account Change is recorded, and Admins can read the Account History

**What to build:** an `account_changes` table, recording every Account write so far:
- `create`, `createFirst`, `resetPassword` and `makeAdmin`;
- the owner's `rename` from My Account;
- the owner changing their own password.

Each record names the actor: an Account, or the server command. A History page at `/admin/accounts/history` lists them newest first, 50 per page, optionally for one Account. Later tickets record their own changes the same way.

See the spec (Part 2, "The Accounts module grows", "schema").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] **Table:** `account_changes`:
  - `id`, `account_id` (references `users.id`, no cascade), `actor_account_id` (null for the server command), `action`, `details` jsonb, `changed_at`;
  - indexes on `(account_id, changed_at desc)` and `changed_at desc`;
  - a new migration.
- [ ] **Actor:** the module's operations take an `actor` (`{ accountId }` or `"server-command"`); the commands pass `"server-command"`.
- [ ] **Recording:**

  | Operation | Records |
  | --- | --- |
  | `create` / `createFirst` | `created { kind }` |
  | `resetPassword` | `password-set` |
  | `makeAdmin` | `kind-changed { from, to }`, only when the kind changed |
  | `rename` | `name-changed { from, to }`, with the owner as actor |

  Never a password or hash.
- [ ] **Owner's password change:** a Better Auth `hooks.after` on a successful `/change-password` records `password-changed`, with the owner as actor. The existing `hooks.before` guards stay.
- [ ] **Reading:** `history({ accountId?, page })` returns changes newest first, 50 per page, with the total.
- [ ] **Formatter:** a pure formatter writes each action's English line, for example:
  - "Created as Kiosk"
  - "Name changed: A → B"
  - "Kind changed: Staff → Admin"
  - "Password set"
  - "Password changed by owner"
  - "Disabled" / "Enabled"

  Its unit tests cover every action.
- [ ] **`/admin/accounts/history`:**
  - behind `requireAdmin()`, server-rendered;
  - **table:** When (Bangkok time), Account (current name and email; a link once 07 exists), Change, By (an Account's name or "Server command");
  - Previous/Next paging;
  - `?account=<id>` narrows the list and shows "Showing changes to {name}", with a link back to all.
- [ ] **Links:** a "History" link in the Accounts list header.
- [ ] **Tests against a real database:**
  - each operation's record and actor;
  - the owner's rename and password change;
  - ordering, paging and the filter;
  - no password in any record.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - commands show as "Server command";
  - a rename and a password change on My Account show the owner;
  - paging past 50;
  - the filter;
  - 375 and 1280 px.
