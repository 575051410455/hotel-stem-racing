# 17: Bulk send Event Pass emails

**What to build:** Staff can send Event Pass emails to everyone, or only to Attendees whose pass was never sent. A summary per Event Day appears before sending, and sending proceeds in batches of 25 with visible progress so no request hits the proxy timeout.

**Blocked by:** 04, 10

**Status:** resolved

- [x] Modes `all` and `unsent` (sent count 0)
- [x] A confirmation summary shows how many emails will go out per Event Day before anything is sent
- [x] Each request sends up to 25 messages one at a time and returns results plus a cursor. The client requests the next batch until done, showing progress and failures.
- [x] Every request finishes well under Cloudflare's 100-second proxy limit (found in ticket 03): cap each batch by elapsed time (stop starting new sends after about 60s) as well as by the 25-message count, and return the cursor so the client continues
- [x] Integration tests cover batch size, cursor continuation, `unsent` filtering and the recorded results

## Answer

Done in commit "feat(email): bulk send Event Pass emails …", on top of main with 15 and 16 merged.

### Registration module

New files: `src/lib/registrations/bulk-send.ts` (logic), `bulk-send-params.ts` (pure: modes and the endpoints' zod schemas), `bulk-send.test.ts`. `registrations.ts` gains two lines in `createRegistrations`:

```ts
registrations.bulkSendSummary(mode: BulkSendMode): Promise<BulkSendSummary>
registrations.sendEventPassBatch(request: EventPassBatchRequest): Promise<EventPassBatchResult>

type BulkSendMode = "all" | "unsent";            // unsent = email_sent_count = 0
type BulkSendSummary = {
  mode; emailConfigured: boolean;
  emails: number;                                // one per Registration
  eventDays: { eventDay; registrations }[];      // per Event Day; a two-day Registration is on both
  throughId: number | null;                      // highest id included; null when nothing to send
};
type EventPassBatchRequest = { mode; afterId: number; throughId?: number; maxMessages?: number; timeBudgetMs?: number };
type EventPassBatchResult =
  | { status: "email-not-configured" }           // nothing looked at or sent
  | { status: "processed"; results: BulkSendMessageResult[]; nextAfterId: number; done: boolean };
type BulkSendMessageResult = { id; passCode; givenName; familyName; email }
  & ({ status: "sent" } | { status: "failed"; reason: string });   // reason: the sender's English error
```

- The summary is one SQL statement, so the total, the days and `throughId` describe the same rows.
- A batch selects `id > afterId` (and `id <= throughId`, in mode) by id, with one extra row to compute `done`. It sends one at a time through 10's `sendEventPassEmail`, which records each sent email. A failed send is a result, and the batch goes on.
- Limits: `MAX_BATCH_MESSAGES = 25` (a larger `maxMessages` is capped) and `BATCH_TIME_BUDGET_MS = 60_000`. No new send starts once the clock says the batch has run longer than the budget. The first send always goes, so every batch moves the cursor and the client loop can't spin.

### Endpoints (Route Handlers, Staff only)

- `GET /api/back-office/bulk-send/summary?mode=all|unsent` → `BulkSendSummary`.
- `POST /api/back-office/bulk-send/batch` with JSON `{ mode, afterId, throughId? }` → `EventPassBatchResult`.
- Both send `401 {"error":"unauthorized"}` when signed out and `400 invalid-params` for a bad mode or id, with `Cache-Control: private, no-store`.
- The POST also sends `415` unless the body is `application/json` (a cross-site form can't send that; the session cookie is `SameSite=Lax`), and `400 invalid-json`.
- The batch size and budget aren't accepted from the client (zod drops unknown keys). Measured: a request asking for `maxMessages: 1000, timeBudgetMs: 999999` still stopped at 60.4 s.

### UI: `/admin/email` ("ส่งอีเมล" in the header nav)

- Files: `src/app/admin/(back-office)/email/{page.tsx, bulk-send.tsx, bulk-send-api.ts}`, plus one `<Link>` in the `(back-office)` layout.
- The flow:
  - Choose the mode. The default is `unsent`, which can't duplicate.
  - Read the summary: the total ("1 ฉบับต่อผู้ลงทะเบียน 1 คน") and the count per Event Day, labelled "ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน แต่ได้รับอีเมลฉบับเดียว".
  - Click "ส่งอีเมล N ฉบับ…", then confirm in an in-page box. Focus moves to its heading, and in `all` mode it warns about repeats and the Gmail daily quotas.
  - Batches then loop until `done`. The page shows a progress bar (`role="progressbar"`), sent and failed counts in a polite live region, and the failure list: Pass Code, name, email, 16's Thai `sendFailureMessage` and the raw error.
- The mode and the confirmed numbers are locked during a run. The confirmed `throughId` bounds the send, so Registrations made after the summary are left out, and the progress total stays true.
- Stop takes effect after the batch in flight ("กำลังหยุดเมื่อจบชุดนี้…"). The fetch isn't aborted, because the server finishes the batch anyway and its cursor is needed. Resume ("ส่งต่อ") continues from the cursor. "ยกเลิกส่วนที่เหลือ" discards the run.
- Leaving the page stops the loop after the batch in flight.
- One loop at a time: a ref guards `sendBatches`. Two synchronous clicks on confirm sent exactly one request.
- The run also pauses, with a Thai reason, when:
  - every message in a batch failed and more remain (SMTP down or over quota), so the run doesn't burn through the list
  - a request fails
  - the session expires (401)
  - email isn't configured
- Stop sits in the panel header, away from Resume and the confirm button. In the smoke test, a double click on Resume landed its second click on Stop, which had replaced Resume in the same spot.
- When a run ends, it invalidates the summary and 11's `registrationListKey`, so 16's email status column refreshes.

### Small edit to 16's code

`sendFailureMessage` (in `_registration-list/event-pass-email.tsx`) now checks for Gmail's daily limit before its switch: "550 5.4.5 Daily user sending limit exceeded" arrives as `EENVELOPE`, and would otherwise read as a bad address. The bulk send uses this function instead of a second mapping.

### Decisions and limits

- **Time budget:** `>` per the decision, so a batch whose clock reads exactly 60 s still starts one more send. Worst case: 60 s, plus one send to a hung SMTP server (05's socket timeout is 30 s), so about 90 s. Typical: 25 sends at about 1 s each, about 25 s. To tighten it, lower `BATCH_TIME_BUDGET_MS`.
- **A lost response** (network drop, or a 524 if the worst case is ever exceeded) pauses the run with "request-failed". In `unsent` mode Resume is safe. In `all` mode it can resend up to one batch (≤ 25) that the server had already sent.
- **The guard is per page.** Two Staff, or two tabs, can still run sends at once; nothing on the server locks.
- **No persistence:** a run lives in the page. Reloading loses its cursor. For `unsent`, just start again. For `all`, there is no "continue from yesterday" after a quota stop. This is a possible follow-up (store the cursor in `localStorage`).
- **Concurrent inserts:** identity ids are assigned before commit, so a Registration committing late with an id below the cursor or `throughId` is skipped. That's harmless: it got its own email on registering.

### Verification

- Tests: `bulk-send.test.ts`, 11 Registration-module integration tests against a real database, with a fake sender, a controllable fake clock that advances per send, and a fixed start time. They cover:
  - summary counts for `all` and `unsent` (per day, and a two-day Registration once in the total)
  - the empty summary
  - the 25 cap (also when asked for 100)
  - cursor continuation over 60 Registrations (25 / 25 / 10, each exactly once, then an empty `done` batch)
  - `unsent` skipping already-sent Registrations
  - the time budget (25 s sends: 3 per batch, with the cursor carried on)
  - at least one send with the budget spent
  - failures recorded without stopping, and left unsent
  - unconfigured email
  - the `throughId` bound
- Mutation-checked: always `done`, no `unsent` filter, no 25 cap and no budget each fail tests.
- `npm run typecheck`, `npm run lint`, `npm test` (167) and `npm run build` pass, also from a clean `.next` with `.env` moved aside. `/admin/email` is partially prerendered.
- Smoke test on `next start -p 3117` (127.0.0.1) against `stem_racing_t17`, with 60 Registrations (10 already sent, 3 with addresses the sink rejects) and a local SMTP sink through the real SMTP sender:
  - Signed out: both endpoints return 401 JSON, and `/admin/email` returns 307.
  - Signed in: the summaries were 50 unsent (30 + 30) and 60 all (40 + 40). 415 and 400 work as described.
  - Sink at 3 s per message: Stop was pressed during the first batch. The batch ended on the budget after 21 tries (20 sent, 1 bounce), then the run paused at 21/50. Resume carried on.
  - `all` run with the sink at 0.5 s: Stop paused after a full batch at 25/60. A double click on Resume (after the fix) kept it running to 60/60: 57 sent, 3 failed with Thai reasons. The sink got 57 distinct recipients, with no repeats. The database showed counts 0 ×3, 1 ×4 and 2 ×53, as expected.
  - Sink stopped (SMTP outage): 25 `ESOCKET` failures in about 1 s, then the run paused with "อีเมลในชุดล่าสุดส่งไม่สำเร็จทั้งหมด…" instead of running through all 60.
  - At 390 and 320 px there was no horizontal scroll, and there were no console messages.
- The sink and seed scripts lived in the session scratchpad and are not committed. The server and sink were stopped and the database dropped afterwards.
