# 17: Bulk send Event Pass emails

**What to build:** Staff can send Event Pass emails to everyone, or only to Attendees whose pass was never sent. A summary per Event Day appears before sending, and sending proceeds in batches of 25 with visible progress so no request hits the proxy timeout.

**Blocked by:** 04, 10

**Status:** ready-for-agent

- [ ] Modes `all` and `unsent` (sent count 0)
- [ ] A confirmation summary shows how many emails will go out per Event Day before anything is sent
- [ ] Each request sends up to 25 messages one at a time and returns results plus a cursor. The client requests the next batch until done, showing progress and failures.
- [ ] Every request finishes well under Cloudflare's 100-second proxy limit (found in ticket 03): cap each batch by elapsed time (stop starting new sends after about 60s) as well as by the 25-message count, and return the cursor so the client continues
- [ ] Integration tests cover batch size, cursor continuation, `unsent` filtering and the recorded results
