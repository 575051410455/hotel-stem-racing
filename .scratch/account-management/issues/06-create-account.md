# 06: Admins create Accounts from the Back Office

**What to build:** "New Account" on `/admin/accounts` opens `/admin/accounts/new`.
- **The form:** an Admin enters a name, an email, a kind and a password typed twice. The kinds are Staff "Check-In desk only", Admin "The whole Back Office, including Accounts" and Kiosk "Kiosk only, for an unattended iPad".
- **The result:** the Account is created and recorded with the Admin as actor. Staff and Admin Accounts are flagged to change their password. A toast says "Account created" and the Admin is back on the list.

See the spec (Part 2, "pages", "The Accounts module grows").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] **`/admin/accounts/new`:**
  - behind `requireAdmin()`;
  - **fields:** Name, Email, Kind (radio group with the one-line explanations), Password, Confirm password;
  - the 12–128 hint;
  - for Staff and Admin, "They'll be asked to choose their own password when they first sign in."
- [ ] **Server Action:**
  - re-checks `getCurrentAdmin()`;
  - calls `create(input, { accountId })`;
  - inline errors for invalid email, email taken (any Account, enabled or disabled), invalid name, password too short or too long, and confirmation mismatch (checked in the browser first).
- [ ] **On success:** `toastSuccess("Account created")`, then redirect to `/admin/accounts`.
- [ ] **Recording:** `created { kind }` with the Admin as actor (module test).
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - create one Account of each kind;
  - the Staff one lands on My Account with the notice at first sign-in, and the Kiosk one goes straight to the Kiosk;
  - each inline error;
  - the History shows the Admin;
  - 375 and 1280 px.
