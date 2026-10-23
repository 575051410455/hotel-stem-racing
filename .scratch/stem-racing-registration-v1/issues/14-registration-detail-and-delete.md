# 14: Registration detail and delete

**What to build:** Staff can open any Registration from the list and see every answer, including accessibility needs and comments. They can delete spam or Duplicate Registrations.

**Blocked by:** 11

**Status:** resolved

- [x] The detail view shows all fields, the Pass Code, email status and Check-Ins
- [x] Delete asks for in-page confirmation (no browser dialog), then removes the Registration and its Check-Ins
- [x] Integration tests show a deleted Registration disappearing from search, counts and token lookup

## Answer

Done in commit "feat(back-office): Registration detail and delete …". No new dependencies, no schema change: Check-Ins already cascade on `check_ins.registration_id`.

### Registration module

New file `src/lib/registrations/detail.ts`, wired into `createRegistrations` with one import and two methods placed after `getEventPass`.

```ts
registrations.getRegistrationDetail(id: number): Promise<RegistrationDetailLookup>
registrations.deleteRegistration(id: number): Promise<DeleteRegistrationResult>

type RegistrationDetailLookup =
  | { status: "found"; registration: RegistrationDetail }
  | { status: "not-found" };
type RegistrationDetail = {
  id; createdAt: Date; token; passCode; givenName; familyName; phone /* E.164 */; email;
  role: AttendeeRole; roleOther; organisation; eventDays: string[]; referralSources: ReferralSource[];
  referralOther; competingTeamCheeredFor; accessibilityNeeds; comments;
  emailSentCount: number; lastEmailSentAt: Date | null;
  checkIns: { eventDay: string; checkedInAt: Date; outsideRegisteredDay: boolean }[]; // Event Day order
};
type DeleteRegistrationResult = { status: "deleted"; passCode: string } | { status: "not-found" };
```

- The detail has every column except the Duplicate Registration key. It includes the Event Pass `token`, so the page can build the link. Keep it Staff-only.
- Delete is one `DELETE … RETURNING pass_code`. The foreign key removes the Check-Ins. There is no undo and no soft delete.
- Ids that can't be Registrations (not a safe integer from 1 to 2^31 − 1) return `not-found` without a query, as in 16's resend. `isRegistrationId(id)` and `registrationIdFromPath(segment)` (digits only, else NaN) are exported from `detail.ts`. 16's resend route keeps its own copy; I didn't touch it.
- Neither function catches database errors. The page shows Next's error page; the endpoint returns 500, which the UI shows as "ลบไม่สำเร็จ…".

### Endpoint

`DELETE /api/back-office/registrations/{id}` in `src/app/api/back-office/registrations/[id]/route.ts`. It uses the same `[id]` segment as 16's `[id]/resend`.

- Signed out: `401 {"error":"unauthorized"}`. Not found, including `abc`, `0` and `99999999999`: `404 {"status":"not-found"}`. Deleted: `200 {"status":"deleted","passCode":"EP-…"}`. `GET` returns 405. Every response sends `Cache-Control: private, no-store`.
- Each delete is logged for the operator: `Registration EP-… deleted by Staff Account <Better Auth user id>`. No name or email goes in the log.
- CSRF: a cross-site `DELETE` needs a CORS preflight, which this route never grants, and the cookie is `SameSite=Lax`.

### UI

- **Row link (11's columns):** a new first column, `column.display({ id: "detail" })`, holds a "รายละเอียด" button-link. It has a screen-reader-only name ("รายละเอียด วิชัย ใจดี") and `prefetch={false}` (a page holds up to 100 rows). I put it first because the table already scrolls sideways at 1280–1568px, so a last column would be off-screen. The edit is one import and one entry.
- **The detail URL keeps the list view:** `/admin/registrations/12?q=ใจดี&role=teacher`. Its query string is the list's own keys, cleaned with `parseRegistrationView`. The back link and the post-delete return use it, so Staff land on the same search, filters, sort and page. Helpers are in `_registration-list/list-links.ts` (pure).
- **`/admin/registrations/[id]`** (`src/app/admin/(back-office)/registrations/[id]/page.tsx`, ◐ partial prerender): one `<Suspense>`, then `requireStaff()`, then params and data.
  - Header: "กลับไปรายการลงทะเบียน", the name as h1, then the Pass Code and the registration time.
  - **ข้อมูลการลงทะเบียน:** every answer in form order with Thai labels:
    - ชื่อ and นามสกุล
    - เบอร์โทรศัพท์, shown `081-234-5678` as a `tel:` link
    - อีเมล, as a `mailto:` link
    - ฐานะการเข้าร่วมงาน, with "อื่น ๆ: …" when the Attendee typed their own
    - the organisation, labelled by `organisationLabel(role)`
    - วันเข้าร่วมงาน, using the `event.ts` labels
    - ช่องทางที่ทราบข่าว, with "อื่น ๆ: …"
    - ทีมที่ต้องการมาเชียร์, ความช่วยเหลือที่ต้องการในการเข้าร่วมงาน and ข้อสอบถามหรือข้อเสนอแนะ. Newlines are kept and long text wraps.
    - Empty answers read "ไม่ได้ระบุ".
  - **Event Pass:**
    - the Pass Code
    - the link (`passLink(token)` from APP_URL, as on `/p/[token]`), with คัดลอกลิงก์ (clipboard, Thai feedback, a fallback message) and เปิด Event Pass (new tab, `noreferrer`)
    - a hint to send the link only to its owner
    - if APP_URL is missing, a Thai notice instead of a crash
    - 16's email status and resend
  - **การเช็คอิน:** each Check-In with its Event Day label and Bangkok time, plus an orange "นอกวันที่ลงทะเบียน" badge when it was outside a registered day. Otherwise "ยังไม่ได้เช็คอิน".
  - **ลบการลงทะเบียน:** a short explanation, then the delete.
  - An unknown or deleted id shows "ไม่พบการลงทะเบียนนี้" with the back link. It renders inline, not through `notFound()`.
- **Delete** (`delete-registration.tsx`):
  - "ลบการลงทะเบียน" swaps in an in-page question: "ลบการลงทะเบียนของ {name} ({Pass Code}) ถาวร? Event Pass นี้จะใช้เช็คอินไม่ได้อีก และกู้คืนไม่ได้", with ลบถาวร (destructive) and ยกเลิก.
  - **Focus starts on ยกเลิก**, so a stray Enter can't delete. Escape cancels and returns focus. No browser dialog.
  - While deleting, both buttons are disabled and the delete button reads "กำลังลบ…".
  - On `deleted`: `invalidateQueries({ queryKey: registrationListKey })`, then `router.replace(<list view>&deleted=EP-…)`. Replace means Back can't reach the deleted page. The navigation re-renders 12's counts, which are dynamic.
  - Otherwise the question closes and an alert shows under the button:
    - not found: "ไม่พบการลงทะเบียนนี้ อาจถูกลบไปแล้ว" with a link to the list
    - signed out: "หมดเวลาการเข้าสู่ระบบ ยังไม่ได้ลบ" with a sign-in link
    - network or other error: "ลบไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง"
  - A `useLayoutEffect` cleanup closes the question when Next hides the page (Activity, Cache Components), so coming back never shows it half-open.
- **Notice on `/admin`** (`registration-deleted-notice.tsx`, one import and one line in `page.tsx` under the welcome line):
  - It reads "ลบการลงทะเบียน EP-… แล้ว" from `?deleted=`. Only a valid Pass Code shows, normalised; anything else shows nothing.
  - It takes focus when it appears (`role="status"`, `tabIndex=-1`). ปิด removes the param with `history.replaceState`, and any change to the list view drops it too.
  - It is derived from the URL rather than state, so a page kept alive by Activity can't show a stale notice.
  - The URL carries only the Pass Code, never a name.
- **16's `ResendEventPass`** gained an optional `onSent` prop (called after `sent`, after its own invalidation). On the detail page, `DetailEventPassEmail` passes `router.refresh()`, so the server-rendered count and time update. The list's behaviour is unchanged.

### Conservative choices

- The detail is server-rendered (RSC), not fetched with TanStack Query, so there is no detail GET endpoint. Only the delete and resend are client calls.
- Check-Ins show the Event Day, time and flag. Who checked them in (`staff_account_id`) isn't shown; the brief didn't ask for it.
- The page title is static (รายละเอียดการลงทะเบียน), so Attendee names stay out of tab titles and history.
- Copy I wrote:
  - the section headings
  - "ไม่ได้ระบุ"
  - "นอกวันที่ลงทะเบียน" (13's "ไม่ได้ลงทะเบียนวันนี้" says "today", which reads wrong later)
  - the link hint
  - the delete question and its outcomes
  - the notice

### Verification

- **TDD**, one red→green at a time, in `src/lib/registrations/detail.test.ts`, 4 tests against the harness database with fixed clocks:
  1. The detail returns every field, the Pass Code, the email status (count 1, time = clock) and two Check-Ins in Event Day order, one flagged. Red: missing method.
  2. An unknown id, plus 0, −1, 1.5, NaN and 2^31, is not found. Red: Postgres threw on 1.5, which added the guard.
  3. A deleted Registration disappears from search (by Pass Code and overall), counts, `getEventPass` and the detail. Its Check-In is gone and the other Attendee's stays. Red: missing method.
  4. Deleting a deleted, missing or impossible id is `not-found`, and the other Registration survives. Red until the guard.
- Ticket 12's "counts drop when a Registration is removed" now deletes through `deleteRegistration`.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass, the build also with `.env` moved aside. `/admin/registrations/[id]` is ◐, and the DELETE route is ƒ.
- **Smoke test** with `next start -p 3114` on `t14.localhost` (16's tip for keeping cookies apart), against `stem_racing_t14` (since dropped), with 30 seeded Registrations and a Staff Account from `npm run staff`.
  - **curl:**
    - DELETE signed out gives 401 with `no-store`; GET gives 405.
    - `abc`, `0`, `99999999999` and `9999` give 404 `not-found`.
    - The detail pages for a deleted id, `abc` and `99999999999` show "ไม่พบการลงทะเบียนนี้", and the back link keeps `?q=`.
    - `?deleted=ep-ppgj2ep5` shows the normalised notice; `?deleted=<b>hi` shows none.
    - The deleted Registration's `/p/{token}` shows "ไม่พบบัตรเข้างานนี้".
  - **Chrome:**
    - I signed in and searched "ใจดี". The row links carried `?q=ใจดี`.
    - วิชัย's detail showed every answer: Thai labels, the two-line accessibility needs, "อื่น ๆ: ป้ายหน้าโรงเรียน", both Event Day labels, the email status in Bangkok time, and the 31 Oct Check-In. คัดลอกลิงก์ showed "คัดลอกลิงก์แล้ว". The back link returned to `?q=ใจดี`.
    - For สแปม บอท, the detail showed the "นอกวันที่ลงทะเบียน" badge. ลบการลงทะเบียน opened the in-page question with focus on ยกเลิก. Escape closed it and focus went back to the button.
    - Opening it again and pressing ลบถาวร went to `/admin?q=บอท&deleted=EP-PPGJ2EP5`. The focused green notice was there, the list read "พบ 0 รายการ", and the counts dropped from 30 to 29 (31 Oct 29→28, อื่น ๆ 1→0).
    - In the database, the row and its Check-In were gone and the other Check-In remained. The server logged the delete line.
  - **Not checked in a browser:**
    - the ปิด button on the notice and a resend from the detail page; the browser tab group closed mid-test and a new group couldn't reach the local server
    - narrow-width layout. The page uses only stacking flex and `sm:` rows, and long text uses `wrap-anywhere`.
