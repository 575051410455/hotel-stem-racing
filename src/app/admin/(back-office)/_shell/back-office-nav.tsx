"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { AccountKind } from "@/lib/auth/access";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { backOfficeDestinations, type BackOfficeDestination, isCurrentDestination } from "./back-office-destinations";

/**
 * The Back Office's page links that `kind` may open, with the current page highlighted. `kind` is null
 * while the session is read, and then no links show. Reading the pathname suspends while
 * prerendering a page with an unknown param (a Registration's detail), so the links render without
 * a highlight until it resolves.
 */
export function BackOfficeNav({ kind }: { kind: AccountKind | null }) {
  const items = backOfficeDestinations(kind);
  return (
    <Suspense fallback={<NavLinks items={items} pathname={null} />}>
      <CurrentNavLinks items={items} />
    </Suspense>
  );
}

function CurrentNavLinks({ items }: { items: BackOfficeDestination[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

function NavLinks({ items, pathname }: { items: BackOfficeDestination[]; pathname: string | null }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <nav aria-label="Back Office menu">
          <SidebarMenu>
            {items.map((item) => {
              const { href, label, icon: Icon } = item;
              const current = isCurrentDestination(item, pathname);
              return (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={current}>
                    {/* On a phone the sidebar is a sheet over the page: close it once a page is chosen. */}
                    <Link href={href} aria-current={current ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
