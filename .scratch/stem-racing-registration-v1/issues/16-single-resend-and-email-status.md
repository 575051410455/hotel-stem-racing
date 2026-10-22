# 16: Single resend and email status

**What to build:** Staff can see in the list whether each Attendee's Event Pass email was sent, and how many times. They can resend one Attendee's pass, for example while helping someone on the phone.

**Blocked by:** 10, 11

**Status:** resolved

- [x] The list and detail view show the sent count and the last-sent time (list done here. The detail view is ticket 14's page, built in parallel, so it reuses the components below once both are merged.)
- [x] A resend action sends through the email-sender port and updates the status. Failures are shown in Thai and never crash the page.
- [x] Integration tests cover a successful and a failed resend

## Answer

Done in commit "feat(back-office): email status and single resend …". No new dependencies, and no schema change: `email_sent_count` and `last_email_sent_at` already exist (ticket 10).

### Files

- New:
  - `src/lib/registrations/resend-event-pass.ts`: `createResendEventPass(deps)` and `ResendEventPassResult`.
  - `src/lib/registrations/resend-event-pass.test.ts`: 5 Registration-module integration tests.
  - `src/app/api/back-office/registrations/[id]/resend/route.ts`: the endpoint.
  - `src/app/admin/(back-office)/_registration-list/event-pass-email.tsx`: the status, the resend action and the Thai messages.
- Small edits to shared files:
  - `search.ts`: two fields on `RegistrationListRow` and `listColumns`.
  - `registrations.ts`: one import, plus `resendEventPass` on the module.
  - `query.ts`: `RegistrationListItem` gets `lastEmailSentAt` as an ISO string.
  - `columns.tsx`: one import, plus one column after "อีเมล".

### Registration module

```ts
registrations.resendEventPass(id: number): Promise<ResendEventPassResult>

type ResendEventPassResult =
  | { status: "sent" }                     // count + 1, last-sent time = clock()
  | { status: "failed"; reason: string }   // nothing recorded; reason = sender's English error
  | { status: "email-not-configured" }     // SMTP_USER empty; nothing attempted
  | { status: "not-found" };               // no Registration with this id (e.g. deleted)
```

- It looks the Registration up by id with `eventPassEmailColumns`, then calls ticket 10's `sendEventPassEmail`, which sends and records the result. It is not throttled: ticket 06's 10-minute window applies only to Duplicate Registration repeats. A Staff resend still restarts that window, as every send does (06's note).
- Order: id check, lookup (`not-found`), then `emailSender.configured` (`email-not-configured`), then the send.
- **It never throws.**
  - An id that isn't a safe integer from 1 to 2^31 − 1 is `not-found` without a query. Postgres would otherwise throw "out of range for type integer".
  - A database error on the lookup is logged and comes back as `failed` with `reason: "Registration could not be read"`. Mutation-checked: widening the id guard made the lookup hit Postgres, and the test caught the `failed` result.
- **Search rows** now carry `emailSentCount: number` and `lastEmailSentAt: Date | null`. Following ticket 06, "sent" means `emailSentCount > 0`: a Duplicate Registration re-send in flight sets the time before the count.

### Endpoint

`POST /api/back-office/registrations/{id}/resend` (Route Handler, not a Server Action):

- Signed out: `401 {"error":"unauthorized"}`.
- `404 {"status":"not-found"}`, also for an id that isn't digits (`abc`, `0`, `99999999999`).
- Otherwise `200` with the result as JSON. A failed send is also 200 on purpose: nginx or Cloudflare could replace a 5xx body with their own error page, and the Back Office would lose the reason.
- Every response sends `Cache-Control: private, no-store`. `GET` returns 405.
- CSRF: the Better Auth cookie is `SameSite=Lax`, so a cross-site POST arrives signed out. There is no separate Origin check.
- **Merge note:** the dynamic segment is `[id]`. If ticket 14 adds a route under `src/app/api/back-office/registrations/` with a different segment name (say `[registrationId]`), Next refuses to build with two slug names at one level. Rename one of them.

### UI (list column "อีเมล Event Pass")

- The status shows "ส่งแล้ว N ครั้ง" with "ล่าสุด 23 ต.ค. 2569 06:27" (Bangkok, the same format as "ลงทะเบียนเมื่อ"), or "ยังไม่ได้ส่ง".
- Under it is "ส่งอีกครั้ง". Clicking it swaps in an in-page confirmation, "ส่ง Event Pass ไปที่ {registered email} อีกครั้ง?", with ส่ง and ยกเลิก buttons. Focus moves to ส่ง; Escape or ยกเลิก cancels and returns focus. There is no browser dialog.
- While sending, the button is disabled and reads "กำลังส่ง…".
- Results are shown inline under the button, as `role="status"` for success and `role="alert"` for everything else:
  - **sent:** "ส่ง Event Pass แล้ว", and `invalidateQueries({ queryKey: registrationListKey })` refreshes the row's count and time. Counts (12) don't change, so there is no `router.refresh()`.
  - **failed:** `sendFailureMessage(reason)` gives Thai text by nodemailer code, with the code kept for the operator. For example: "ส่งไม่สำเร็จ: เชื่อมต่อเซิร์ฟเวอร์อีเมลไม่ได้ ลองอีกครั้งภายหลัง (ESOCKET)". It covers EAUTH, connection, timeout and TLS errors, rejected recipients and a missing APP_URL, with a generic fallback.
  - **email-not-configured:** "ส่งไม่ได้ เพราะยังไม่ได้ตั้งค่าการส่งอีเมล (SMTP)".
  - **not-found:** "ไม่พบการลงทะเบียนนี้ อาจถูกลบไปแล้ว". The row stays until the next refresh, so the message doesn't vanish with it.
  - **401:** "หมดเวลาการเข้าสู่ระบบ" with a sign-in link.
  - A network error or unexpected body: "ส่งไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง".
  - `requestResend` catches everything, so nothing reaches React as an error.

### Choices and deviations

- **One column, not two.** Status, time and action share one cell, placed right after "อีเมล". Keeping the action in that cell avoids a second `actions` column next to ticket 14's row link, and keeps my `columns.tsx` hunk away from the end of the array, where 14 is likely to append.
- The action is labelled "ส่งอีกครั้ง" even on unsent rows, as decided. An email was already attempted on registering.
- **Detail view:** it doesn't exist on this branch (ticket 14). For it, import `EventPassEmailStatus` (`{ emailSentCount, lastEmailSentAt: string | null }`) and `ResendEventPass` (`{ registrationId, email }`) from `_registration-list/event-pass-email.tsx`. `ResendEventPass` invalidates `registrationListKey`. If 14's detail page has its own query key, invalidate that too, or put it under `registrationListKey`.
- **For ticket 17:** `sendFailureMessage(reason)` is exported for Thai bulk-send failures.

### Verification

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass, including the build from a clean `.next` with `.env` moved aside. The new route is dynamic (ƒ), and `/admin` is still partially prerendered.
- Tests (TDD, one red→green at a time, fixed fake clocks):
  - search rows carry the status
  - a successful resend (to the registered address, count 1→2, time = clock)
  - a failed resend (reason reported, status unchanged)
  - unconfigured (nothing sent)
  - not-found (a missing id, plus 0, −1, 1.5, NaN and 2^31)
- Smoke test with `next start -p 3116`, database `stem_racing_t16`, a local SMTP sink and the real SMTP sender:
  - curl: 401 signed out. A signed-in resend gave `{"status":"sent"}`; the sink got the email to the registered address with the `/p/{token}` link, and the list showed count 1 with the time. 404 for 999, `abc` and `99999999999`; 405 for GET.
  - Chrome on `t16.localhost:3116`. A separate host name keeps the cookie apart from other agents' `127.0.0.1` servers; ticket 11's shared-jar gotcha also hits `127.0.0.1` across ports. Checked there:
    - the column on seeded rows, with Bangkok times
    - confirm, then send: the row refreshed to "ส่งแล้ว 1 ครั้ง" with a green status
    - with the sink stopped: the Thai ESOCKET alert, and the database unchanged. The server log names only the Pass Code.
    - with SMTP_USER empty: the "not configured" alert
    - a Registration deleted behind the page: the "not found" alert
    - signed out mid-page: the session alert with a link
    - Escape returns focus
    - no console messages, and no page-level horizontal scroll
