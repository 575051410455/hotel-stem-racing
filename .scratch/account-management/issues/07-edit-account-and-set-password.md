# 07: Admins edit an Account and set its password

**What to build:** each row on `/admin/accounts` opens `/admin/accounts/[id]`. There an Admin can:
- change the name, email and kind;
- set a new password, which signs the Account out everywhere and, for Staff and Admin, forces a change at next sign-in.

Both are recorded.

**Guards:**
- An Admin can't change their own kind or set their own password here; a link to My Account stands in for that.
- Demoting the last enabled Admin is refused.

See the spec (Part 2, "The Accounts module grows", "pages").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 06

**Status:** resolved

- [x] **Accounts module:**
  - `update(id, { name?, email?, kind? }, actor)`:
    - one record per changed field, with `{ from, to }`;
    - a kind change deletes sessions;
    - **refuses:** invalid name or email, email taken (case-insensitive), your own kind, demoting the last enabled Admin.
    - `rename` becomes a thin call into it.
  - `setPassword(id, password, actor)`:
    - replaces `resetPassword` (the command looks up by email);
    - flags Staff and Admin, deletes sessions, records `password-set`;
    - refuses your own Account;
    - reports when the Account stays disabled.
- [x] **`/admin/accounts/[id]`:**
  - behind `requireAdmin()`; `notFound()` for an unknown id;
  - **details form**, with "Changing the kind signs this Account out everywhere.";
  - **on your own Account:** kind locked, with "You can't change your own kind.";
  - **"Set a new password"** with confirmation and its warning; your own Account gets a link to My Account instead;
  - **"View history"** links to `/admin/accounts/history?account=<id>`.
- [x] **Links into the page:** list rows, and the History's Account column.
- [x] **Saving:** Server Actions re-check `getCurrentAdmin()`. Inline errors; the toasts "Account updated" and "Password set".
- [x] **Command:** `npm run staff -- reset-password` uses `setPassword` and prints when the Account stays disabled.
- [x] **Tests against a real database:**
  - each field change and its record;
  - email taken;
  - your own kind refused;
  - last enabled Admin refused;
  - a kind change ends sessions;
  - `setPassword`: flag, sessions ended, signing in with the new password works, your own refused.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with a second browser signed in as the target:
  - change its kind from Staff to Admin: the session ends, and the next sign-in sees the whole Back Office;
  - set its password: the session ends, and the next sign-in is forced to change it;
  - your own page shows the kind locked and the My Account link;
  - demoting the last Admin is refused;
  - 375 and 1280 px.

## Answer

Done on branch `am-07`, off `account-management` at `7146e4b`.

### What's where

| What | Where |
| --- | --- |
| `update(id, { name?, email?, kind? }, actor)`: `updated { account }`, or `not-found`, `invalid-name`, `name-too-long`, `invalid-email`, `email-taken`, `own-kind`, `last-enabled-admin` | `src/lib/auth/accounts.ts` |
| `rename(accountId, name)`: the Kiosk check, then `update` with only the name and the owner as actor | same |
| `setPassword(id, password, actor)`, replacing `resetPassword`: `password-set { accountId, email, kind, staysDisabled }`, or `own-account`, `not-found`, `password-too-short`, `password-too-long` | same |
| `getByEmail(email)`, a read for the command | same |
| Private helpers: `checkName` (shared with `create`), `isOwnAccount(accountId, actor)`, `otherEnabledAdmins(accountId)` | same |
| Tests: a new `describe("Accounts: an Admin edits an Account and sets its password")` (9 tests); a `getByEmail` test; every `resetPassword` test now calls `setPassword` | `src/lib/auth/accounts.test.ts` |
| `reset-password`: `getByEmail`, then `setPassword(…, "server-command")`; it adds "It stays disabled: it can't sign in until an Admin enables it again." | `scripts/staff.ts` |
| The page: one `<Suspense>` around the header and the content; `requireAdmin()`, then `params`, then `get(id)`, and `notFound()` for an unknown id | `(back-office)/accounts/[id]/page.tsx` |
| "Accounts › {name}" breadcrumb, also used by `not-found.tsx` | `[id]/account-header.tsx` |
| "Account not found", inside the Back Office | `[id]/not-found.tsx` |
| Details form (Name, Email, Kind) | `[id]/account-details-form.tsx` |
| "Set a new password" form | `[id]/set-password-form.tsx` |
| Server Actions `updateAccount(accountId, input)` and `setAccountPassword(accountId, password)` | `[id]/actions.ts` |
| The forms' shared messages, `KIND_CHOICES`, and the browser checks `nameProblems`, `emailProblems`, `passwordProblems`. Moved out of New Account unchanged; New Account now imports them. | `accounts/account-form-rules.ts` |
| `text(input, field)`, moved out of `new/actions.ts` for both pages' actions | `accounts/action-input.ts` |
| `accountHref(id)` | `accounts/links.ts` |
| List: in the table, the name links to the page; in the stacked list, the whole row does (a stretched link). `AccountStatus` and `LastSignIn` are exported for the page. | `accounts/account-list.tsx` |
| History: the Account column's name links to the page, in the table and the stacked list | `accounts/history/account-history-list.tsx` |
| Comments and wording | See below. |

The comments and wording that changed:
- A Kiosk's password is set by an Admin or the command: `canChangeOwnPassword` in `access.ts`, and the message of the `/change-password` refusal in `staff-auth.ts`.
- Names also change on an Account's page (`staff-auth.ts`).
- The name limit is shared with three forms (`name-rules.ts`).
- The Accounts list's header comment.

### Decisions

- **`update` checks and records only what changes.** A field that is left out, or the same after trimming (and, for the email, lower-casing), is neither checked nor recorded. That is ticket 11's rule for names, applied to the email too.
  - **All or nothing.** It checks first, in form order (name, email, kind). It then saves in one `updateUser`, deletes the sessions if the kind changed, and records one change per field. The History, newest first, shows kind, email, name.
  - **A no-op** answers `updated` and records nothing.
- **Your own Account:** only your own kind (`update`) and your own password (`setPassword`) are refused. An Admin may change their own name and email on their own page.
  - The ticket's guards name only those two.
  - The spec's out-of-scope "Changing your own email" reads as self-service: My Account still says "To change your email, ask an Admin".
  - **Flag:** if the organisers want an Admin's own email locked here too, it's one more check in `update`.
  - As the spec says, these rules apply only to an `{ accountId }` actor. The command can change anyone, the operator's own Account included.
- **Last enabled Admin.** `update` refuses when the target is an enabled Admin and no other enabled Admin exists (`countTotalUsers`: kind admin, `disabledAt` null, id not the target's).
  - A disabled Admin can be demoted: its `disabled_at` is set, so it isn't one of the enabled Admins.
  - The rule holds for every actor, the server command included.
  - The same-second race is accepted (spec).
- **Statuses:** `own-kind`, `last-enabled-admin`, and `own-account` (for `setPassword`).
- **`setPassword` order:**
  1. your own Account, before anything else;
  2. the password's length;
  3. not found.

  A disabled Account stays disabled, and the result says `staysDisabled: true`.
- **`getByEmail`.** "The command looks up by email": the command has only the module, so the module gained this one read rather than the command going round it.
- **The command:**
  - its message names the stored (lower-case) email;
  - an unknown email is now reported before a short password;
  - `own-account` can't come back for the server command, so it throws.
- **`rename`.** It reads the Account (`get`) for the Kiosk check, then calls `update`.
  - Not-found and not-allowed now come before name problems.
  - A name saved unchanged is no longer checked. An old name over 100 characters can be saved as it is, where before it was refused.
- **Layout.** Like a Registration's detail, the whole page waits behind one boundary, because the header shows the name.
  - **Header:** the breadcrumb "Accounts › {name}", with the name cut short when long.
  - **The `h1`:** the name, in full, at the top of the content. Ticket 13 can put the avatar beside it.
  - **Below the name:** the email; Kind, Status and Last sign-in, worded as in the list; then a "View history" button.
  - **Sections:** "Details", then "Set a new password". On your own Account the second is called "Password" and holds the link to My Account.
  - **Title:** "Account", static, like "Registration details".
  - **No "Created" line:** the spec's header doesn't list it.
- **`notFound()`, as the ticket says, plus `accounts/[id]/not-found.tsx`.**
  - **What it shows:** "Account not found", the breadcrumb, the sidebar, and "Back to Accounts". The page stays inside the Back Office instead of dropping to the global bilingual 404.
  - **The status is 200, with `noindex`.** The call runs below the `<Suspense>`, after streaming has started, as `requireAdmin()`'s redirects do. The not-found text is in the server's HTML.
  - **Why not 404:** that would need the page to block on the session and the database before streaming, against the Cache Components rule.
- **The details form:**
  - **What it sends:** all three fields, every time. The module decides what changed.
  - **Kind:** 06's radio group and one-line explanations. "Changing the kind signs this Account out everywhere." describes the group.
  - **On your own Account:** the radios are disabled, and "You can't change your own kind." replaces the warning.
  - **Messages:** New Account's, from the shared module.
  - **`last-enabled-admin`:** "This is the last enabled Admin Account, so it stays an Admin. Make another Account an Admin first." It shows under Kind, and the focus goes to the chosen radio.
  - **`own-kind`:** "You can't change your own kind." Only a stale page gets it.
  - **On success:** the toast "Account updated". The fields show what was saved (trimmed, lower-case), and `refresh()` reads the page and the account menu again.
  - **Fresh values:** the form is keyed on the saved name, email and kind, so it starts again from them after any save. Like New Account, it resets when Next hides the page.
- **"Set a new password":**
  - **Fields:** "New password" and "Confirm new password", with the hint "12 to 128 characters". "With confirmation" is read as typed twice (spec story 26), not as a dialog.
  - **Notes:** "Setting a password signs this Account out everywhere." For a Staff or Admin Account (by its saved kind), also "They'll be asked to choose their own password at their next sign-in." Both describe the button.
  - **Messages:** New Account's.
  - **On success:** the toast "Password set". The fields are emptied, and the refresh shows "Must change password" in Status. Nothing typed survives a hidden page.
  - **For a disabled Account,** the toast is still just "Password set". Saying so on the page is 08's UI.
- **Links:**
  - **Accounts list:** in the table, the name (underlined on hover). In the stacked list, the whole row, so a thumb can tap anywhere on it.
  - **History:** the Account's name, underlined, in both views.

### Guards (audit)

| Page / handler | Guard |
| --- | --- |
| `/admin/accounts/[id]` | `requireAdmin()` in `AdminOnlyAccount`, below `<Suspense>`, before `params` or the database are read. Checked: Staff → `/admin/check-in`, Kiosk → `/kiosk`, signed out → `/admin/login`, an Admin whose password was just set → `/admin/account`. |
| `[id]/not-found.tsx` | Reached only through `notFound()`, after `requireAdmin()`. It shows no data. |
| `updateAccount` (Server Action) | `getCurrentAdmin()` first. Anyone else gets `signed-out`, and nothing is read from the input. The actor is `admin.id` from the session. The id must be a string; the kind must be one of the three (`invalid-kind`). The module refuses your own kind and the last enabled Admin. |
| `setAccountPassword` (Server Action) | The same check first. The module refuses your own Account. |
| Replay | The captured `updateAccount` request, replayed from a Kiosk session and from an Admin who must choose their own password: `signed-out`, nothing changed. |
| `npm run staff -- reset-password` | The server command. It can set any Account's password, the operator's own included, and never enables a disabled Account. |
| List and History links, "View history", the My Account link | Display only; each page guards itself. |

The Accounts module still makes every decision about the Account.

### Check (2026-10-24)

- **Gate:**
  - `npm run typecheck`, `npm run lint`, `npm test` (323 pass; 10 new) and `npm run build` pass.
  - `/admin/accounts/[id]` builds as a partial prerender.
- **Setup:**
  - `next start` on :3107 on the scratch database `stem_racing_am07`, migrated to 0005, email off.
  - Accounts made with `npm run staff`: Admin "Napat Wongsa" (the acting Admin), Admin "Mary-Jane O'Neil", Staff "Somchai J", Staff "Departed Helper" and Kiosk 1. The three people's flags were cleared by SQL, and "Departed Helper" was disabled by SQL (no UI before 08).
  - Headless Chrome on :9307: one browser context per Account (Admin, the target, Kiosk, signed out), each sign-in from its own `X-Real-IP`, with real mouse clicks and typing. 74/74 checks passed.
- **Command:**
  - `reset-password ' Departed@Example.org '` on the disabled Account printed "Reset the password for the Staff Account departed@example.org and signed it out of every device. At their next sign-in they must choose their own password. It stays disabled: it can't sign in until an Admin enables it again." `disabled_at` was unchanged.
  - On the enabled Kiosk it said nothing about disabling.
  - An unknown email gave "There is no Account for …" (exit 1); a 5-character password gave "too short" (exit 1).
  - The two resets were recorded as `password-set` by Server command, and show in the History.
- **Who may open it:** Staff → `/admin/check-in`, Kiosk → `/kiosk`, signed out → `/admin/login`.
- **Links:**
  - At 1280 px, each of the five table rows' names links to its own `/admin/accounts/[id]`; clicking "Somchai J" opens it.
  - At 375 px, tapping a stacked row on its Kind opens the page.
  - On the History, every row's Account links to its page (table and stacked list); clicking "Kiosk 1" opens its page.
- **The page:**
  - title "Account · Back Office · …"; breadcrumb "Accounts › Somchai J";
  - the name, the email, Kind "Staff", Status "Enabled", Last sign-in "24 Oct 2026, 22:57";
  - "View history" → `/admin/accounts/history?account=<id>`;
  - the sections Details and Set a new password; the form starts from the saved values;
  - the kind warning describes the group, and both password notes describe the button. A Kiosk's page has only the warning.
- **Details errors:**
  - empty name and email: both messages, the cursor on Name;
  - 101 characters and "not-an-email": both refused;
  - ` KIOSK-1@Example.org `: "This email already belongs to an Account" from the server, the cursor on Email.
  - Each message marks its field and is linked to it. Nothing was saved or recorded.
- **Kind Staff → Admin, with the second browser signed in as Somchai on the desk:**
  - The same save changed the name to "  Somchai Jaidee " and the email to "Somchai.Jaidee@Example.org".
  - **On the Admin's page:** the toast "Account updated"; the page, the breadcrumb and the form show "Somchai Jaidee", `somchai.jaidee@example.org` and Admin.
  - **In the database:** the new values are stored, and Somchai has 0 sessions.
  - **Somchai's next request** (the desk) went to sign-in. Signing in with the new email landed on `/admin`, with Registrations, Check-In, Email and Accounts in the sidebar; `/admin/email` and `/admin/accounts` open.
- **Set a new password:**
  - **Errors:** empty (too short, and "Please enter the password again", the cursor on New password); 129 characters with a mismatch; a mismatch alone (the cursor on Confirm). Nothing was recorded, and the target stayed signed in.
  - **Then a good one:** the toast "Password set". The fields emptied, Status became "Enabled · Must change password", the flag was set, and Somchai had 0 sessions.
  - **Somchai's next request** went to sign-in. The old password gave "Wrong email or password". The new one landed on My Account with "An Admin set your password. Choose your own to continue.", and `/admin` and `/admin/accounts` both went there.
- **History:** "View history" shows, each by "Napat Wongsa":
  - "Password set";
  - "Kind changed: Staff → Admin";
  - "Email changed: somchai@example.org → somchai.jaidee@example.org";
  - "Name changed: Somchai J → Somchai Jaidee".

  Below them, "Created as Staff" by "Server command".
- **Your own page:**
  - The kind radios are disabled with Admin checked, and "You can't change your own kind." describes the group.
  - There is no password form, only "You change your own password on My Account, by entering your current one." Its link opens `/admin/account`.
  - Renaming yourself to "Napat W." gave "Account updated". It was recorded once; the kind stayed Admin and the session stayed. The account menu showed the new name.
- **Last enabled Admin:**
  - Napat and Somchai were disabled by SQL, which leaves Napat signed in until 08's backstop. That makes Mary-Jane the last enabled Admin.
  - Choosing Staff on her page and saving: the message under Kind, the group marked invalid and linked, the cursor on the chosen radio. Nothing changed or recorded.
- **Each visit starts afresh:** a typed password and an unsaved name were gone after leaving through the breadcrumb and coming Back.
- **Unknown id:** `/admin/accounts/no-such-account` shows "Account not found" inside the Back Office. Over HTTP it answers 200 with `noindex`.
- **Widths:**
  - 1280 px: the page, the errors, after saving, the password errors, your own page, the last-Admin refusal, the History and the not-found page;
  - 375 px: the list, the page, the errors, your own page, the target and the History;
  - none scrolls sideways; screenshots looked right.
- **New Account after the move to `account-form-rules.ts`, rechecked in the browser (6/6):**
  - the kinds and explanations;
  - the four messages on an empty form, with the cursor on Name;
  - email taken;
  - creating an Account gives "Account created", and its new row links to its page.
- **Afterwards:** server and Chrome stopped, `stem_racing_am07` dropped.

### Noticed, not changed

- **A disabled Account can still sign in until 08.** The last-Admin check above relied on it.
- ~~**The forced-change flag and kind changes.**~~ **Changed at merge (integrator):** a kind change now moves the flag with it, in `update` and `makeAdmin` (`mustChangePasswordAsKind`). A Staff or Admin made a Kiosk is cleared ("Kiosk Accounts are never flagged", spec); a Kiosk made Staff or Admin is flagged, since an Admin or the command chose its password (ADR 0004); between Staff and Admin it stays. Module test "a kind change keeps a Kiosk unflagged, and a Kiosk made Staff or Admin must choose its own password" (324 tests).
- **The operator guide** (`docs/deploy-guide/index.html`, `docs/deploy.md`) doesn't mention editing an Account or setting its password from the Back Office. It also doesn't say that `reset-password` leaves a disabled Account disabled. The spec plans the guide's Part 2 update for the merge into `main`.
- **History table:** an Account's email wraps inside the address at 1280 px (04's `wrap-anywhere` in a narrow column), as before.
- **Disabled kind radios** dim their labels but not their one-line explanations (shadcn `Field` styling).
- **`next start`** warns that it doesn't fit `output: "standalone"`, as in earlier checks.

### For later tickets

- **08 (disable and enable):**
  - `otherEnabledAdmins(accountId)` is the "last enabled Admin" count, and `isOwnAccount(accountId, actor)` is "yourself". Use both in `disable`.
  - `setPassword` already returns `staysDisabled`, and the command prints it. The page's toast is plain "Password set": add a line there if you want the page to say so (`setAccountPassword` returns the whole result).
  - Put Disable / Enable on `[id]/page.tsx` after "Set a new password", not on your own Account (`isOwnAccount` is already computed there). Status uses the list's `AccountStatus`.
  - The new `describe` has a `disable()` helper that writes `disabledAt` through the internal adapter. Switch it, and the ordering test, to the module's `disable`.
  - Once 08 signs disabled Accounts out, a signed-in Admin is always an enabled Admin. Through the UI, the last enabled Admin can then be demoted only by itself, which is refused as its own kind. A check of `last-enabled-admin` would need the command or a race; the module test covers it.
- **11 (names in English):**
  - **Module:** `checkName` is shared by `create` and `update`, and so `rename`. `update` already checks the name only when it changes.
  - **Browser:** `nameProblems` in `accounts/account-form-rules.ts` serves New Account and the details form. My Account has its own `checkInput` in `rename-form.tsx`.
  - **The hint** "In English" goes under Name in `account-details-form.tsx`.
- **12 (generated passwords):**
  - Generate, Copy and show/hide go on `[id]/set-password-form.tsx` (`password`, `confirmation`; `fieldProps` sets `type: "password"`) and on New Account. Lift them into one shared component.
  - The next-sign-in note is already beside them.
- **13 (avatars and Badges):**
  - The header block is the top of `AdminOnlyAccount` in `[id]/page.tsx`: the `h1` name, the email, and a `dl` with Kind, Status and Last sign-in. Put the avatar beside the `h1`, and Badges in place of the Kind and Status text.
  - In the list, the name cell is now a `Link`, and in the stacked list a stretched one.
