# 06: English Back Office: shell, sign-in and change password

**What to build:** The Back Office's frame and its account pages are English, written directly in the code with no toggle.
- The Back Office root layout declares `<html lang="en">`; the title template becomes "%s · Back Office · STEM Racing Thailand 2026".
- The sidebar, navigation, account menu, mobile sheet and shared states ("Loading…", "Session expired", "Sign in again", "Try again", "Cancel").
- The screen-reader-only strings in the shared UI primitives the Back Office uses: sheet, sidebar, breadcrumb and Toaster.
- The sign-in page with every error, and the change-password page with every error and its toast.
- **After account-management 01–02 (merged into `main` first):**
  - the sidebar is per kind: Admin sees Registrations, Check-In, Email; Staff see Check-In;
  - the account menu says "My Account";
  - the change-password form lives on `/admin/account`, already in English.

  Translate what is still Thai around them, and check the shell as both an Admin and a Staff Account.
- The Kiosk page keeps `<html lang="th">`.

Work on the integration branch `back-office-english` (branch each ticket from it, merge back into it). Nothing reaches `main` before ticket 10.

See the spec ("English Back Office") and `copy-back-office.md` ("Shell", "Sign-in page", "Change password").

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Every string in the listed areas matches `copy-back-office.md`; no Thai left in them.
- [ ] Sign-in behaviour is unchanged (redirects, rate-limit wait, Kiosk Account to `/kiosk`); only the words change.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the sign-in errors, the sidebar and mobile sheet, and change password, at 375 and 1280 px.
