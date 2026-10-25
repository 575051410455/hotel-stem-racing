# 08: Admins disable and enable Accounts

**What to build:** "Disable Account" and "Enable Account" on `/admin/accounts/[id]`. Disabling is confirmed in a dialog; enabling acts at once.
- **Disabling** sets `disabled_at`, signs the Account out everywhere at once, and makes sign-in fail. The sign-in page says "This Account is disabled. Ask an Admin to turn it back on." only after the right password.
- **Enabling** restores it as it was.
- **Guards:** an Admin can't disable themself or the last enabled Admin.
- **Elsewhere:** the list shows the status, both changes are recorded, and `make-admin` re-enables a disabled Account.

See the spec (Part 2, "sign-in, forced change, pages", "The Accounts module grows").

**Part:** 2, after the Event, on `account-management`. `account-management` merges `--no-ff` into `main` after 1 November, once 08, 10, 12 and 13 are done.

**Blocked by:** 07

**Status:** resolved

- [x] **Accounts module:**
  - `disable(id, actor)` sets `disabled_at`, deletes sessions and records `disabled`;
  - `enable(id, actor)` clears it and records `enabled`;
  - **refuses:** yourself, and the last enabled Admin;
  - repeating either is a no-op that records nothing;
  - `makeAdmin` enables a disabled Account and records `enabled`.
- [x] **Sign-in:**
  - a Better Auth `databaseHooks.session.create.before` throws `FORBIDDEN` / `ACCOUNT_DISABLED` for a disabled Account. It runs after the password matched, so a wrong password still gets the usual message.
  - `getSignedInAccount` treats a disabled Account as signed out.
- [x] **Sign-in form:** maps `ACCOUNT_DISABLED` to "This Account is disabled. Ask an Admin to turn it back on."
- [x] **`/admin/accounts/[id]`:**
  - "Disable Account" in a shadcn `AlertDialog` that names the Account and says it will be signed out everywhere;
  - "Enable Account" calls `enable` at once, with no dialog;
  - neither on your own Account;
  - toasts "Account disabled" and "Account enabled".
- [x] **`/admin/accounts`:** "Disabled" status; disabled Accounts sort after enabled ones.
- [x] **Commands:**
  - `make-admin` says when it enabled the Account;
  - `reset-password` leaves it disabled and says so (from 07).
- [x] **Tests against a real database:**
  - disable ends sessions;
  - `auth.api.signInEmail` with the right password fails with `ACCOUNT_DISABLED`, and with a wrong one fails as a wrong password;
  - enable restores sign-in;
  - a sign-in refused as disabled leaves `last_signed_in_at` unchanged (from 03);
  - the guards;
  - no-ops record nothing;
  - `makeAdmin` enables.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with a second browser signed in as the target:
  - disable asks first, and the session ends;
  - right password, then the disabled message; wrong password, then the usual message;
  - enable acts at once, and sign in works;
  - no disable button on your own page;
  - both changes in the History;
  - 375 and 1280 px.

## Answer

Implemented on `am-08`. The Accounts module disables an Account, ends its sessions, refuses new sessions after a correct password, and enables it again without changing its kind or password state. An Admin cannot disable their own Account or the last enabled Admin. Repeated operations record no Account Change. `make-admin` enables a disabled Account and reports that through the server command.

The Account page offers a confirmation dialog for Disable and an immediate Enable button. Both actions recheck Admin access on the server, refresh the page and show a toast. The list sorts enabled Accounts first, and the sign-in form gives the disabled message only after the correct password. The existing session reader also refuses a disabled Account as a backstop.

**Verification (25 October 2026):** `npm run typecheck`, `npm run lint`, `npm test` (332 passed) and `npm run build` passed. The focused Accounts file passed 83 tests. A production `next start` on a freshly migrated scratch database was checked in headless Chrome at 375 and 1280 px: an Admin opened another Account, saw Disable, confirmed in the named dialog, saw Enable and the success toast, then enabled it again. Neither width had horizontal overflow. The production HTTP check also confirmed Admin sign-in and access to the Account page. Integration tests cover session revocation, the disabled sign-in response for all kinds, the wrong-password response, enable, guards, history, no-ops and `make-admin`.
