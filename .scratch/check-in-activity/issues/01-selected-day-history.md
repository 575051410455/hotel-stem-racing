# 01: Browse recorded Check-Ins for one Event Day

**What to build:** Staff using an Admin Account can open Check-In Activity from Back Office navigation, select an Event Day and browse the latest recorded Check-Ins through TanStack Table and TanStack Query.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Page, navigation and data endpoint permit only Admin Accounts, preserving disabled and must-change-password restrictions.
- [x] Select one configured Event Day; default to today's Bangkok Event Day, otherwise the next Event Day, or the latest after the Event.
- [x] Show Attendee name, Pass Code, Attendee Role, organisation, actual Check-In date/time in Bangkok, recording Account and outside-registered-day badge; retain rows with missing attribution.
- [x] Select by recorded Event Day even when the timestamp falls on another date. Order newest first with a stable tie-breaker.
- [x] Page server-side with matching result count and 25/50/100 sizes, default 25. Preserve day/page/page size in the URL and browser history.
- [x] Distinguish loading, no Check-Ins, out-of-range page, failures and expired access, with useful recovery.
- [x] Add Registration-module database tests and pure Check-In Activity View tests at the spec's seams. Run required checks before commit; do not change Check-In writes or Event Pass values.
