# 11: Back Office Registration list

**What to build:** Signed-in Staff see a paginated list of Registrations, newest first, at `/admin`. They can search by name, phone, email or Pass Code, filter by Event Day and Attendee Role, and sort. Searching, filtering, sorting and pagination all run on the server, and the view lives in the URL.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] A Staff-only endpoint accepts `q`, `day`, `role`, `sort`, `page` and `pageSize` and returns a page of results plus the total
- [ ] Search matches given name, family name, phone, email and Pass Code. Event Day and Attendee Role filters combine.
- [ ] The view uses URL search params validated with zod, so refresh, back and shared links keep it
- [ ] TanStack Query keeps the previous page visible while loading. TanStack Table v9 runs in manual mode with shadcn/ui components. Read the v9 docs first; its API differs from v8.
- [ ] The Back Office UI is in Thai
- [ ] Registration-module integration tests cover search across each field, combined filters, sorting and pagination totals
