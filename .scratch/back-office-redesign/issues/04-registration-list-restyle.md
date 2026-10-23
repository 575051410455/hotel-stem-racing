# 04: Registration list toolbar, column picker and pagination

**What to build:** The Registration list on the Back Office home looks like dashboard-01's table and behaves exactly as it does now:
- **Toolbar:** search, the Event Day and Attendee Role filters, ล้างตัวกรอง, a "คอลัมน์" menu to hide and show columns, and CSV export.
- **Pagination:** rows per page, "หน้า X จาก Y", and first, previous, next and last buttons.

Search, filters, sorting and paging stay server-driven and in the URL. See the spec ("Registration list").

**Blocked by:** 01 (Back Office app shell)

**Status:** ready-for-agent

- [ ] **Toolbar,** wrapping on narrow screens: search · Event Day (native select) · Attendee Role (native select) · ล้างตัวกรอง · "คอลัมน์" · CSV export at the end.
- [ ] **"คอลัมน์":**
  - a dropdown of checkbox items, one per column header, to hide or show that column
  - the detail link column can't be hidden
  - visibility isn't persisted or put in the URL, so every column is back on reload
  - CSV export still includes every column
- [ ] **Pagination:**
  - "แถวต่อหน้า" (native select)
  - "หน้า X จาก Y"
  - lucide icon buttons labelled หน้าแรก, ก่อนหน้า, ถัดไป and หน้าสุดท้าย, disabled at the ends
- [ ] **Unchanged:**
  - TanStack Table v9 in manual mode, TanStack Query, view state in the URL (links and Back still work), the search debounce, the dimmed `aria-busy` loading state and the retry on error
  - the ten columns and their cells, including the Event Pass email cell and the detail link
- [ ] **Not added:** row checkboxes, a per-row ⋮ menu, drag handles, tabs or a row drawer.
- [ ] typecheck, lint, test and build pass. The hand-off records a browser check covering:
  - every filter, sort and page change, and the URL after each
  - hiding a column, then reloading
  - a CSV export with a column hidden
  - keyboard use of the column menu
  - 1280, 768 and 375 px
