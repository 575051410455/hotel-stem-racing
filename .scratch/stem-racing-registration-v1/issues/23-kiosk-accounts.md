# 23: Kiosk Accounts (check-in only)

**What to build:** Kiosk iPads sign in with a **Kiosk Account**, which can only run the Kiosk and record Check-Ins (ADR 0003, GLOSSARY "Kiosk Account"). Even if an Attendee leaves Kiosk mode, or uses the address bar or Back, a Kiosk Account sees no Registration data. Staff Accounts are unchanged.

**Blocked by:** None (tickets 04, 13, 18 and 19 are merged)

**Status:** resolved

- [x] Every Account has a kind, Staff Account or Kiosk Account, stored with the Account (default Staff Account, so existing Accounts are unchanged), through a new migration
- [x] `npm run staff -- create-kiosk <email> "<name>"` creates a Kiosk Account; `reset-password` works for both kinds; both kinds need at least 12 characters
- [x] A Kiosk Account that signs in at `/admin/login` lands on a dedicated Kiosk page (e.g. `/kiosk`), always in Kiosk mode, with the Event Day and front camera as ticket 19 does. It has no exit-to-desk control, only a discreet sign-out with in-page confirmation.
- [x] Every other Back Office page refuses a Kiosk Account. Pages redirect to the Kiosk page; the list, detail, check-in desk, email page and every `/api/back-office/*` route answer 401/redirect as for a signed-out request. The check is server-side, not just hidden links.
- [x] Check-Ins from a Kiosk Account are recorded with that Account's id, through the same Check-In path as the desk
- [x] Staff Accounts keep everything they have today, including Kiosk mode on `/admin/check-in?kiosk=1`
- [x] Tests at the Staff Accounts seam (real database): a Kiosk Account can be created and signs in as a Kiosk Account; the access rule refuses it for the Back Office and allows it for Check-In; a Staff Account is allowed both
- [x] `docs/deploy.md` explains creating one Kiosk Account per iPad (or one shared) and still recommends Guided Access as a second layer

## Answer

Done in commit "feat(staff-auth): Kiosk Accounts are check-in only …".

### Modules and names

| What | Where |
| --- | --- |
| `users.kind`: `text`, `'staff' \| 'kiosk'`, NOT NULL, default `'staff'`, plus CHECK `users_kind_check`. Existing rows become Staff Accounts. | `src/lib/db/auth-schema.ts`, migration `drizzle/0002_kiosk_accounts.sql` |
| Better Auth `user.additionalFields.kind` with `input: false`. It is on every `getSession()` user and the sign-in response. No request can set it: `/update-user` with `kind` answers 400. | `src/lib/auth/staff-auth.ts` |
| **Access rules (pure):** `ACCOUNT_KINDS`, `AccountKind`, `isAccountKind`, `canUseBackOffice(kind)` (staff only), `canCheckIn(kind)` (both), `canChooseCheckInDay(kind)` (staff only), `KIOSK_PATH` (`/kiosk`), and `homePath(kind)` (`/admin` or `/kiosk`). Unknown kinds get nothing. | `src/lib/auth/access.ts` |
| **Session helpers.** `getCurrentStaff()` returns null for a Kiosk Account. `requireStaff()` redirects a Kiosk Account to `/kiosk`, and anyone signed out to `/admin/login`. Every existing guard therefore refuses Kiosks with no per-route edits: the 4 Back Office pages, the 6 `/api/back-office/*` routes and the Staff menu. The new `getCurrentCheckInAccount()` and `requireCheckInAccount()` return `CurrentCheckInAccount = CurrentStaff & { kind }`. The cached session read is now the private `getSignedInAccount`. | `src/lib/auth/session.ts` |
| `createStaffAccounts(auth).create({ …, kind? })`, where `kind` defaults to `"staff"`. Results now carry `accountId` (renamed from `staffAccountId`) and `kind`; `resetPassword` returns the kind too. | `src/lib/auth/staff-accounts.ts` |
| `npm run staff -- create-kiosk <email> "<name>"`. `create` and `reset-password` work as before. Output names the kind ("Created the Kiosk Account …", "Reset the password for the Staff Account …"). The `email-taken` and `not-found` messages now say "Account". | `scripts/staff.ts` |
| **Kiosk page:** `/kiosk`, outside `/admin`, so there is no Back Office layout or navigation. Its layout only sets `.back-office` (the shadcn theme) and `noindex`. The page runs `requireCheckInAccount()` under Suspense. The client `KioskStation` renders ticket 19's `KioskScreen` and calls `checkInScan({ scan })` with no Event Day. | `src/app/kiosk/{layout,page,kiosk-station}.tsx` |
| `KioskScreen` takes `exit: KioskExit` in place of `onLeave`. It is `{ kind: "leave-kiosk-mode", onLeave }` at the desk, or `{ kind: "sign-out", accountName }` on `/kiosk`. With `sign-out`, the "เจ้าหน้าที่" corner panel says "ออกจากระบบ Kiosk นี้?" and shows the Account name, the day and the wake-lock line. It has an "ออกจากระบบ" button (the `signOut` action, through a form) and "ยกเลิก". It never uses a browser dialog. The whole-screen signed-out notice also has a `/kiosk` wording. | `check-in/kiosk-screen.tsx` |
| `checkInScan` uses `getCurrentCheckInAccount()`, so both kinds can call it, and records `account.id`. It ignores `eventDay` unless `canChooseCheckInDay`. | `check-in/actions.ts` |
| **Proxy:** the matcher adds `/kiosk/:path*`, which also matches `/kiosk`, so a signed-out request gets a real 307 to `/admin/login`. | `src/proxy.ts` |
| **Sign-in form:** after a successful sign-in, it goes to `homePath(user.kind)`. Better Auth types the client's user loosely, so the form checks the value with `isAccountKind` and falls back to `/admin`. | `src/app/admin/login/sign-in-form.tsx` |

`check_ins.staff_account_id` now holds the id of whichever Account recorded the Check-In, Staff or Kiosk. It is not renamed (see the schema comment).

### Conservative choices

- **A Kiosk Account always records today's Event Day.** The server ignores an `eventDay` it sends (`canChooseCheckInDay`).
  - Before the Event, a Kiosk scan therefore shows "Today isn't an Event Day". That still proves the camera and the connection work.
  - Rehearsals with a chosen day use Staff Kiosk mode at `/admin/check-in?kiosk=1`. `docs/deploy.md` says so.
- **Staff Accounts may open `/kiosk`.** The Kiosk there is the same as for a Kiosk Account, and the Staff corner only offers sign-out.
- **The access rules fail closed.** `canUseBackOffice` is true only for exactly `"staff"`. The CHECK constraint also keeps unknown kinds out of the database.
- **The kind is fixed at creation.** There is no command to change it: create another Account instead.
- **No consolidation of `/admin/login`.** I didn't merge the sign-in path constant (ticket 22, after the Event). `KIOSK_PATH` lives in a module that isn't server-only, so client and server share it.
- **A Kiosk result still includes the Attendee's name, Attendee Role, Pass Code and chosen days**, as at the desk. The Kiosk shows only the name. You can get a result only by presenting a valid pass, and that also records a Check-In. I didn't trim the result per kind.
- **No new hook for Check-In state.** `KioskStation` has its own ~15-line `submitScan` (pending state, latest-scan-wins, following today). Sharing it with the desk would have meant reworking ticket 19's desk.
- **Desk copy:** the desk's Kiosk section gains one line. It tells Staff to sign unattended iPads in with a Kiosk Account.
- **Copy I wrote:**
  - ออกจากระบบ Kiosk นี้?
  - หลังออกจากระบบ จุดนี้จะเช็คอินไม่ได้จนกว่าจะเข้าสู่ระบบด้วยบัญชี Kiosk อีกครั้ง
  - เข้าสู่ระบบในชื่อ …
  - วันนี้ไม่ใช่วันจัดงาน จุดนี้จะเช็คอินได้ในวันจัดงานเท่านั้น
  - กำลังออกจากระบบ…
  - กำลังเปิด Kiosk…
  - เข้าสู่ระบบด้วยบัญชี Kiosk แล้วหน้านี้จะเปิดขึ้นเอง
  - the desk hint
  - the command output

### Verification

- `npm run typecheck`, `npm run lint`, `npm test` (195 tests) and `npm run build` all pass, including the build with `.env` moved aside. `/kiosk` is a partial prerender.
- **TDD, red then green, one test at a time.**
  - **Access module, 4 tests:**
    - a Kiosk is refused the Back Office and allowed Check-In;
    - Staff are allowed both;
    - only Staff may choose a day;
    - each kind's home path.

    Mutation check: making `canUseBackOffice` always false fails the Staff test.
  - **Staff Accounts seam (real database), 4 tests:**
    - a created Kiosk Account's session has `kind: "kiosk"`;
    - a Staff Account's has `"staff"`;
    - a signed-in Kiosk's `/update-user {kind:"staff"}` gets 400 and the kind stays;
    - resetting a Kiosk Account's password keeps it a Kiosk Account.

    Mutation checks: `input: true` fails the update-user test, and a `"kiosk"` default kind fails the Staff test.
- **Migration:** on a database with only migrations 0000 and 0001 plus one user, applying 0002 gave that user `kind = 'staff'`. `update users set kind = 'admin'` was rejected by `users_kind_check`.
- **Smoke test:** `next start -p 3123` against `stem_racing_t23`, with the server clock shifted to 31 Oct 09:00 Bangkok by a preloaded `Date` shim (smoke test only).
  - **Staff command:**
    - `create-kiosk` and `create` both worked with `STAFF_PASSWORD`, and `create-kiosk` also worked through the hidden prompt in a pty, with no echo.
    - A short password exited 1; `reset-password` on a Kiosk Account exited 0 and printed its kind; a taken email exited 1; missing arguments exited 2.
  - **HTTP checks as the Kiosk Account:**
    - `/admin`, `/admin/registrations/1`, `/admin/check-in`, `/admin/check-in?kiosk=1` and `/admin/email` each gave a streamed `NEXT_REDIRECT;replace;/kiosk`, with no Attendee names, emails, phones or Pass Codes in the HTML.
    - All 6 `/api/back-office/*` routes answered 401, the same as signed out, and the DELETE didn't delete.
    - `checkInScan` posted from `/kiosk` recorded 31 Oct with the Kiosk Account id, even when it sent `eventDay: 2026-11-01`. A repeat gave `already-checked-in`.
    - Signed out, `/kiosk` gets a 307 to `/admin/login`.
  - **HTTP checks as the Staff Account:**
    - every page rendered as before, including the desk and `?kiosk=1`;
    - the APIs answered 200;
    - the desk could still choose 1 Nov.
  - **Headless Chromium over CDP**, with a canvas camera showing a QR of a pass link (21 checks, all passing):
    - **Kiosk sign-in:** signing in at `/admin/login` as the Kiosk Account went straight to `/kiosk`. There was no `<nav>`, no "ออกจากโหมด Kiosk", and the front camera (`facingMode: "user"`) opened by itself.
    - **Camera Check-In:** a 1 Nov-only pass gave orange "ไม่ได้ลงทะเบียนวันนี้" with the name. The row was flagged outside the registered day and stored the Kiosk Account.
    - **Address bar:** each of the five Back Office pages, typed into the address bar, ended on `/kiosk`. A `fetch` of the API gave 401.
    - **Sign-out:** the corner panel named "Kiosk 1". "ยกเลิก" closed it; "ออกจากระบบ" went to `/admin/login`, and `/kiosk` then asked for sign-in.
    - **Staff Account:** it landed on `/admin` with the list and saw the detail, the desk and `?kiosk=1`, which leaves back to the desk. It can also open `/kiosk`.
    - No console errors.
    - No horizontal scroll at 1024, 768 or 320px with the panel open.
- **For the operator, on a real iPad over https:**
  - [ ] Create a Kiosk Account, sign the iPad in at `/admin/login`, and check that it opens the Kiosk with the front camera.
  - [ ] Type `/admin` in the address bar: it comes back to the Kiosk.
  - [ ] Sign out from the "เจ้าหน้าที่" corner, then sign in again.
  - [ ] Set up Guided Access as in `docs/deploy.md` section 6.
