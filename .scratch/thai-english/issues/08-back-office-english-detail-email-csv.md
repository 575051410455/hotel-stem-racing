# 08: English Back Office: Registration detail, bulk email and CSV

**What to build:** A Registration's detail page, the bulk-send page and the CSV export are English.
- The detail page: every answer's label with English Attendee Role, Referral Source and Event Day values, the Event Pass section, Check-Ins, and the delete confirmation and its outcomes.
- The bulk-send page: modes, summary, confirmation, progress, pauses, failures, and toasts, with "1 email" / "N emails".
- The CSV: English headers and option values, Event Days as English labels, timestamps in the English Bangkok format; still UTF-8 with BOM, filename unchanged.

On the integration branch `back-office-english`.

See the spec ("English Back Office", "CSV") and `copy-back-office.md` ("Registration detail", "Email (bulk send)", "CSV export").

**Blocked by:** 02

**Status:** resolved

- [x] CSV tests: English headers, English Attendee Role, Referral Source and Event Day values, Thai names intact, BOM kept.
- [x] Every string in the listed areas matches `copy-back-office.md`; no Thai left apart from Attendee-entered data.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the detail page with and without Check-Ins, a delete, a bulk send through to "Finished" (local SMTP sink), and the CSV opened and checked.

## Answer

Done on branch `thai-english-08` (from `back-office-english`).

### What's where

| What | Where |
| --- | --- |
| Detail page: tab title, loading line, breadcrumb, not-found, every answer's label, English Attendee Role, Referral Source and Event Day values, "Not given", the Event Pass section's labels and hint, Check-Ins ("Not checked in", "Checked in {time}", "not a registered day"), the delete section | `src/app/admin/(back-office)/registrations/[id]/page.tsx` |
| The Back Office organisation label ("School or organisation" / "Company or organisation represented" for a Sponsor) | `organisationLabel(role)` in the same page |
| Copy link / Link copied / copy failure / Open Event Pass | `registrations/[id]/detail-actions.tsx` |
| Delete confirmation, its buttons and the three failure outcomes | `registrations/[id]/delete-registration.tsx` |
| Bulk send: tab and page title, introduction, modes, summary (with its errors), confirmation, progress, pauses, failures and toasts; counts in `en-GB` with "1 email" / "N emails" and "1 person" / "N people" | `src/app/admin/(back-office)/email/page.tsx`, `email/bulk-send.tsx` |
| CSV: English headers and Attendee Role, Event Day and Referral Source values; BOM, quoting, formula guard, timestamps and filename unchanged | `src/lib/registrations/csv.ts`, tested in `csv.test.ts` |

`src/app/api/back-office/**` carries no Thai, `export.test.ts` doesn't assert CSV text and `fields.ts` needed no change, so none of them changed.

### Decisions

- **CSV timestamps stay `2026-10-22 14:05:09` (Bangkok), not "22 Oct 2026, 14:05". Please confirm.** The deck's Formats row assumes the CSV shows the list's Thai format today ("22 ต.ค. 2569 14:05"). It doesn't: ticket 15 chose this form on purpose because Excel reads it as a date and time and sorts it (see `15-csv-export.md`). It has no Thai in it, and the spec says "Timestamps keep the Bangkok format". The headers say "(Bangkok time)" as the deck asks. To use the deck's form, change `bangkokDateTime` in `csv.ts` and the literals in `csv.test.ts`.
- **The organisation label lives in the detail page**, which is the only Back Office place that shows it. The deck's Back Office wording differs from the form's question ("…you represent"), and Back Office strings go in the code. So `fields.ts` (and the public form) are untouched.
- **Singular forms** follow the deck's "1 email" / "1 person" rule wherever a count is shown: "Send 1 email…", "Send 1 Event Pass email?", "1 of 1 email". Counts use `en-GB` ("2,000").
- **Apostrophes are ASCII, as in the deck** (written `&apos;` in JSX text). The existing English lines at the check-in desk and Kiosk use ’; ticket 10 may want to make them one style.
- **Punctuation:** the bulk summary's signed-out line reads "Session expired. Sign in again" (the deck has the two shell strings without the full stop between them).

### Visible Thai left, and where it comes from

- **Attendee-entered data:** names, "Other" texts, organisation, team, needs, comments (and in the CSV, the same columns only).
- **Ticket 07's shared pieces** (still Thai on this branch, as agreed): `formatCreatedAt` (the "Registered", "Checked in" and last-sent times), `EventPassEmailStatus` ("ส่งแล้ว 1 ครั้ง · ล่าสุด …") and `ResendEventPass` (button, confirmation, toasts) in the detail page's Event Pass section, `sendFailureMessage` in the bulk-send failure list, and the list's "ลบการลงทะเบียน … แล้ว" toast after a delete.
- **Ticket 06's shell:** `<html lang="th">`, the "· ระบบหลังบ้าน ·" tab title template, the sidebar, the sidebar trigger's "เปิดหรือปิดเมนู" and the breadcrumb's "ตำแหน่งของหน้านี้".

### For the organisers' review

- The finished-run toast is the deck's "Event Pass emails sent" even when some failed (it then shows as an error with "4 sent · 1 failed"). The Thai said "finished sending"; "Event Pass emails finished" may read better.
- No string outside the deck was added apart from the singular forms and the full stop above.

### Needs from other tickets

- **07:** keep the names and signatures of `formatCreatedAt`, `formatPhone`, `EventPassEmailStatus`, `ResendEventPass` and `sendFailureMessage`; translating them finishes the detail page's Event Pass section, its timestamps and the bulk-send failure reasons.
- **06:** the shell items above.
- **10:** after merging, look again at the detail page's Event Pass section and a bulk-send failure, the two places where 07's text shows inside these pages.

### Verified

- typecheck, lint, 250 tests (one new) and build pass.
- **CSV tests** (7, literals from the deck): BOM and the English header row; the formula guard and quoting with Parent and "Saturday 31 October 2026"; two rows with Other, both Event Days, "LINE; A Competing Team; Other", "Sponsor / Supporter", Website, Thai names and free text as typed, Bangkok times; every Attendee Role and every Referral Source in English; an international phone in both phone columns; the filename.
- **Headless Chrome against `next start`** (scratch copy of the demo data, local SMTP sink, no `.env`):
  - Detail page with no Check-Ins (an "Other" Attendee with an international phone, both Event Days, four Referral Sources with "Other: …", team, needs and a two-line comment), with a Check-In outside the registered day (badge "not a registered day"), and a Sponsor ("Company or organisation represented"). Tab title "Registration details · …", breadcrumb "Registrations › EP-…", "Back to Registrations", "Not given". Not found: "Registration not found" / "It may have been deleted, or the link is wrong.", back link keeps the list's query. "Link copied", and "Couldn't copy. …" with the clipboard refusing. 375 px: no sideways scroll. The loading line is in the server HTML.
  - Delete: the confirmation text, focus on Cancel, Escape closes it and returns focus; offline ("Couldn't delete. …"), 401 ("Session expired. Nothing was deleted." + "Sign in again" → `/admin/login`), 404 ("Registration not found. It may have been deleted already." + "Back to Registrations" keeping `?role=parent`), the pending "Deleting…" with both buttons disabled; then a real delete lands on `/admin?role=parent`, and the Registration and its Check-In are gone from the database.
  - Bulk send: both modes and their summaries ("5 emails", "3 people", "39 emails"); a failed count (three tries) and a 401 summary; SMTP not set up with "1 email" / "1 person" and the button disabled; nothing to send ("0 emails", "No emails to send", disabled). Confirmation for both modes (the "all" mode's extra line), Cancel. Runs to "Finished": 5 with one address refused by the sink ("4 sent · 1 failed", "1 failed", the next-send note, error toast "Event Pass emails sent"), and 39 clean (success toast "39 sent · 0 failed"); the sink counted 4, 14 and 39 messages. Pauses: Stop while a batch is held ("Stopping after this batch…", then "Sending stopped. Press “Resume” …" and the info toast), a whole batch refused ("Every email in the last batch failed …"), the request failing, a 401 and SMTP not set up, each with its message and an error toast; Resume, "Cancel the rest" and "Start a new send". Progress `aria-valuetext` "0 of 39 emails" … "39 of 39 emails". 375 px: no sideways scroll. No console errors.
  - CSV fetched with the session cookie: `text/csv; charset=utf-8`, `filename="stem-racing-registrations-2026-10-24.csv"`, `private, no-store`, starts `EF BB BF`; Python's `csv` reads 39 rows of 18 columns; English headers; Attendee Role, Event Days and Referral Sources in English; Thai only in the given name, family name, the two "(other)" columns, organisation, team, needs and comments; `'+447700900123` in both phone columns.
