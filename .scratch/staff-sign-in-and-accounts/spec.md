# Spec: Staff sign-in page, first Staff Account seed, and changing a password

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. "admin" in the request means a **Staff Account**: there is no Admin role, and "Admin" stays reserved for a permission level if one is ever needed. Respects ADR 0001 (Accounts are created only by the server command; no public sign-up) and ADR 0003 (Kiosk Accounts are check-in only). Builds on the Back Office redesign in `.scratch/back-office-redesign/`.

**Deadline:** merged to `main` by **28 October 2026**. The Back Office is frozen from 29 October to 1 November (the Event).

## Problem Statement

The organisers want the Back Office sign-in page to match the new shadcn/ui look (the `login-01` block). They also want two other things:
- **The first Staff Account in one step.** Today the operator types a name and a hidden password twice into `npm run staff -- create` on the server.
- **Changing your own password from the Back Office.** Today the only way is the operator running `npm run staff -- reset-password` on the server.

## Solution

1. **Sign-in page.** `/admin/login` takes the `login-01` layout: a centred card on a full-height page, built with shadcn's field components. It keeps everything the current form does. There is no Google sign-in, no sign-up and no self-service reset. A short line tells Staff who forgot their password to contact the organisers.
2. **`npm run seed`.** The operator runs it once after deploy. It creates the first Staff Account from an email in the server's `.env` and a strong random password, which it prints once.
   - It does nothing if a Staff Account already exists.
   - It never writes a password to the repo, a file or a log.
3. **"เปลี่ยนรหัสผ่าน"** in the sidebar's account menu opens `/admin/password`. Signed-in Staff change their own password there by entering the current one. Other devices signed in with that Account are signed out.

## User Stories

### Staff: signing in

1. As Staff, I want the sign-in page to look like the rest of the redesigned Back Office, so that it feels like one system.
2. As Staff, I want the sign-in card centred on the page with "เข้าสู่ระบบหลังบ้าน" and the Event's name, so that I know where I am.
3. As Staff, I want the same Thai error messages as now (wrong email or password, invalid email, too many attempts with the wait time, no connection), so that I know what to do.
4. As Staff, I want no Google sign-in, sign-up or "forgot password" link, so that I'm not offered things that don't work here.
5. As Staff who forgot my password, I want a line telling me to contact the organisers for a new one, so that I know the way back in.
6. As a Kiosk Account, I want signing in to take me straight to the Kiosk, as now, so that a Kiosk iPad never shows the Back Office.
7. As Staff on a phone, I want the sign-in page to fit a 375px screen, so that I can sign in at the entrance.

### Operator: the first Staff Account

8. As the operator, I want one command that creates the first Staff Account without typing a password, so that a fresh deploy is usable at once.
9. As the operator, I want its email to come from the server's `.env` (`SEED_STAFF_EMAIL`), and its name from `SEED_STAFF_NAME` or "เจ้าหน้าที่", so that nothing about it is in the repo.
10. As the operator, I want a strong random password printed once in my terminal, never stored in the repo, a file or a container log, so that only the person running it knows it.
11. As the operator, I want the command to stop with a clear message when `SEED_STAFF_EMAIL` is missing or invalid, so that I know what to fix.
12. As the operator, I want the command to do nothing, and say so, when a Staff Account already exists, so that running it again can't lock anyone out or create a second first account.
13. As the operator, I want Kiosk Accounts not to count as Staff Accounts for that check, so that a database with only Kiosks still gets its first Staff Account.
14. As the operator, I want the command to create nothing else (no sample Registrations, no Kiosk Accounts), so that no test data mixes into the real counts or CSV.
15. As the operator, I want the command to work the same locally and in the Docker container, so that I can try it before deploying.
16. As the operator, I want the deploy guide to use this command for the first Staff Account, and `npm run staff` for the rest, so that the steps are clear.

### Staff: changing my password

17. As Staff, I want "เปลี่ยนรหัสผ่าน" in my account menu at the foot of the sidebar, above "ออกจากระบบ", so that I can find it where my Account is.
18. As Staff, I want a page `/admin/password` in the Back Office layout with the title "เปลี่ยนรหัสผ่าน", so that it feels like the rest of the Back Office.
19. As Staff, I want to enter my current password, a new one and the new one again, so that nobody who finds my unlocked phone can change it, and a typo can't lock me out.
20. As Staff, I want the page to say the new password needs at least 12 characters, so that I choose a valid one the first time.
21. As Staff, I want to be told before I change it that other devices using this Account will have to sign in again, so that I'm not surprised at the entrance.
22. As Staff, I want a wrong current password, a too-short new password, a too-long one or a mismatched confirmation shown next to the field, in Thai, so that I can fix it.
23. As Staff, I want a toast "เปลี่ยนรหัสผ่านแล้ว" and the form cleared when it works, while I stay signed in on this device, so that I know it worked.
24. As Staff, I want other devices signed in with my Account to be signed out when I change it, so that someone who knew the old password loses access.
25. As a Kiosk Account, I want `/admin/password` to send me back to the Kiosk like every other Back Office page, so that a Kiosk iPad never shows it. A Kiosk Account's password is changed with the command.

## Implementation Decisions

### Sign-in page (ticket 01)

- **Install:** add `login-01` with the shadcn CLI.
  - Keep it to the `field` primitive, plus the block's layout and form markup adapted into the existing sign-in page.
  - Don't overwrite existing ui files without a reviewed diff.
  - Imports use `@/lib/utils`, not the `cn` package, as `components.json` says. Remove `cn` again if the CLI adds it.
  - Delete the block's own `/login` page: no `/login` route may exist.
- **Page and form:** the page stays `/admin/login`, outside the signed-in Back Office layout. The form keeps its behaviour:
  - Better Auth email sign-in from the browser
  - every current Thai message, including the `X-Retry-After` wait
  - a Kiosk Account goes to its home (`homePath`)
- **Copy and accessibility:** Thai labels "อีเมล" and "รหัสผ่าน", the button "เข้าสู่ระบบ", the existing title and description, and one h1.
- **Not included:** Google sign-in, sign-up and a reset link. In their place goes the muted line "ลืมรหัสผ่าน? ติดต่อผู้จัดงานเพื่อตั้งรหัสผ่านใหม่", which is not a link.
- **Theme:** the page is inside `.back-office`, so it keeps the Back Office theme. It is light only.

### First Staff Account (ticket 02)

- **The Staff Accounts module** (`createStaffAccounts`, the agreed test seam for Accounts) gains one operation: create the first Staff Account when no Staff Account exists.
  - It takes the email, the name and the password, and reuses the existing create rules (email pattern, name, 12–128 characters).
  - It returns a result the command can explain: created (with the Account), skipped because a Staff Account exists, or the existing create problems.
  - Only Accounts of kind `staff` count; Kiosk Accounts don't.
- **The command:** `npm run seed` (for example `scripts/seed.ts`).
  - It reads `SEED_STAFF_EMAIL` (required) and `SEED_STAFF_NAME` (default "เจ้าหน้าที่").
  - It generates a random password with `crypto.getRandomValues` (24+ characters, within the 128-character limit) and prints it once.
  - It never takes the password from env or arguments, and never writes it anywhere else.
  - **Exit codes:** 0 when created or skipped; non-zero, with a message, when the env var is missing or invalid.
  - It follows the existing script rules: it runs under tsx in the image, its runtime imports are in `dependencies`, it uses no top-level `await`, and it doesn't import `server-only`.
- **Not run automatically:** the command is not wired into the container start or the migrations, because a printed password would land in `docker compose logs`.
- **Docs:** `.env.example` documents `SEED_STAFF_EMAIL` and `SEED_STAFF_NAME`. Section 6 of `docs/deploy.md` creates the first Staff Account with `docker compose exec app npm run seed`, and keeps `npm run staff` for further Accounts, Kiosk Accounts and resets.

### Changing a password (ticket 03)

- **The page** `/admin/password` lives in the signed-in Back Office layout, with `PageHeader`/`PageTitle` "เปลี่ยนรหัสผ่าน" and a narrow `PageContent`.
  - The page checks the session with `requireStaff()`, so a Kiosk Account is sent to `/kiosk`.
  - It is not in the main sidebar nav.
- **Account menu:** a "เปลี่ยนรหัสผ่าน" item, with a lucide key icon, links to the page, above "ออกจากระบบ".
- **The form:**
  - current password, new password and confirm new password
  - a hint for the 12-character minimum
  - the warning "อุปกรณ์อื่นที่ใช้บัญชีนี้จะต้องเข้าสู่ระบบใหม่"
  - it submits through Better Auth's existing change-password endpoint, with other sessions revoked, from the browser client (`staffAuthClient`)
- **Results:**
  - **Wrong current password:** an inline error on that field.
  - **Too short, too long or mismatched new password:** an inline error, checked in the browser and enforced by the server's limits.
  - **Rate limit:** the wait message.
  - **Success:** `toastSuccess("เปลี่ยนรหัสผ่านแล้ว")` from the Back Office toast helper, and the form clears.
  - **Signed out meanwhile:** the sign-in link.
- **No schema change:** no forced change at first sign-in, and no password history.

## Testing Decisions

- **Seams:** the existing ones only.
  - **Staff Accounts module, against a real database** (prior art: `src/lib/auth/staff-accounts.test.ts`). Ticket 02's new operation:
    - creates a Staff Account that can sign in with the given password
    - creates it when only Kiosk Accounts exist
    - skips (creating nothing, changing nothing) when a Staff Account exists
    - refuses an invalid email or a password out of range
  - **The password generator,** if it is a separate pure function: its length and that it is random. Not cryptographic randomness tests.
- **No automated UI tests.** Each ticket's hand-off records a check against `next start`:
  - **01:** sign-in success, wrong password, the rate-limit wait, a Kiosk Account landing on `/kiosk`, 375 and 1280 px, `/login` returning 404.
  - **02:** the command run against a scratch database: create, run again to skip, missing email, Kiosk-only database.
  - **03:** change and sign in with the new password; the old password refused; a second browser's session signed out; each inline error; the toast; a Kiosk Account sent away.
- **Gate:** `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass before each commit.

## Out of Scope

- An Admin role or managing Accounts from the Back Office.
- Self-service password reset by email, Google sign-in and public sign-up.
- Forcing a password change at first sign-in, password history or expiry.
- Seeding sample Registrations, Check-Ins or Kiosk Accounts.
- Changing a Kiosk Account's password from the Kiosk (use `npm run staff -- reset-password`).

## Further Notes

- **GLOSSARY:** unchanged. "admin" was resolved to the existing Staff Account.
- **ADR:** none needed. Nothing here is hard to reverse.
- **Tickets:** in `issues/`: 01 sign-in page, 02 first Staff Account seed, 03 change password. They are independent and can run in parallel. 03 edits the sidebar account menu and adds a page; 01 touches only `/admin/login`; 02 touches the Staff Accounts module, a script, `.env.example` and `docs/deploy.md`.
