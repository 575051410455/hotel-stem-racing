# 03: Staff change their own password at /admin/password

**What to build:** the sidebar's account menu gains "เปลี่ยนรหัสผ่าน", above "ออกจากระบบ". It opens `/admin/password`, a Back Office page titled "เปลี่ยนรหัสผ่าน".
- **The form:** current password, new password (at least 12 characters) and confirmation.
- **The warning:** "อุปกรณ์อื่นที่ใช้บัญชีนี้จะต้องเข้าสู่ระบบใหม่".
- **On success:** the password changes through Better Auth, other devices are signed out, this one stays signed in, a toast says "เปลี่ยนรหัสผ่านแล้ว" and the form clears.
- **Errors:** they show next to their field in Thai.
- **Kiosk Accounts:** they are sent back to `/kiosk`.

See the spec ("Changing a password").

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] **The page** `/admin/password` is in the signed-in Back Office layout, with `PageHeader`/`PageTitle` "เปลี่ยนรหัสผ่าน" and narrow `PageContent`.
  - It checks the session with `requireStaff()`, behind `<Suspense>`, so a Kiosk Account goes to `/kiosk`.
  - It is not in the main sidebar nav.
- [ ] **Account menu:** a "เปลี่ยนรหัสผ่าน" item with a lucide key icon links to the page, above "ออกจากระบบ", by pointer and by keyboard.
- [ ] **The form:**
  - three password fields with Thai labels and the right `autocomplete` values (`current-password`, `new-password`)
  - a hint for the 12-character minimum
  - the other-devices warning
  - a submit button with a pending state
- [ ] **Submitting** goes through Better Auth's existing change-password endpoint from the browser client, revoking other sessions.
- [ ] **Errors** show inline in Thai: a wrong current password on that field; a new password that is too short, too long or doesn't match its confirmation (checked in the browser and enforced by the server's limits); and the rate-limit wait. A signed-out session shows the sign-in link.
- [ ] **On success:** `toastSuccess("เปลี่ยนรหัสผ่านแล้ว")` from the Back Office toast helper, the form clears, and this device stays signed in.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start` with two browser sessions on one Staff Account:
  - change the password, then sign in with the new one
  - the old password is refused
  - the other session is signed out
  - each inline error
  - the toast
  - a Kiosk Account is sent to `/kiosk`
  - 375 and 1280 px with no horizontal scroll
