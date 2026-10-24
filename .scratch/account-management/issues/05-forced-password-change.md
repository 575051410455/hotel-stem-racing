# 05: A password set by someone else must be changed at the next sign-in

**What to build:** when someone other than its owner sets a Staff or Admin Account's password, the Account is flagged `must_change_password`.
- **Who sets it:** the commands now; the Back Office in 06 and 07. Never for Kiosk Accounts.
- **While flagged:** the owner lands on My Account with "An Admin set your password. Choose your own to continue." Every other Back Office page redirects there, and the Back Office APIs and Server Actions refuse.
- **Clearing it:** changing the password clears the flag and goes to the Account's home.

See the spec (Part 2, "sign-in, forced change, pages").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] **Setting the flag:** the Accounts module sets it for Staff and Admin (never Kiosk) on `create`, `createFirst` and `resetPassword`. So `npm run staff -- create|create-admin|reset-password` and `npm run seed` flag the Account.
- [ ] **Session:**
  - `getSignedInAccount` returns `mustChangePassword`.
  - While it is set, `requireStaff()` and `requireAdmin()` redirect to `/admin/account`.
  - `getCurrentStaff()`, `getCurrentAdmin()` and `getCurrentCheckInAccount()` return null.
  - My Account uses a variant that lets the flag through. Its Name form stays usable.
- [ ] **Clearing the flag:** the `hooks.after` on a successful `/change-password` (from 04) also clears it.
- [ ] **My Account while flagged:** shows the notice above the forms, then goes to `homePath` after a successful change. "Sign out" works.
- [ ] **Tests against a real database:**
  - the flag per kind and operation;
  - `auth.api.changePassword` clears it;
  - Kiosk Accounts are never flagged.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - `reset-password` a Staff Account, then sign in, and land on My Account with the notice;
  - the desk and an API call are refused or redirected;
  - change the password, then land on the desk;
  - the same for an Admin, landing on `/admin`;
  - a Kiosk Account after `reset-password` goes straight to the Kiosk.
