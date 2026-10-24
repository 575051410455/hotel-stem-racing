# Spec: Admin Accounts, check-in-only Staff Accounts, My Account, and managing Accounts

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`, which was updated for this spec.
- **Admin Account:** the full Back Office.
- **Staff Account:** records Check-Ins and sees its own Account, nothing else.
- **Account Change / Account History:** the record of changes to Accounts.

How the request maps to those terms:
- "role admin" and "user management CRUD" mean an Admin Account that manages Accounts.
- "user staff … scan QR เข้างาน only" means the new Staff Account.
- "profiles" means **My Account**: the glossary avoids "profile" as a synonym for Account.

Accounts are disabled, never deleted.

**Earlier decisions this changes:**
- ADR 0004 records the change.
- It supersedes in part ADR 0003 ("Staff Accounts keep full, equal access") and the v1 spec's story 52 (every Staff member has the same permissions).
- It also ends "Accounts are created only by the server command" (ADR 0001 as applied in the staff-sign-in spec).
- Kiosk Accounts stay check-in only (ADR 0003).

**Two parts, two timings:**
- **Part 1, before the Event:** tickets 01–02, merged into `main` by **28 October 2026**. It covers the Admin Account kind, check-in-only Staff Accounts, My Account, and the commands. It goes **before** the English Back Office (thai-english 06–09). Both must reach `main` by 28 October: the whole Back Office is in English at the Event.
- **Part 2, after the Event:** tickets 03–08, on the integration branch `account-management`, merged into `main` after 1 November 2026. It covers the Accounts pages, the Account History, forced password change, and creating, editing, disabling and enabling Accounts. The Back Office is frozen from 29 October to 1 November.
- **Copy:** all new Back Office copy is English.
- **Contingency:** if thai-english ticket 10 can't merge by 28 October, Part 1's new strings are translated to Thai on `main` before the freeze, so the Back Office never ships half Thai, half English. The thai-english spec's rule still holds.

## Problem Statement

Today every Staff Account sees the whole Back Office: every Registration with phone and email, the CSV export and bulk email. At the Event, helpers at the entrance only need to scan Event Passes. Giving them full Staff Accounts exposes every Attendee's contact details to people who don't need them.

Separately, only someone with shell access to the server can create an Account, reset a password or change an Account's kind. The organisers want to manage Accounts themselves:
- create Accounts for helpers;
- fix names and emails;
- set new passwords;
- turn off a lost Kiosk iPad's or a departed helper's Account at once;
- see who did what.

## Solution

### Part 1: before the Event

1. **Three kinds of Account:**
   - **Admin Account:** the whole Back Office (Registrations, the overview, detail, CSV export, email, Check-In), plus My Account, plus managing Accounts in Part 2.
   - **Staff Account:** the check-in desk (`/admin/check-in`, including choosing the Event Day and Kiosk mode) and My Account. Nothing else.
   - **Kiosk Account:** unchanged, the Kiosk only.
2. **Staff Accounts are confined to the desk:**
   - they land on the check-in desk after signing in, and their sidebar shows only "Check-In";
   - every other Back Office page redirects them to the desk;
   - every Back Office API (Registrations, export, email, resend) refuses them.
3. **My Account** (`/admin/account`), for Staff and Admin Accounts:
   - email and kind, read-only;
   - the owner's name, which they can edit;
   - the change-password form, moved here from `/admin/password`, which now redirects to it.

   The account menu's "Change password" item becomes "My Account".
4. **Commands:**
   - `npm run seed` creates the first **Admin** Account;
   - `npm run staff -- create-admin <email> <name>` creates another;
   - `npm run staff -- make-admin <email>` turns an existing Account into an Admin Account.

   After the migration, existing Staff Accounts are check-in only until the operator runs `make-admin` for them.
5. **At the entrance:** looking an Attendee up by name and re-sending an Event Pass stay Admin-only. At least one Admin works the entrance for those cases.

### Part 2: after the Event

6. **The Accounts pages**, for Admin Accounts only: a list of every Account; creating an Account of any kind with a password the Admin types; editing name, email and kind; setting a new password; disabling and enabling.
7. **Forced password change.** When someone else sets a Staff or Admin Account's password, its owner must choose their own at the next sign-in before doing anything else.
8. **Disabled Accounts** are signed out everywhere at once and can't sign in. Enabling restores them as they were.
9. **Account History:** every Account Change, from the Back Office, a command or the owner, with who made it and when, never a password. Shown newest first, for all Accounts or one.
10. **Guards:** there is always at least one enabled Admin Account. An Admin can't change their own kind, disable themself, or set their own password from the Accounts pages.

## User Stories

### Part 1: Staff at the entrance

1. As Staff with a Staff Account, I want to land on the check-in desk after signing in, so that I can start scanning at once.
2. As Staff with a Staff Account, I want the sidebar to show only "Check-In", so that the Back Office isn't cluttered with pages I can't use.
3. As Staff with a Staff Account, I want any other Back Office address to bring me back to the desk, so that a bookmarked link doesn't strand me on an error.
4. As an Attendee, I want only the people who need my phone and email to see them, so that the helpers at the entrance can't browse everyone's contact details.
5. As Staff with a Staff Account, I want to scan or type a Pass Code, choose the Event Day and switch to Kiosk mode exactly as before, so that the entrance works the same, rehearsal day included.
6. As an Admin, I want an Attendee without their QR, or one who never got the email, to be my job, because looking up by name and re-sending stay Admin-only. At least one Admin works the entrance.

### Part 1: Admin

7. As an Admin, I want everything the Back Office offers today (overview, Registrations, detail, export, email, Check-In), so that running the Event loses nothing.
8. As an Admin, I want the sidebar to show Registrations, Check-In and Email, so that I find everything as before.

### Part 1: My Account

9. As Staff or an Admin, I want "My Account" in the account menu at the foot of the sidebar, so that I can find my own details.
10. As Staff or an Admin, I want My Account to show my email and my kind of Account, so that I know which Account I'm signed in with.
11. As Staff or an Admin, I want to change my name there:
    - trimmed;
    - not empty;
    - at most 100 characters;
    - saved with the toast "Name saved".

    That way it's shown correctly in the Back Office.
12. As Staff or an Admin, I want to change my password on the same page, with the same fields, rules, warning and toast as the old Change password page, so that nothing about it surprises me.
13. As someone with an old `/admin/password` bookmark, I want to land on My Account, so that the link still works.
14. As a Kiosk Account, I want no My Account and no way to rename myself, through the page or Better Auth's API, so that a Kiosk iPad can't be changed from the Kiosk.

### Part 1: Operator

15. As the operator, I want `npm run seed` on a fresh deploy to create the first Admin Account, and do nothing when an Admin Account exists, so that a new install starts with someone who can see Registrations.
16. As the operator, I want `npm run staff -- create-admin <email> <name>` alongside `create` and `create-kiosk`, so that I can create more Admins.
17. As the operator, I want `npm run staff -- make-admin <email>` to turn an existing Account into an Admin Account and sign it out everywhere, so that I can promote the organisers on a database that already has Staff Accounts.
18. As the operator, I want the deploy guide to say which command creates which kind of Account, and that an existing Staff Account sees only the desk until promoted, so that nobody is surprised after the migration.

### Part 2: Admin managing Accounts

19. As an Admin, I want an "Accounts" item in the sidebar, and Staff not to have it, so that only Admins manage Accounts.
20. As an Admin, I want a list of every Account showing:
    - name and email;
    - kind;
    - status: enabled or disabled, and whether it must change its password;
    - when it was created.

    Enabled Accounts come first, each group by name, and the list fits 375 px.
21. As an Admin, I want to create an Account with a name, an email, a kind (Staff, Admin or Kiosk, each explained in one line) and a password I type twice (12–128 characters), so that I can give someone access without the operator.
22. As an Admin, I want to be told that a Staff or Admin Account will have to choose its own password at first sign-in, so that I know the password I hand over is temporary.
23. As an Admin, I want an email that already belongs to any Account refused next to the field, so that one person doesn't get two Accounts.
24. As an Admin, I want to change an Account's name, email and kind, with a kind change signing it out everywhere, so that its open sessions don't keep old permissions.
25. As an Admin, I want my own kind locked, and demoting the last enabled Admin refused, so that the organisers never lock themselves out.
26. As an Admin, I want to set a new password for an Account (typed twice), which signs it out everywhere, so that I can help someone who forgot theirs.
27. As an Admin, I want my own Account's page to send me to My Account for my password, so that I change mine by confirming the current one.
28. As an Admin, I want to disable an Account after confirming, signing it out everywhere at once, so that a lost Kiosk iPad or a departed helper loses access immediately.
29. As an Admin, I want to enable it again exactly as it was, so that a mistake is easy to undo.
30. As an Admin, I want disabling myself, or the last enabled Admin, refused, so that someone can always manage Accounts.

### Part 2: Account owners

31. As Staff or an Admin whose password someone else set, I want to land on My Account after signing in, with a line explaining why, and reach nothing else until I've chosen my own, so that only I know my password.
32. As someone with a disabled Account, I want "This Account is disabled. Ask an Admin to turn it back on." only after entering the right password, so that strangers can't learn which emails have Accounts.
33. As a Kiosk Account, I want no forced password change, so that a Kiosk keeps working.

### Part 2: Account History

34. As an Admin, I want a History page listing every Account Change newest first, 50 per page. Each one shows:
    - when (Bangkok time);
    - which Account;
    - what changed ("Kind changed: Staff → Admin", "Password set", "Disabled", …);
    - who did it: an Account's name, or "Server command".

    That way I can see who did what.
35. As an Admin, I want one Account's history from its page, and no password ever shown or stored, so that I can follow one person's access safely.
36. As the operator, I want my command changes recorded as "Server command", and `reset-password` to leave a disabled Account disabled (and say so), so that the record is complete and resets never silently restore access.

## Implementation Decisions

### Account kinds and access rules (Part 1, ticket 01)

- **Kinds:** `ACCOUNT_KINDS` becomes `["admin", "staff", "kiosk"]`.
- **Rules in `src/lib/auth/access.ts`:** they stay pure and fail closed.

  | Rule | Who |
  | --- | --- |
  | `canUseBackOffice` | Admin only. It now means the Registration pages, overview, detail, export, email and resend. |
  | **New:** `canUseCheckInDesk` | Admin and Staff |
  | `canChooseCheckInDay` | Admin and Staff |
  | `canChangeOwnPassword` | Admin and Staff |
  | **New:** `canEditOwnName` | Admin and Staff |
  | `canCheckIn` | all three |
  | **New:** `canManageAccounts` | Admin only (used from Part 2) |

- **`homePath`:** Admin goes to `/admin`, Staff to `/admin/check-in`, Kiosk to `/kiosk`.
- **Session helpers (`src/lib/auth/session.ts`):**
  - **New:** `requireAdmin()` / `getCurrentAdmin()` for every Registration page, the overview, detail, email, every `/api/back-office/*` Route Handler and their Server Actions.
    - `requireAdmin()` redirects a signed-out request to sign-in, and any other Account to its `homePath`.
    - `getCurrentAdmin()` returns null for non-Admins, so the APIs answer as they do for a signed-out request.
  - `requireStaff()` / `getCurrentStaff()` now mean a Staff or Admin Account. They are used by the check-in desk and My Account.
  - The check-in Server Action keeps `getCurrentCheckInAccount()`.
- **Every existing guard is audited:** each Back Office page, layout, Route Handler and Server Action is listed in the ticket's hand-off with its new guard.
- **The shell:** the Back Office layout passes the Account's kind to the sidebar.
  - **Admin sees:** Registrations, Check-In, Email.
  - **Staff see:** Check-In.
  - The account menu shows the name and email, then "My Account" and "Sign out", for both.
- **Schema:**
  - `users.kind` accepts `admin` (the enum in `auth-schema.ts` and the `users_kind_check` constraint);
  - the column default stays `staff`;
  - one migration: `npm run db:generate -- --name admin-accounts`.
  - Existing Accounts keep their kind, so existing Staff Accounts become check-in only.
- **Accounts module (`src/lib/auth/accounts.ts`, `createAccounts`; renamed from `staff-accounts.ts` / `createStaffAccounts` in the Part 1 review):**
  - `create` accepts kind `admin`.
  - `createFirst` creates an **Admin** Account and skips when any Admin Account exists (Staff and Kiosk don't count).
  - **New:** `makeAdmin(email)` sets kind `admin` and deletes the Account's sessions. It reports not-found, already-Admin, or promoted with the previous kind.
- **Commands:**
  - `scripts/staff.ts` gains `create-admin <email> <name>` and `make-admin <email>`, with the usage text updated.
  - `scripts/seed.ts` creates an Admin Account. The env names stay `SEED_STAFF_EMAIL` / `SEED_STAFF_NAME`, so `.env` doesn't change, and the messages say "Admin Account".
- **Docs:**
  - `docs/deploy.md` covers the first Admin (`seed`), `create-admin` / `create` / `create-kiosk`, and `make-admin` for existing databases;
  - `.env.example` comments are updated.
- **Local demo database:** after the migration, run `make-admin staff@local.test` so the demo keeps its full view.

### My Account (Part 1, ticket 02)

- **`/admin/account`:**
  - in the signed-in Back Office layout, behind `requireStaff()` below `<Suspense>`;
  - `PageHeader`/`PageTitle` "My Account", narrow `PageContent`;
  - not in the sidebar nav.
- **Sections:**
  - **Details:**
    - email and kind ("Admin", "Staff"), read-only;
    - a Name field with a "Save name" button;
    - a short line: "To change your email, ask an Admin."
  - **Change password:** the existing form moves here unchanged in behaviour:
    - current, new and confirm fields;
    - the 12–128 rules;
    - the other-devices warning;
    - Better Auth's change-password with other sessions revoked;
    - inline errors, the rate-limit wait, and the toast "Password changed".
- **Saving the name:**
  - A Server Action re-checks `getCurrentStaff()` and calls the Accounts module's new `rename(accountId, name, actor)`:
    - trims the name;
    - refuses an empty one, or one longer than 100 characters;
    - refuses a Kiosk Account;
    - writes the name through Better Auth's internal adapter.
  - Errors show inline; success shows `toastSuccess("Name saved")`.
  - The sidebar's account menu shows the new name after the refresh.
- **Better Auth's own rename:** its `/update-user` endpoint is refused for every Account by a `hooks.before` (fail closed), next to the existing `/change-password` guard. Names change only through the Accounts module, so Part 2 can record every change in the Account History.
- **Redirects:** `/admin/password` redirects permanently to `/admin/account`. The account menu item becomes "My Account" (lucide `UserRoundIcon`).
- **Kiosk Accounts:** they are sent to `/kiosk` by `requireStaff()`, as now.
- **History:** a name changed before Part 2 isn't recorded in the Account History. Part 2 doesn't backfill.

### Part 2: the Accounts module grows (tickets 03–08)

- **Actor:** every operation takes an `actor`, either `{ accountId }` or `"server-command"`. Rules about "yourself" apply only to an Account actor.
- **Operations:**
  - `list()`: every Account with id, name, email, kind, `disabledAt`, `mustChangePassword` and `createdAt`.
  - `get(id)`: one Account, or not found.
  - `create(input, actor)`: flags Staff and Admin (never Kiosk) and records `created`.
  - `update(id, { name?, email?, kind? }, actor)`:
    - **Refusals:** email taken (case-insensitive), invalid email or name, your own kind, demoting the last enabled Admin.
    - **Kind change:** deletes sessions.
    - **History:** one change per field.
    - `rename` from Part 1 becomes a thin call into it (owner as actor), recording `name-changed`.
  - `setPassword(id, password, actor)`:
    - replaces `resetPassword` (the command looks up by email);
    - flags Staff and Admin, deletes sessions, records `password-set`;
    - refuses yourself;
    - never enables a disabled Account, and reports that it stays disabled.
  - `disable(id, actor)` / `enable(id, actor)`:
    - `disable` sets or clears `disabled_at`, deletes sessions on disable, and records the change;
    - **refusals:** yourself, and the last enabled Admin;
    - repeating either is a no-op that records nothing.
  - `makeAdmin(email)`: also enables a disabled Account and records with actor `"server-command"`.
  - `history({ accountId?, page })`: newest first, 50 per page, with the total.
- **Last enabled Admin:** "last enabled Admin" counts enabled Admin Accounts other than the target. A race between two Admins in the same second is accepted.
- **Recording:** changes are written right after the change; a failure surfaces as an error. There are no transactions across the internal adapter.

### Part 2: schema

- **Users:** `users.must_change_password boolean not null default false` and `users.disabled_at timestamptz null`. Both are Better Auth `additionalFields` with `input: false`, returned on the session.
- **`account_changes`:**
  - **Columns:**
    - `id`
    - `account_id` (references `users.id`, no cascade)
    - `actor_account_id` (null for the server command)
    - `action`
    - `details` jsonb
    - `changed_at` (default now)
  - **Indexes:** `(account_id, changed_at desc)` and `changed_at desc`.
  - **Actions and `details`:**

    | Action | `details` |
    | --- | --- |
    | `created` | `{ kind }` |
    | `name-changed` | `{ from, to }` |
    | `email-changed` | `{ from, to }` |
    | `kind-changed` | `{ from, to }` |
    | `password-set` | none |
    | `password-changed` | none |
    | `disabled` | none |
    | `enabled` | none |

    `password-set` is by someone else; `password-changed` is by the owner.
  - **Never a password or hash.**

### Part 2: sign-in, forced change, pages

- **Disabled Accounts:**
  - A Better Auth `databaseHooks.session.create.before` throws `FORBIDDEN` / `ACCOUNT_DISABLED` for a disabled Account. It runs only after the password matched, so a wrong password still gets the usual message.
  - The sign-in form shows "This Account is disabled. Ask an Admin to turn it back on."
  - `getSignedInAccount` treats a disabled Account as signed out (backstop).
- **Forced change:**
  - **While flagged:** `requireStaff()` and `requireAdmin()` redirect to `/admin/account`, which shows "An Admin set your password. Choose your own to continue."; `getCurrent*()` return null.
  - **Clearing the flag:** a `hooks.after` on a successful `/change-password` clears it and records `password-changed`. It then goes to the Account's `homePath`.
  - **Kiosk Accounts are never flagged.**
- **Not used: Better Auth's `admin` plugin.** It adds a `role` beside our `kind` (two sources of permission) and HTTP endpoints (impersonation, removing users, setting roles) that we'd have to lock down. ADR 0004 records this.
- **Pages** (English, Admin-only via `requireAdmin()` + `canManageAccounts`; Server Actions re-check `getCurrentAdmin()`):
  - **Sidebar:** an "Accounts" item (lucide `UsersRound`).
  - **`/admin/accounts`:** the table (Name, Email, Kind, Status, Created), a stacked list at 375 px, a "New Account" button and a "History" link.
  - **`/admin/accounts/new`:** Name, Email, Kind (a radio group with one-line explanations), Password, Confirm, the 12–128 hint, and the first-sign-in note. Success shows "Account created" and returns to the list.
  - **`/admin/accounts/[id]`:**
    - a details form: on your own Account the kind is locked; a kind-change warning;
    - "Set a new password": your own Account gets a link to My Account instead;
    - "Disable Account" / "Enable Account" in a shadcn `AlertDialog`: none on your own Account;
    - "View history";
    - `notFound()` for an unknown id.
  - **`/admin/accounts/history`:**
    - server-rendered, newest first, 50 per page, with Previous/Next;
    - columns: When, Account, Change, By;
    - `?account=<id>` filters it.
  - A pure formatter turns an Account Change into its English line.
- **Commands:** `reset-password` uses `setPassword` and prints when the Account stays disabled. `make-admin` prints what changed.

## Testing Decisions

- **Pure modules:**
  - `access.ts` rules for all three kinds, every rule in the table above, plus fail-closed for unknown kinds and `homePath` per kind;
  - in Part 2, the Account Change formatter.
- **Accounts module, against a real database** (prior art: `src/lib/auth/accounts.test.ts`, `reset()` in `beforeEach`).
  - **Part 1:**
    - `create` with kind `admin`;
    - `createFirst` creates an Admin when only Staff or Kiosk Accounts exist, and skips when an Admin exists;
    - `makeAdmin`: promotes, deletes sessions, not-found, already-Admin;
    - `rename`: trims; refuses an empty or over-long name; refuses a Kiosk Account;
    - `auth.api.updateUser` is refused for a signed-in Account.
  - **Part 2:**
    - flags per kind and operation;
    - `update` rules and one record per field;
    - `setPassword`: sessions ended, signing in with the new password works, yourself refused, disabled stays disabled;
    - disable and enable: sessions ended; `signInEmail` with the right password fails with `ACCOUNT_DISABLED`, and with a wrong one fails as a wrong password; guards; no-ops record nothing;
    - `makeAdmin` enables;
    - the owner's change through `auth.api.changePassword` clears the flag and records `password-changed`;
    - history order, paging and filter, never a password.
- **Fakes:** none new.
- **No automated UI tests.** Each ticket's hand-off records a check against `next start` on a scratch database, with an Admin, a Staff and a Kiosk Account in separate browser contexts.
  - **Part 1:**
    - Staff land on the desk and see only "Check-In";
    - Staff opening `/admin`, a Registration's detail and `/admin/email` are redirected to the desk;
    - Staff calling `/api/back-office/registrations` and the CSV export are refused;
    - Staff check in by scan and by typing, choose the Event Day, use Kiosk mode;
    - the Admin sees everything as before;
    - My Account: rename, change password, `/admin/password` redirect;
    - the Kiosk unchanged;
    - 375 and 1280 px with no horizontal scroll.
- **Gate:** `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass before each commit.

## Out of Scope

- Deleting Accounts.
- Name search or re-sending Event Passes for Staff Accounts at the desk (an Admin does it).
- Changing your own email.
- Email invitations or self-service reset by email.
- Sign-in history, "last signed in", and showing sessions or devices.
- More kinds or per-page permissions.
- Impersonation and two-factor sign-in.
- Editing, deleting or exporting the Account History.
- Backfilling it.
- Password expiry or reuse rules.
- A Kiosk Account changing its own password or name.

## Further Notes

- **GLOSSARY:** already updated during the grilling: Staff, Staff Account, Admin Account, Account (three kinds, disabled not deleted), and Account Change / Account History.
- **ADR:** `docs/adr/0004-admin-accounts-manage-accounts.md`. ADR 0003 carries a note that 0004 supersedes it in part.
- **thai-english:**
  - Ticket 06 (shell, sign-in, change password) builds on Part 1: the account menu says "My Account", and the password form lives on `/admin/account`, already in English.
  - Ticket 06 still translates the rest of the shell, sign-in and the desk.
  - `copy-back-office.md` and ticket 06 already carry notes on the moved strings.
- **Order of work before 28 October:**
  1. account-management 01, then 02, each on its own branch, merged `--no-ff` into `main`;
  2. thai-english 06–09 on `back-office-english`, merged by ticket 10.
- **Part 2:**
  - starts after the Event, on `account-management`, branching from `main`;
  - tickets 03 → 08, in order;
  - merged into `main` after 1 November.
- **Deploy (Part 1):**
  - the migration runs on container start;
  - then `docker compose exec app npm run seed` creates the first Admin Account;
  - more Admins with `create-admin`, desk helpers with `create`, iPads with `create-kiosk`.
