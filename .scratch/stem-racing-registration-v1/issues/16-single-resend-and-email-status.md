# 16: Single resend and email status

**What to build:** Staff can see in the list whether each Attendee's Event Pass email was sent, and how many times. They can resend one Attendee's pass, for example while helping someone on the phone.

**Blocked by:** 10, 11

**Status:** ready-for-agent

- [ ] The list and detail view show the sent count and the last-sent time
- [ ] A resend action sends through the email-sender port and updates the status. Failures are shown in Thai and never crash the page.
- [ ] Integration tests cover a successful and a failed resend
