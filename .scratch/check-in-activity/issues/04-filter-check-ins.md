# 04: Filter Check-Ins by Attendee Role and recording Account

**What to build:** Staff using an Admin Account can narrow the selected day's Check-In history by Attendee Role, recording Account and outside-registered-day status, individually or together.

**Blocked by:** 01: Browse recorded Check-Ins for one Event Day.

**Status:** ready-for-agent

- [x] Provide All roles plus configured Attendee Roles, All Accounts plus recording Accounts, and All/within/outside registered day controls.
- [x] Use stable Account identifiers; retain disabled Accounts with recorded Check-Ins in choices. Do not discard rows with missing attribution from the unfiltered history.
- [x] Apply filters together in the database and with text search when present. Filtering must work before the search slice is implemented.
- [x] Preserve filters in the URL; changes reset page one. Clear filters removes all table predicates while retaining Event Day and page size.
- [x] Filters affect only table rows and matching total, never the selected-day overview when present.
- [x] Verify individual/combined filters and stable pagination with real-database tests, pure URL tests and browser acceptance.
