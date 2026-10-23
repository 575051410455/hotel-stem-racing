# 01: Back Office app shell (sidebar, header, mobile sheet)

**What to build:** Every signed-in Back Office page sits in the shadcn/ui dashboard-01 app shell:
- **Sidebar:** "ระบบหลังบ้าน" with the Event name; links to ผู้ลงทะเบียน, เช็คอิน and ส่งอีเมล with the current one highlighted; and the signed-in Staff member's account menu with "ออกจากระบบ".
- **Header:** sticky, with the sidebar toggle and the page title.
- **Phones:** the sidebar slides in as a sheet.

Pages keep their content and behaviour; only the chrome around them changes. The Kiosk, Kiosk mode, the sign-in page and the public pages are untouched. See the spec ("Installing the block", "App shell", "Theme", "Next.js constraints").

**Blocked by:** v1 ticket 22 (`.scratch/stem-racing-registration-v1/issues/22-consolidate-shared-helpers.md`)

**Status:** ready-for-agent

- [ ] `dashboard-01` is added with the shadcn CLI.
  - Existing ui components aren't overwritten without a reviewed diff, and the `.back-office` contrast fixes survive.
  - The block's page and demo data are deleted: `/dashboard` answers 404.
  - Unused block parts, primitives and packages are removed: its data table, documents and secondary navigation, drawer, tabs, toggle group, checkbox, select, dnd-kit, `@tabler/icons-react`, vaul.
- [ ] The Back Office home, the check-in desk, the email page and the Registration detail page render inside the sidebar shell. The old header and Staff menu are gone.
- [ ] **Sidebar header and navigation:**
  - The header reads "ระบบหลังบ้าน" and the Event name.
  - The navigation is labelled "เมนูระบบหลังบ้าน" and has lucide icons for ผู้ลงทะเบียน, เช็คอิน and ส่งอีเมล.
  - The current page is highlighted, and ผู้ลงทะเบียน is also highlighted on detail pages.
- [ ] **Sidebar footer:**
  - It shows a lucide person icon (no initials), the Staff member's name and their email in small text.
  - Its dropdown has "ออกจากระบบ", which signs out through the existing sign-out action.
  - The session is read behind its own Suspense boundary with a skeleton fallback.
- [ ] **Sidebar behaviour:**
  - On desktop the sidebar is open on every load and collapses off-canvas by its trigger or Ctrl/⌘+B.
  - Its state is not restored on load, and the layout reads no cookie or other request-time data.
  - Below shadcn's mobile breakpoint it is a Sheet that closes when a page is chosen.
- [ ] **Header and titles:**
  - The sticky header holds the trigger, a separator and the page's only h1: ผู้ลงทะเบียน, เช็คอิน or ส่งอีเมล.
  - The detail page shows a breadcrumb "ผู้ลงทะเบียน › {Pass Code}" whose first part links to the list.
  - The home page's "ระบบหลังบ้าน / ยินดีต้อนรับ {name}" block is removed. The deleted notice still shows until ticket 05.
- [ ] Kiosk mode at the check-in desk still covers the whole viewport, above the sidebar, the header and an open mobile sheet.
- [ ] A Kiosk Account is still sent to `/kiosk` from every Back Office page without seeing the shell's data. `/kiosk` and `/admin/login` look and work as before.
- [ ] The shadcn Toaster (sonner) is mounted once in the signed-in Back Office layout, and nothing shows a toast yet (ticket 05).
- [ ] **Theme:**
  - `.back-office` gains the sidebar and chart tokens from the neutral palette, at AA contrast.
  - `tw-animate-css` is imported.
  - Public pages look the same.
- [ ] All copy is Thai and all icons are lucide.
- [ ] typecheck, lint, test and build pass. The hand-off records a browser check against `next start` covering:
  - 1280, 768 and 375 px with no horizontal page scroll
  - collapse by button and Ctrl/⌘+B
  - the mobile sheet
  - keyboard focus through the sidebar and account menu
  - sign-out
  - Kiosk mode covering everything
  - a Kiosk Account sent to `/kiosk`
  - `/dashboard` returning 404
