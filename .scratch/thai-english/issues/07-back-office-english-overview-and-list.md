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
