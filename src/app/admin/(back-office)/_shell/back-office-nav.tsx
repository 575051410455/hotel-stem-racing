"use client";

import { type LucideIcon, MailIcon, ScanLineIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/** One sidebar link. It is current when the pathname is `href`, unless `isCurrent` says otherwise. */
type NavItem = { href: string; label: string; icon: LucideIcon; isCurrent?: (pathname: string) => boolean };

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "ผู้ลงทะเบียน",
    icon: UsersIcon,
    // A Registration's detail belongs to the list.
    isCurrent: (pathname) => pathname === "/admin" || pathname.startsWith("/admin/registrations/"),
  },
  { href: "/admin/check-in", label: "เช็คอิน", icon: ScanLineIcon },
  { href: "/admin/email", label: "ส่งอีเมล", icon: MailIcon },
];

/**
 * The Back Office's page links, with the current page highlighted. Reading the pathname suspends
 * while prerendering a page with an unknown param (a Registration's detail), so the links render
 * without a highlight until it resolves.
 */
export function BackOfficeNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <CurrentNavLinks />
    </Suspense>
  );
}

function CurrentNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <nav aria-label="เมนูระบบหลังบ้าน">
          <SidebarMenu>
            {navItems.map(({ href, label, icon: Icon, isCurrent = (path) => path === href }) => {
              const current = pathname !== null && isCurrent(pathname);
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
