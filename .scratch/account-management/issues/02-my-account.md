# 02: My Account: your email and kind, your name, and your password

**What to build:** `/admin/account`, a Back Office page for Staff and Admin Accounts titled "My Account". It shows:
- the Account's email and kind, read-only;
- a Name field the owner can save (trimmed, not empty, at most 100 characters);
- the change-password form, moved here from `/admin/password`, which now redirects to it.

The account menu's "Change password" becomes "My Account". Better Auth's own `/update-user` endpoint is refused, so names change only through the Accounts module. Kiosk Accounts have no My Account. All copy is English.

See the spec (Part 1, "My Account").

**Part:** 1, before the Event. Branch from `main` after 01, merge `--no-ff` into `main` by 28 October 2026.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] **`/admin/account`:**
  - in the signed-in Back Office layout, behind `requireStaff()` below `<Suspense>`;
  - `PageHeader`/`PageTitle` "My Account", narrow `PageContent`;
  - not in the sidebar nav;
  - a Kiosk Account goes to `/kiosk`.
- [ ] **Details:**
  - email and kind ("Admin" / "Staff"), read-only;
  - "To change your email, ask an Admin.";
  - a Name field with "Save name".
- [ ] **Saving the name:**
  - The Server Action re-checks `getCurrentStaff()` and calls the Accounts module's new `rename(accountId, name, actor)`.
  - `rename` trims the name, refuses an empty one or one over 100 characters, and refuses a Kiosk Account.
  - Errors show inline (`aria-invalid`, `aria-describedby`); success shows `toastSuccess("Name saved")`.
  - The account menu shows the new name.
- [ ] **Change password:** the existing form moves here with the same behaviour:
  - current, new and confirm fields;
  - the 12–128 rules and the other-devices warning;
  - Better Auth's change-password with other sessions revoked;
  - inline errors and the rate-limit wait;
  - the toast "Password changed".

  The copy is English, matching `copy-back-office.md`'s "Change password" rows.
- [ ] **Old address:** `/admin/password` redirects permanently to `/admin/account`.
- [ ] **Account menu:** "My Account" (lucide `UserRoundIcon`) replaces "Change password", above "Sign out", for Staff and Admin.
- [ ] **Better Auth's rename:** a `hooks.before` refuses `/update-user` for every Account (fail closed), next to the `/change-password` guard.
- [ ] **Tests against a real database:**
  - `rename` trims, refuses empty and over-long names, and refuses a Kiosk Account;
  - `auth.api.updateUser` is refused for a signed-in Staff, Admin and Kiosk Account.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - rename as Staff and as Admin;
  - each name error;
  - change password: the toast, a second session signed out, signing in with the new password;
  - the `/admin/password` redirect;
  - a Kiosk Account sent to `/kiosk`;
  - 375 and 1280 px.
