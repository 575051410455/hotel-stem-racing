# 11: Back Office Registration list

**What to build:** Signed-in Staff see a paginated list of Registrations, newest first, at `/admin`. They can search by name, phone, email or Pass Code, filter by Event Day and Attendee Role, and sort. Searching, filtering, sorting and pagination all run on the server, and the view lives in the URL.

**Blocked by:** 02, 04

**Status:** resolved

- [x] A Staff-only endpoint accepts `q`, `day`, `role`, `sort`, `page` and `pageSize` and returns a page of results plus the total
- [x] Search matches given name, family name, phone, email and Pass Code. Event Day and Attendee Role filters combine.
- [x] The view uses URL search params validated with zod, so refresh, back and shared links keep it
- [x] TanStack Query keeps the previous page visible while loading. TanStack Table v9 runs in manual mode with shadcn/ui components. Read the v9 docs first; its API differs from v8.
- [x] The Back Office UI is in Thai
- [x] Registration-module integration tests cover search across each field, combined filters, sorting and pagination totals

## Answer

Done in commit "feat(back-office): Registration list …". New dependencies: `@tanstack/react-query` 5, `@tanstack/react-table` 9.3, `zod` 4 and `lucide-react` (shadcn's icon library, needed by NativeSelect).

### Search function (Registration module)

```ts
registrations.search(search: RegistrationSearch): Promise<RegistrationSearchResult>

type RegistrationSearch = {
  q?: string;                 // given name, family name, phone, email or Pass Code
  day?: EventDayDate;         // "2026-10-31" | "2026-11-01": the Registration chose that day
  role?: AttendeeRole;
  sort?: RegistrationSort;    // "createdAt.desc" (default) | "createdAt.asc" | "familyName.asc|desc" | "givenName.asc|desc"
  page: number;               // 1-based; below 1 reads as 1
  pageSize: number;           // clamped to 10–100
};
type RegistrationSearchResult = {
  rows: RegistrationListRow[]; // { id, createdAt: Date, givenName, familyName, role, roleOther, eventDays, phone, email, passCode }
  total: number;               // all matches across pages
  page: number;                // as used, after clamping
  pageSize: number;
};
```

- Code: `src/lib/registrations/search.ts` (`searchRegistrations(db, search)`, wired as `search` in `createRegistrations`). Types, sort list, page-size limits and the zod URL schemas are in `src/lib/registrations/search-params.ts`. That file is pure and browser-safe; the module, the endpoint and the page all share it.
- **Matching** (one OR; filters AND onto it):
  - The query is NFC-normalised, trimmed, and its whitespace collapsed. LIKE wildcards (`%`, `_`, `\`) are escaped, so they match themselves.
  - Names: `given || ' ' || family ILIKE %q%`, so a full name "วิชัย ใจดี" matches too.
  - Email: `ILIKE`, so any case matches.
  - Phone: only when `q` is digits with spaces, dashes or a leading `+`. Local numbers match from the start (`081 234` → `+6681234%`). Any digit run matches anywhere (`5678`, `+66812345678`, `66 81…`). `+66 081…` (trunk 0 kept) works.
  - Pass Code: exact via `normalisePassCode(q) ?? normalisePassCode("EP" + q)`, so it works in any case, with or without "EP-", and with spaces. Partial codes ("7kq2", "EP-7KQ") match through `ILIKE`.
- **Sorting** is allow-listed. An unknown sort falls back to newest first and never reaches SQL. Ties break by the other name, then `id`, in the same direction.
- **Thai dictionary order:** names sort with `COLLATE "th-TH-x-icu"`, so ใจดี files under จ and not after every consonant. Latin sorts case-insensitively, after Thai.
  - **Operator note:** this needs an ICU-enabled PostgreSQL. Local Homebrew 17 has it. PostgreSQL 16+ builds with ICU by default, so `postgres:17-alpine` should too, but I couldn't check the image here (no Docker). Check once on the server with `select 1 from pg_collation where collname = 'th-TH-x-icu'`. If it's missing, only name sorts fail.
- Tests: `src/lib/registrations/search.test.ts`, 21 tests.
  - Each field and its variants, wildcards, blank search, the day and role filters, and both combined with a search.
  - Every sort, including the Thai order and the fallback.
  - Page slices, totals that respect filters, page below 1, and the page-size clamp.
  - Mutation-checked: removing the clamp, the LIKE escaping, the "EP" tolerance or the filter on the total each fails a test.

### Endpoint

`GET /api/back-office/registrations?q&day&role&sort&page&pageSize`, in `src/app/api/back-office/registrations/route.ts`.

- `401 {"error":"unauthorized"}` when signed out (ticket 04's `getCurrentStaff()`).
- `400 {"error":"invalid-params","fields":{…}}` for a bad value, for example `role=boss` or `page=0`. Unknown keys are ignored.
- Otherwise `RegistrationSearchResult` as JSON, with `createdAt` as an ISO string.
- Every response sends `Cache-Control: private, no-store`.
- Defaults: sort `createdAt.desc`, page 1, pageSize 25. An empty value (`?role=`) means no filter.
- **For 15 (CSV export):** parse the same query string with `parseRegistrationSearchParams(request.nextUrl.searchParams)`, then call `registrations().search(...)`. Fetch every page with `pageSize: 100`, or add an unpaged module function next to `search` that reuses its `where`/`orderBy` (in `search.ts`). The UI can build the export link from the current view with `registrationViewToSearchParams(view)`.

### UI on `/admin`

- `page.tsx`: the h1, then ticket 12's `<CountsPanel />`, then `<RegistrationListSection />`. Each section has its own `<Suspense>` and calls `requireStaff()`.
- `src/app/admin/(back-office)/query-provider.tsx` holds `BackOfficeQueryProvider`. It wraps `{children}` in the `(back-office)` layout, so every signed-in Back Office page can call `useQuery`/`useQueryClient`. It also defines `BackOfficeRequestError(status)`: 4xx errors aren't retried, and `staleTime` is 10 s.
- `src/app/admin/(back-office)/_registration-list/`:
  - `registration-list-section.tsx`: the server wrapper (heading, Suspense, `requireStaff`).
  - `registration-list.tsx`: the client list (toolbar, table, empty and error states, pagination).
  - `columns.tsx`: `registrationListFeatures` (v9 `tableFeatures`: column filtering, global filtering, sorting and pagination; no client row models) and `registrationListColumns`.
  - `query.ts`: `registrationListQuery(view)` (`keepPreviousData`), `registrationListKey`, and the wire types `RegistrationListItem` / `RegistrationListPage`.
  - `use-registration-view.ts`: URL state.
  - `format.ts`: Bangkok time, "31 ต.ค.", `081-234-5678`, role labels.
- **URL state:** `useRegistrationView()` parses `useSearchParams()` with the lenient zod schema, where each bad value falls back to its default. Changes go through `history.pushState` without a server round trip; Next's router updates `useSearchParams`, so Back and Forward work. Any change other than the page resets to page 1. Defaults are left out of the URL (`?role=teacher`).
- **Table (v9, manual mode):**
  - `useTable` gets controlled `state` (sorting, pagination, globalFilter, columnFilters) derived from the URL. Its `on*Change` handlers write back to the URL.
  - Sort headers use `getToggleSortingHandler()` (single sort, no removal; `createdAt` sorts descending first) and set `aria-sort`.
  - The filter selects use `column.setFilterValue`. The search box calls `table.setGlobalFilter` after a 300 ms pause, or straight away on Enter.
  - The filterable columns have a no-op `filterFn`, because the server filters. This avoids v9's dev warnings about unregistered filter functions.
- **Loading:** the previous page stays on screen, dimmed with `aria-busy`, and the status line reads "· กำลังโหลด…".
- **Empty states:** no Registrations yet; nothing matches (with ล้างตัวกรอง); and a page past the end (with กลับไปหน้าแรก).
- **Errors:** a 401 shows หมดเวลาการเข้าสู่ระบบ with a sign-in link. Other errors show ลองอีกครั้ง.
- shadcn, hand-added from the new-york-v4 registry with `cn` imported from `@/lib/utils`: `src/components/ui/{table,badge,native-select}.tsx`. No CSS changes. I used NativeSelect instead of Radix Select, so `tw-animate-css` still isn't needed.

### Adding a column or a row action (14, 16)

1. **Data:** add the field to `RegistrationListRow` and `listColumns` in `src/lib/registrations/search.ts`, for example `emailSentCount` or `lastEmailSentAt` for 16. JSON turns Dates into strings, and `RegistrationListItem` handles that only for `createdAt`. Widen it there if you add another timestamp.
2. **Column:** add a `column.accessor("field", { header: "…", enableSorting: false, enableColumnFilter: false })` to `registrationListColumns` in `columns.tsx`.
   - To make it sortable, add the column to `registrationSortColumns` and `registrationSorts` in `search-params.ts`, and to `sortKeys` in `search.ts`.
   - The column `id` must equal the sort column name.
3. **Row action** (open detail, delete, resend): add `column.display({ id: "actions", header: () => <span className="sr-only">…</span>, cell: ({ row }) => … })`, using `row.original.id`.
   - After a mutation, call `queryClient.invalidateQueries({ queryKey: registrationListKey })` to refresh every cached page. Ticket 12's counts are server-rendered, so also call `router.refresh()`.
   - A detail route such as `/admin/registrations/[id]` gets the provider from the layout. Going back to `/admin` keeps the URL view and the cached page.

### Gotchas

- **Dev servers share a cookie jar.** Browsers share cookies across ports on one host. Signing in to another agent's app on `localhost:31xx` replaces your Better Auth session cookie, and the list then shows the 401 state. I ran my browser smoke test on `127.0.0.1:3111` (`APP_URL`/`BETTER_AUTH_URL` set to match).
  - `next dev` blocks its own HMR and chunks for a `127.0.0.1` origin unless `allowedDevOrigins` lists it, so the page never hydrates there. Use `next start` on 127.0.0.1, or `localhost` when nobody else is signed in.
- The list only fetches in the browser; the server render shows the loading row. Prefilling the first page from the server would need the prerender-safe hydration helper in Next's TanStack Query guide (because of Cache Components). I didn't need it.
- I kept 04's "ยินดีต้อนรับ {name}" line under the h1.

### Verification

- `npm run typecheck`, `npm run lint`, `npm test` (116 tests) and `npm run build` pass, including the build with `.env` moved aside. `/admin` is still partially prerendered.
- Endpoint via curl on `next start -p 3111`: 401 JSON signed out, with `no-store`. Signed in:
  - paging (`page=7&pageSize=10` → 3 rows of 63)
  - combined `q` + `role` + `day`
  - Thai-order family sort
  - 400 for `role=boss`
  - email search
- Chrome (production build, `stem_racing_t11`, 63 seeded Registrations, real sign-in):
  - Typing "ใจดี" pushed one history entry (`?q=…`, 10 found).
  - The role and day selects combined (2, then 1).
  - Back stepped through each view, and the search box and selects followed.
  - A pasted link `?sort=familyName.asc&pageSize=10&page=2&role=student` restored page 2 of 2.
  - Clicking the created-time header sorted descending and reset to page 1. With `fetch` slowed by 2 s, the previous rows stayed visible (dimmed, `aria-busy`).
  - Next page went to page 2 and then disabled. Page size 50 reset to page 1.
  - Both empty states and their buttons worked.
  - No console messages.
  - Layout at 1280 px and 390 px (iframes, as the window couldn't be resized): no page-level horizontal scroll; at 390 px the table scrolls inside its container.
- TanStack Table v9 dev warnings: driving the same features and columns through `constructTable` with `NODE_ENV=development` logged none.

## Comments

- 2026-10-25: The operator note's ICU check passes in `postgres:17-alpine`: `th-TH-x-icu` exists (checked in Docker in the CI/CD review: the production image built with `docker compose build` and run with `db`, `app` and `nginx`, with requests sent as `cloudflared` would (no Cloudflare)).
