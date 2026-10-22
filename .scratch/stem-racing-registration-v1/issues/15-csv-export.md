# 15: CSV export

**What to build:** Staff export the Registrations matching their current search and filters as a CSV that opens in Excel with Thai text intact.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] A Staff-only export uses the same filters as the list and includes every field, with Event Days and Referral Sources readable
- [ ] The file is UTF-8 with a BOM and has a dated file name
- [ ] Tests check the header row, BOM, quoting of commas, quotes and newlines, and that filters are respected
