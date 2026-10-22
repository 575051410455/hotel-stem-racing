# 15: CSV export

**What to build:** Staff export the Registrations matching their current search and filters as a CSV that opens in Excel with Thai text intact.

**Blocked by:** 11

**Status:** resolved

- [x] A Staff-only export uses the same filters as the list and includes every field, with Event Days and Referral Sources readable
- [x] The file is UTF-8 with a BOM and has a dated file name
- [x] Tests check the header row, BOM, quoting of commas, quotes and newlines, and that filters are respected

## Answer

Done in commit "feat(back-office): CSV export …". No new dependencies, no schema change.

### Export rows (Registration module)

```ts
registrations.exportRows(filters: RegistrationExportFilters): Promise<RegistrationExportRow[]>

type RegistrationExportFilters = Pick<RegistrationSearch, "q" | "day" | "role" | "sort">;
type RegistrationExportRow = {
  createdAt: Date; passCode: string; givenName: string; familyName: string;
  phone: string /* E.164 */; email: string; role: AttendeeRole; roleOther: string | null;
  organisation: string | null; eventDays: string[]; referralSources: ReferralSource[];
  referralOther: string | null; competingTeamCheeredFor: string | null;
  accessibilityNeeds: string | null; comments: string | null;
  emailSentCount: number; lastEmailSentAt: Date | null;
};
```

- Code: `src/lib/registrations/export.ts` (`exportRegistrations(db, filters)`), wired as `exportRows` in `createRegistrations`.
- It reuses search's logic, so the export always matches the list. The change to `search.ts` is small and local:
  - the `where` building moved into an exported `searchFilter({ q, day, role })`, which `searchRegistrations` now calls;
  - `orderBy(sort)` is exported.
- It returns every match with no page limit, in the list's sort order (Thai dictionary order for name sorts; newest first by default).
- **Every field except two:** the Event Pass `token` (it opens the Event Pass, so a file that gets shared must not carry it) and the internal `duplicateKey`. The database `id` is left out too; the Pass Code identifies a Registration for Staff.

### CSV builder (pure)

`src/lib/registrations/csv.ts`: `registrationsCsv(rows)` → string; `registrationsCsvFileName(exportedAt)` → `stem-racing-registrations-YYYY-MM-DD.csv` (Bangkok date).

- UTF-8 with a BOM (`﻿`, sent as `EF BB BF`). RFC 4180: a cell holding `,`, `"`, CR or LF is quoted and its quotes doubled. Every record ends in CRLF, the last one included.
- **Formula-injection guard:** a cell starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'`. The guard runs before quoting, so `=HYPERLINK("…")` becomes `"'=HYPERLINK(""…"")"`.
- 18 columns with Thai headers, in this order:
  - ลงทะเบียนเมื่อ, รหัส Event Pass, ชื่อ, นามสกุล
  - เบอร์โทรศัพท์ (`081-234-5678`), เบอร์โทรศัพท์ (E.164)
  - อีเมล, ฐานะการเข้าร่วมงาน, ฐานะการเข้าร่วมงาน (ระบุ)
  - โรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน, วันเข้าร่วมงาน, ช่องทางที่ทราบข่าว, ช่องทางที่ทราบข่าว (ระบุ)
  - ทีมที่ต้องการมาเชียร์, ความช่วยเหลือที่ต้องการ, ข้อสอบถามหรือข้อเสนอแนะ
  - ส่งอีเมล Event Pass แล้ว (ครั้ง), ส่งอีเมล Event Pass ล่าสุดเมื่อ
- **Labels:** Event Days use `event.ts` labels and Referral Sources the form's labels, each joined with `"; "`. For Attendee Role and Referral Source, "Other" reads "อื่น ๆ" rather than the form's "อื่น ๆ โปรดระบุ"; what the Attendee typed goes in the "(ระบุ)" column.
- **Times** are Bangkok, `2026-10-22 14:05:09`. Excel reads this form as a date-time; Buddhist-era text would not sort.
- **The E.164 cell always shows a leading `'`** (`'+66812345678`), because it starts with `+`. Without it, Excel turns the phone into the number 66812345678. That's why the local display column comes first.

### Endpoint

`GET /api/back-office/registrations/export?q&day&role&sort`, in `src/app/api/back-office/registrations/export/route.ts`.

- `401 {"error":"unauthorized"}` when signed out and `400 {"error":"invalid-params",…}` for a bad value, as in ticket 11. Both are JSON.
- It parses with the same strict `parseRegistrationSearchParams`, so the list's query string works as is. `page` and `pageSize` are validated but ignored.
- `200` sends `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="stem-racing-registrations-<Bangkok date>.csv"` and `Cache-Control: private, no-store`. That is the sibling endpoint's value, which includes `no-store`.
- The file is built in memory, which is fine at Event scale (thousands of rows).

### UI

- `_registration-list/export-csv-link.tsx`: `ExportCsvLink({ view })`, an outline "ส่งออก CSV" button with a download icon at the right end of the toolbar.
  - It is a plain `<a download>`, so the browser's own download takes over, named by the endpoint.
  - `registrationExportHref(view)` builds the link from the URL view with `registrationViewToSearchParams`, leaving out page and page size.
  - The `title` says it exports every matching row across all pages.
- The edit to `registration-list.tsx` is two lines: the import and `<ExportCsvLink view={view} />` after the filter group.
- **Limit:** a signed-out click downloads or shows the 401 JSON rather than the Thai sign-in prompt. Sessions last 30 days, and the list itself shows the 401 state.

### Tests

- `csv.test.ts` (5, literal expected strings): BOM plus header row with CRLF; the formula guard (`=`, `+`, `-`, `@`, tab, and the E.164 phone); quoting of commas, quotes, CRLF and LF, and guard plus quoting together; Thai labels, Bangkok times, two rows in order; the file name's Bangkok date across UTC midnight.
- `export.test.ts` (4, real database, fixed clock): every field; `q`, `day`, `role` alone and combined, and no match; sort (default, `createdAt.asc`, Thai `familyName.asc`); 105 rows returned unpaged, and 103 with a role filter.
- **Mutation-checked:** dropping the `where`, the `orderBy` or the "อื่น ๆ" role label each fails a test.

### Verification

- `npm run typecheck`, `npm run lint`, `npm test` (151 tests) and `npm run build` pass, including the build with `.env` moved aside. The export route is dynamic (ƒ).
- **curl** against `next start` on `127.0.0.1:3115` (`stem_racing_t15`, 5 seeded Registrations with a comma, quotes, a newline, `=HYPERLINK(…)` and a leading `-`), signed in through Better Auth:
  - Signed out: 401 JSON with `no-store`. `role=boss`: 400.
  - `role=teacher&sort=familyName.asc&page=3&pageSize=10` returned both teachers (ใจดี before รักเรียน). The file starts `ef bb bf e0 b8 a5` (BOM, then ล), and the name is `…-2026-10-23.csv` at 23:27 UTC on the 22nd. Python's `csv` module reads 3 rows of 18 columns; the only bare LF is inside the quoted comment.
  - `q=ใจดี&day=2026-10-31` returned วิชัย only.
- **Chrome**, real sign-in:
  - Choosing คุณครู in the role select set `?role=teacher`. The button's link followed (`…/export?role=teacher`, with `download`), and fetching it returned the BOM, the Thai and the two teachers.
  - On `?q=ใจดี&sort=familyName.asc&page=2&pageSize=10`, the link kept only `q` and `sort`.
  - No console errors.

### Merge notes

- 14 and 16 also edit `search.ts`, `registrations.ts` and the toolbar. Here those edits are `searchFilter`/`export orderBy`, one import and one method placed before `search`, and two lines in `registration-list.tsx`.
- When 16 adds email-status fields, the export already has `emailSentCount` and `lastEmailSentAt`, straight from the table and independent of `listColumns`.
