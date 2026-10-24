# 05: A password set by someone else must be changed at the next sign-in

**What to build:** when someone other than its owner sets a Staff or Admin Account's password, the Account is flagged `must_change_password`.
- **Who sets it:** the commands now; the Back Office in 06 and 07. Never for Kiosk Accounts.
- **While flagged:** the owner lands on My Account with "An Admin set your password. Choose your own to continue." Every other Back Office page redirects there, and the Back Office APIs and Server Actions refuse.
- **Clearing it:** changing the password clears the flag and goes to the Account's home.

See the spec (Part 2, "sign-in, forced change, pages").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 04

**Status:** resolved

- [x] **Setting the flag:** the Accounts module sets it for Staff and Admin (never Kiosk) on `create`, `createFirst` and `resetPassword`. So `npm run staff -- create|create-admin|reset-password` and `npm run seed` flag the Account.
- [x] **Session:**
  - `getSignedInAccount` returns `mustChangePassword`.
  - While it is set, `requireStaff()` and `requireAdmin()` redirect to `/admin/account`.
  - `getCurrentStaff()`, `getCurrentAdmin()` and `getCurrentCheckInAccount()` return null.
  - My Account uses a variant that lets the flag through. Its Name form stays usable.
- [x] **Clearing the flag:** the `hooks.after` on a successful `/change-password` (from 04) also clears it.
- [x] **My Account while flagged:** shows the notice above the forms, then goes to `homePath` after a successful change. "Sign out" works.
- [x] **Tests against a real database:**
  - the flag per kind and operation;
  - `auth.api.changePassword` clears it;
  - Kiosk Accounts are never flagged.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - `reset-password` a Staff Account, then sign in, and land on My Account with the notice;
  - the desk and an API call are refused or redirected;
  - change the password, then land on the desk;
  - the same for an Admin, landing on `/admin`;
  - a Kiosk Account after `reset-password` goes straight to the Kiosk.

## Answer

Done on branch `am-05`, off `account-management`. Started by an agent that stopped mid-way (the code was there, uncommitted, with no check run); finished, checked and handed off inline.

### What's where

| What | Where |
| --- | --- |
| `mustChooseOwnPassword(kind, flag)`: the flag counts only for kinds that can change their own password, so a Kiosk is never held back, even if its flag were set; `MY_ACCOUNT_PATH` | `src/lib/auth/access.ts` (+ 1 test in `access.test.ts`) |
| `create` / `createFirst` set `mustChangePassword` for Staff and Admin; `resetPassword` sets it for Staff and Admin (after the new hash, before deleting sessions) | `src/lib/auth/accounts.ts` (+ `describe("Accounts: a password set by someone else")` in `accounts.test.ts`, 8 tests; two existing tests now expect `true` for a new Staff Account) |
| `hooks.after` on a successful `/change-password` clears the flag, then records `password-changed` as before | `src/lib/auth/staff-auth.ts` |
| `CurrentAccount.mustChangePassword`; `requireAccountThat` / `signedInAccountThat` take `{ forOwnAccount }`; `requireStaffForOwnAccount()` and `getStaffForOwnAccount()`; `getCurrentCheckInAccount()` and `requireCheckInAccount()` refuse / redirect a flagged Account | `src/lib/auth/session.ts` |
| My Account: the notice, Signed-in devices left out while flagged, `homeAfterChange` for the form | `(back-office)/account/page.tsx`, `change-password-form.tsx` |
| The rename Server Action lets the flag through; the two device actions still refuse it | `(back-office)/account/actions.ts` |
| The account menu (My Account, Sign out) shows while flagged; the page links don't | `_shell/staff-account-menu.tsx`, `_shell/current-back-office-nav.tsx` (comment only) |
| Sign-in goes straight to My Account when flagged (saves a hop) | `src/app/admin/login/sign-in-form.tsx` |
| Command and seed messages; operator guide wording | `scripts/staff.ts`, `scripts/seed.ts`, `docs/deploy-guide/index.html` |

### Decisions

- **The flag is checked before the kind.** A flagged Staff Account opening `/admin` goes straight to My Account, not via the desk.
- **Signed-in devices is left out while flagged,** rather than shown with buttons that would be refused: its actions use `getCurrentStaff()`, which refuses a flagged Account like every other Back Office action. Setting the password already signed every device out, and the change itself signs the others out again.
- **Only the Name form and the account menu let the flag through** (`forOwnAccount`). Everything else, Route Handlers and the check-in Server Action included, treats a flagged Account like a signed-out one (401 / "Session expired").
- **After the change:** `router.replace(homePath)` then `router.refresh()`. The sidebar is in the layout, which a client navigation doesn't re-render; the refresh brings back its page links. The "Password changed" toast survives (the Toaster is in the layout).
- **The hook clears before it records,** so a failed record never leaves the owner held at My Account with a password only they know.
- **`makeAdmin` and the owner's rename don't flag.** Only a password chosen by someone else does.
- **`mustChooseOwnPassword` in `CurrentAccount`:** `currentAccount()` stores the combined rule, not the raw column, so every guard reads one boolean.

### Guards (audit)

| Page / handler | While flagged |
| --- | --- |
| `/admin`, `/admin/registrations/[id]`, `/admin/email`, `/admin/accounts`, `/admin/accounts/history` (`requireAdmin`) | redirect to `/admin/account` |
| `/admin/check-in` (`requireStaff`), `/kiosk` (`requireCheckInAccount`) | redirect to `/admin/account` |
| `/admin/account` (`requireStaffForOwnAccount`) | shown, with the notice |
| `/api/back-office/*` (`getCurrentAdmin`) | 401 |
| `checkInScan` (`getCurrentCheckInAccount`) | `signed-out` |
| `renameOwnAccount` (`getStaffForOwnAccount`) | allowed |
| `signOutDevice`, `signOutOtherDevices` (`getCurrentStaff`) | `signed-out` |
| `signOut` | allowed (no session check) |
| Better Auth `/change-password` | allowed; clears the flag on success |

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (310 pass; 9 new) and `npm run build` pass.
- **Setup:** `next start` on :3105 on the scratch database `stem_racing_am05`, email off; headless Chrome on :9305, one browser context and `X-Real-IP` per Account; the sign-in and change-password forms typed into and submitted with Enter. 45/45 checks passed.
- **Commands:** `create` and `create-admin` flag the Account and say "At their first sign-in they must choose their own password."; `create-kiosk` doesn't flag and says nothing. `npm run seed` on a fresh database flags the first Admin and says "you'll be asked to choose your own password before anything else."
- **Staff:**
  - `reset-password` (says "At their next sign-in…"), then sign in: lands on My Account with "An Admin set your password. Choose your own to continue." above Details; no Signed-in devices; no page links in the sidebar; the account menu is there.
  - `/admin/check-in`, `/admin`, `/admin/accounts`, `/admin/email` and `/kiosk` all end on `/admin/account`; `GET /api/back-office/registrations` is 401.
  - Save name works ("Name saved", stored). No sideways scroll at 375 px; the notice wraps.
  - Change password: lands on `/admin/check-in` with the toast "Password changed", and the sidebar's "Check-In" link is back. The flag is cleared. My Account then shows Signed-in devices and no notice.
  - History: `created`, `password-set` (Server command), `name-changed`, `password-changed` (owner).
- **Admin:**
  - `reset-password`, sign in: My Account with the notice. `/admin`, `/admin/accounts`, `/admin/accounts/history`, `/admin/email`, `/admin/check-in`, `/kiosk` all end on `/admin/account`. `/api/back-office/registrations`, `…/export` and `…/bulk-send/summary` are 401.
  - "Sign out" from the account menu works; signing in again lands on My Account again.
  - Change password: lands on `/admin` with every page link back (Registrations, Check-In, Email, Accounts); the API answers 200.
  - **Server Action:** with the desk open, I set the flag by SQL and checked a Pass Code in: "Session expired", no Check-In recorded; reloading the desk goes to My Account.
- **Kiosk:** `reset-password` doesn't flag and adds no note; sign-in goes straight to `/kiosk`.
- Screenshots at 1280 and 375 px (flagged My Account), the desk after the change and the refused scan.

### Noticed, not changed

- **The desk says "Session expired"** for a flagged Account's scan. It can only happen when the flag is set while signed in, and every way to set it (create, reset, later 06/07) deletes or precedes the sessions. Not worth its own message.
- **`/admin/login` while flagged** shows the sign-in form, as it does for any signed-in Account.

### For later tickets

- **06/07 (Back Office create and set password):** call the module's `create` / `setPassword`; the flag comes with them. Don't set `mustChangePassword` anywhere else.
- **New Back Office pages:** guard with `requireAdmin()` / `requireStaff()` as usual: they hold a flagged Account back for free. Use the `…ForOwnAccount` variants only for the Account's own things.
- **08 (disable):** `getSignedInAccount` is the place for the disabled backstop too; `currentAccount()` builds the `CurrentAccount`.
