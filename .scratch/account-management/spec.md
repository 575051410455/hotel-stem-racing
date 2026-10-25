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
- **Part 2, after the Event:** tickets 03–13, on the integration branch `account-management`, merged into `main` after 1 November 2026. Work on the branch started on 24 October 2026; nothing reaches `main` before 2 November. It covers the Accounts pages, the Account History, forced password change, and creating, editing, disabling and enabling Accounts. Since the second grilling (24 October 2026, below) it also covers each Account's last sign-in, the owner's signed-in devices, generated passwords, and Account names in English. The Back Office is frozen from 29 October to 1 November. _(changed 2026-10-25: Part 2 was merged into `main` on 25 October and ships with the next deploy, before the Event; recorded in ADR 0004. The freeze still applies.)_
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

A second grilling, on 24 October 2026, worked through the "User Manager Blueprint" from the organisers' other system (hotel-e-voucher) and kept what fits here:
- **Admins can't tell which Accounts are still used.** A helper's or a Kiosk iPad's Account may sit unused long after its last shift, and nothing shows it.
- **Owners can't see where they are signed in.** Someone who lost a phone can only change their password and hope.
- **Typing a password for someone else is awkward.** It must be typed twice, then passed on.
- **Names come in mixed scripts.** The Back Office is in English, but Account names can be typed in Thai, which also makes poor initials for an avatar.

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

6. **The Accounts pages**, for Admin Accounts only: a list of every Account; creating an Account of any kind with a password the Admin types or generates; editing name, email and kind; setting a new password; disabling and enabling.
7. **Forced password change.** When someone else sets a Staff or Admin Account's password, its owner must choose their own at the next sign-in before doing anything else.
8. **Disabled Accounts** are signed out everywhere at once and can't sign in. Enabling restores them as they were.
9. **Account History:** every Account Change, from the Back Office, a command or the owner, with who made it and when, never a password. Shown newest first, for all Accounts or one.
10. **Guards:** there is always at least one enabled Admin Account. An Admin can't change their own kind, disable themself, or set their own password from the Accounts pages.
11. **Last sign-in:** the Accounts list and each Account's page show when the Account last signed in, or "Never". Each row also gets an avatar with the name's initials, and Badges for kind and status.
12. **Generated passwords:** wherever an Admin sets someone else's password (a new Account, "Set a new password"), a Generate button fills a strong random password, shows it, and offers Copy. Typed passwords stay hidden behind a show/hide toggle.
13. **Enable at once:** disabling still asks for confirmation; enabling doesn't.
14. **Signed-in devices:** My Account lists every device the owner is signed in on, this one first. The owner can sign out any other device, or all of them at once.
15. **Names in English:** every Account name set from now on uses English letters, digits, spaces, `-`, `'` and `.`. A Thai name is refused with a toast and an inline message. Existing names stay until someone changes them.

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

### Part 2: last sign-in and the list's look

37. As an Admin, I want a "Last sign-in" column in the Accounts list, so that I can spot Accounts nobody uses any more and disable them.
38. As an Admin, I want the last sign-in in the Back Office's usual form, "22 Oct 2026, 14:05" in Bangkok time, so that it reads like every other time in the Back Office.
39. As an Admin, I want "Never" for an Account that has never signed in, so that a freshly created Account is obvious.
40. As an Admin, I want an Account's page to show its last sign-in too, so that I see it next to the actions.
41. As an Admin, I want every sign-in to count, whatever the kind (Admin, Staff or Kiosk), so that an unused Kiosk iPad shows up as clearly as an unused helper.
42. As an Admin after the upgrade, I want existing Accounts to start with the time of their newest session, so that the column isn't "Never" for everyone who is already signed in.
43. As an Admin, I want each Account shown with an avatar of its initials ("NW" for Napat Wongsa, "K1" for Kiosk 1), so that I can find a row at a glance.
44. As an Admin, I want an Account whose old name is in Thai to show the first letter of its email instead, so that its avatar is never an unreadable fragment.
45. As an Admin, I want the kind and the status as Badges ("Enabled" with a green dot, "Disabled", "Must change password"), so that the state of each Account stands out.
46. As an Admin on a phone, I want the stacked list at 375 px to keep the avatar, the last sign-in and the Badges, so that I can manage Accounts from the entrance.

### Part 2: generated passwords

47. As an Admin creating an Account, I want a Generate button next to the password, so that I don't have to invent a strong one.
48. As an Admin, I want Generate to fill both Password and Confirm, so that I don't type it twice.
49. As an Admin, I want a generated password shown in plain text, so that I can read it out or check what I copy.
50. As an Admin, I want a Copy button that copies the password and says "Password copied", so that I can paste it into a message to its owner.
51. As an Admin, I want the same Generate and Copy under "Set a new password" on an Account's page, so that resetting works the same way.
52. As an Admin typing a password myself, I want it hidden by default with a show/hide toggle, so that people nearby can't read it, but I can check it.
53. As an Admin setting up a Kiosk iPad, I want generated passwords without look-alike characters (no o, 0, i or 1) and in lower case, so that they are quick to type on the iPad.
54. As an Admin, I want to be reminded that a Staff or Admin Account will choose its own password at first sign-in, so that I know a generated password is temporary.

### Part 2: enabling

55. As an Admin, I want "Enable Account" to take effect at once, without a confirmation, so that undoing a mistaken disable is one click.
56. As an Admin, I want "Disable Account" to still ask first, so that I don't cut someone off by accident.

### Part 2: signed-in devices

57. As Staff or an Admin, I want a "Signed-in devices" section on My Account, so that I can see where my Account is signed in.
58. As Staff or an Admin, I want each device named by browser and system ("Safari on iPhone", "Chrome on Windows"), so that I can recognise it.
59. As Staff or an Admin, I want each device's IP address and when it signed in ("Signed in 22 Oct 2026, 14:05"), so that I can tell an old sign-in from a strange one.
60. As Staff or an Admin, I want this device listed first with a "This device" Badge and the others newest first, so that I don't sign myself out by mistake.
61. As Staff or an Admin, I want "Sign out" on each other device, without a confirmation, and the toast "Signed out of that device", so that I can end one quickly.
62. As Staff or an Admin, I want "Sign out all other devices" behind a confirmation, with the toast "Signed out of your other devices", so that I can clean up after losing a phone.
63. As Staff or an Admin with no other devices, I want no "Sign out all other devices" button, so that the section doesn't offer something that does nothing.
64. As Staff or an Admin, I want to sign out this device from the account menu as before, not from the list, so that signing out stays in one place.
65. As an Admin, I want signing out of devices not to fill the Account History, so that it stays a record of changes to Accounts.
66. As Staff or an Admin, I want no session token ever sent to a browser, so that the device list can't be used to take over an Account.

### Part 2: names in English

67. As an Admin, I want Account names in English, so that they match the English Back Office and make readable initials.
68. As an Admin creating or renaming an Account, I want the hint "In English" under the Name field, so that I know the rule before I type.
69. As an Admin who typed a Thai name, I want the toast "Use English letters for the name, for example Somchai Jaidee." and the same message under the field, so that I see what's wrong and where.
70. As Staff or an Admin renaming myself on My Account, I want the same rule, hint and message, so that every name follows one rule.
71. As an Admin, I want digits, spaces, `-`, `'` and `.` allowed, so that names like "Kiosk 1", "Mary-Jane" and "O'Neil" work.
72. As an Admin, I want a name with no letter at all ("123") refused, so that every Account has a readable name.
73. As an Admin editing only the email or kind of an Account whose old name is in Thai, I want the change saved without being forced to rename it, so that old Accounts keep working.
74. As the operator, I want `create`, `create-admin` and `create-kiosk` to refuse a Thai name with the same message, so that the commands follow the same rule.
75. As the operator, I want `npm run seed` to name the first Admin "Admin" when `SEED_STAFF_NAME` is empty, instead of "เจ้าหน้าที่", so that the default passes the rule.

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

### Part 2: the Accounts module grows (tickets 03–13)

- **Actor:** every operation takes an `actor`, either `{ accountId }` or `"server-command"`. Rules about "yourself" apply only to an Account actor.
- **Operations:**
  - `list()`: every Account with id, name, email, kind, `disabledAt`, `mustChangePassword`, `lastSignedInAt` and `createdAt`.
  - `get(id)`: one Account with the same fields, or not found.
  - `create(input, actor)`: flags Staff and Admin (never Kiosk) and records `created`.
  - `update(id, { name?, email?, kind? }, actor)`:
    - **Refusals:** email taken (case-insensitive), invalid email or name, your own kind, demoting the last enabled Admin.
    - **Name rule (ticket 11):** checked only when the name actually changes, so an old Thai name doesn't block an email or kind change.
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

- **Users:** `users.must_change_password boolean not null default false`, `users.disabled_at timestamptz null` and `users.last_signed_in_at timestamptz null`, in one migration (ticket 03). All three are Better Auth `additionalFields` with `input: false`, returned on the session.
- **Backfill:** the same migration sets `last_signed_in_at` to the newest `sessions.created_at` of each Account that has a session; the rest stay null ("Never"). Better Auth deletes a session on sign-out, so an Account that signed out before the upgrade shows "Never" until its next sign-in.
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
  - **`/admin/accounts`:** the table (Name with the avatar, Email, Kind, Status, Last sign-in, Created), a stacked list at 375 px, a "New Account" button and a "History" link.
  - **`/admin/accounts/new`:** Name (with the "In English" hint), Email, Kind (a radio group with one-line explanations), Password and Confirm (with Generate, Copy and show/hide), the 12–128 hint, and the first-sign-in note. Success shows "Account created" and returns to the list.
  - **`/admin/accounts/[id]`:**
    - a header with the avatar, name, email, kind and status Badges, and the last sign-in;
    - a details form: on your own Account the kind is locked; a kind-change warning;
    - "Set a new password" (with Generate, Copy and show/hide): your own Account gets a link to My Account instead;
    - "Disable Account" in a shadcn `AlertDialog`; "Enable Account" acts at once with the toast "Account enabled"; neither on your own Account;
    - "View history";
    - `notFound()` for an unknown id.
  - **`/admin/accounts/history`:**
    - server-rendered, newest first, 50 per page, with Previous/Next;
    - columns: When, Account, Change, By;
    - `?account=<id>` filters it.
  - A pure formatter turns an Account Change into its English line.
- **Commands:** `reset-password` uses `setPassword` and prints when the Account stays disabled. `make-admin` prints what changed.

### Part 2: additions from the User Manager Blueprint (tickets 03, 08–13)

The second grilling (24 October 2026) mapped the blueprint onto this design. Better Auth, the three kinds, ADR 0004 and the 12–128 password rule are unchanged.

- **Last sign-in (ticket 03):**
  - A Better Auth `databaseHooks.session.create.after` sets `last_signed_in_at` to now. It runs after the disabled check in `.before`, so only a real sign-in counts.
  - Every kind counts.
  - Shown with the Back Office's English date and time ("22 Oct 2026, 14:05", Bangkok), or "Never" when null.
- **Avatars and Badges (ticket 13: the list, and the header of `/admin/accounts/[id]`):**
  - shadcn `Avatar` with only the fallback (no images), on a muted background.
  - **Initials, a pure function of the name and email:**
    - the first character of the first word and of the last word, upper-cased: "Napat Wongsa" → "NW", "Kiosk 1" → "K1", "Admin" → "A";
    - a name that doesn't pass the English-name rule (an old Thai name) uses the first letter of the email.
  - **Badges:**
    - kind: "Admin", "Staff" or "Kiosk";
    - status: "Enabled" (outline, green dot), "Disabled" (secondary), plus "Must change password" (outline) when flagged.
  - The sidebar's account menu keeps its icon.
- **Generated passwords (ticket 12, on the forms from 06 and 07):**
  - Generate uses the existing pure `randomPassword()` (24 lower-case characters, no o, 0, i or 1). It is browser-safe, so it runs in the browser.
  - Generate fills Password and Confirm and switches both to plain text.
  - Copy writes the password to the clipboard with the toast "Password copied". Its `aria-label` is "Copy password".
  - Typed passwords are masked, with a show/hide toggle ("Show password" / "Hide password").
  - The password is still sent and checked by the same Server Action; nothing about storing it changes.
- **Enabling (ticket 08):** "Enable Account" calls `enable` directly, with no `AlertDialog`. "Disable Account" keeps its `AlertDialog`.
- **Signed-in devices (ticket 09 lists them; ticket 10 signs them out):**
  - **Accounts module, three new operations:**
    - `listDevices(accountId, currentSessionId)`: the Account's unexpired sessions as id, user agent, IP, `createdAt` and `isCurrent`. **Never the session token.**
    - `signOutDevice(accountId, sessionId)`: deletes that session only if it belongs to the Account and isn't the current one; otherwise not found.
    - `signOutOtherDevices(accountId, currentSessionId)`: deletes every other session of the Account.
  - **Order:** the current session first, then newest first.
  - **Recording:** none of these record an Account Change.
  - **My Account:** a third section, "Signed-in devices", after Change password. It reads behind its own `<Suspense>`.
    - **Each row:** the device label, the IP, and "Signed in {date and time}". The current one has a "This device" Badge and no button.
    - **Other rows:** a "Sign out" button with no confirmation, then the toast "Signed out of that device".
    - **All others:** "Sign out all other devices", only when there is at least one other device, behind an `AlertDialog`:
      - title "Sign out all other devices?";
      - body "Every other device signed in to your Account is signed out. This one stays signed in.";
      - confirm "Sign out other devices", and "Cancel";
      - toast "Signed out of your other devices".
  - **Server Actions:**
    - each re-checks `getCurrentStaff()`, so a Kiosk Account, a signed-out request and a flagged Account are refused;
    - they pass the current session's id from the session itself, never from the browser;
    - they refresh the section afterwards.
  - **Copy:** the section's description is "Where your Account is signed in. Sign out any device you don't recognise." The UI says "device", never "session".
  - **Device label, a pure function of the user agent:**
    - browsers: Safari, Chrome, Firefox, Edge, Samsung Internet;
    - systems: iPhone, iPad, Android, Windows, macOS, Linux, ChromeOS;
    - the result reads "{browser} on {system}", or "Unknown browser" when nothing matches;
    - no new dependency;
    - iPadOS Safari that reports itself as a Mac reads "Safari on macOS". That is accepted.
  - The IP is what Better Auth stored at sign-in: the visitor IP that nginx restores from Cloudflare's header (ADR 0005). It is left out when empty.
- **Names in English (ticket 11):**
  - **The rule lives in the existing pure name-rules module, shared with the browser forms:**
    - trimmed;
    - at most 100 characters;
    - only A–Z, a–z, 0–9, spaces, `-`, `'` and `.`;
    - at least one letter.
  - **Message:** "Use English letters for the name, for example Somchai Jaidee."
  - **The Accounts module applies it in:**
    - `create` (and so `createFirst`);
    - `update` (and so `rename`), only when the name changes.

    So the Back Office, My Account, and the `create`, `create-admin`, `create-kiosk` and `seed` commands all follow it.
  - **Forms** (`/admin/accounts/new`, `/admin/accounts/[id]`, My Account):
    - the hint "In English" sits under Name;
    - on a refusal, a `toastError` with the message, and the same message inline under the field (linked to the input);
    - the browser checks first with the same rule, and the server decides.
  - **Seed:** the default name for an empty `SEED_STAFF_NAME` becomes "Admin". `.env.example` and the operator guide follow.
  - **Existing names:** they stay as they are. Nothing renames or migrates them.

## Testing Decisions

- **Pure modules:**
  - `access.ts` rules for all three kinds, every rule in the table above, plus fail-closed for unknown kinds and `homePath` per kind;
  - in Part 2, the Account Change formatter;
  - **the English-name rule** (ticket 11): accepts "Napat Wongsa", "Kiosk 1", "Mary-Jane", "O'Neil", "J. Smith"; refuses Thai, "123", empty, over 100 characters; trims;
  - **initials** (ticket 13): "NW", "K1", "A", extra spaces, and an old Thai name falling back to the email's first letter;
  - **the device label** (ticket 09): a table of real user-agent strings (Safari on iPhone and iPad, Chrome on Android, Windows and macOS, Edge, Firefox, Samsung Internet) and "Unknown browser" for an empty or unknown one.
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
    - **Last sign-in (03; the disabled case in 08):** null for a new Account; set by a successful `signInEmail` for every kind; unchanged by a sign-in refused as disabled; returned by `list()` and `get()`.
    - **Names (11):** `create` and `update` refuse a Thai name with the message; `update` of email or kind on an Account whose stored name is Thai succeeds; `rename` follows the rule.
    - **Devices (09, 10):**
      - `listDevices` returns only the Account's own sessions, current first then newest, with no token in any row;
      - `signOutDevice` deletes another of its sessions, and refuses the current session and another Account's session;
      - `signOutOtherDevices` keeps only the current session.
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
  - **Part 2 additions:**
    - the list's avatars, Badges and Last sign-in at 375 and 1280 px, and the backfill on a copy of the local demo database;
    - Generate fills both fields, shows the password, and Copy says "Password copied"; show/hide on typed passwords;
    - a Thai name gives the toast and the inline message on `/admin/accounts/new`, `/admin/accounts/[id]` and My Account; `npm run staff -- create … "ชื่อไทย"` refuses it; `seed` with no name creates "Admin";
    - Enable acts at once; Disable asks first;
    - signed-in devices with two browser contexts for one Account: both listed, "This device" on the right one, signing the other out ends it on its next request, and "Sign out all other devices" leaves only this one.
- **Gate:** `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass before each commit.

## Out of Scope

- Deleting Accounts.
- Name search or re-sending Event Passes for Staff Accounts at the desk (an Admin does it).
- Changing your own email.
- Email invitations or self-service reset by email.
- A history of individual sign-ins: only the last sign-in is kept.
- An Admin seeing or ending another Account's devices: disabling the Account or setting its password already ends every session.
- More kinds or per-page permissions.
- Impersonation and two-factor sign-in.
- Editing, deleting or exporting the Account History.
- Backfilling it.
- Password expiry or reuse rules.
- A Kiosk Account changing its own password or name.

**Considered from the User Manager Blueprint and left out (second grilling, 24 October 2026):**
- **Locking an Account after wrong passwords, and Unlock:**
  - Better Auth already limits sign-in per IP, and passwords are 12+ characters.
  - A lock would let anyone lock an Admin out at the entrance.
- **Forgot password by email OTP:** Admins set a temporary password (07) and the owner changes it (05); the commands remain. Kiosk emails aren't real mailboxes.
- **Department and position fields:** the team is small; a name and a kind are enough.
- **Search, filters and paging on the Accounts list:** a few dozen Accounts fit one page.
- **IP addresses in the Account History:** it already records who and when.
- **A transaction around the last-Admin check:** Better Auth's internal adapter has none. The same-second race stays accepted, and `make-admin` is the way back.
- **Manager and Customer roles:** the kinds stay Admin, Staff and Kiosk (ADR 0004).
- **Deleting Accounts, soft or hard:** Accounts are disabled, never deleted (ADR 0004).
- **A "Forbidden" test for every Server Action:** guards stay tested in the Accounts module and pure rules, and audited in each ticket's hand-off.
- **Bcrypt and its 8-character / 72-byte rule:** Better Auth's hashing and the 12–128 rule stay.

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
  - started on 24 October 2026 on `account-management`, branching from `main`;
  - tickets in this order: 03, 04, 05, 06, 07, then 08, 11 and 12, then 13. 09 and then 10 run alongside, since they need only 02. 11 adds the English-name rule to the forms from 06, 07 and 02; 13 uses 11's rule for its initials;
  - merged into `main` after 1 November, once 08, 10, 12 and 13 are done _(changed 2026-10-25: merged on 25 October, before the Event)_.
- **The User Manager Blueprint:** the organisers' notes from hotel-e-voucher, at https://claude.ai/artifact/L8g4M7T7dSCZjg5DBmYA3W. The second grilling took last sign-in, avatars and Badges, generated passwords, enabling without confirmation and signed-in devices from it. English names came up in that grilling. Everything else is under "Out of Scope".
- **Operator guide:** when Part 2 merges, `docs/deploy-guide/index.html` and `.env.example` get the new seed default ("Admin") and the English-name rule for the commands.
- **Deploy (Part 1):**
  - the migration runs on container start;
  - then `docker compose exec app npm run seed` creates the first Admin Account;
  - more Admins with `create-admin`, desk helpers with `create`, iPads with `create-kiosk`.
