# 13: Check-In by Pass Code

**What to build:** Staff at the entrance open `/admin/check-in`, type or paste an Event Pass (Pass Code, token or link) and get an immediate result under the Check-In rules. This is the tracer bullet for Check-In before the camera arrives.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] Scan resolution accepts:
  - a bare token
  - a Pass Code in any case, with or without spaces or hyphens
  - a link whose last two path segments identify the pass, on any host
- [ ] A first Check-In for today records the time and the signed-in Staff Account and shows success
- [ ] A repeat on the same Event Day records nothing and shows amber "เช็คอินแล้วเมื่อ HH:MM"
- [ ] A Check-In on an Event Day the Attendee didn't choose is recorded, flagged and shown as a warning
- [ ] Text that isn't an Event Pass shows "not an Event Pass" and records nothing
- [ ] Unit tests cover scan resolution. Integration tests cover every Check-In outcome, using a fake clock for the Event Day.
