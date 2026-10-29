# 03: Search recorded Check-Ins by Attendee or Pass Code

**What to build:** Staff using an Admin Account can find Check-Ins by Attendee name, Pass Code or organisation within the selected Event Day.

**Blocked by:** 01: Browse recorded Check-Ins for one Event Day.

**Status:** ready-for-agent

- [x] Search Thai and English names, full names, case-insensitive Latin text, normalised Pass Codes and organisation text through the Registration module and guarded GET contract.
- [x] Keep search in the URL and reset to page one on a changed query; reload and Back/Forward restore the applied query.
- [x] Show matching total and a distinct no-matches state with Clear filters, retaining Event Day and page size.
- [x] Search affects only table rows and matching total; selected-day overview counts remain unchanged when that slice is present.
- [x] Verify search behaviors and URL round trips at the agreed database and pure seams; browser-check typing, submit and history restoration.
