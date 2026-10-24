# 09: Owners see where their Account is signed in

**What to build:** a "Signed-in devices" section on My Account (`/admin/account`), after Change password. It lists every device the owner's Account is signed in on: this one first, with a "This device" Badge, then the others newest first. Each row shows the device ("Safari on iPhone"), the IP address, and "Signed in 22 Oct 2026, 14:05". Nothing can be signed out yet; ticket 10 adds that.

See the spec (Part 2, "Signed-in devices", stories 57–60 and 66).

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 02

**Status:** resolved

- [x] **Device label:** a pure function of the user agent, with no new dependency:
  - browsers: Safari, Chrome, Firefox, Edge, Samsung Internet;
  - systems: iPhone, iPad, Android, Windows, macOS, Linux, ChromeOS;
  - "{browser} on {system}", or "Unknown browser" when nothing matches;
  - iPadOS Safari that reports itself as a Mac reads "Safari on macOS" (accepted);
  - unit tests with a table of real user-agent strings (Safari on iPhone and iPad, Chrome on Android, Windows and macOS, Edge, Firefox, Samsung Internet) and an empty or unknown one.
- [x] **Accounts module:** `listDevices(accountId, currentSessionId)`:
  - the Account's unexpired sessions as id, user agent, IP, `createdAt` and `isCurrent`;
  - **never the session token**;
  - the current session first, then newest first;
  - records no Account Change.
- [x] **My Account:**
  - a third section, "Signed-in devices", with the description "Where your Account is signed in. Sign out any device you don't recognise.";
  - it reads behind its own `<Suspense>`, through `getCurrentStaff()`; the current session's id comes from the session itself, never from the browser;
  - **each row:** the device label, the IP (left out when empty), and "Signed in {date and time}" with the shared `bangkokEnglishDateTime`;
  - the current one has a "This device" Badge;
  - the UI says "device", never "session".
- [x] **Tests against a real database:**
  - `listDevices` returns only the Account's own sessions, current first then newest;
  - expired sessions are left out;
  - no row carries a token.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with two browser contexts signed in to one Account (different user agents):
  - both devices listed, "This device" on the right one in each context;
  - a Kiosk Account still goes to `/kiosk`;
  - the page's HTML and RSC payload carry no session token;
  - 375 and 1280 px.

## Answer

Done on branch `am-09`, off `account-management`.

### What's where

| What | Where |
| --- | --- |
| `deviceLabel(userAgent)`: "{browser} on {system}", pure, no dependency | `src/lib/auth/device-label.ts` (+ `device-label.test.ts`, 20 tests) |
| `listDevices(accountId, currentSessionId)` and the `SignedInDevice` type: id, user agent, IP, `createdAt`, `isCurrent`; this one first, then newest first; never the token | `src/lib/auth/accounts.ts` (appended; tests in a new `describe("Accounts: signed-in devices")` at the end of `accounts.test.ts`, 3 tests) |
| `CurrentAccount.sessionId`: the id of the session the request is signed in with, read from the session on the server | `src/lib/auth/session.ts` (`getSignedInAccount`, `getCurrentCheckInAccount`) |
| The section: "Signed-in devices", its description, then the list behind its own `<Suspense>` | `(back-office)/account/page.tsx` |
| `SignedInDevices` (server): `getCurrentStaff()`, then `listDevices(staff.id, staff.sessionId)`; each row's label, IP, "Signed in {date and time}" (`bangkokEnglishDateTime`), the "This device" Badge; `SignedInDevicesSkeleton` | `(back-office)/account/signed-in-devices.tsx` |
| The account menu gets only `{ name, email }` | `(back-office)/_shell/staff-account-menu.tsx` |
| After "Password changed", the page is read again (`router.refresh()`), so the list drops the devices that were just signed out | `(back-office)/account/change-password-form.tsx` |

### Decisions

- **The current session's id rides on `CurrentAccount`** (`sessionId`), so `getCurrentStaff()` gives it to the section, and ticket 10's Server Actions read it the same way. It comes from `session.session.id`, never from the browser.
- **Session ids reach the browser; tokens don't.** The rows use the session id as their React key, so the Staff's own session ids are in the RSC payload. An id signs nothing in (ticket 10 needs them for its buttons anyway). The user agent itself isn't sent either: the label is computed on the server.
- **The whole Account object no longer goes to the account menu,** a Client Component. It now gets only name and email, so neither the Account id nor the session id is serialised there.
- **Device label, where the spec was silent:**
  - Only the browser unknown → "Unknown browser on iPhone" (for example LINE's in-app browser). Only the system unknown → just the browser ("Firefox"). Neither → "Unknown browser".
  - Safari needs "Version/… Safari/", so in-app browsers don't read as Safari.
  - Other Chromium browsers (Opera, Brave, Vivaldi) read as Chrome.
  - Edge, Firefox and Chrome on iOS (`EdgiOS`, `FxiOS`, `CriOS`) are named as such.
- **`listDevices`:**
  - uses Better Auth's `internalAdapter.listSessions(id, { onlyActiveSessions: true })`, so "unexpired" is the real clock;
  - turns Better Auth's empty strings (no header) into null;
  - with a `currentSessionId` that isn't the Account's, nothing is current.
- **Tests:**
  - The expired case sets one session's `expires_at` in the past through the test database: setup, not verification.
  - The tests sit in their own `describe` at the end of the file with their own database, so the merge with 03's additions touches separate hunks.
  - "Records no Account Change" isn't tested here: the Account History arrives with 04, and `listDevices` only reads.
- **Layout for ticket 10:** each `li` is `flex justify-between` with the text in a `min-w-0` block. A "Sign out" button goes in as its second child, and "Sign out all other devices" can follow the `ul`.
- **The IP is shown bare** ("198.51.100.11 · Signed in 24 Oct 2026, 21:08"), as the ticket lists it, and wraps (`break-all`) for a long IPv6.

### Guards (audit)

| Page / handler | Guard |
| --- | --- |
| `/admin/account` | unchanged: `requireStaff()` below `<Suspense>` (Kiosk → `/kiosk`, signed out → sign-in) |
| `SignedInDevices` (inside the page) | `getCurrentStaff()` (the same request's cached read); renders nothing when null; lists only `staff.id`'s sessions, with `staff.sessionId` from the session |
| New Server Actions or Route Handlers | none |

### Check (2026-10-24)

- `npm run typecheck`, `npm run lint`, `npm test` (274 pass; 23 new) and `npm run build` pass.
- **Setup:** `next start` on :3109 on the scratch database `stem_racing_am09`, email off. Admin, Staff and Kiosk Accounts were made with `npm run staff`. Headless Chrome ran separate browser contexts, each with its own user agent and `X-Real-IP`.
- **One Staff Account on two devices:** "Safari on iPhone" (198.51.100.11) and, a minute later, "Chrome on Windows" (198.51.100.22).
  - **The phone** lists "Safari on iPhone · This device · 198.51.100.11 · Signed in 24 Oct 2026, 21:08", then "Chrome on Windows · 198.51.100.22 · Signed in 24 Oct 2026, 21:09".
  - **The laptop** lists itself first with the Badge, then the phone.
  - One Badge each. Each context was checked at 375 and 1280 px with no horizontal scroll; screenshots looked right.
- **The Admin** (Firefox on Linux) sees only its own device, with the Badge. The Staff's devices aren't in its list.
- **A Kiosk Account** opening `/admin/account` ends on `/kiosk`.
- **No session token:** the database had 4 tokens. None of them was in:
  - the page's HTML (`fetch('/admin/account')`);
  - its RSC payload (`RSC: 1`, `text/x-component`);
  - the live DOM;
  - `document.cookie`.

  The user agent string isn't in them either. The Staff's 2 session ids are, as React keys.
- **Change password on the laptop:** the toast "Password changed". With no reload, the list went from 2 devices to 1 ("Chrome on Windows · This device"). The phone's next request went to the sign-in page.

### Noticed, not changed

- The description says "Sign out any device you don't recognise." Until ticket 10, only Change password can sign devices out.
- `createAccounts`'s doc comment lists what the module does and doesn't mention devices. It's left alone so the merge with 03 stays clean; it's worth one line once both are in.
