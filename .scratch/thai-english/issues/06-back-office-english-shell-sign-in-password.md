# 06: English Back Office: shell, sign-in and change password

**What to build:** The Back Office's frame and its account pages are English, written directly in the code with no toggle.
- The Back Office root layout declares `<html lang="en">`; the title template becomes "%s · Back Office · STEM Racing Thailand 2026".
- The sidebar, navigation, account menu, mobile sheet and shared states ("Loading…", "Session expired", "Sign in again", "Try again", "Cancel").
- The screen-reader-only strings in the shared UI primitives the Back Office uses: sheet, sidebar, breadcrumb and Toaster.
- The sign-in page with every error, and the change-password page with every error and its toast.
- **After account-management 01–02 (merged into `main` first):**
  - the sidebar is per kind: Admin sees Registrations, Check-In, Email; Staff see Check-In;
  - the account menu says "My Account";
  - the change-password form lives on `/admin/account`, already in English.

  Translate what is still Thai around them, and check the shell as both an Admin and a Staff Account.
- The Kiosk page keeps `<html lang="th">`.

Work on the integration branch `back-office-english` (branch each ticket from it, merge back into it). Nothing reaches `main` before ticket 10.

See the spec ("English Back Office") and `copy-back-office.md` ("Shell", "Sign-in page", "Change password").

**Blocked by:** 01

**Status:** resolved

- [x] Every string in the listed areas matches `copy-back-office.md`; no Thai left in them.
- [x] Sign-in behaviour is unchanged (redirects, rate-limit wait, Kiosk Account to `/kiosk`); only the words change.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the sign-in errors, the sidebar and mobile sheet, and change password, at 375 and 1280 px.

## Answer

Done on branch `thai-english-06`.

### What's where

| What | Where |
| --- | --- |
| `<html lang="en">`; default title "Back Office · {event}" and template "%s · Back Office · {event}" | `src/app/admin/layout.tsx` |
| Sign-in page: tab title, heading, description | `src/app/admin/login/page.tsx` |
| Sign-in form: labels, button and pending text, every error, the forgot-password line (logic untouched) | `src/app/admin/login/sign-in-form.tsx` |
| Sidebar name and landmark ("Back Office", "Back Office sidebar") | `src/app/admin/(back-office)/_shell/back-office-sidebar.tsx` |
| Nav labels (Registrations, Check-In, Email) and the nav's name ("Back Office menu") | `src/app/admin/(back-office)/_shell/back-office-nav.tsx` |
| Account menu: "Signed in as" (screen readers), "Sign out" ("My Account" was already English) | `src/app/admin/(back-office)/_shell/staff-account-dropdown.tsx` |
| Mobile sheet title and description ("Menu", "Choose a page"), the toggle and rail ("Open or close the menu") | `src/components/ui/sidebar.tsx` |
| Sheet close ("Close"), breadcrumb ("Breadcrumb", "More"), Toaster ("Notifications", "Close notification") | `src/components/ui/sheet.tsx`, `breadcrumb.tsx`, `sonner.tsx` |

`/admin/account` (details, rename, change password, its errors and toasts, "Loading…", "Session expired. Sign in again") was already English from account-management 02 and matches the deck; it is unchanged. `src/app/admin/actions.ts` and `query-provider.tsx` have no user-facing words.

### Decisions

- **The four UI primitives are Back Office only.** No public page and no Kiosk file imports `sheet`, `sidebar`, `breadcrumb`, `sonner` (or `sonner` itself); the breadcrumb's one user is the Registration detail page (ticket 08). So the English names reach nobody outside the Back Office.
- **`/admin` keeps no title of its own** (ticket 07's page), so its tab shows the layout's default, "Back Office · STEM Racing Thailand 2026", the deck's first Shell row.
- **The Kiosk keeps `<html lang="th">`**: its own root layout (ticket 09's) is untouched; checked live.
- **Strings not in the deck:** none. Every string changed is a deck row; the sidebar rail (not used by the Back Office) shares the toggle's "Open or close the menu".

### Needs from other tickets

Nothing blocks this ticket. Thai still showing inside the English shell, all in other tickets' files:
- **Tab titles:** "เช็คอิน" (`check-in/page.tsx`, 09), "ส่งอีเมล Event Pass" (`email/page.tsx`, 08), "รายละเอียดการลงทะเบียน" (`registrations/[id]/page.tsx`, 08). They already get the English suffix ("… · Back Office · STEM Racing Thailand 2026").
- **Page headings** in each page's `PageHeader` (07, 08, 09), and the resend error toast's text (`_registration-list/event-pass-email.tsx`, in 07's folder); the Toaster's own names are English.
- **The shared states** from the deck's Shell table, to use the same English ("Loading…", "Session expired", "Sign in again", "Try again", "Cancel"):
  - 07: `_overview/summary-cards.tsx`, `_overview/role-table-card.tsx`, `_daily-registrations/daily-registrations-card.tsx`, `_registration-list/registration-list.tsx`, `registration-list-section.tsx`, `event-pass-email.tsx`;
  - 08: `email/page.tsx`, `email/bulk-send.tsx`, `registrations/[id]/page.tsx`, `delete-registration.tsx`;
  - 09: `check-in/page.tsx`, `check-in-result.tsx`, `camera-scanner.tsx`, `kiosk-screen.tsx`.

### Verified

- typecheck, lint, 249 tests and build pass (no new tests: UI isn't an agreed seam).
- **Against `next start`** (scratch copy of the demo database `stem_racing_te06`, email off, an Admin, a Staff and a Kiosk Account made with `npm run staff`), headless Chrome at 1280 and 375 px; 169 checks, all pass but one (a console error on the Kiosk page, see the last line):
  - **Sign-in page** at both widths: `<html lang="en">`, tab title "Sign in · Back Office · STEM Racing Thailand 2026", heading, description, labels, button, forgot line, `method="dialog"`, no sideways scroll, no Thai anywhere (text, `aria-*`, title, placeholder).
  - **Every sign-in error**: empty (both widths, fields marked invalid and described by the message), "Please enter a valid email" (server), "Wrong email or password" (password selected for retyping), "Too many sign-in attempts. Wait 10 seconds and try again." (real limit), "…Wait a moment…" (a 429 without `X-Retry-After`), "Can't reach the server…" (request failed offline), "Sign-in failed. Please try again." (a 500), and "Signing in…" with the button disabled while pending.
  - **Redirects unchanged:** Admin to `/admin`, Staff to `/admin/check-in`, Kiosk Account to `/kiosk` (which is `lang="th"`; `/admin` sends it back there); `/admin/password` answers 308 to `/admin/account`; a Staff Account opening `/admin/email` lands on the desk.
  - **Shell as Admin and as Staff**, at both widths: "Back Office" and the Event in the sidebar, landmarks "Back Office sidebar" and "Back Office menu", links "Registrations, Check-In, Email" (Admin) or "Check-In" (Staff) with the current page marked (Registrations also on a Registration's detail, none on My Account), "Signed in as {name}{email}", toggle "Open or close the menu", menu "My Account | Sign out", Sign out back to sign-in. On a phone the sheet is a dialog named "Menu", described "Choose a page", its hidden close button "Close", and choosing My Account closes it. No Thai in the sidebar, sheet or menu on any page, apart from a Staff member's Thai name.
  - **Titles:** `/admin` "Back Office · STEM Racing Thailand 2026", My Account "My Account · Back Office · …", the other pages "{their Thai title} · Back Office · …"; every page `lang="en"`.
  - **Breadcrumb** on a Registration's detail: "Breadcrumb". **Toaster:** an error toast (resend with email off) sits in "Notifications alt+T" with a close button "Close notification".
  - **Change password** on `/admin/account` (Admin at 1280, Staff at 375): the three empty-field errors with focus on the first, too long, mismatch, "Wrong current password" (server), "Too many attempts. Wait 10 seconds and try again." (real limit), "…Wait a moment…", "Session expired. Sign in again" linking to `/admin/login` (a 401), "Can't reach the server…", "Couldn't change the password. Please try again." (a 500), "Changing password…" disabled while pending, then the toast "Password changed", the form emptied and the session kept. No Thai on My Account.
  - Screenshots looked at: sign-in (both widths, with errors), the sidebar and open menu, the mobile sheet for both kinds, My Account with errors and with the toast.
  - The only console error was the Kiosk's camera refusing headless Chrome (expected).
