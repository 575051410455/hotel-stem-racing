# 10: Owners sign out their other devices

**What to build:** on My Account's "Signed-in devices" section (from 09), each other device gets a "Sign out" button, and the section gets "Sign out all other devices".
- **One device:** no confirmation; the toast "Signed out of that device".
- **All others:** behind an `AlertDialog`, only when there is at least one other device:
  - title "Sign out all other devices?";
  - body "Every other device signed in to your Account is signed out. This one stays signed in.";
  - confirm "Sign out other devices", and "Cancel";
  - the toast "Signed out of your other devices".
- **This device** has no button: it signs out from the account menu, as before.

Signing out of devices records no Account Change.

See the spec (Part 2, "Signed-in devices", stories 61–66).

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 09

**Status:** resolved

- [x] **Accounts module:**
  - `signOutDevice(accountId, sessionId)`: deletes that session only if it belongs to the Account and isn't the current one; otherwise not found;
  - `signOutOtherDevices(accountId, currentSessionId)`: deletes every other session of the Account;
  - neither records an Account Change.
- [x] **Server Actions:**
  - each re-checks `getCurrentStaff()`, so a Kiosk Account and a signed-out request are refused (and, once 05 is merged, a flagged Account);
  - the current session's id comes from the session itself, never from the browser;
  - they refresh the section afterwards.
- [x] **My Account:** the buttons, dialog and toasts above. No "Sign out all other devices" when this is the only device.
- [x] **Tests against a real database:**
  - `signOutDevice` deletes another of the Account's sessions, and refuses the current session and another Account's session;
  - `signOutOtherDevices` keeps only the current session;
  - no Account Change is recorded (once 04 is merged).
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with three browser contexts signed in to one Account:
  - "Sign out" on one device: the toast, and that device is signed out on its next request;
  - "Sign out all other devices" asks first, then leaves only this one; the button then disappears;
  - this device stays signed in throughout;
  - 375 and 1280 px.

## Answer

Done on branch `am-10`, off `account-management` (with 09).

### What's where

| What | Where |
| --- | --- |
| `signOutDevice(accountId, sessionId, currentSessionId)` and `signOutOtherDevices(accountId, currentSessionId)`, with `SignOutDeviceResult` / `SignOutOtherDevicesResult` | `src/lib/auth/accounts.ts` (appended after `listDevices`) |
| Their tests: 4, at the end of `describe("Accounts: signed-in devices")` | `src/lib/auth/accounts.test.ts` |
| Server Actions `signOutDevice(deviceId)` and `signOutOtherDevices()` | `(back-office)/account/actions.ts` (after `renameOwnAccount`) |
| `SignOutDeviceButton` (a row's "Sign out") and `SignOutOtherDevicesButton` (the `AlertDialog`), with their toasts | `(back-office)/account/sign-out-devices.tsx` (new, client) |
| "Sign out" on every row but this device; "Sign out all other devices" after the list, only when there is another device | `(back-office)/account/signed-in-devices.tsx` |
| shadcn `AlertDialog` | `src/components/ui/alert-dialog.tsx` (new) |
| The Back Office theme reaches the portaled dialog: `[data-slot="alert-dialog-content"]` joins the list | `src/app/globals.css` |

### Decisions

- **`signOutDevice` takes a third argument, `currentSessionId`.** The spec writes `signOutDevice(accountId, sessionId)`, but the module can't refuse "the current one" without knowing it. The Server Action passes `staff.sessionId`, read from the session.
- **Results:**
  - `signOutDevice`: `device-signed-out`, or `not-found` (not one of the Account's sessions, or this device).
  - `signOutOtherDevices`: `other-devices-signed-out` with `count`.
  - The Server Actions add `signed-out` (no Staff session), as `renameOwnAccount` does.
- **The token stays on the server.** Both look the Account's sessions up with `internalAdapter.listSessions(accountId)`, match by id, and delete by token (`deleteSession` / `deleteSessions`).
  - Expired rows count as the Account's too, so "Sign out all other devices" also clears them.
  - `signOutOtherDevices` with an id that isn't one of the Account's sessions would sign out all of them. That can't come from the action: its id is that of the session that just authenticated the request.
- **Guard: `getCurrentStaff()`, decided deliberately** (not the cookie-free reader of the session-ended fix).
  - When the session has ended, Better Auth clears the cookie inside the action. Next then re-renders the page, and `requireStaff()` sends the browser to sign-in.
  - For My Account that's the right place to land. The fix was for an unattended Kiosk, which must keep its own screen.
  - The client's "Session expired" toast is only a fallback.
- **`refresh()` after every call by a signed-in Staff member, `not-found` included,** so a stale list catches up.
- **Copy not in the spec:**
  - `not-found` shows `toastInfo("That device is already signed out")`. The device signed itself out, was signed out from elsewhere, or its sign-in ran out; the refreshed list drops it.
  - A failed call shows `toastError` with the forms' "Can't reach the server…".
  - An ended session shows `toastError(<SessionExpired />)`.
  - Pending labels: "Signing out…".
- **The dialog:**
  - It stays open, with both buttons disabled, until the action returns. Escape is ignored meanwhile.
  - Focus opens on Cancel (Radix).
  - The confirm button is the default (primary), not destructive: signing in again undoes it.
- **"Sign out" buttons:**
  - `outline`, `sm`.
  - Each has `aria-describedby` set to its row's text (`id="device-{session id}"`: label, IP, time), so a screen reader hears which device.
  - They send only the session id.
- **`AlertDialog` was added by hand.** `npx shadcn@latest add alert-dialog` now installs a new `cn` npm package, imports `cn` from it, and asks to overwrite `button.tsx`. I reverted that.
  - The file is the registry's `new-york-v4` item with this repo's `@/lib/utils` and `@/components/ui/button` imports, like the other ui files. No new dependency.
- **`globals.css`:** the shadcn palette lives only in `.back-office` and in the portaled primitives listed by `data-slot`.
  - The first browser run showed the dialog with no background and an uncoloured confirm button.
  - `[data-slot="alert-dialog-content"]` now joins the list, as the block's note asks. 08's Disable dialog gets it for free.
- **Tests:**
  - They watch the outcome through the public seams: each device's cookie through `auth.api.getSession` (its next request), and `listDevices`.
  - "No Account Change" isn't tested yet: 04 (the Account History) isn't merged, and neither operation writes anything but sessions. Once 04 lands, a test can assert `history()` stays empty after both.

### Guards (audit)

| Server Action / page | Guard |
| --- | --- |
| `signOutDevice(deviceId)` | `getCurrentStaff()`: null for a signed-out request, an ended session or a Kiosk Account (and, once 05 is merged, a flagged Account) → `signed-out`, nothing done. The Account and this device come from the session. The id must be another session of that Account, else `not-found`; a non-string id is `not-found`. |
| `signOutOtherDevices()` | `getCurrentStaff()`, as above. Takes nothing from the browser; arguments are ignored. |
| `/admin/account` | unchanged: `requireStaff()` below `<Suspense>`; `SignedInDevices` reads through `getCurrentStaff()` |

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (278 pass; 4 new) and `npm run build` pass.
- **Setup:**
  - `next start` on :3110, on the scratch database `stem_racing_am10`, with email off.
  - Staff, Admin and Kiosk Accounts were made with `npm run staff`.
  - Headless Chrome ran on :9310 with a fresh profile.
  - Three browser contexts signed in to `staff@am10.test`, in this order:
    - "laptop": Chrome on Windows, 1280 px, 198.51.100.21;
    - "desktop": Firefox on Linux, 1280 px, 198.51.100.31;
    - "phone": Safari on iPhone, 375 px, 198.51.100.11.
- **Every context lists:**
  - 3 devices, itself first with "This device" and no button;
  - "Sign out" on the other two;
  - "Sign out all other devices";
  - no horizontal scroll.
- **"Sign out" on one device:** the desktop signed the laptop out.
  - The toast "Signed out of that device" showed, and the row left with no reload.
  - The laptop's next request ended on `/admin/login`.
- **A stale list:** the phone still showed the laptop. Its "Sign out" gave "That device is already signed out", and the list refreshed to 2.
- **"Sign out all other devices" on the phone (375 px):**
  - The dialog read "Sign out all other devices?", the body as specified, and "Cancel" / "Sign out other devices", with focus on Cancel.
  - Cancel closed it; both devices stayed, and the desktop still loaded My Account.
  - Confirming gave "Signed out of your other devices". Only "Safari on iPhone · This device" was left, and the button was gone.
  - The page was usable afterwards: no leftover `pointer-events: none`.
  - The desktop's next request ended on `/admin/login`.
- **This device stayed signed in throughout.** A reload still showed it.
- **At 1280 px** (the phone's tab resized, the laptop signed in again):
  - 2 devices;
  - the dialog with its buttons side by side;
  - after confirming, 1 device and no button; the laptop was signed out.
- Screenshots at 375 and 1280 px (list, dialog, after) looked right once the `globals.css` fix was in.
- **Forged requests.** Both action ids were taken from real clicks, then replayed with `fetch`:
  - **A Kiosk Account:** both answered `{"status":"signed-out"}`, and nothing was signed out.
  - **An ended session** (a stale cookie): `signed-out`. The response also carried the redirect to `/admin/login`, because the cookie was cleared.
  - **A Staff session naming another session:** the Admin's session, its own session and an object id all gave `not-found`, and nothing was signed out.
  - **`signOutOtherDevices` with a forged argument:** the argument was ignored, and this device stayed.
- **No session token reaches the browser.** None of the database's 5 tokens was in:
  - the HTML;
  - the RSC payload;
  - the DOM;
  - `document.cookie`.

  The user agent isn't in them either. The Staff's own session ids are: React keys, `aria-describedby` targets and the action's argument.

### Noticed, not changed

- **Focus is lost after a sign-out.** After "Sign out" on a row, or after the dialog, the focused button leaves the page and focus falls to `<body>`. Sonner's live region announces the toast. Moving focus to the "Signed-in devices" heading would help keyboard users.
- **On a phone, the toast covers the foot of My Account,** where "Sign out all other devices" sits, for its 4 s. Sonner pauses while a pointer rests on it. This is the Back Office's toast placement.
- **The shadcn CLI now wants the `cn` package** and offers to overwrite `button.tsx` (above). Ticket 08's dialog can reuse this file. Any other new ui component needs the same adaptation.
- **`createAccounts`'s doc comment** still doesn't mention devices (09's note). It's left alone for the merge with 03.
- **For the check recipe:** with three browser contexts (three headless windows), a tab became `document.hidden`, and Sonner pauses toasts on a hidden document. `Emulation.setFocusEmulationEnabled({ enabled: true })` on each tab fixed it.
