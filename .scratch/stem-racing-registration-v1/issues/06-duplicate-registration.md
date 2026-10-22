# 06: Duplicate Registration

**What to build:** When someone submits the form again for the same person (same given name, family name and phone), no second Registration is created. They are told "ท่านลงทะเบียนแล้ว", and their existing Event Pass is re-sent to the registered email, which is shown masked. The pass itself is never shown on screen. Family members sharing a parent's email or phone can still register separately.

**Blocked by:** 02

**Status:** resolved

- [x] The Duplicate Registration key (trimmed, case-folded given and family name + E.164 phone) is detected and backed by the database constraint, including when two submissions race
- [x] A duplicate response shows the masked email (e.g. j***@gmail.com) and never the token, the Pass Code or a link to the pass
- [x] Re-send goes through the email-sender port at most once per 10 minutes per Registration. When email is not configured, the organisers' contact channels are shown instead.
- [x] The same email or phone with a different name is accepted as a new Registration
- [x] Integration tests cover each of the above with a fake email sender and a fake clock

## Answer

Done in commit "feat(registration): Duplicate Registration …", on top of main with 10, 07 and 09 merged.

### Files
- `src/lib/registrations/duplicates.ts`: `respondToDuplicate`, `maskEmail`, `RESEND_INTERVAL_MS`, `DuplicateResult`.
- `src/lib/registrations/duplicates.test.ts`: 8 Registration-module integration tests against a real database, with a fake email sender and a fake clock.
- `src/components/registration/DuplicateRegistrationNotice.tsx`: the card shown in place of the form.
- Small edits to `registrations.ts` (union member, `save`, one line in `submit`) and `RegistrationForm.tsx` (5 lines). `actions.ts` is unchanged: it already returns every non-accepted result to the form.

### Interface
```ts
type SubmitResult =
  | { status: "accepted"; pass: EventPass }
  | { status: "invalid"; fieldErrors: FieldErrors }
  | { status: "duplicate"; maskedEmail: string; passResent: boolean; emailConfigured: boolean }
  | { status: "closed" };

respondToDuplicate(deps: EventPassEmailDependencies, duplicateKey: string): Promise<DuplicateResult>
maskEmail(email: string): string      // "john.smith@gmail.com" → "j***@gmail.com"
RESEND_INTERVAL_MS = 600_000
```
- `emailConfigured` was added beside `passResent`. The form needs it to tell "SMTP is off" (show contact channels) from "throttled or failed" (check your inbox).
- `maskedEmail` is always the **registered** email. The address typed in the repeat is ignored, so a repeat can't redirect someone's pass.

### How it works
- **Detection is insert-first.** `save()` inserts; `registrations_duplicateKey_unique` makes it resolve to `undefined`, and `submit` calls `respondToDuplicate`. There is no pre-check, so a race and an ordinary repeat take the same path, and the database decides.
  - If the row vanishes between the violation and the lookup (a Staff delete), `respondToDuplicate` throws. That is very rare, and the next submit is accepted.
- **Re-send** reuses 10's `sendEventPassEmail` and `eventPassEmailColumns` from `send-event-pass.ts`, and is awaited, so "เราได้ส่ง… อีกครั้ง" is true when shown.
  - **Throttle is atomic.** A conditional `UPDATE … SET last_email_sent_at = now WHERE id = ? AND (last_email_sent_at IS NULL OR last_email_sent_at <= now − 10 min)` claims the slot, so racing repeats send one email between them. That is tested with three concurrent repeats.
  - On a failed send the previous value is restored (`WHERE last_email_sent_at = now`). Nothing is recorded, and the Attendee can retry at once. Every failure, including a DB error, gives `passResent: false` and never throws.
  - The email sent on registering (10) also starts the window, so a repeat right after registering says "check your inbox".

### UI
- Like 07's `closed`, the `duplicate` result replaces the form with a card ("ท่านลงทะเบียนแล้ว"), focused for screen readers. It has three variants:
  - **re-sent:** "เราได้ส่ง Event Pass ไปที่ {masked} อีกครั้ง" plus a spam-folder hint
  - **throttled or failed:** check the inbox of {masked}, then the contact channels as a fallback when any are configured
  - **email off:** "ท่านลงทะเบียนไว้ด้วยอีเมล {masked}" plus the contact channels
- "ลงทะเบียนให้ผู้อื่น" is a plain `<a href="/">` (with an eslint-disable). A `<Link>` to the same route would keep the action state and leave the card up.

### Notes for 16 (single resend, email status)
- Staff resend is not throttled: call `sendEventPassEmail(deps, row)` directly, with `row` selected by `eventPassEmailColumns`.
- Derive "sent" from `email_sent_count > 0`, not from `last_email_sent_at`. While a duplicate re-send is in flight (up to about 30s of SMTP), `last_email_sent_at` holds the claim time with the count unchanged. A failure puts it back.

### Notes for 17 (bulk send)
- Use `sendEventPassEmail` per row. "Unsent" is `email_sent_count = 0` (spec), which is unaffected by the claim above.
- Every successful send (bulk, resend or registration) sets `last_email_sent_at`, so it also restarts the 10-minute duplicate window. That is intended.

### Notes for 10 (already merged)
- 10's helper is reused unchanged. My own draft helper was dropped in the merge. `respondToDuplicate` takes the same `deps` as `sendEventPassEmail` (`db`, `emailSender`, `clock`, `appUrl`).

### Found while smoke-testing (not fixed here: 07's page)
- Since 07 moved the form under `<Suspense>` + `connection()` (PPR), a **no-JS** POST no longer renders the action's result. The state is in the flight data, but the streamed HTML shows an idle form, for `invalid` and `closed` as well as `duplicate`. With JS it works.
- Before the 07 merge, the no-JS duplicate card rendered correctly.

### Verification
- `npm run typecheck`, `npm run lint`, `npm test` (91 tests) and `npm run build` all pass.
- Smoke test on `next start -p 3106` with dev database `stem_racing_t06` and a local SMTP sink, through the real SMTP sender:
  - Registering sent one email, counted 1.
  - An immediate repeat with another email gave the throttled card with `j***@gmail.com` and no email.
  - After ageing `last_email_sent_at` by 11 minutes, a repeat gave `passResent: true`: an email to the **registered** address, counted 2. There was still one row.
  - The responses contain no token and no Pass Code.
- In Chrome with JS:
  - The card replaced the form and took focus.
  - There was no horizontal scroll at 320px (checked in a 320px iframe, since the window couldn't be resized).
  - "ลงทะเบียนให้ผู้อื่น" brought back an empty form.
  - No console errors.
