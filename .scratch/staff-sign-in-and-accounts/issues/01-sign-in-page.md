# 01: Staff sign-in page in the login-01 layout

**What to build:** `/admin/login` looks like shadcn/ui's `login-01` block: a centred card on a full-height page, built with shadcn's field components. It titles itself "เข้าสู่ระบบหลังบ้าน" with "สำหรับเจ้าหน้าที่ {Event name}". It works exactly as it does now:
- Better Auth sign-in
- the Thai error messages and the rate-limit wait
- a Kiosk Account goes straight to `/kiosk`

There is no Google sign-in, no sign-up and no reset link. A muted line says "ลืมรหัสผ่าน? ติดต่อผู้จัดงานเพื่อตั้งรหัสผ่านใหม่". See the spec ("Sign-in page").

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] **Installed with the shadcn CLI:**
  - Only the `field` primitive is kept beyond what's already installed.
  - Existing ui files aren't overwritten without a reviewed diff.
  - Imports use `@/lib/utils`, and the `cn` package isn't added.
  - The block's own `/login` page is deleted, so `/login` answers 404.
- [x] `/admin/login` uses the `login-01` layout and field components: a centred card at full height, one h1, the existing title and description, and Thai labels อีเมล / รหัสผ่าน with the button เข้าสู่ระบบ.
- [x] **Behaviour unchanged:**
  - success goes to `/admin`, and a Kiosk Account to `/kiosk`
  - wrong email or password, invalid email, too many attempts (with the wait in seconds) and no connection show the same Thai messages, announced as now
  - the pending state disables the button
- [x] **Not included:** "Login with Google", "Sign up" and a reset link. The muted line "ลืมรหัสผ่าน? ติดต่อผู้จัดงานเพื่อตั้งรหัสผ่านใหม่" is not a link.
- [x] The page stays inside `.back-office` (light theme) and fits 375px with no horizontal scroll.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - sign-in success
  - a wrong password
  - the rate-limit message
  - a Kiosk Account landing on `/kiosk`
  - 375 and 1280 px
  - `/login` returning 404

## Answer

Done on branch `staff-01-sign-in-page`.

### What's where

| What | Where |
| --- | --- |
| The `field` primitive, from `npx shadcn@latest add login-01`, importing `cn` from `@/lib/utils` | `src/components/ui/field.tsx` |
| The login-01 layout: `main` full height (`min-h-svh`), centred, `p-6 md:p-10`, a `max-w-sm` Card holding the existing h1 and description | `src/app/admin/login/page.tsx` |
| The form on `FieldGroup` / `Field` / `FieldLabel` / `FieldDescription`. Sign-in logic and messages are unchanged. | `src/app/admin/login/sign-in-form.tsx` |

### How it was installed

- `--dry-run` showed the block would overwrite `button`, `card`, `input`, `label` and `separator`. `--diff` showed the only change in each was `import { cn } from "cn"` in place of `@/lib/utils`, so every overwrite was answered "no" and all five are unchanged.
- The CLI added the `cn` package: removed again with `npm uninstall cn`. `package.json` and the lockfile are unchanged.
- The block's `src/app/login/page.tsx` and `src/components/login-form.tsx` were deleted after their layout was copied in. `/login` answers 404.

### Decisions

- **Error message placement:** the message stays one always-rendered `role="alert"` paragraph (so each new message is announced, as before), now in the last `Field` just above the button. It no longer reserves a line when empty, so the empty form matches login-01's spacing; a message pushes the button down by one line.
- **`data-invalid` on both fields** when there is a message, as `aria-invalid` already was. With field components this also turns the labels red, matching the inputs' red borders.
- **The forgot-password line** is a `FieldDescription` under the button, where the block had "Don't have an account? Sign up". It is plain text.
- **The block's `className`/`cn` wrapper (`LoginForm`) wasn't kept:** the page renders the card directly, as before.

### Verified

- typecheck, lint, the 218 tests and build pass. `/admin/login` stays `○` (static).
- **Headless Chrome against `next start`** (port 3142, scratch database with one Staff Account and one Kiosk Account, each scenario from its own `X-Real-IP`): 30 of 30 checks pass.
  - **Structure:**
    - one h1 "เข้าสู่ระบบหลังบ้าน", and the description "สำหรับเจ้าหน้าที่ STEM Racing Thailand 2026"
    - labels อีเมล and รหัสผ่าน tied to their inputs
    - one button เข้าสู่ระบบ, three `Field`s in a `FieldGroup`
    - the muted line is a `<p>`, and the form has no links
    - no Google, sign-up or reset text
    - inside `.back-office`
  - **Layout:**
    - at 1280 px the card is centred to the pixel both ways, 384 px wide
    - at 375 px it has 24 px gutters
    - no horizontal scroll at either width, with or without a message
  - **Behaviour:**
    - empty submit: "กรุณากรอกอีเมลและรหัสผ่าน"
    - invalid email: "กรุณากรอกอีเมลให้ถูกต้อง"
    - wrong password: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", both inputs `aria-invalid` and described by the message, the password selected
    - the fourth attempt in 10 s: "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 10 วินาทีแล้วลองใหม่"
    - while the request is paused, the button is disabled and reads "กำลังเข้าสู่ระบบ…"
    - the request failed (`InternetDisconnected`): "เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่", and the button is enabled again
    - the Staff Account lands on `/admin`; the Kiosk Account lands on `/kiosk`
    - `/login` answers 404
  - The live region exists before any message, as before.
- **Screenshots looked at:** 1280 px empty, 375 px with the wrong-password message, the rate-limit message. In the last, the button was caught mid-fade from its disabled opacity; a re-check read `disabled: false` and opacity 1 after 500 ms.
