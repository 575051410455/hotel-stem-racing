# 22: Consolidate helpers duplicated across tickets

**What to build:** No behaviour change. Shared Back Office and domain helpers live in one place each, so a label or rule changes in one edit. Found by the full-build standards review.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] One sign-in path constant (`/admin/login`), currently defined in 7 files, in a module that isn't server-only
- [ ] One set of Thai label maps for Attendee Role (including the short "อื่น ๆ"), Referral Source and Event Day, used by the counts panel, check-in, Kiosk, the detail page, the CSV and the Event Pass card
- [ ] One Bangkok date/time formatting helper. `event-day-availability`, `csv`, `check-in-result` and the email currently each have their own.
- [ ] One Registration-id parser for the detail, resend and delete paths
- [ ] Shared Back Office route-handler helpers: the no-store header, the 401 guard, the zod 400 response, and `rejectUnlessSameOrigin` for every mutating route
- [ ] Check-In status presentation (tone and copy) shared by the desk and the Kiosk instead of two switches
- [ ] All existing tests still pass with no test changes beyond imports
- [ ] Do this after the Event unless a bug forces it earlier
