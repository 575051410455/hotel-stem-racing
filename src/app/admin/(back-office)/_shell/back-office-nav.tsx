"use client";

import { type LucideIcon, MailIcon, ScanLineIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { type AccountKind, canUseBackOffice, canUseCheckInDesk } from "@/lib/auth/access";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * One sidebar link, shown to the kinds of Account that `may` open it. It is current when the pathname
 * is `href`, unless `isCurrent` says otherwise.
 */
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  may: (kind: AccountKind) => boolean;
  isCurrent?: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "ผู้ลงทะเบียน",
    icon: UsersIcon,
    may: canUseBackOffice,
    // A Registration's detail belongs to the list.
    isCurrent: (pathname) => pathname === "/admin" || pathname.startsWith("/admin/registrations/"),
  },
  { href: "/admin/check-in", label: "เช็คอิน", icon: ScanLineIcon, may: canUseCheckInDesk },
  { href: "/admin/email", label: "ส่งอีเมล", icon: MailIcon, may: canUseBackOffice },
];

/**
 * The Back Office's page links that `kind` may open, with the current page highlighted. `kind` is null
 * while the session is read, and then no links show. Reading the pathname suspends while
 * prerendering a page with an unknown param (a Registration's detail), so the links render without
 * a highlight until it resolves.
 */
export function BackOfficeNav({ kind }: { kind: AccountKind | null }) {
  const items = kind ? navItems.filter((item) => item.may(kind)) : [];
  return (
    <Suspense fallback={<NavLinks items={items} pathname={null} />}>
      <CurrentNavLinks items={items} />
    </Suspense>
  );
}

function CurrentNavLinks({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <nav aria-label="เมนูระบบหลังบ้าน">
          <SidebarMenu>
            {items.map(({ href, label, icon: Icon, isCurrent = (path) => path === href }) => {
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
