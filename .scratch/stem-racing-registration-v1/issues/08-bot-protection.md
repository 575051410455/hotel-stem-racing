# 08: Bot protection

**What to build:** The public form is protected by Cloudflare Turnstile and a per-IP submission rate limit. Real Attendees barely notice either, and bots and floods are turned away with a clear Thai message.

**Blocked by:** 02

**Status:** resolved

- [x] The Turnstile widget renders on the form using the public site key. With the test keys from `.env.example` it works locally.
- [x] The server verifies the Turnstile token through the bot-check verifier port before accepting a Registration. A failure returns a Thai message and saves nothing.
- [x] An in-memory per-IP limit applies to submissions, keyed on the client IP restored by nginx from Cloudflare's header. Exceeding it returns a Thai "try again later" message.
- [x] Tests cover a verifier failure rejecting the submission and the rate limit tripping after the threshold

## Answer

Done in commit "feat(registration): bot protection …". Notes for downstream tickets.

### Modules and names
- **Submit interface:** `registrations.submit(form, context?)`.
  - `context` is `SubmissionContext = { botCheckToken?: string; remoteIp?: string }`, from `src/lib/registrations/bot-protection.ts`.
  - Two new `SubmitResult` members sit at the end of the union: `{ status: "bot-check-failed" }` and `{ status: "rate-limited" }`.
- **Order of checks in `submit`:** closed (07) → bot check → rate limit → Field validation → save / duplicate (06).
  - The bot check comes before the rate limit, so only verified submissions use up an IP's allowance. Bots on a shared IP (venue Wi-Fi, mobile carrier NAT) can't lock real Attendees out.
  - The cost of that order is one siteverify call per junk token. Missing tokens never reach Cloudflare.
  - Every verified submission counts against the limit, including ones that turn out invalid or duplicate. A rate-limited one does not count, so retrying never extends the wait.
  - This also caps how often one IP can trigger 06's duplicate re-send.
- **Rate limiter:** `src/lib/registrations/bot-protection.ts`.
  - `createInMemoryRateLimiter({ limit, windowMs })` is a sliding window. It sweeps keys that have gone quiet once per window, so memory stays bounded.
  - `SUBMISSIONS_PER_WINDOW = 10` and `SUBMISSION_WINDOW_MINUTES = 10`. The form's copy reads the minutes from there.
  - It is injectable as `RegistrationDependencies.rateLimiter`. `tryAcquire(key, now)` takes the `now` that `submit` already read from the injected clock.
  - It is per process, which is fine with the single app container. A restart forgets every count.
  - A `submit` without `remoteIp` (tests, scripts) is not rate limited, so existing tests that share one module instance are unaffected.
- **Turnstile client:** `src/lib/bot-check/turnstile.ts`.
  - `createTurnstileBotCheck(process.env)` returns `passThroughBotCheck` when `TURNSTILE_SECRET_KEY` is empty.
  - It POSTs form-encoded to siteverify with a 5 s `AbortSignal.timeout`.
  - `remoteip` is sent only when the value passes `isIP`, so the `unknown` fallback is never sent.
  - An empty token, or one over 2048 characters, fails without a network call.
  - `verify` never throws. A network error, timeout or non-JSON reply counts as a failed check and is logged with `console.error`.
  - Error codes that point at our setup are also logged: `missing-input-secret`, `invalid-input-secret`, `bad-request`, `internal-error`. Visitor-side codes are not.
  - `parseSiteverifyResponse` is pure: only an explicit `success: true` passes.
- **Request side:** `src/lib/bot-check/submission-context.ts`.
  - `submissionContext(formData, await headers())` reads the token from `cf-turnstile-response` (`TURNSTILE_RESPONSE_FIELD`).
  - The IP comes from `X-Real-IP`, falling back to `UNKNOWN_CLIENT_IP = "unknown"`.
- **Composition root:** `botCheck: createTurnstileBotCheck(process.env)` is built inside the lazy singleton, next to 10's SMTP sender. Nothing reads env at import or prerender.
- **UI:** `src/components/registration/BotProtection.tsx`, rendered as `<BotProtection state={state} pending={pending} />` right above the submit button. That is a two-line change in `RegistrationForm.tsx`.
  - The widget uses explicit rendering through `next/script` (`afterInteractive`, from the exact Cloudflare URL, never proxied).
  - The widget is Thai, light theme, and `refresh-expired: auto`.
  - Its size is `flexible` when the form is at least 300px wide, otherwise `compact`. Most phones get compact, which avoids horizontal scroll at 320px.
  - The token rides in the form's own FormData, in Turnstile's hidden input.
  - The widget is reset after every server result, because a token is single use and the server spends it even on `invalid`.
  - Widget-side problems show Thai text: script load failed, widget error (with a ลองอีกครั้ง button that resets it), or unsupported browser.
  - With `NEXT_PUBLIC_TURNSTILE_SITE_KEY` empty, there is no widget and no script.
- **Thai copy:**
  - bot-check-failed: "การตรวจสอบความปลอดภัยไม่ผ่าน กรุณารอให้การตรวจสอบด้านบนเสร็จสิ้น แล้วกดลงทะเบียนอีกครั้ง"
  - rate-limited: "มีการส่งแบบฟอร์มจากเครือข่ายนี้บ่อยเกินไป กรุณารอประมาณ 10 นาที แล้วลองใหม่อีกครั้ง"
  - Both use the existing `FieldError` live region under the widget. They are hidden while a submission is pending, so a repeat is announced again. Focus stays on the button, and every entered value is kept.

### Gotchas and conservative choices
- **Shared IPs.** 10 per 10 minutes per IP can bite real Attendees behind one address: venue Wi-Fi on an Event Day, or a teacher registering a class from one school network. If walk-ins register on venue Wi-Fi, raise `SUBMISSIONS_PER_WINDOW`. Turnstile remains the main defence.
- **Missing X-Real-IP.** Without it, every request shares the `unknown` key. That is right for local development, but behind a misconfigured nginx it would mean one limit for the whole site. `docs/deploy.md` §2 already explains how to check the restored IP.
- **Fail closed.** If siteverify is down or slow (over 5 s), submissions get `bot-check-failed`. That was a decision, not an accident.
- **No JavaScript.** Without JavaScript there is no token, so a no-JS submit gets `bot-check-failed` whenever Turnstile is configured.
- **No-JS POST rendering (pre-existing, not from this ticket).** On a no-JS form POST, the action result (including 02's `invalid` field errors) reaches the page only in the hydration payload, not in the server-rendered HTML. It shows once JavaScript hydrates. This seems to come from the form now streaming under `<Suspense>` after `connection()` (07).
- **Tests stay inside the agreed seams.** `verify`'s network behaviour (fake fetch rejecting, hanging past the timeout, a 502 HTML reply, missing or oversized token, `remoteip` only for real IPs, and Cloudflare's three test secrets) was checked with a throwaway script. No committed test calls Cloudflare.
- **`AbortSignal.timeout` uses an unref'd timer.** That only matters in a script with no open socket; the server always has one.

### Verification
- `npm run typecheck`, `npm run lint`, `npm test` (102 tests) and `npm run build` all pass. The build also passes with `.env` moved aside, and then no site key is inlined and no `.env` is copied into standalone.
- New tests:
  - `src/lib/registrations/bot-protection.test.ts` (Registration module, real database, fixed clock):
    - a failed bot check returns `bot-check-failed`, passes the token and IP to the verifier, and saves nothing
    - a passed check accepts
    - one IP is limited to 10 per 10 minutes while another IP is not, and a slot frees up 10 minutes after the first submission
  - `src/lib/bot-check/turnstile.test.ts`: siteverify parsing.
- Smoke test against `next build` + `next start -p 3108`, using dev database `stem_racing_t08` and Cloudflare's test keys:
  - **curl, no-JS action POST:**
    - With no token: `bot-check-failed`, and nothing saved.
    - With the dummy token: verified by the real siteverify, then a 303 to `/p/{token}`.
    - Ten posts with `X-Real-IP: 203.0.113.7` were accepted; the 11th was `rate-limited` and not saved. Another IP was still accepted.
  - **Chrome:**
    - The widget rendered in Thai ("สำเร็จ!") at flexible width, with the dummy token in the form, and the submit landed on the Event Pass.
    - With the always-fail secret `2x…AA`: the Thai bot-check message appeared under the widget, all entered values were kept, the widget reset once for a fresh token, and nothing was saved.
    - After ten curl posts used up the `unknown` key: the browser submit showed the Thai rate-limited message, with the form intact.
    - In a 320px viewport the widget was compact (146px tall) with no horizontal scroll. At 390px it was flexible at 300px.
    - No console errors, no server errors, and the secret key appears in no static asset.
