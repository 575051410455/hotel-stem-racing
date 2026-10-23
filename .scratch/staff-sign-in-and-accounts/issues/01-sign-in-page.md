# 01: Staff sign-in page in the login-01 layout

**What to build:** `/admin/login` looks like shadcn/ui's `login-01` block: a centred card on a full-height page, built with shadcn's field components. It titles itself "เข้าสู่ระบบหลังบ้าน" with "สำหรับเจ้าหน้าที่ {Event name}". It works exactly as it does now:
- Better Auth sign-in
- the Thai error messages and the rate-limit wait
- a Kiosk Account goes straight to `/kiosk`

There is no Google sign-in, no sign-up and no reset link. A muted line says "ลืมรหัสผ่าน? ติดต่อผู้จัดงานเพื่อตั้งรหัสผ่านใหม่". See the spec ("Sign-in page").

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] **Installed with the shadcn CLI:**
  - Only the `field` primitive is kept beyond what's already installed.
  - Existing ui files aren't overwritten without a reviewed diff.
  - Imports use `@/lib/utils`, and the `cn` package isn't added.
  - The block's own `/login` page is deleted, so `/login` answers 404.
- [ ] `/admin/login` uses the `login-01` layout and field components: a centred card at full height, one h1, the existing title and description, and Thai labels อีเมล / รหัสผ่าน with the button เข้าสู่ระบบ.
- [ ] **Behaviour unchanged:**
  - success goes to `/admin`, and a Kiosk Account to `/kiosk`
  - wrong email or password, invalid email, too many attempts (with the wait in seconds) and no connection show the same Thai messages, announced as now
  - the pending state disables the button
- [ ] **Not included:** "Login with Google", "Sign up" and a reset link. The muted line "ลืมรหัสผ่าน? ติดต่อผู้จัดงานเพื่อตั้งรหัสผ่านใหม่" is not a link.
- [ ] The page stays inside `.back-office` (light theme) and fits 375px with no horizontal scroll.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - sign-in success
  - a wrong password
  - the rate-limit message
  - a Kiosk Account landing on `/kiosk`
  - 375 and 1280 px
  - `/login` returning 404
