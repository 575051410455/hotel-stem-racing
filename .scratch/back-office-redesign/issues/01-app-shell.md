# 01: Back Office app shell (sidebar, header, mobile sheet)

**What to build:** Every signed-in Back Office page sits in the shadcn/ui dashboard-01 app shell:
- **Sidebar:** "ระบบหลังบ้าน" with the Event name; links to ผู้ลงทะเบียน, เช็คอิน and ส่งอีเมล with the current one highlighted; and the signed-in Staff member's account menu with "ออกจากระบบ".
- **Header:** sticky, with the sidebar toggle and the page title.
- **Phones:** the sidebar slides in as a sheet.

Pages keep their content and behaviour; only the chrome around them changes. The Kiosk, Kiosk mode, the sign-in page and the public pages are untouched. See the spec ("Installing the block", "App shell", "Theme", "Next.js constraints").

**Blocked by:** v1 ticket 22 (`.scratch/stem-racing-registration-v1/issues/22-consolidate-shared-helpers.md`)

**Status:** resolved

- [x] `dashboard-01` is added with the shadcn CLI.
  - Existing ui components aren't overwritten without a reviewed diff, and the `.back-office` contrast fixes survive.
  - The block's page and demo data are deleted: `/dashboard` answers 404.
  - Unused block parts, primitives and packages are removed: its data table, documents and secondary navigation, drawer, tabs, toggle group, checkbox, select, dnd-kit, `@tabler/icons-react`, vaul.
- [x] The Back Office home, the check-in desk, the email page and the Registration detail page render inside the sidebar shell. The old header and Staff menu are gone.
- [x] **Sidebar header and navigation:**
  - The header reads "ระบบหลังบ้าน" and the Event name.
  - The navigation is labelled "เมนูระบบหลังบ้าน" and has lucide icons for ผู้ลงทะเบียน, เช็คอิน and ส่งอีเมล.
  - The current page is highlighted, and ผู้ลงทะเบียน is also highlighted on detail pages.
- [x] **Sidebar footer:**
  - It shows a lucide person icon (no initials), the Staff member's name and their email in small text.
  - Its dropdown has "ออกจากระบบ", which signs out through the existing sign-out action.
  - The session is read behind its own Suspense boundary with a skeleton fallback.
- [x] **Sidebar behaviour:**
  - On desktop the sidebar is open on every load and collapses off-canvas by its trigger or Ctrl/⌘+B.
  - Its state is not restored on load, and the layout reads no cookie or other request-time data.
  - Below shadcn's mobile breakpoint it is a Sheet that closes when a page is chosen.
- [x] **Header and titles:**
  - The sticky header holds the trigger, a separator and the page's only h1: ผู้ลงทะเบียน, เช็คอิน or ส่งอีเมล.
  - The detail page shows a breadcrumb "ผู้ลงทะเบียน › {Pass Code}" whose first part links to the list.
  - The home page's "ระบบหลังบ้าน / ยินดีต้อนรับ {name}" block is removed. The deleted notice still shows until ticket 05.
- [x] Kiosk mode at the check-in desk still covers the whole viewport, above the sidebar, the header and an open mobile sheet.
- [x] A Kiosk Account is still sent to `/kiosk` from every Back Office page without seeing the shell's data. `/kiosk` and `/admin/login` look and work as before.
- [x] The shadcn Toaster (sonner) is mounted once in the signed-in Back Office layout, and nothing shows a toast yet (ticket 05).
- [x] **Theme:**
  - `.back-office` gains the sidebar and chart tokens from the neutral palette, at AA contrast.
  - `tw-animate-css` is imported.
  - Public pages look the same.
- [x] All copy is Thai and all icons are lucide.
- [x] typecheck, lint, test and build pass. The hand-off records a browser check against `next start` covering:
  - 1280, 768 and 375 px with no horizontal page scroll
  - collapse by button and Ctrl/⌘+B
  - the mobile sheet
  - keyboard focus through the sidebar and account menu
  - sign-out
  - Kiosk mode covering everything
  - a Kiosk Account sent to `/kiosk`
  - `/dashboard` returning 404

## Answer

Done on branch `redesign-01-app-shell`.

### What's where

| What | Where |
| --- | --- |
| Shell layout: `SidebarProvider` (`--sidebar-width` 18rem, `--header-height` 3rem), `BackOfficeSidebar`, `SidebarInset className="min-w-0"`, `Toaster` | `(back-office)/layout.tsx` |
| Sidebar: always `variant="inset"`, off-canvas. An `<aside aria-label="แถบเมนูระบบหลังบ้าน">` holds the name and Event, the nav, and the `accountMenu` slot. | `(back-office)/_shell/back-office-sidebar.tsx` |
| Nav: `navItems` (lucide `UsersIcon`, `ScanLineIcon`, `MailIcon`). An item is current when the pathname is its `href`; only ผู้ลงทะเบียน overrides that, to cover detail pages. `aria-current="page"`; closes the mobile sheet on click; inside `<Suspense>` (see Gotchas). | `_shell/back-office-nav.tsx` |
| Staff account menu: the session read (server) passes `account` (`Pick<CurrentStaff, "name" \| "email">`) to the dropdown (client), which calls the existing `signOut` Server Action from `onSelect` in a transition | `_shell/staff-account-menu.tsx`, `_shell/staff-account-dropdown.tsx` (the old `staff-menu.tsx` is gone) |
| `PageHeader`, `PageTitle` (the h1), `PageContent` (`narrow` = `max-w-3xl`; drops the first section's top margin) | `_shell/page-header.tsx` |
| Pages: each renders its own header (h1 ผู้ลงทะเบียน, เช็คอิน, ส่งอีเมล). The detail page's breadcrumb `ผู้ลงทะเบียน › {Pass Code}` renders inside the existing Suspense, so it is still one database read; the Attendee's name stays the page's h1. Home: the welcome block is removed, and the deleted notice moved from the top to just above the list. | the four `page.tsx` |
| Kiosk overlay at `z-[60]`, above the mobile sheet (z-50) | `check-in/kiosk-screen.tsx` |

### Installing the block

- **The CLI's changes to existing files were all reverted.** `npx shadcn@latest add dashboard-01 --yes --overwrite` ran on a clean tree, and the diff was reviewed:
  - The only change to the 6 existing ui files was `import { cn } from "cn"` (shadcn's new `cn` package) in place of `@/lib/utils`. All 6 were restored, every new ui file now imports `@/lib/utils` as `components.json` says, and the `cn` package was removed.
  - The CLI appended `:root`/`.dark` sidebar colours to `globals.css`. They were removed: the Back Office theme already has `--sidebar-*` and `--chart-*`.
- **Deleted from the block:**
  - `src/app/dashboard/` and `data.json` (`/dashboard` is no route)
  - the data table, documents and secondary navigation
  - `section-cards` and `chart-area-interactive`: 02 and 03 build their own from the spec. The registry source is at `https://ui.shadcn.com/r/styles/new-york-v4/dashboard-01.json` for reference.
  - drawer, tabs, toggle group, toggle, checkbox, select
- **Packages removed:** dnd-kit (4), `@tabler/icons-react`, vaul, `next-themes` (sonner now uses `theme="light"`), `cn`.
- **Packages added:** `recharts` and `sonner` (dependencies), `tw-animate-css` (devDependencies, a CSS-only build input like tailwindcss). `chart.tsx` stays for ticket 03.
- **Edited primitives:**
  - **sidebar:**
    - It no longer writes the `sidebar_state` cookie. Nothing read it, and it rode along on every request, public pages included.
    - The off-canvas container is `inert` while collapsed, so its links leave the Tab order.
    - Thai, generic screen-reader copy ("เมนู", "เปิดหรือปิดเมนู").
    - `SidebarMenuSkeleton` takes a fixed `width` instead of `Math.random()`, which fails lint and can't be prerendered.
  - **sheet, breadcrumb:** Thai screen-reader strings.
  - **sonner:** light only, Thai `containerAriaLabel` and `closeButtonAriaLabel`, and `--border-radius` set to `0.5rem` (the theme leaves `--radius` unset).
  - **`useIsMobile`:** rewritten on `useSyncExternalStore`. The upstream hook set state in an effect, which fails React Compiler lint.

### Gotchas (for 02–05)

- **Radix portals** (Sheet, Dropdown Menu, Tooltip) render into `<body>`, outside `.back-office`.
  - The theme block in `globals.css` also matches their content by `data-slot` (`sheet-content`, `dropdown-menu-content`, `dropdown-menu-sub-content`, `tooltip-content`). **A newly added portaled primitive must join that list.**
  - It deliberately doesn't use `body:has(.back-office)`: Next keeps visited routes mounted but hidden, so a client navigation to a public page would have kept matching.
- **`usePathname` suspends under Cache Components** below a route with an unknown param (`/admin/registrations/[id]`), and the build fails without a boundary. So the nav is in `<Suspense>`, and its fallback shows the same links with nothing highlighted.
- **Hidden routes stay in the DOM** (Activity). DOM checks must count only visible elements, for example with `checkVisibility()`.
- **`PageContent` zeroes the first child's top margin,** so put anything that may render nothing (a Suspense with a `null` fallback) after the first section. Otherwise the page shifts when it resolves.
- **`SidebarInset` needs `min-w-0`.** Without it, the 10-column table widened the page instead of scrolling in its own container.
- **The Toaster's `toastOptions` sets a Thai `closeButtonAriaLabel`.** Ticket 05 should merge into it, not replace it. Its z-index (sonner's default) is above the Kiosk overlay, so 05 must dismiss toasts on entering Kiosk mode, as planned.

### Review

A two-axis review (Standards, Spec) found no hard violations. Fixed:
- **Bugs:** the collapsed sidebar was focusable (now `inert`), and the theme leak risk through `body:has()` (now `data-slot`).
- **Agreed copy:** the email page's h1 is now ส่งอีเมล, as agreed.
- **Layout:** the page no longer shifts when the deleted notice's boundary resolves.
- **Sidebar:** the unread cookie is gone, and the `<aside>` landmark is added.
- **Naming and structure:** `navItems` with a default `isCurrent`, a fixed `inset` variant, the `accountMenu` slot, the `account` object, the generic sheet copy, and a comment that won't go stale.

Kept: `chart.tsx` and `recharts`, which ticket 03 needs and the spec lists. Also kept: the detail page's `BackToList`, since its content is unchanged by design.

### Verified

- typecheck, lint, the 200 tests and build pass. The build has no `/dashboard`, and `/admin/*` stay `◐`.
- **Headless Chrome over CDP against `next start`,** with a throwaway Staff Account, Kiosk Account and Registration (all deleted). 49 of 49 checks pass:
  - **Desktop (1280):**
    - Staff sign-in lands on `/admin`.
    - The sidebar header shows ระบบหลังบ้าน and the Event, inside the `<aside>`. The footer shows the name and email.
    - The nav highlights the right page on all four pages.
    - Each page has one visible h1, and the breadcrumb links back to the list.
    - The header is sticky, and the welcome block is gone.
    - The counts section sits 24px under the header, with and without a deleted notice. The notice appears above the list.
  - **Sidebar:**
    - Ctrl+B, ⌘+B and the trigger each collapse and expand it.
    - While collapsed it is `inert` and its links can't take focus.
    - No `sidebar_state` cookie is written, and it is open again after a reload.
  - **Account menu:** it opens by keyboard, shows ออกจากระบบ with a themed background, and Escape closes it. Choosing ออกจากระบบ by pointer lands on `/admin/login`.
  - **Kiosk mode** covers the sidebar, header and content at 5 sample points.
  - **768:** the desktop sidebar shows, with no horizontal page scroll.
  - **375:**
    - no sidebar on the page and no horizontal scroll
    - the menu button opens the sheet, which has the Thai title "เมนู" and a themed background
    - choosing เช็คอิน navigates and closes the sheet
  - **Kiosk Account:** it lands on `/kiosk`, is sent from `/admin` to `/kiosk`, and sees no shell.
  - **Public `/`:** the warm background, and no Back Office tokens on `<body>`.
- **Screenshots looked at:**
  - home at 1280
  - collapsed sidebar
  - account menu
  - check-in
  - detail
  - Kiosk mode
  - home at 768
  - the sheet at 375
  - public `/`
