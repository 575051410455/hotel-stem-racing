# 02: See the selected Event Day's Check-In overview

**What to build:** Staff using an Admin Account can see the expected, arrived, awaiting, outside-registered-day and total Check-In counts above the selected day's history.

**Blocked by:** 01: Browse recorded Check-Ins for one Event Day.

**Status:** ready-for-agent

- [x] Show registered, registered-and-checked-in, awaiting Check-In, outside-registered-day and total Check-In counts for the selected Event Day.
- [x] Count two-day Registrations once in each selected day and repeat Check-Ins only once; deleted Registrations and their Check-Ins disappear consistently.
- [x] Show zeros for empty data. Clearly label that overview counts cover the entire selected Event Day.
- [x] Include the overview in the authenticated response and render accessible cards in the page; table filters never narrow these counts.
- [x] Verify worked examples through the Registration module with a real isolated database, including outside arrivals and a recorded timestamp on another date.
