# 04: Registration list toolbar, column picker and pagination

**What to build:** The Registration list on the Back Office home looks like dashboard-01's table and behaves exactly as it does now:
- **Toolbar:** search, the Event Day and Attendee Role filters, ล้างตัวกรอง, a "คอลัมน์" menu to hide and show columns, and CSV export.
- **Pagination:** rows per page, "หน้า X จาก Y", and first, previous, next and last buttons.

Search, filters, sorting and paging stay server-driven and in the URL. See the spec ("Registration list").

**Blocked by:** 01 (Back Office app shell)

**Status:** resolved

- [x] **Toolbar,** wrapping on narrow screens: search · Event Day (native select) · Attendee Role (native select) · ล้างตัวกรอง · "คอลัมน์" · CSV export at the end.
- [x] **"คอลัมน์":**
  - a dropdown of checkbox items, one per column header, to hide or show that column
  - the detail link column can't be hidden
  - visibility isn't persisted or put in the URL, so every column is back on reload
  - CSV export still includes every column
- [x] **Pagination:**
  - "แถวต่อหน้า" (native select)
  - "หน้า X จาก Y"
  - lucide icon buttons labelled หน้าแรก, ก่อนหน้า, ถัดไป and หน้าสุดท้าย, disabled at the ends
- [x] **Unchanged:**
  - TanStack Table v9 in manual mode, TanStack Query, view state in the URL (links and Back still work), the search debounce, the dimmed `aria-busy` loading state and the retry on error
  - the ten columns and their cells, including the Event Pass email cell and the detail link
- [x] **Not added:** row checkboxes, a per-row ⋮ menu, drag handles, tabs or a row drawer.
- [x] typecheck, lint, test and build pass. The hand-off records a browser check covering:
  - every filter, sort and page change, and the URL after each
  - hiding a column, then reloading
  - a CSV export with a column hidden
  - keyboard use of the column menu
  - 1280, 768 and 375 px

## Answer

Done on branch `worktree-agent-a60ae2b055594fe05`.

### What's where

All in `src/app/admin/(back-office)/_registration-list/` unless noted.

| What | Where |
| --- | --- |
| Toolbar: search · วันเข้าร่วมงาน · ฐานะการเข้าร่วมงาน · ล้างตัวกรอง (only while filtered, as before) · คอลัมน์ · ส่งออก CSV. It is one `flex-wrap items-end` row: labels stay visible above the controls, and คอลัมน์ and export sit in an `ml-auto` group at the right end. | `registration-list.tsx` |
| Column visibility: `columnVisibilityFeature` is added to `registrationListFeatures`. The detail column has `enableHiding: false`. `RegistrationListTable` (the table type) and `columnLabel(column)` (a column's header text, used for its menu item) are new exports. | `columns.tsx` |
| "คอลัมน์" menu: a shadcn `DropdownMenu` with one `DropdownMenuCheckboxItem` per column whose `getCanHide()` is true, so 9 items and no detail link. Choosing an item keeps the menu open (`onSelect` → `preventDefault`), so several columns can be hidden in one go. Escape or a click outside closes it. | `column-menu.tsx` (new, client) |
| Visibility state: plain React `useState<ColumnVisibilityState>({})`, passed to `useTable` as `state.columnVisibility` with `onColumnVisibilityChange`. Nothing persists it and it is not in the URL, so a reload shows every column again. The table renders `row.getVisibleCells()`, and the empty or error row's `colSpan` is `table.getVisibleLeafColumns().length`. | `registration-list.tsx` |
| Table look as in dashboard-01: `rounded-lg border overflow-hidden` wrapper, `bg-muted` header. Sort buttons get `hover:bg-background`, because the ghost hover colour is the same grey as `bg-muted`. | `registration-list.tsx` |
| Pagination: "แสดง a–b จาก N รายการ" on the left. On the right: แถวต่อหน้า (native select), "หน้า X จาก Y", and lucide `ChevronsLeft`/`ChevronLeft`/`ChevronRight`/`ChevronsRight` icon buttons (`aria-label` and `title` หน้าแรก, ก่อนหน้า, ถัดไป, หน้าสุดท้าย), disabled at the ends. All four buttons and the size picker show at every width; dashboard-01 hides some of them below `lg`. | `registration-list.tsx` |
| Export button: `size="sm"`, and the old `self-start md:self-auto` placement is dropped (the toolbar places it now) | `export-csv-link.tsx` |

Unchanged: TanStack Query, `useRegistrationView` (URL state, `pushState`, back and forward), the 300 ms search debounce and Enter-to-search, the dimmed `aria-busy` loading state, the error with ลองอีกครั้ง, the 401 sign-in prompt, the ten columns and their cells (including `event-pass-email.tsx`, untouched), and the CSV endpoint.

### Decisions

- **Compact toolbar (h-8, as in dashboard-01).** Search, selects and buttons use `size="sm"`, the gap is 8px, the search box's minimum width is 12rem, and the คอลัมน์ button has no chevron. With the sidebar open at 1280 the content is about 936px wide. At the default h-9 sizes, with ล้างตัวกรอง showing, the row needed about 1030px and wrapped. It now fits on one row, filtered or not.
- **Visible labels kept** above search and the two filters, rather than dashboard-01's label-less controls. The labels are the existing copy, and a select showing only "นักเรียน / นักศึกษา" would otherwise lose its label on screen.
- **The menu stays open after each toggle,** unlike dashboard-01's, which closes on every pick. It is quicker for hiding several columns on a phone.
- **Visibility in React state, not table-owned:** the menu gets `columnVisibility` as a prop, so it re-renders under the React Compiler. TanStack's own guidance: don't hide state reads behind a stable table, column or row object. Next keeps `/admin` mounted (Activity), so hidden columns survive a trip to a detail page and back within the visit. They reset on reload.

### Deviation: a shared theme fix in `src/app/globals.css` (2 lines)

- **The bug:** the open column menu had a near-black border. Every Radix portal had it: the account menu and the mobile sheet from ticket 01 too.
  - The Back Office's `border-color: var(--border)` rule matches only the **descendants** of `.back-office` and the portaled `data-slot` elements, not the portaled elements themselves.
  - So their own `border` fell back to `currentColor`.
- **The fix:** `border-color: var(--border)` added to the existing theme block, beside `color: var(--foreground)`.
  - It applies to the matched elements themselves.
  - It doesn't touch the data-slot selector lists, which ticket 05 may extend.
- **Verified:** after the fix, both menus' computed `border-top-color` equals the cards' border.

### Gotchas

- Radix checkbox items toggle on Space and Enter. When driving them over CDP, pace the key presses (about 100 ms). Keys sent back-to-back while the table re-renders get lost. A person's typing is unaffected.
- `attendeeRoleShortLabels.student` is "นักเรียน / นักศึกษา", not "นักเรียน".

### Verified

- **Gate:** typecheck, lint, the 200 tests and build pass. No new tests: no agreed seam changed.
- **Browser check:** headless Chrome over CDP against `next start` on a throwaway local database, 62 Registrations (mixed roles, Event Days and email states) and a throwaway Staff Account, all dropped afterwards. **92 of 92 checks pass.**
  - **Toolbar at 1280:**
    - one row, bottoms aligned, in the agreed order, export flush right
    - still one row with ล้างตัวกรอง showing
    - both filters are native selects
  - **Pagination** (25 per page, 3 pages):
    - หน้า 1 จาก 3 and แสดง 1–25 จาก 62
    - first and previous disabled on page 1; next and last disabled on page 3
    - ถัดไป → `?page=2`, หน้าสุดท้าย → `?page=3` (12 rows), ก่อนหน้า → `?page=2`, หน้าแรก → no param
    - แถวต่อหน้า 50 → `?pageSize=50` (หน้า 1 จาก 2), then page 2 → `?page=2&pageSize=50`, Back → `?pageSize=50`, 25 → no param
  - **Loading** (1.5 s latency): `aria-busy="true"`, dimmed, previous rows kept, status "· กำลังโหลด…".
  - **Filters:**
    - Event Day → `?day=2026-10-31` (พบ 41)
    - plus role → `?day=2026-10-31&role=student` (พบ 9, every row a student)
    - ล้างตัวกรอง → no params, selects back to ทุกวัน and ทุกฐานะ
  - **Search:**
    - URL unchanged 120 ms after typing, then `?q=อรุณ` (พบ 6)
    - Enter submits at once
    - Back restores `?q=อรุณ` in the box
    - ล้างตัวกรอง empties it
  - **Sort:**
    - ลงทะเบียนเมื่อ → `?sort=createdAt.asc` (oldest first)
    - ชื่อ → `givenName.asc`, then `givenName.desc`
    - นามสกุล → `familyName.asc`
    - `aria-sort` follows each change
    - paging keeps the sort; a filter change goes back to page 1 and keeps it; Back restores `?sort=familyName.asc&page=2`
  - **คอลัมน์ by keyboard:**
    - Enter on the button opens it, focus on the first item
    - 9 items, all checked, no รายละเอียด; the menu is named by its trigger and has the themed background
    - Space hides ลงทะเบียนเมื่อ and the menu stays open
    - ArrowDown ×5 reaches โทรศัพท์, Enter hides it
    - Escape closes and focus returns to the button
    - ArrowDown on the button also opens it
  - **คอลัมน์ by pointer:** a click hides อีเมล Event Pass and the menu stays open; a second click shows it again.
  - **Hidden columns:**
    - 8 headers and 8 cells per row; URL unchanged
    - still hidden after a page change
    - the "ไม่พบ…" row spans 8 columns
  - **CSV export with 2 columns hidden** (`?role=sponsor`):
    - the link is `/api/back-office/registrations/export?role=sponsor`
    - fetched with the session cookie: 200 `text/csv`, the full 18-column header (including ลงทะเบียนเมื่อ and เบอร์โทรศัพท์), 12 rows
    - without the cookie: 401
  - **Reload:** all 10 columns back, every menu item checked.
  - **Error:** the list API answering 500 shows "โหลดรายการลงทะเบียนไม่สำเร็จ" and ลองอีกครั้ง (after the query's 2 retries); with the API restored, ลองอีกครั้ง loads the result.
  - **768:**
    - no horizontal page scroll; the table scrolls inside its container
    - the toolbar wraps: search and day on row 1, role and the button group on row 2
  - **375:**
    - no horizontal page scroll; the toolbar wraps with search on its own row
    - all four page buttons and the open menu sit inside the viewport
    - ถัดไป and a filter still work
- **Screenshots looked at:**
  - 1280: list, filtered, column menu (before and after the border fix), columns hidden, loading, error
  - 768: list
  - 375: list, column menu, filtered
