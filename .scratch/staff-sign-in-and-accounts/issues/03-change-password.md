# 03: Staff change their own password at /admin/password

**What to build:** the sidebar's account menu gains "เปลี่ยนรหัสผ่าน", above "ออกจากระบบ". It opens `/admin/password`, a Back Office page titled "เปลี่ยนรหัสผ่าน".
- **The form:** current password, new password (at least 12 characters) and confirmation.
- **The warning:** "อุปกรณ์อื่นที่ใช้บัญชีนี้จะต้องเข้าสู่ระบบใหม่".
- **On success:** the password changes through Better Auth, other devices are signed out, this one stays signed in, a toast says "เปลี่ยนรหัสผ่านแล้ว" and the form clears.
- **Errors:** they show next to their field in Thai.
- **Kiosk Accounts:** they are sent back to `/kiosk`.

See the spec ("Changing a password").

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] **The page** `/admin/password` is in the signed-in Back Office layout, with `PageHeader`/`PageTitle` "เปลี่ยนรหัสผ่าน" and narrow `PageContent`.
  - It checks the session with `requireStaff()`, behind `<Suspense>`, so a Kiosk Account goes to `/kiosk`.
  - It is not in the main sidebar nav.
- [x] **Account menu:** a "เปลี่ยนรหัสผ่าน" item with a lucide key icon links to the page, above "ออกจากระบบ", by pointer and by keyboard.
- [x] **The form:**
  - three password fields with Thai labels and the right `autocomplete` values (`current-password`, `new-password`)
  - a hint for the 12-character minimum
  - the other-devices warning
  - a submit button with a pending state
- [x] **Submitting** goes through Better Auth's existing change-password endpoint from the browser client, revoking other sessions.
- [x] **Errors** show inline in Thai: a wrong current password on that field; a new password that is too short, too long or doesn't match its confirmation (checked in the browser and enforced by the server's limits); and the rate-limit wait. A signed-out session shows the sign-in link.
- [x] **On success:** `toastSuccess("เปลี่ยนรหัสผ่านแล้ว")` from the Back Office toast helper, the form clears, and this device stays signed in.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start` with two browser sessions on one Staff Account:
  - change the password, then sign in with the new one
  - the old password is refused
  - the other session is signed out
  - each inline error
  - the toast
  - a Kiosk Account is sent to `/kiosk`
  - 375 and 1280 px with no horizontal scroll

## Answer

Done on branch `staff-03-change-password`.

### What's where

| What | Where |
| --- | --- |
| The page: `PageHeader`/`PageTitle` "เปลี่ยนรหัสผ่าน", narrow `PageContent`. "บัญชี {email}" and the form sit behind `requireStaff()` in a `<Suspense>`. | `(back-office)/password/page.tsx` |
| The form, on the `field` primitive from ticket 01. It calls `staffAuthClient.changePassword({ …, revokeOtherSessions: true })`. | `(back-office)/password/change-password-form.tsx` |
| Account menu: label, separator, "เปลี่ยนรหัสผ่าน" (lucide `KeyRoundIcon`, a `Link` via `asChild`, closes the mobile sheet like the nav links), separator, "ออกจากระบบ" | `_shell/staff-account-dropdown.tsx` |
| `MIN_PASSWORD_LENGTH` / `MAX_PASSWORD_LENGTH`, moved out of `staff-auth.ts`, which imports server code, so the browser form can share them | `src/lib/auth/password-rules.ts` |

### Decisions

- **Browser checks run first, then the request:**
  - current password empty
  - new password under 12 or over 128 characters
  - confirmation empty or different
  - Each problem shows under its field (`FieldError`), with `aria-invalid` and `aria-describedby`, and the first field with a problem is focused and selected.
- **Server answers:**

  | Answer | Shown |
  | --- | --- |
  | `INVALID_PASSWORD` | "รหัสผ่านปัจจุบันไม่ถูกต้อง" on the current password |
  | `PASSWORD_TOO_SHORT` | the too-short message on the new password |
  | `PASSWORD_TOO_LONG` | on the new password if it is the long one, otherwise on the current password as wrong (the server also refuses a current password over 128) |
  | 429 | "พยายามเปลี่ยนรหัสผ่านหลายครั้งเกินไป กรุณารอ N วินาทีแล้วลองใหม่". Better Auth's built-in rule allows 3 per 10 s per address, like sign-in. |
  | 401 | "หมดเวลาการเข้าสู่ระบบ" with the link "เข้าสู่ระบบอีกครั้ง" |
  | network failure | the sign-in page's no-connection message |

  The last three show above the button, in an always-rendered `role="alert"` paragraph, as on the sign-in page.
- **This device stays signed in:** with `revokeOtherSessions`, Better Auth deletes every session, creates a new one and sets its cookie on the response.
- **The other-devices warning** is a `FieldDescription` above the button, and the button's `aria-describedby`.
- **Added beyond the ticket:**
  - "บัญชี {email}" above the form, so Staff know which Account they are changing
  - a hidden `autocomplete="username"` field, so password managers save the new password against the right Account
- **No new tests:** UI is not an agreed seam, and the password rules come from the same constants the existing module tests cover.

### Gotchas

- **Choosing a dropdown item that navigates:** Radix returns focus to the menu's trigger about 100–200 ms later, when the menu's close animation ends. A test that clicks into the new page sooner loses its focus to the trigger. Wait for that, as a person always does.
- **Pages loaded in full:** streamed Suspense content is in the DOM but hidden until React reveals it. Wait for `checkVisibility()`, not just presence.

### Verified

- typecheck, lint, the 218 tests and build pass. `/admin/password` is `◐`.
- **Headless Chrome against `next start`** (port 3142, the scratch database; a Staff Account, a Kiosk Account, each scenario from its own `X-Real-IP`): 38 of 38 checks pass.
  - **Menu:**
    - By pointer: the items are "เปลี่ยนรหัสผ่าน" (key icon) then "ออกจากระบบ", and choosing the first opens `/admin/password`.
    - By keyboard at 375 px, inside the mobile sheet: Enter on the account button opens the menu with focus on "เปลี่ยนรหัสผ่าน", and Enter on it opens the page and closes the sheet.
  - **Page:**
    - one h1 "เปลี่ยนรหัสผ่าน"; the title "เปลี่ยนรหัสผ่าน · ระบบหลังบ้าน · …"; "บัญชี staff03@example.org"
    - no nav item highlighted, and none added
    - inputs `username` (hidden), `current-password`, `new-password` ×2, with labels tied to them
    - the hint "อย่างน้อย 12 ตัวอักษร" describes the new password, and the warning describes the button
  - **Inline errors:**
    - all empty: three messages, focus on the current password
    - too short (11), too long (129), mismatch: each on its own field, focused
    - wrong current password, from the server: on that field, focused and selected
  - **Server limits:** a `fetch` around the form gets `400 PASSWORD_TOO_SHORT` and `400 PASSWORD_TOO_LONG`.
  - **Other messages:**
    - the fourth attempt within 10 s: the wait message
    - request paused: the button is disabled and reads "กำลังเปลี่ยนรหัสผ่าน…"
    - request failed: the no-connection message
  - **Two sessions (A and B, separate browser contexts):**
    - A changes the password: the toast "เปลี่ยนรหัสผ่านแล้ว" shows, and the fields and messages clear.
    - A then opens `/admin` and stays signed in. B opening `/admin` is sent to `/admin/login`.
    - The old password is refused at sign-in, and the new one signs in.
  - **Signed out meanwhile** (cookies cleared with the page open): "หมดเวลาการเข้าสู่ระบบ เข้าสู่ระบบอีกครั้ง", linking to `/admin/login`.
  - **Kiosk Account:** `/admin/password` sends it to `/kiosk`. Without a session cookie, the proxy answers 307 to `/admin/login`.
  - **Widths:** no horizontal scroll at 1280 px, or at 375 px with all three errors.
  - **Focus loop:**
    - first run: 15 runs with no wait reproduced the trigger taking focus back (see Gotchas)
    - rerun after the trigger has settled: 12 runs, 0 misses
- **Screenshots looked at:**
  - the toast at 1280 px
  - the wrong current password
  - 375 px with errors
  - the account menu at 375 px once the sheet had finished opening
- **Found, not caused here:** the mobile sidebar sheet has a transparent background. `sidebar.tsx` gives its `SheetContent` `data-slot="sidebar"`, replacing `sheet-content`. The theme block in `globals.css` then doesn't match it, so `--sidebar` is empty, and the computed background reads `rgba(0, 0, 0, 0)`. This has been the case since redesign 01 (`c42e4e6`) and is reported separately.
