import { FlagIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { event } from "@/lib/event";

/**
 * The Back Office sidebar: its name and the Event, `nav` (the page links the signed-in Account may
 * open), and `accountMenu` (the signed-in Staff member's menu) at the foot. The layout streams both
 * in. Inset, as in dashboard-01.
 */
export function BackOfficeSidebar({ nav, accountMenu }: { nav: ReactNode; accountMenu: ReactNode }) {
  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      {/* A landmark, so the name and the account menu aren't stranded outside one. */}
      <aside aria-label="Back Office sidebar" className="flex min-h-0 flex-1 flex-col">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <FlagIcon aria-hidden="true" className="size-4" />
            </span>
            <p className="grid min-w-0 flex-1 text-sm leading-tight">
              <span className="truncate font-semibold">Back Office</span>
              <span className="truncate text-xs text-muted-foreground">{event.name}</span>
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>{nav}</SidebarContent>
        <SidebarFooter>{accountMenu}</SidebarFooter>
      </aside>
    </Sidebar>
  );
}
