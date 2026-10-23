import { type CSSProperties, Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { BackOfficeSidebar } from "./_shell/back-office-sidebar";
import { StaffAccountMenu, StaffAccountMenuSkeleton } from "./_shell/staff-account-menu";
import { BackOfficeQueryProvider } from "./query-provider";

// Chrome for every signed-in Back Office page: the sidebar (page links and the Staff account menu)
// and the inset each page fills with its own header (see _shell/page-header.tsx) and content.
// Static apart from the account menu, which reads the session behind its own boundary. The sidebar
// opens on every load: remembering it would mean reading a cookie here, making every page wait.
// This layout does NOT protect anything: each page calls `requireStaff()` (layouts don't re-run on
// client navigation).
export default function SignedInBackOfficeLayout({ children }: LayoutProps<"/admin">) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <BackOfficeSidebar
        accountMenu={
          <Suspense fallback={<StaffAccountMenuSkeleton />}>
            <StaffAccountMenu />
          </Suspense>
        }
      />
      {/* min-w-0: a flex item would otherwise grow to the Registration table's width, so the page
          scrolled sideways instead of the table. */}
      <SidebarInset className="min-w-0">
        <BackOfficeQueryProvider>{children}</BackOfficeQueryProvider>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
