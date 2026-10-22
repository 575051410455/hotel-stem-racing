# 13: Check-In by Pass Code

**What to build:** Staff at the entrance open `/admin/check-in`, type or paste an Event Pass (Pass Code, token or link) and get an immediate result under the Check-In rules. This is the tracer bullet for Check-In before the camera arrives.

**Blocked by:** 02, 04

**Status:** resolved

- [x] Scan resolution accepts:
  - a bare token
  - a Pass Code in any case, with or without spaces or hyphens
  - a link whose last two path segments identify the pass, on any host
- [x] A first Check-In for today records the time and the signed-in Staff Account and shows success
- [x] A repeat on the same Event Day records nothing and shows amber "เช็คอินแล้วเมื่อ HH:MM"
- [x] A Check-In on an Event Day the Attendee didn't choose is recorded, flagged and shown as a warning
- [x] Text that isn't an Event Pass shows "not an Event Pass" and records nothing
- [x] Unit tests cover scan resolution. Integration tests cover every Check-In outcome, using a fake clock for the Event Day.

## Answer

Done in commit "feat(check-in): Check-In by Pass Code …". Notes for downstream tickets.

### Modules and names
- **Scan resolution** (pure, browser and server): `resolveScan(text)` in `src/lib/registrations/event-pass-codec.ts`.
  - It returns a `ScanResolution`: `{ kind: "token"; token } | { kind: "pass-code"; passCode } | { kind: "not-a-pass" }`.
  - The text is trimmed first. It accepts:
    - a bare UUID in any case, returned lower-cased;
    - an http(s) link, with the scheme optional, whose last two path segments are `p/{token}`. Any host, query or hash is fine, and `P` and the token are matched case-insensitively, because QR encoders may upper-case a whole link;
    - a Pass Code via `normalisePassCode`, in any case and with spaces and hyphens. It also accepts the code without its `EP` prefix: 8 characters can only be the code without the prefix, and 10 can only be the code with it.
  - `normalisePassCode` itself is unchanged and still requires the prefix.
- **Today's Event Day:** `eventDayOn(now)` in `event-day-availability.ts` returns the `EventDay` that `now` falls on in Bangkok, or `undefined`.
- **Registration module:** `registrations.checkIn({ scan, eventDay?, staffAccountId })`, implemented in `src/lib/registrations/check-in.ts`.
  - `eventDay` is an ISO date. If it is omitted, the module uses today's Event Day by `deps.clock` in Bangkok. `checkedInAt` also comes from the clock, not the database default.
  - The Event Day is checked before the scan.
  - Uniqueness: `INSERT … ON CONFLICT (registration_id, event_day) DO NOTHING`, on `check_ins_registrationId_eventDay_unique`. A concurrent second insert waits for the first, does nothing, then reads the winner's row. Tested with 6 parallel scans. A mutation check (dropping the ON CONFLICT) makes 4 tests fail.
  ```ts
  type CheckInResult =
    | { status: "checked-in"; eventDay; checkedInAt: Date; attendee: CheckedInAttendee }
    | { status: "checked-in-outside-registered-day"; eventDay; checkedInAt: Date; attendee } // recorded, flagged
    | { status: "already-checked-in"; eventDay; checkedInAt: Date /* original */; outsideRegisteredDay: boolean; attendee }
    | { status: "not-an-event-pass" } // unresolvable text, or an unknown token or Pass Code
    | { status: "not-an-event-day" }; // none chosen and today isn't one, or the chosen date isn't one
  type CheckedInAttendee = { givenName; familyName; role: AttendeeRole; passCode; eventDays: string[] };
  ```

### For 18 (camera) and 19 (Kiosk): what to call
- **Server Action:** `checkInScan({ scan, eventDay? }): Promise<CheckInScanResult>` in `src/app/admin/(back-office)/check-in/actions.ts`.
  - `CheckInScanResult = CheckInResult | { status: "signed-out" }`, exported from `check-in-result.tsx`.
  - The action checks the session with `getCurrentStaff()` and records `staff.id`.
  - It accepts any text up to 2048 characters; longer text becomes `not-an-event-pass`.
- **Easiest route:** feed decoded QR text into `submitScan(text)` inside `CheckInDesk` (`check-in-desk.tsx`). That path already handles the chosen Event Day, the pending state, stale responses (only the latest scan's result shows) and the result panel.
- **`CheckInResultPanel({ attempt })`** in `check-in-result.tsx` is hook-free. `attempt` is `{ scan, result }`, where `result` is also allowed to be `pending` or `failed`. `bangkokTime(date)` formats HH:MM.
- **For 18's orange non-pass notice:** a browser recogniser can run `resolveScan` to drop stray QR codes before calling the server. The spec wants it looser than the server, so treat it as the strict side and pre-filter with something looser: case-insensitive, matching `/p/` or `EP`.
- **Colours:** green = checked in, amber = already, orange = outside a registered day, white/neutral = not a pass and the other non-outcomes. Orange is therefore taken by the outside-day warning. 18's brief orange camera notice should look different, for example as a toast rather than a panel.

### UI (`/admin/check-in`, ◐ partial prerender)
- The page is Staff-only (`requireStaff()` under Suspense).
- **Event Day picker:** two radios that default to today's Event Day (from `eventDayOn(new Date())` at render).
  - Staff can pick another day, for example to test before the Event. A hint then says the Check-In will be recorded for that day.
  - The choice lives in client state only. "Following today" sends no `eventDay`, so the server decides. A desk left open overnight therefore records the new day, and the picker updates from the result's `eventDay`.
- **Input:** a big input with `autoFocus`.
  - It is cleared and refocused at submit, so the next pass can be typed while one is in flight.
  - For `not-an-event-day`, `signed-out` and `failed`, the text is put back, because nothing about the pass was decided.
  - `method="dialog"` makes a submit before hydration a no-op, rather than a GET that would put the pass in the URL.
- **Result panel:** sits above the input (`role="status"`, polite), so a phone's keyboard can't hide it. A new scan replaces the old result with "กำลังตรวจสอบ…" at once, so nobody is waved through on the previous person's green.
- **Header:** `layout.tsx` gains a nav (ผู้ลงทะเบียน → `/admin`, เช็คอิน → `/admin/check-in`), and the header row wraps. Without the wrap, the sign-out button overflowed by 7px at 320px.

### Conservative choices
- **Copy I wrote** (the brief fixed only the four headlines):
  - กำลังตรวจสอบ…
  - ไม่ได้บันทึกซ้ำ ตรวจสอบว่าเป็นเจ้าของ Event Pass
  - บันทึกการเช็คอินแล้ว
  - ลงทะเบียนไว้: …
  - เช็คอินสำหรับ…
  - วันนี้ไม่ใช่วันจัดงาน …
  - หมดเวลาเข้าสู่ระบบ
  - เช็คอินไม่สำเร็จ …
  - the field label and hint
- **Staff may record any Event Day** while today is also one. The server doesn't force today; the picker hint warns instead.
- **No foreign key** from `check_ins.staff_account_id` to `users.id`: the schema was out of scope for this ticket.
- **When a session ends mid-shift,** the action's cookie cleanup re-renders the page, and `requireStaff()` sends the browser to `/admin/login`. Nothing is recorded. The `signed-out` panel is the fallback when no re-render happens.
- **If a Registration is deleted at the very moment of a scan,** the scan either reads as `not-an-event-pass` or fails with a foreign-key error, which shows "เช็คอินไม่สำเร็จ". A retry then reads as not an Event Pass.

### Verification
- `npm run typecheck`, `npm run lint`, `npm test` (121 tests on main with 06, 08, 09 and 12 merged) and `npm run build` all pass, including the build with `.env` moved aside.
- The smoke test below ran before 08 (bot protection) landed. 08 only adds the Turnstile verifier that `submit` uses, so the Check-In path is unchanged.
- **Unit tests:** 7 for `resolveScan`, covering tokens, Pass Codes with and without the prefix, links on any host (upper-case, trailing slash, query, no scheme), junk text, and near-miss tokens, links and codes.
- **Integration tests:** 12 for Check-In, all with a fake clock:
  - a first Check-In
  - a repeat, with the original time and no new row
  - the other day, giving a new Check-In
  - outside a registered day, flagged, and its repeat
  - unknown text, tokens and codes
  - lower-case spaced code, old-domain link and token
  - 6 concurrent scans giving one row
  - Bangkok midnight
  - no Event Day today
  - a chosen day
  - an invalid chosen day
  - `staffAccountId` stored
- **Smoke test** with `next start -p 3113` against `stem_racing_t13`, signed in as a Staff Account made with `npm run staff`:
  - Before choosing a day: "วันนี้ไม่ใช่วันจัดงาน", with the text kept.
  - 31 Oct: `ep xyy5 f6tj` gave green "เช็คอินสำเร็จ".
  - An old-domain link, then the bare token, gave amber "เช็คอินแล้วเมื่อ 20:19".
  - A 1 Nov-only Attendee gave orange "ไม่ได้ลงทะเบียนวันนี้".
  - A Facebook link gave "ไม่ใช่ Event Pass".
  - On 1 Nov, a link submitted by clicking the button gave green.
  - The database held exactly 3 rows, with the flag, Bangkok times and the signed-in Staff Account id.
  - After every result the input was empty and focused.
  - No horizontal scroll at 320, 734 or 900px. No console errors.
