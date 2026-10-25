# 01: Admin Accounts get the whole Back Office; Staff Accounts get only the check-in desk

**What to build:** a third Account kind, `admin`, which gets everything the Back Office offers today.

**Staff Accounts:**
- land on `/admin/check-in` and see only "Check-In" in the sidebar;
- are redirected there from every other Back Office page;
- are refused by every Back Office API (Registrations, export, email, resend).

They still scan, type Pass Codes, choose the Event Day and use Kiosk mode.

**Commands:**
- `npm run seed` creates the first Admin Account;
- `npm run staff -- create-admin` creates more;
- `npm run staff -- make-admin` promotes an existing Account.

Kiosk Accounts are unchanged.

See the spec (Part 1, "Account kinds and access rules").

**Part:** 1, before the Event. Branch from `main`, merge `--no-ff` into `main` by 28 October 2026.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] **`access.ts`:**
  - `ACCOUNT_KINDS` is `["admin", "staff", "kiosk"]`.
  - `canUseBackOffice` allows Admin only.
  - **New:** `canUseCheckInDesk`, `canEditOwnName` and `canManageAccounts`.
  - `canChooseCheckInDay` and `canChangeOwnPassword` allow Admin and Staff; `canCheckIn` allows all three.
  - `homePath`: Admin to `/admin`, Staff to `/admin/check-in`, Kiosk to `/kiosk`.
  - Unit tests cover every rule per kind, plus fail-closed.
- [x] **Schema:**
  - `users.kind` accepts `admin` (enum and `users_kind_check`); the default stays `staff`;
  - Better Auth's `kind` field accepts it (`input: false` kept);
  - migration from `npm run db:generate -- --name admin_accounts` (underscore, like the earlier ones).
- [x] **Session helpers:**
  - **New:** `requireAdmin()` / `getCurrentAdmin()`.
  - `requireStaff()` / `getCurrentStaff()` mean a Staff or Admin Account.
  - Redirects go by `homePath`.
- [x] **Every guard switched:**
  - the overview and list (`/admin`), Registration detail, `/admin/email`, every `/api/back-office/*` Route Handler and their Server Actions use the Admin helpers;
  - the check-in page uses `requireStaff()`;
  - the check-in Server Action keeps `getCurrentCheckInAccount()`.
  - The hand-off lists each page, Route Handler and Server Action with its guard.
- [x] **Sidebar by kind:** Admin sees Registrations, Check-In, Email; Staff see Check-In. The layout passes the kind.
- [x] **Accounts module:**
  - `create` accepts `admin`;
  - `createFirst` creates an Admin Account and skips when any Admin exists;
  - **new:** `makeAdmin(email)` sets `admin` and deletes the Account's sessions. It reports not-found, already-Admin, or promoted from a kind.
  - Tests against a real database.
- [x] **Commands:**
  - `create-admin <email> <name>` and `make-admin <email>` are added to `scripts/staff.ts`, with the usage updated;
  - `scripts/seed.ts` creates an Admin Account (same env names) and says so.
- [x] **Docs:**
  - `docs/deploy.md`: the first Admin via `seed`; `create-admin` / `create` / `create-kiosk`; `make-admin` for databases with existing Staff Accounts, which see only the desk until promoted;
  - `.env.example` comments.
- [x] **Local demo database:** migrated, then `make-admin staff@local.test`.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start` on a scratch database, with Admin, Staff and Kiosk Accounts in separate browser contexts:
  - Staff land on the desk with a one-item sidebar;
  - Staff are redirected from `/admin`, a Registration detail and `/admin/email`;
  - Staff are refused by `/api/back-office/registrations` and the CSV export;
  - Staff check in by scan and by typing, choose the Event Day, and use Kiosk mode;
  - the Admin sees everything as before;
  - the Kiosk is unchanged;
  - 375 and 1280 px.

## Answer

Done on branch `account-01-admin-accounts`.

### What's where

| What | Where |
| --- | --- |
| Rules per kind: `canUseBackOffice` (Admin), new `canUseCheckInDesk`, `canEditOwnName`, `canManageAccounts`; `homePath` per kind | `src/lib/auth/access.ts` (+ tests) |
| `kind` accepts `admin` | `src/lib/db/auth-schema.ts`, `drizzle/0003_admin_accounts.sql` (drops and re-adds `users_kind_check`) |
| `requireAdmin()` / `getCurrentAdmin()`; `requireStaff()` / `getCurrentStaff()` now mean Staff or Admin; `CurrentStaff` carries `kind` | `src/lib/auth/session.ts` |
| `createFirst` makes an Admin (skip status `admin-account-exists`); `makeAdmin(email)` | `src/lib/auth/accounts.ts` (+ tests; was `staff-accounts.ts`) |
| Sidebar links per kind: `BackOfficeNav({ kind })` filters by each item's rule; `CurrentBackOfficeNav` reads the session under the layout's `<Suspense>` | `_shell/back-office-nav.tsx`, `_shell/current-back-office-nav.tsx`, `_shell/back-office-sidebar.tsx`, `layout.tsx` |
| `create-admin`, `make-admin`; per-kind "created" messages | `scripts/staff.ts` |
| First Admin; email-taken suggests `make-admin` | `scripts/seed.ts` |
| Three kinds table, `make-admin` for existing databases | `docs/deploy.md`, `.env.example` |

### Guards (audit)

| Page / handler | Guard |
| --- | --- |
| `/admin` overview cards, daily chart, role table, Registration list section | `requireAdmin()` |
| `/admin/registrations/[id]` | `requireAdmin()` |
| `/admin/email` | `requireAdmin()` |
| `/admin/check-in` | `requireStaff()` (Staff or Admin) |
| `/admin/password` | `requireStaff()` |
| Account menu, sidebar links | `getCurrentStaff()` |
| Check-in Server Action | `getCurrentCheckInAccount()` (any kind) + `canChooseCheckInDay` |
| `/kiosk` | `requireCheckInAccount()` (any kind) |
| `GET /api/back-office/registrations`, `…/export`, `DELETE …/[id]`, `POST …/[id]/resend`, `GET /bulk-send/summary`, `POST /bulk-send/batch` | `getCurrentAdmin()`, else 401 |
| Sign-in form | lands on `homePath(kind)` |
| `signOut` Server Action (`src/app/admin/actions.ts`) | none: ends whatever session there is, any kind |
| Back Office layout | none: protects nothing; the nav and account menu read `getCurrentStaff()` under their own `<Suspense>` |
| `/admin/account` page, `renameOwnAccount` Server Action (ticket 02) | `requireStaff()`, `getCurrentStaff()` |

### Decisions

- **Migration name:** `admin_accounts` with an underscore, matching `0002_kiosk_accounts`; the spec said `admin-accounts`.
- **`homePath` for an unknown kind is `/kiosk`.** The Kiosk page then refuses it too (fail closed), and the Account ends up on sign-in.
- **The sidebar links now stream in.** They read the session behind their own boundary, with no links as the fallback. The account menu already worked this way. The layout stays static.
- **`make-admin` takes no password,** so it doesn't prompt.
- **The seed's email belongs to another Account:** the command stops and suggests `make-admin` instead of promoting it silently.
- **The comments:** "Staff-only" is now "Admin-only" on the Registration, overview and email code.

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (245 pass) and `npm run build` pass.
- **Setup:** `next start` on a copy of the local demo database, with an Admin, a Staff and a Kiosk Account in separate browser contexts.
- **Admin:**
  - lands on `/admin`;
  - sidebar: ผู้ลงทะเบียน, เช็คอิน, ส่งอีเมล;
  - the list and export APIs answer 200;
  - email, detail and desk open.
- **Staff:**
  - lands on `/admin/check-in`, with only เช็คอิน in the sidebar;
  - `/admin`, `/admin/email` and `/admin/registrations/5` redirect to the desk;
  - list, export, `DELETE` detail, resend and both bulk-send endpoints answer 401;
  - chose 1 Nov and checked in `EP-E368B993` by typing ("เช็คอินสำเร็จ"). Camera scanning wasn't checked: headless Chrome has no camera. Its code path is the same `submitScan`, and the camera code is unchanged;
  - Kiosk mode opens;
  - `/admin/password` and `/kiosk` open;
  - no horizontal scroll at 375 or 1280 px.
- **Kiosk:** lands on `/kiosk`; the desk and `/admin` send it back; the list API answers 401.
- **`make-admin desk@…` with the Staff signed in elsewhere:** the old session is gone, the next sign-in is `admin`, and the list API answers 200.
- **Commands:**
  - `create` / `create-admin` / `create-kiosk` messages;
  - `make-admin` on an unknown email, and on an Admin ("already");
  - `seed` on a fresh database (creates), again (skips), and with a Staff Account's email (suggests `make-admin`).
- **Local demo database `stem_racing`:** migrated, and `staff@local.test` is now an Admin Account.

## Comments

- 2026-10-25: Story 18's note, that an existing Staff Account sees only the desk until `make-admin`, was lost when `f842cde` replaced `docs/deploy.md` with the HTML guide. It is back in section 6 of `docs/deploy-guide/index.html` and in `docs/deploy.md`.
