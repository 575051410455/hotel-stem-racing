import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * The bar on top of every Back Office page: the sidebar toggle, then the page's title (`PageTitle`)
 * or a breadcrumb. Each page renders its own, since the layout can't know the page. Sticky, so the
 * title stays in view while a long list scrolls.
 */
export function PageHeader({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center border-b bg-background md:rounded-t-xl">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        {children}
      </div>
    </header>
  );
}

/** The page's only h1. */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="truncate text-base leading-normal font-medium">{children}</h1>;
}

/**
 * The page's content below the header. Sections space themselves with a top margin, so the first
 * one's is dropped: every page starts the same distance below the header. `narrow` keeps forms
 * at a readable width.
 */
export function PageContent({ narrow = false, children }: { narrow?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex w-full flex-1 flex-col p-4 *:first:mt-0 lg:p-6", narrow && "max-w-3xl")}>
      {children}
    </div>
  );
}
