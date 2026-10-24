# 08: Admins disable and enable Accounts

**What to build:** "Disable Account" and "Enable Account" on `/admin/accounts/[id]`, each confirmed in a dialog.
- **Disabling** sets `disabled_at`, signs the Account out everywhere at once, and makes sign-in fail. The sign-in page says "This Account is disabled. Ask an Admin to turn it back on." only after the right password.
- **Enabling** restores it as it was.
- **Guards:** an Admin can't disable themself or the last enabled Admin.
- **Elsewhere:** the list shows the status, both changes are recorded, and `make-admin` re-enables a disabled Account.

See the spec (Part 2, "sign-in, forced change, pages", "The Accounts module grows").

**Part:** 2, after the Event, on `account-management`. Ticket 08 is the last: after it, `account-management` merges `--no-ff` into `main`.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] **Accounts module:**
  - `disable(id, actor)` sets `disabled_at`, deletes sessions and records `disabled`;
  - `enable(id, actor)` clears it and records `enabled`;
  - **refuses:** yourself, and the last enabled Admin;
  - repeating either is a no-op that records nothing;
  - `makeAdmin` enables a disabled Account and records `enabled`.
- [ ] **Sign-in:**
  - a Better Auth `databaseHooks.session.create.before` throws `FORBIDDEN` / `ACCOUNT_DISABLED` for a disabled Account. It runs after the password matched, so a wrong password still gets the usual message.
  - `getSignedInAccount` treats a disabled Account as signed out.
- [ ] **Sign-in form:** maps `ACCOUNT_DISABLED` to "This Account is disabled. Ask an Admin to turn it back on."
- [ ] **`/admin/accounts/[id]`:**
  - "Disable Account" / "Enable Account" in a shadcn `AlertDialog` that names the Account and says it will be signed out everywhere;
  - none on your own Account;
  - toasts "Account disabled" and "Account enabled".
- [ ] **`/admin/accounts`:** "Disabled" status; disabled Accounts sort after enabled ones.
- [ ] **Commands:**
  - `make-admin` says when it enabled the Account;
  - `reset-password` leaves it disabled and says so (from 07).
- [ ] **Tests against a real database:**
  - disable ends sessions;
  - `auth.api.signInEmail` with the right password fails with `ACCOUNT_DISABLED`, and with a wrong one fails as a wrong password;
  - enable restores sign-in;
  - the guards;
  - no-ops record nothing;
  - `makeAdmin` enables.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with a second browser signed in as the target:
  - disable, and the session ends;
  - right password, then the disabled message; wrong password, then the usual message;
  - enable, and sign in works;
  - no disable button on your own page;
  - both changes in the History;
  - 375 and 1280 px.
