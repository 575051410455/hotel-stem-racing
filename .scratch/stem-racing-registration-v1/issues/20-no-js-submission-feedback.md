# 20: Show submission results without JavaScript

**What to build:** An Attendee whose browser has JavaScript turned off submits the form and sees the outcome: field errors, Duplicate Registration, closed, bot check failed or rate-limited. Right now nothing appears and the form comes back empty. This regressed when ticket 07 started streaming the form under `<Suspense>`: the Server Action's returned state only shows after hydration. Found by tickets 06 and 08.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] With JavaScript disabled, each non-accepted outcome is visible after submitting, and the Attendee's input is kept
- [ ] An accepted submission still lands on the Event Pass page
- [ ] With JavaScript enabled, the behaviour is unchanged
- [ ] Nearly every phone runs JavaScript, so weigh the fix against the risk of touching the public page close to the Event
