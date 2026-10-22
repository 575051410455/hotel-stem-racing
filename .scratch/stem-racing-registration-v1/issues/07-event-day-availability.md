# 07: Event Day availability

**What to build:** An Event Day can be chosen until it ends (end of day, Bangkok time), so same-day walk-ins can register. Days that have ended disappear from the form. Once the last Event Day has ended, `/` shows that registration is closed instead of the form. The server enforces the same rules.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The form lists only Event Days that have not ended in Asia/Bangkok
- [ ] After the last Event Day ends, `/` shows a closed message with the organisers' contact channels
- [ ] The server rejects ended Event Days and returns "registration closed" after the last day, using the injected clock
- [ ] Integration tests with a fake clock cover: before the Event, the morning of 31 Oct, after 31 Oct ends, and after 1 Nov ends
