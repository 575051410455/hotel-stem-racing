# 07: Event Day availability

**What to build:** An Event Day can be chosen until it ends (end of day, Bangkok time), so same-day walk-ins can register. Days that have ended disappear from the form. Once the last Event Day has ended, `/` shows that registration is closed instead of the form. The server enforces the same rules.

**Blocked by:** 02

**Status:** resolved

- [x] The form lists only Event Days that have not ended in Asia/Bangkok
- [x] After the last Event Day ends, `/` shows a closed message with the organisers' contact channels
- [x] The server rejects ended Event Days and returns "registration closed" after the last day, using the injected clock
- [x] Integration tests with a fake clock cover: before the Event, the morning of 31 Oct, after 31 Oct ends, and after 1 Nov ends

## Answer

Done in commit "feat(registration): Event Day availability …". Notes for downstream tickets.

### Modules and names
- **Event Day availability** (pure, browser and server): `src/lib/registrations/event-day-availability.ts`.
  - `openEventDays(now)` → the `EventDay`s whose date, in `event.timeZone`, is today or later. A day is open until 23:59:59.999 Bangkok time.
  - `isRegistrationClosed(now)` → true once no Event Day is open.
  - `endedEventDayErrors(chosen, now)` → `{ eventDays: "<labels> ผ่านไปแล้ว กรุณาเลือกวันเข้าร่วมงานอื่น" }` for chosen days that have ended, else `{}`. Unknown dates are left to Field validation.
  - The Bangkok date comes from `Intl.DateTimeFormat` with `event.timeZone`, so the server's own time zone never matters. The unit tests pass under TZ=Asia/Bangkok, UTC, America/Los_Angeles and Pacific/Kiritimati.
- **Registration module:** `submit` reads `deps.clock()` once.
  - If registration is closed it returns `{ status: "closed" }` before validating anything, so an empty form also gets `closed`.
  - Otherwise an ended Event Day is merged into the other field errors and returned as `invalid`. Field validation's own `eventDays` message wins if both apply.
  - `SubmitResult` gains `| { status: "closed" }` as the last member.
- **UI:**
  - `src/app/(public)/page.tsx`: the banner, h1 and intro stay in the static shell. `<Registration>` sits under `<Suspense>`, calls `await connection()`, then `openEventDays(new Date())`. `/` is now ◐ Partial Prerender in the build output.
  - `RegistrationForm` takes a new required prop `eventDays: readonly EventDay[]` instead of reading `event.eventDays`. When only one day is left, the hint reads "(เลือก 1 ข้อ)".
  - `src/components/registration/RegistrationClosed.tsx`: a hook-free component used both by the page and by the form. If a submission comes back `closed`, the form swaps itself for this message and moves focus to it. It shows `contactChannels()`, and the contact paragraph is hidden when neither channel is configured.
  - `actions.ts` and `form-state.ts` are unchanged; `closed` passes through as is.

### Conservative choices
- **`connection()` rather than `io()`.** I used `connection()`, as AGENTS.md and the brief say. The Next 16.4 docs prefer `io()` because it can be prefetched. I kept `connection()` so the open days are always worked out on a real request, never from a prefetch.
- **No refresh after an ended-day error.** If the page was loaded before midnight and submitted after, the ended day stays in the list with the server's error under it. Unticking it clears the error.
- **Copy I wrote** (not from the organisers): ปิดรับลงทะเบียนแล้ว, ขณะนี้ปิดรับลงทะเบียนเข้าร่วมงาน … แล้ว ขอขอบคุณทุกท่านที่ให้ความสนใจ, หากมีข้อสงสัย กรุณาติดต่อผู้จัดงาน, the ended-day error above, and the placeholder กำลังโหลดแบบฟอร์มลงทะเบียน….
- **The static shell keeps its h1.** "ลงทะเบียนเข้าร่วมงาน …" stays even when registration is closed, so the shell does not depend on the time.
- **JavaScript is now needed to see the form.** It streams under `<Suspense>`, and the swap is an inline script. This works before hydration, but a browser with JavaScript fully disabled keeps the placeholder. `/p/[token]` already behaved this way, and Turnstile (08) needs JavaScript anyway.

### Tests
- Unit tests (`event-day-availability.test.ts`) cover:
  - before the Event
  - 31 Oct at 08:00, 23:59 and 23:59:59.999
  - 1 Nov at 00:00 and 23:59
  - 2 Nov at 00:00
- Integration tests (`registrations.test.ts`, "Event Day availability") use a fake clock:
  - before the Event, both days are accepted
  - on the morning of 31 Oct, a walk-in is accepted for both days
  - after 31 Oct ends, it is rejected and 1 Nov is accepted
  - an ended day is reported together with other field errors
  - after 1 Nov ends, the result is `closed` (also for an invalid form)
- The existing tests now use a fixed `beforeTheEvent` clock, so they keep passing after 1 Nov 2026. **Any test that calls `createRegistrations` without a `clock` depends on the real date:** from 2 Nov 2026 every submit returns `closed`, so pass `clock: beforeTheEvent`.

### Verification
- `npm run typecheck`, `npm run lint`, `npm test` (67 tests) and `npm run build` all pass. The build shows no prerender time errors.
- Smoke test on port 3107 with database `stem_racing_t07`, using temporary clock overrides (since reverted):
  - Today (22 Oct), `/` lists both days and the static shell contains the fallback.
  - With the page clock at 1 Nov 08:00, only 1 Nov is listed. At 2 Nov 00:00, the closed message shows LINE and phone links.
  - With the action clock at 1 Nov 08:00, submitting both days showed the Thai ended-day error and focused the group. Unticking 31 Oct and resubmitting landed on the Event Pass, stored with `{2026-11-01}`.
  - With the action clock at 2 Nov, the form was replaced by the focused closed message and nothing was stored.
  - There were no console errors.
