# 09: Owners see where their Account is signed in

**What to build:** a "Signed-in devices" section on My Account (`/admin/account`), after Change password. It lists every device the owner's Account is signed in on: this one first, with a "This device" Badge, then the others newest first. Each row shows the device ("Safari on iPhone"), the IP address, and "Signed in 22 Oct 2026, 14:05". Nothing can be signed out yet; ticket 10 adds that.

See the spec (Part 2, "Signed-in devices", stories 57–60 and 66).

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] **Device label:** a pure function of the user agent, with no new dependency:
  - browsers: Safari, Chrome, Firefox, Edge, Samsung Internet;
  - systems: iPhone, iPad, Android, Windows, macOS, Linux, ChromeOS;
  - "{browser} on {system}", or "Unknown browser" when nothing matches;
  - iPadOS Safari that reports itself as a Mac reads "Safari on macOS" (accepted);
  - unit tests with a table of real user-agent strings (Safari on iPhone and iPad, Chrome on Android, Windows and macOS, Edge, Firefox, Samsung Internet) and an empty or unknown one.
- [ ] **Accounts module:** `listDevices(accountId, currentSessionId)`:
  - the Account's unexpired sessions as id, user agent, IP, `createdAt` and `isCurrent`;
  - **never the session token**;
  - the current session first, then newest first;
  - records no Account Change.
- [ ] **My Account:**
  - a third section, "Signed-in devices", with the description "Where your Account is signed in. Sign out any device you don't recognise.";
  - it reads behind its own `<Suspense>`, through `getCurrentStaff()`; the current session's id comes from the session itself, never from the browser;
  - **each row:** the device label, the IP (left out when empty), and "Signed in {date and time}" with the shared `bangkokEnglishDateTime`;
  - the current one has a "This device" Badge;
  - the UI says "device", never "session".
- [ ] **Tests against a real database:**
  - `listDevices` returns only the Account's own sessions, current first then newest;
  - expired sessions are left out;
  - no row carries a token.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with two browser contexts signed in to one Account (different user agents):
  - both devices listed, "This device" on the right one in each context;
  - a Kiosk Account still goes to `/kiosk`;
  - the page's HTML and RSC payload carry no session token;
  - 375 and 1280 px.
