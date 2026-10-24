# 07: English Back Office: overview and Registration list

**What to build:** The Registrations page is English: the overview cards, the Attendee Role table, the daily chart, and the Registration list.
- Formats: Bangkok time with English months and Gregorian years ("23 Oct 2026, 14:05"), "Sat 31 Oct" for Event Days in the list and filters, the chart's axis, tooltip and screen-reader formats, thousands separators, "1 person" / "N people".
- The list's search, filters, columns, column menu, empty states, pagination, CSV link, the deleted toast, and the Event Pass email cell with its resend flow.
- Attendee Roles and Event Days use the English labels; names and free text are shown as typed; name sorting keeps the Thai collation.

On the integration branch `back-office-english`.

See the spec ("English Back Office", "Formats") and `copy-back-office.md` ("Formats", "Overview", "Registration list", "Event Pass email").

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Every string in the listed areas matches `copy-back-office.md`; no Thai left apart from Attendee-entered data.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the overview, the chart's tooltip, the list's filters, sort, pagination, empty states and resend.

## Answer

Plan:
- Formats first: `_registration-list/format.ts` and `_daily-registrations/format.ts` switch to English Bangkok formats ("22 Oct 2026, 14:05", "Sat 31 Oct", "23 Oct", "Fri 23 Oct 2026", "Friday 23 October 2026"), keeping their export names and signatures.
- Then the strings: the page title, overview cards, Attendee Role table, daily chart, the list (toolbar, columns, column menu, states, pagination, CSV link, deleted toast) and the Event Pass email cell and resend flow, word for word from `copy-back-office.md`; labels from `attendeeRoleShortLabels.en` and `eventDayLabel(…, "en")`.
- Check against `next start` on `stem_racing_te07` in headless Chrome, scanning each view for Thai.

In progress.
