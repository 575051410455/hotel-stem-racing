# 08: English Back Office: Registration detail, bulk email and CSV

**What to build:** A Registration's detail page, the bulk-send page and the CSV export are English.
- The detail page: every answer's label with English Attendee Role, Referral Source and Event Day values, the Event Pass section, Check-Ins, and the delete confirmation and its outcomes.
- The bulk-send page: modes, summary, confirmation, progress, pauses, failures, and toasts, with "1 email" / "N emails".
- The CSV: English headers and option values, Event Days as English labels, timestamps in the English Bangkok format; still UTF-8 with BOM, filename unchanged.

On the integration branch `back-office-english`.

See the spec ("English Back Office", "CSV") and `copy-back-office.md` ("Registration detail", "Email (bulk send)", "CSV export").

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] CSV tests: English headers, English Attendee Role, Referral Source and Event Day values, Thai names intact, BOM kept.
- [ ] Every string in the listed areas matches `copy-back-office.md`; no Thai left apart from Attendee-entered data.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the detail page with and without Check-Ins, a delete, a bulk send through to "Finished" (local SMTP sink), and the CSV opened and checked.

## Answer

Plan:
- Detail page (`registrations/[id]/`): English labels, sections, Check-Ins, the Event Pass link and the delete confirmation and outcomes; English Attendee Role, Referral Source and Event Day values; the deck's Back Office organisation label.
- Bulk send (`email/`): modes, summary, confirmation, progress, pauses, failures and toasts, with "1 email" / "N emails" and "1 person" / "N people", counts in `en-GB`.
- CSV (`csv.ts`): English headers and values, tests rewritten with the deck's literals (headers, values, Thai names, BOM, international phone).
- Check everything against `next start` with a scratch database and a local SMTP sink.

In progress.
