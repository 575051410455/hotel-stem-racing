# 17: Bulk send Event Pass emails

**What to build:** Staff can send Event Pass emails to everyone, or only to Attendees whose pass was never sent. A summary per Event Day appears before sending, and sending proceeds in batches of 25 with visible progress so no request hits the proxy timeout.

**Blocked by:** 04, 10

**Status:** ready-for-agent

- [ ] Modes `all` and `unsent` (sent count 0)
- [ ] A confirmation summary shows how many emails will go out per Event Day before anything is sent
- [ ] Each request sends up to 25 messages one at a time and returns results plus a cursor. The client requests the next batch until done, showing progress and failures.
- [ ] Integration tests cover batch size, cursor continuation, `unsent` filtering and the recorded results
