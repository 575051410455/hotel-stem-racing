# 10: Auto-send Event Pass email on registration

**What to build:** When SMTP is configured, every accepted Registration triggers an Event Pass email to the Attendee after it is saved. A send failure never fails the Registration; it is recorded as unsent. Each Registration tracks how many times its pass was emailed and when last.

**Blocked by:** 02, 05

**Status:** ready-for-agent

- [ ] The composition root wires the SMTP sender only when SMTP variables are present; otherwise the no-op sender is used
- [ ] An accepted Registration sends one Event Pass email after the Registration is saved
- [ ] A failed send leaves the Registration accepted with sent count 0. A successful send increments the sent count and sets the last-sent time.
- [ ] Integration tests with a fake sender cover success, failure and the unconfigured case
