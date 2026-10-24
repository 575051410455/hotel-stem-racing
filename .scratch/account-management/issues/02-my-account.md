# 02: My Account: your email and kind, your name, and your password

**What to build:** `/admin/account`, a Back Office page for Staff and Admin Accounts titled "My Account". It shows:
- the Account's email and kind, read-only;
- a Name field the owner can save (trimmed, not empty, at most 100 characters);
- the change-password form, moved here from `/admin/password`, which now redirects to it.

The account menu's "Change password" becomes "My Account". Better Auth's own `/update-user` endpoint is refused, so names change only through the Accounts module. Kiosk Accounts have no My Account. All copy is English.

See the spec (Part 1, "My Account").

**Part:** 1, before the Event. Branch from `main` after 01, merge `--no-ff` into `main` by 28 October 2026.

**Blocked by:** 01

**Status:** resolved

- [x] **`/admin/account`:**
  - in the signed-in Back Office layout, behind `requireStaff()` below `<Suspense>`;
  - `PageHeader`/`PageTitle` "My Account", narrow `PageContent`;
  - not in the sidebar nav;
  - a Kiosk Account goes to `/kiosk`.
- [x] **Details:**
  - email and kind ("Admin" / "Staff"), read-only;
  - "To change your email, ask an Admin.";
  - a Name field with "Save name".
- [x] **Saving the name:**
  - The Server Action re-checks `getCurrentStaff()` and calls the Accounts module's new `rename(accountId, name, actor)`.
  - `rename` trims the name, refuses an empty one or one over 100 characters, and refuses a Kiosk Account.
  - Errors show inline (`aria-invalid`, `aria-describedby`); success shows `toastSuccess("Name saved")`.
  - The account menu shows the new name.
- [x] **Change password:** the existing form moves here with the same behaviour:
  - current, new and confirm fields;
  - the 12–128 rules and the other-devices warning;
  - Better Auth's change-password with other sessions revoked;
  - inline errors and the rate-limit wait;
  - the toast "Password changed".

  The copy is English, matching `copy-back-office.md`'s "Change password" rows.
- [x] **Old address:** `/admin/password` redirects permanently to `/admin/account`.
- [x] **Account menu:** "My Account" (lucide `UserRoundIcon`) replaces "Change password", above "Sign out", for Staff and Admin.
- [x] **Better Auth's rename:** a `hooks.before` refuses `/update-user` for every Account (fail closed), next to the `/change-password` guard.
- [x] **Tests against a real database:**
  - `rename` trims, refuses empty and over-long names, and refuses a Kiosk Account;
  - `auth.api.updateUser` is refused for a signed-in Staff, Admin and Kiosk Account.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - rename as Staff and as Admin;
  - each name error;
  - change password: the toast, a second session signed out, signing in with the new password;
  - the `/admin/password` redirect;
  - a Kiosk Account sent to `/kiosk`;
  - 375 and 1280 px.

## Answer

Done on branch `account-02-my-account`.

### What's where

| What | Where |
| --- | --- |
| The page: "My Account", Details (email, kind with what it opens, "To change your email, ask an Admin."), Name form, Change password section; `requireStaff()` behind `<Suspense>` | `(back-office)/account/page.tsx` |
| Name form (client): browser checks, then the Server Action; inline errors, the toast "Name saved" | `(back-office)/account/rename-form.tsx` |
| `renameOwnAccount`: re-checks `getCurrentStaff()`, calls the module, then `refresh()` so the account menu shows the new name | `(back-office)/account/actions.ts` |
| Change password form, moved from `password/` and now in English (copy deck "Change password" rows, plus the shell's "Session expired. Sign in again" and the connection message) | `(back-office)/account/change-password-form.tsx` |
| `rename(accountId, name)`: trims; refuses empty, over 100, or a Kiosk Account; not-found | `src/lib/auth/staff-accounts.ts` (+ tests) |
| `MAX_NAME_LENGTH = 100`, browser-safe | `src/lib/auth/name-rules.ts` |
| `staffAccounts()` on the app's auth instance | `src/lib/auth/server.ts` |
| `/update-user` refused for everyone (403 `UPDATE_USER_NOT_ALLOWED`) | `src/lib/auth/staff-auth.ts` `hooks.before` |
| `/admin/password` → `/admin/account`, permanent (308) | `next.config.ts` `redirects()` |
| Account menu: "My Account" (lucide `UserRoundIcon`) | `_shell/staff-account-dropdown.tsx` |
| Seed message and deploy guide point to My Account | `scripts/seed.ts`, `docs/deploy.md` |

### Decisions

- **`rename` takes no actor yet.** The actor arrives with the Account History (ticket 04), so there's no unused parameter now.
- **No `maxLength` on the Name input.** Over-long names get the inline error instead, like the password form. The server enforces the limit either way.
- **A Kiosk Account's `/update-user` attempt to change its `kind`** now gets 403 from the hook instead of 400 from validation. The existing test was updated, and it now tries `kind: "admin"`.
- **The redirect lives in `next.config.ts`,** not a page, so the old address answers before any rendering.
- **Mixed language for now:** the rest of the shell (sidebar labels, "ออกจากระบบ", the title template) stays Thai until thai-english 06, as planned.

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (249 pass) and `npm run build` pass.
- **Setup:** `next start` on a copy of the local demo database, with Staff, Admin and Kiosk Accounts in separate browser contexts.
- **Staff:**
  - The account menu shows "My Account → /admin/account", then ออกจากระบบ. Opened with pointer events.
  - The page shows the title, Details ("Staff · the Check-In desk") and the name.
  - **Rename:** empty → "Please enter your name", focused; 101 characters → "Your name can be at most 100 characters"; "  ประตู สอง  " → toast "Name saved", input "ประตู สอง", account menu updated, kept after reload.
  - **Change password:**
    - wrong current → "Wrong current password";
    - mismatch → "The new passwords don't match";
    - success → toast "Password changed";
    - this device stays signed in, and the second device's session is gone;
    - the old password is refused, and the new one signs in.
  - `/admin/password` → `/admin/account` (308).
  - No horizontal scroll at 375 px.
- **Admin:** "Admin · the whole Back Office", no horizontal scroll at 1280 px.
- **Kiosk:** `/admin/account` sends it to `/kiosk`.
- **Not checked in the browser:**
  - an Admin renaming. It is the same form and action; the module test renames an Admin Account.
  - the change-password rate-limit wait. Its logic is unchanged and only translated.
