# 06: Admins create Accounts from the Back Office

**What to build:** "New Account" on `/admin/accounts` opens `/admin/accounts/new`.
- **The form:** an Admin enters a name, an email, a kind and a password typed twice. The kinds are Staff "Check-In desk only", Admin "The whole Back Office, including Accounts" and Kiosk "Kiosk only, for an unattended iPad".
- **The result:** the Account is created and recorded with the Admin as actor. Staff and Admin Accounts are flagged to change their password. A toast says "Account created" and the Admin is back on the list.

See the spec (Part 2, "pages", "The Accounts module grows").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 05

**Status:** resolved

- [x] **`/admin/accounts/new`:**
  - behind `requireAdmin()`;
  - **fields:** Name, Email, Kind (radio group with the one-line explanations), Password, Confirm password;
  - the 12–128 hint;
  - for Staff and Admin, "They'll be asked to choose their own password when they first sign in."
- [x] **Server Action:**
  - re-checks `getCurrentAdmin()`;
  - calls `create(input, { accountId })`;
  - inline errors for invalid email, email taken (any Account, enabled or disabled), invalid name, password too short or too long, and confirmation mismatch (checked in the browser first).
- [x] **On success:** `toastSuccess("Account created")`, then redirect to `/admin/accounts`.
- [x] **Recording:** `created { kind }` with the Admin as actor (module test).
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - create one Account of each kind;
  - the Staff one lands on My Account with the notice at first sign-in, and the Kiosk one goes straight to the Kiosk;
  - each inline error;
  - the History shows the Admin;
  - 375 and 1280 px.

## Answer

Done on branch `am-06`, off `account-management` at `c8c2b79`.

### What's where

| What | Where |
| --- | --- |
| `create` refuses a name over 100 characters (`name-too-long`, the same limit as the owner's rename) and has its doc; the email rule moved out; the module's doc names the Accounts pages | `src/lib/auth/accounts.ts` (+ 3 tests in `accounts.test.ts`, below) |
| `isValidAccountEmail()`: the module's email rule, now pure so the browser form checks with the same one | `src/lib/auth/email-rules.ts` |
| The commands report `name-too-long` | `scripts/staff.ts` (`create*`), `scripts/seed.ts` |
| Stale comments from 03/04: sign-up is off because Accounts are made through the module, by an Admin or the command; "Admin, Staff and Kiosk Accounts" | `src/lib/auth/staff-auth.ts` |
| shadcn `RadioGroup`, copied by hand from the new-york-v4 registry (`cn` from `@/lib/utils`); not portaled, so no `globals.css` change | `src/components/ui/radio-group.tsx` |
| `SessionExpired`, `CANT_REACH_SERVER`, `FormAlert`, moved from My Account so the Accounts pages share them (`git mv`; three imports updated) | `(back-office)/_shell/form-messages.tsx` |
| "New Account" (lucide `UserRoundPlusIcon`, primary) after "History" in the Accounts header; "History" shows only its icon below `sm` | `(back-office)/accounts/page.tsx` |
| The page: breadcrumb "Accounts › New Account" (the `h1` is the last crumb), `requireAdmin()` behind `<Suspense>`, then the form | `(back-office)/accounts/new/page.tsx` |
| The form: Name, Email, Kind (radio group, one-line explanations), Password with "12 to 128 characters", Confirm password, the first-sign-in note for Staff and Admin, "Create Account" | `(back-office)/accounts/new/new-account-form.tsx` |
| `createAccount(input)`: re-checks `getCurrentAdmin()`, refuses a kind that isn't one of the three, calls `create(…, { accountId: admin.id })` | `(back-office)/accounts/new/actions.ts` |

### Decisions

- **Staff is chosen to begin with.** A radio group needs a starting choice, and the ticket lists no "choose a kind" error. Staff is the commonest new Account (a helper at the entrance) and the least a person can be given. Kinds are offered in the ticket's order: Staff, Admin, Kiosk.
- **`create` now refuses a name over 100 characters** (`{ status: "name-too-long", maxLength: 100 }`), like `rename`. Before, only an empty name was refused, so an Admin could create an Account whose owner then couldn't save its name unchanged on My Account. `npm run staff -- create*` and `npm run seed` say so. Ticket 11 adds the English-letters rule on top; the length part is already in place.
- **The browser checks first with the server's rules:** the name (trimmed, not empty, at most 100), the email (`isValidAccountEmail`, moved out of the module unchanged), the password (12–128, from `password-rules.ts`) and the confirmation. The server decides all but the confirmation.
- **The confirmation is checked only in the browser.** It guards against a typo by the Admin; a request could always send two matching values, so the Server Action takes only the password. Same as the change-password form.
- **The kind must be one of the three.** The module defaults a missing kind to Staff (for the commands); the Server Action doesn't rely on that and answers `invalid-kind`, shown under Kind ("Choose a kind of Account"). The radio group always sends one, so only a bug or a forged request lands there.
- **Messages,** in the tone of My Account's forms:
  - Name: "Please enter a name", "The name can be at most 100 characters";
  - Email: "Please enter an email", "Please enter a valid email", "This email already belongs to an Account" (enabled or disabled; the list shows both);
  - Password: "The password needs at least 12 characters", "The password can be at most 128 characters";
  - Confirm: "Please enter the password again", "The passwords don't match";
  - above the button: "Session expired. Sign in again" (signed out, not an Admin, or an Admin who must choose their own password), and "Can't reach the server…".
  - The cursor goes to the first field with a problem, its text selected, as on My Account.
- **The first-sign-in note** ("They'll be asked to choose their own password when they first sign in.") shows only while Staff or Admin is chosen (`canChangeOwnPassword`), above the button, and describes it (`aria-describedby`), like My Account's other-devices warning.
- **Success:** the action returns `created`; the browser shows `toastSuccess("Account created")` and `router.push("/admin/accounts")`. Not `redirect()` in the action: the toast lives in the browser, and a redirecting action never hands its result back. The list is dynamic, so the new row is there at once (checked). Push, not replace: Back returns to a fresh New Account form, like a classic post-redirect-get.
- **Each visit starts afresh.** Next keeps the page alive, hidden, after navigating away (Activity), so a `useLayoutEffect` cleanup resets the form, the kind and any messages when it hides. Nothing typed, the password included, stays behind in a hidden page. The button stays "Creating Account…" until then, so a second click can't send it twice.
- **Fields:** Name and Email are `autocomplete="off"` (they are someone else's, so the browser shouldn't offer the Admin's own); the passwords are `new-password`. No Generate, Copy or show/hide yet (ticket 12), and no "In English" hint (ticket 11).
- **`form-messages.tsx` moved to `_shell/`** now that a second page uses it, rather than importing across route folders. 07 can use it as is.
- **The header at 375 px:** with both buttons, "Accounts" was cut to "Accou…". "History" now shows only its icon below `sm` (its label stays for screen readers); "New Account" keeps its label.

### Guards (audit)

| Page / handler | Guard |
| --- | --- |
| `/admin/accounts/new` | `requireAdmin()` in `AdminOnlyNewAccountForm`, below `<Suspense>`; the form renders only after it. Signed out → `/admin/login` (the Proxy, then the guard), Staff → `/admin/check-in`, Kiosk → `/kiosk`, a flagged Account → `/admin/account`. |
| `createAccount` (Server Action) | `getCurrentAdmin()` first: anyone else gets `signed-out` and nothing is read from the input. The actor is `admin.id` from the session, never from the browser. A request without a session cookie is turned away by the Proxy before it runs. |
| "New Account" button | display only; the page and the action guard themselves |

The Accounts module still makes every decision about the Account (email taken, name, password, flag, record).

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (313 pass; 3 new) and `npm run build` pass. `/admin/accounts/new` builds as a partial prerender.
- **New tests** (Accounts module, real database):
  - an Admin creating a Staff, an Admin and a Kiosk Account records `created { kind }` with that Admin as actor, newest first; Staff and Admin are flagged, the Kiosk isn't; six refusals (invalid email, email taken in another case, empty name, 101 characters, short and long password) record nothing and create nothing (in `describe("Accounts: Account History")`);
  - an email that a disabled Account has is taken too;
  - a new Account's name is trimmed; empty or over 100 characters is refused.
  - 04's test already covered one `create` with an `{ accountId }` actor (a Kiosk); the new one covers each kind and the refusals.
- **Setup:**
  - `next start` on :3106 on the scratch database `stem_racing_am06`, migrated to 0005, email off;
  - with `npm run staff`: Admin "Napat Wongsa", Staff "Old Helper", Staff "Departed Helper" (disabled by SQL, no UI before 08), Kiosk 1. The Admin's and Old Helper's flags were cleared by SQL for setup;
  - headless Chrome on :9306, one browser context and `X-Real-IP` per Account, real mouse clicks and typing. 61/61 checks passed.
- **Getting there:** the Accounts header has "History" then "New Account" → `/admin/accounts/new`; title "New Account · Back Office · …"; breadcrumb "Accounts › New Account"; "Accounts" current in the sidebar.
- **The form:** fields in order Name, Email, Kind (Staff, Admin, Kiosk, each with its line, the line linked to its radio), Password, Confirm password. Staff starts chosen. The hint reads "12 to 128 characters", linked to the field. The note shows for Staff and Admin, not for Kiosk (chosen by clicking its label; Admin by its radio).
- **Inline errors, in the browser:** empty form (all four messages, cursor on Name); 101-character name, "not-an-email", 129-character password and a mismatched confirmation (all four); an 11-character password alone (cursor on Password); a mismatch alone (cursor on Confirm). Each field is `aria-invalid` and described by its message. Nothing was created.
- **Inline errors, from the server:**
  - `helper@example.org` (enabled): "This email already belongs to an Account" under Email, cursor there, button back to "Create Account";
  - ` DEPARTED@Example.org ` (disabled, other case, spaces): the same;
  - an Admin flagged by SQL: "Session expired. Sign in again" above the button, nothing created.
- **The Server Action replayed** with the captured `Next-Action` id and an Admin kind:
  - from Staff and Kiosk sessions: `{"status":"signed-out"}`, nothing created;
  - with no cookie: the Proxy redirects it;
  - with a made-up session cookie (past the Proxy): `signed-out`, nothing created.
- **One of each kind through the form:**
  - Staff "Somchai Jaidee" (`Somchai@Example.org`): toast "Account created", back on `/admin/accounts`, the row there at once with `somchai@example.org`, Staff, "Enabled · Must change password", "Never";
  - Back from the list: New Account again, empty, Staff chosen, button ready;
  - Admin "Mary-Jane O'Neil": Admin, "Must change password";
  - Kiosk "Kiosk 3": Kiosk, "Enabled", not flagged.
  - In the database: flagged for Staff and Admin only; `account_changes` has exactly three new `created` rows (`staff`, `admin`, `kiosk`) with the Admin as actor, none for the refusals or replays.
- **The History shows the Admin:** "Created as Kiosk", "Created as Admin", "Created as Staff", newest first, each by "Napat Wongsa"; the setup Accounts by "Server command".
- **First sign-ins:** Somchai lands on My Account with "An Admin set your password. Choose your own to continue." (375 px); Mary-Jane lands on My Account; Kiosk 3 goes straight to `/kiosk`.
- **Who may open it:** Staff → `/admin/check-in`, Kiosk → `/kiosk`, signed out → `/admin/login`, the flagged new Staff → `/admin/account`.
- **Widths:** 1280 px (form, errors, email taken, list after create, History) and 375 px (list, form, errors) with no sideways scroll; at 375 the header shows "Accounts" in full, the History icon and "New Account". Screenshots looked right.
- Afterwards: server and Chrome stopped, `stem_racing_am06` dropped.

### Noticed, not changed

- **`access.ts` still says a Kiosk Account's password "is changed only with the server command"** (`canChangeOwnPassword`'s doc). True until 07's "Set a new password".
- **The operator guide** (`docs/deploy-guide/index.html`, `docs/deploy.md`) gives the `npm run staff` commands for making Accounts and doesn't mention the Back Office's New Account yet. The spec plans the guide's Part 2 update for the merge into `main`; this belongs there.
- **The History icon on a phone has no tooltip.** Its accessible name is "History"; the History page's title says the rest.
- **`next start` warns** that it doesn't fit `output: "standalone"`, as in earlier checks. It serves the build fine for these checks.

### For later tickets

- **07:**
  - The New Account form is the model for "Set a new password" (the same messages, `fieldProps`, focus on the first problem, reset on hide). Ticket 12 then lifts the password fields into one shared component for both.
  - `_shell/form-messages.tsx` has `SessionExpired`, `CANT_REACH_SERVER` and `FormAlert`.
  - `update` should refuse a name over 100 the way `create` now does (`name-too-long`).
  - List rows can link to `/admin/accounts/[id]`; the header already has room on a phone.
- **11:** the English-name rule goes into `create` next to the length check (`checkNewAccount`), and into the form's `checkInput` beside `NAME_EMPTY`/`NAME_TOO_LONG`, with the "In English" hint under Name.
- **12:** Generate, Copy and show/hide go on the Password and Confirm fields here. The note for Staff and Admin is already next to them, above the button.
- **13:** nothing here; the list keeps its rows.

## Comments

- 2026-10-25: Part 2 is on `main`, so the operator guide now mentions the Accounts pages, New Account included (section 6).
