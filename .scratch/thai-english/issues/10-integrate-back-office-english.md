# 10: Merge the English Back Office into main

**What to build:** The integration branch `back-office-english` (tickets 06–09) reaches `main` in one merge, only if all of it is done by 28 October 2026. Otherwise it waits until after the Event (the Back Office is frozen 29 October – 1 November) and nothing half-translated ships.
- Bring `main` into the branch, resolve conflicts with the public tickets, and check the whole Back Office once.

See the spec ("Deadline").

**Blocked by:** 06, 07, 08, 09

**Status:** ready-for-agent

- [ ] Every Back Office page has no Thai left, apart from Attendee-entered data and the Kiosk's Attendee-facing screens.
- [ ] typecheck, lint, test and build pass on the merged branch.
- [ ] The hand-off records one combined check against `next start` across every Back Office page and the Kiosk, and the CSV opened.
- [ ] Merged into `main` with `--no-ff` by 28 October, or this ticket records why it moved after the Event.
