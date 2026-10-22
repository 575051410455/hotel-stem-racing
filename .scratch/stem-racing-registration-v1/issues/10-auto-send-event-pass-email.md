# 10: Auto-send Event Pass email on registration

**What to build:** When SMTP is configured, every accepted Registration triggers an Event Pass email to the Attendee after it is saved. A send failure never fails the Registration; it is recorded as unsent. Each Registration tracks how many times its pass was emailed and when last.

**Blocked by:** 02, 05

**Status:** resolved

- [x] The composition root wires the SMTP sender only when SMTP variables are present; otherwise the no-op sender is used
- [x] An accepted Registration sends one Event Pass email after the Registration is saved
- [x] A failed send leaves the Registration accepted with sent count 0. A successful send increments the sent count and sets the last-sent time.
- [x] Integration tests with a fake sender cover success, failure and the unconfigured case

## Answer

Done in commit "feat(email): auto-send Event Pass on registration". Files: `src/lib/registrations/send-event-pass.ts` (new), `event-pass-email-on-registration.test.ts` (new, 6 tests), small edits to `registrations.ts` and `src/lib/server/registrations.ts`. `actions.ts` and `next.config.ts` are unchanged.

### The shared helper (for 06, 16 and 17)
```ts
// src/lib/registrations/send-event-pass.ts
sendEventPassEmail(
  deps: EventPassEmailDependencies, // { db; emailSender; clock; appUrl?: string }
  recipient: EventPassEmailRecipient, // EventPass & { email: string }
): Promise<EventPassEmailOutcome> // { sent: true } | { sent: false; error: string }

eventPassEmailColumns // drizzle select map for an EventPassEmailRecipient
```
- It takes a row, not an id, so it never re-reads the database. Select `eventPassEmailColumns` (spread in `id` for a bulk cursor) and pass the row. Extra fields such as `id` are ignored, and only the five Event Pass fields reach the email.
- The result is recorded by `token`. A sent email increments `email_sent_count` and sets `last_email_sent_at = clock()`. A failed one writes nothing, so the count stays as it was (0 means unsent).
- It never throws: a missing APP_URL, a sender that throws, `{ success: false }` and a failed bookkeeping update are all logged by Pass Code (never the token or the email). If the email went out but the update failed, the result is still `sent: true`.
- When `emailSender.configured` is false, nothing is attempted or logged, and the result is `{ sent: false, error: "Email is not configured" }`. 06 and 16 should check `configured` first to show contact channels.
- Inside `createRegistrations`, pass `deps` straight in: the merged dependencies already fit `EventPassEmailDependencies`. 16 and 17 can add module methods that call it, so they reuse the sender built in the composition root.
- `error` is the sender's English string (`"EAUTH: …"`, `"ESOCKET: …"`). 16 maps it to Thai.

### Timing: `afterResponse`, an injected scheduler
- `RegistrationDependencies` gains two optional fields:
  - `appUrl?: string`
  - `afterResponse?: (task) => void | Promise<void>`
- `submit` saves, then runs `await deps.afterResponse(() => sendEventPassEmail(...))`.
- The default runs the task inline, so `submit` resolves after the send has been recorded. Tests and scripts need no plumbing.
- The composition root passes `(task) => after(task)` from `next/server`, so the email goes out after the 303 to `/p/{token}` has been sent. Measured: 47 ms redirect, row stamped 36 ms later. With SMTP down, the redirect took 4 ms and the row kept count 0.
- 06 can reuse `deps.afterResponse` for the duplicate re-send.
- **Caveat:** `after()` throws outside a request scope. Anything that calls `registrations().submit` outside a request (a script, say) must build its own `createRegistrations` without `afterResponse`.

### Composition root
`createSmtpEmailSender(process.env)` and `process.env.APP_URL` are read inside `registrations()`, the existing lazy `globalThis` singleton: on first use, never at import, and with one SMTP pool. With `SMTP_USER` empty, the factory returns `unconfiguredEmailSender`.

### Tests
- The tests sit at the Registration-module seam, using a fake sender, a fake clock and a fixed `appUrl`. They cover:
  - success (count 1 plus the time)
  - the message: recipient, link and pass
  - a failed send
  - a sender that throws, or a missing APP_URL
  - SMTP not configured
  - deferred sending through `afterResponse`
- No public read of the email status exists yet, so the tests read `email_sent_count` and `last_email_sent_at` from the table through a small `emailStatus(token)` helper. 16 can switch them to its status read.

### Verified
- typecheck, lint, test (62) and build all pass. The build also passes from a clean `.next` with `.env` moved aside.
- Turbopack bundles nodemailer and qrcode without warnings, so `serverExternalPackages` was not needed. The standalone trace adds only `public/brand/banner-email.jpg`.
- Real sends to a local SMTP sink worked with both `next start` and `.next/standalone/server.js`, using no-JS action POSTs. The MIME has text, HTML, the QR PNG and the banner, and the link appears in the body.
